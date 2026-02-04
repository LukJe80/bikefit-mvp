import { presets, toLabelDiscipline, toLabelGoal } from "./presets.js";

export function createLiveController(deps){
  const {
    videoEl, canvasEl,
    setStatus, dbg, setHint,
    setKpi
  } = deps;

  let camera = null;
  let pose = null;
  let stream = null;

  const ctx = canvasEl.getContext("2d");
  let lastMetrics = { knee:null, elbow:null, torso:null, stab:null };

  // żeby nie spamować instrukcjami w każdej klatce
  let lastHintKey = "";
  let lastHintAt = 0;

  function angleABC(a,b,c){
    const abx=a.x-b.x, aby=a.y-b.y;
    const cbx=c.x-b.x, cby=c.y-b.y;
    const dot=abx*cbx+aby*cby;
    const lab=Math.hypot(abx,aby);
    const lcb=Math.hypot(cbx,cby);
    if(lab===0||lcb===0) return null;
    let cos=dot/(lab*lcb);
    cos=Math.max(-1,Math.min(1,cos));
    return Math.acos(cos)*180/Math.PI;
  }

  function fmtDeg(x){ return (x==null||Number.isNaN(x)) ? "—" : (Math.round(x)+"°"); }

  function resizeCanvasToVideo(){
    const w=videoEl.videoWidth||1280;
    const h=videoEl.videoHeight||720;
    canvasEl.width=w; canvasEl.height=h;
  }

  function draw(results){
    ctx.save();
    ctx.clearRect(0,0,canvasEl.width,canvasEl.height);

    if(results.image){
      ctx.drawImage(results.image,0,0,canvasEl.width,canvasEl.height);
    }
    if(results.poseLandmarks){
      // rysunki pomocnicze – zostawiamy
      window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS,
        { color: "rgba(255,255,255,0.35)", lineWidth: 3 });
      window.drawLandmarks(ctx, results.poseLandmarks,
        { color: "rgba(255,255,255,0.95)", lineWidth: 2, radius: 4 });
    }
    ctx.restore();
  }

  function throttleHint(key, ms=900){
    const now = Date.now();
    if(key !== lastHintKey || (now - lastHintAt) > ms){
      lastHintKey = key;
      lastHintAt = now;
      return true;
    }
    return false;
  }

  function setHintSafe(key, title, text){
    if(throttleHint(key)){
      setHint(title, text);
    }
  }

  function instructionEngine(session, m){
    // pobierz progi z presets.js
    const p = presets(session.bike.discipline, session.bike.goal);

    // Jakakolwiek widoczność kiepska -> najpierw “technikalia”
    if(isFinite(m.stab) && m.stab < 55){
      setHintSafe(
        "stab_low",
        "Słaba widoczność punktów",
        `Stabilność ${m.stab}%. Popraw światło, ustaw kadr (biodro–kolano–kostka w widoku), unikaj luźnych ubrań.`
      );
      return;
    }

    // 1) Kolano -> siodło
    if(m.knee != null){
      if(m.knee < p.knee[0]){
        setHintSafe(
          "knee_low",
          "Kolano za mocno zgięte",
          `Kąt kolana ${Math.round(m.knee)}° (poniżej ${p.knee[0]}°). Najczęściej: siodło za nisko. Podnieś 3–5 mm i re-test 10–20 obrotów.`
        );
        return;
      }
      if(m.knee > p.knee[1]){
        setHintSafe(
          "knee_high",
          "Kolano za proste",
          `Kąt kolana ${Math.round(m.knee)}° (powyżej ${p.knee[1]}°). Najczęściej: siodło za wysoko. Opuść 3–5 mm i re-test 10–20 obrotów.`
        );
        return;
      }
    }

    // 2) Tułów -> wysokość kokpitu (drop)
    if(m.torso != null){
      if(m.torso < p.torso[0]){
        setHintSafe(
          "torso_low",
          "Tułów zbyt niski / agresywny",
          `Kąt tułowia ${Math.round(m.torso)}° (poniżej ${p.torso[0]}°). Dla celu ${toLabelGoal(session.bike.goal)} rozważ: podnieść kokpit +5–10 mm lub krótszy mostek.`
        );
        return;
      }
      if(m.torso > p.torso[1]){
        setHintSafe(
          "torso_high",
          "Tułów zbyt wysoki / zbyt pionowo",
          `Kąt tułowia ${Math.round(m.torso)}° (powyżej ${p.torso[1]}°). Jeśli chcesz bardziej sportowo: obniż kokpit 5–10 mm i sprawdź komfort.`
        );
        return;
      }
    }

    // 3) Łokieć -> reach / mostek
    if(m.elbow != null){
      if(m.elbow > p.elbow[1]){
        setHintSafe(
          "elbow_high",
          "Ręce za proste / reach za duży",
          `Kąt łokcia ${Math.round(m.elbow)}° (powyżej ${p.elbow[1]}°). Test: krótszy mostek (-10 mm) lub wyżej kokpit (+5–10 mm). Jedna zmiana naraz.`
        );
        return;
      }
      if(m.elbow < p.elbow[0]){
        setHintSafe(
          "elbow_low",
          "Ręce mocno ugięte / pozycja zebrana",
          `Kąt łokcia ${Math.round(m.elbow)}° (poniżej ${p.elbow[0]}°). Jeśli to nie cel aero: test dłuższy mostek (+10 mm) albo delikatnie niżej kokpit.`
        );
        return;
      }
    }

    // Jeśli wszystko w normie:
    const label = `${toLabelDiscipline(session.bike.discipline)} • ${toLabelGoal(session.bike.goal)}`;
    setHintSafe(
      "ok_all",
      "Wygląda dobrze ✅",
      `Jesteś w zakresach dla: ${label}. Zapisz „PRZED”, zrób jedną zmianę i zapisz „PO”.`
    );
  }

  function computeMetrics(results, session){
    const lm=results.poseLandmarks;
    if(!lm) return;

    // (prawa strona ciała domyślnie)
    const hip=lm[24], knee=lm[26], ankle=lm[28];
    const shoulder=lm[12], elbow=lm[14], wrist=lm[16];

    const kneeAng=angleABC(hip,knee,ankle);
    const elbowAng=angleABC(shoulder,elbow,wrist);

    let torsoAng=null;
    if(hip && shoulder){
      const a={x:hip.x, y:hip.y-1};
      torsoAng=angleABC(a, hip, shoulder);
    }

    const vis=[hip,knee,ankle,shoulder,elbow,wrist].map(p=>p?.visibility??0);
    const avg=vis.reduce((s,v)=>s+v,0)/vis.length;
    const stab=Math.round(avg*100);

    setKpi("knee", fmtDeg(kneeAng));
    setKpi("elbow", fmtDeg(elbowAng));
    setKpi("torso", fmtDeg(torsoAng));
    setKpi("stab", (isFinite(stab)?(stab+"%"):"—"));

    lastMetrics = { knee:kneeAng, elbow:elbowAng, torso:torsoAng, stab:stab };

    // Instruktor krok-po-kroku:
    instructionEngine(session, lastMetrics);

    // Debug
    dbg(`preset: ${session.bike.discipline}/${session.bike.goal} | knee=${fmtDeg(kneeAng)} elbow=${fmtDeg(elbowAng)} torso=${fmtDeg(torsoAng)} stab=${stab}%`);
  }

  async function initPose(){
    pose = new window.Pose({
      locateFile: (file) => "https://cdn.jsdelivr.net/npm/@mediapipe/pose/" + file
    });

    pose.setOptions({
      modelComplexity: 1,
      smoothLandmarks: true,
      enableSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    pose.onResults((results) => {
      if(videoEl.videoWidth && canvasEl.width === 0) resizeCanvasToVideo();
      draw(results);
    });
  }

  async function start(session){
    try{
      setStatus("START...", false);
      setHint("Łączę kamerę", "Przeglądarka może zapytać o zgodę.");
      dbg("start...");

      if(!pose) await initPose();

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:"user", width:{ideal:1280}, height:{ideal:720} },
        audio:false
      });

      videoEl.srcObject=stream;
      await videoEl.play();
      resizeCanvasToVideo();

      // podmieniamy onResults, żeby mieć aktualny session
      pose.onResults((results) => {
        if(videoEl.videoWidth && canvasEl.width === 0) resizeCanvasToVideo();
        draw(results);
        computeMetrics(results, session);
      });

      camera = new window.Camera(videoEl, {
        onFrame: async () => { await pose.send({ image: videoEl }); }
      });
      camera.start();

      setStatus("ON", true);
      setHint("Analizuję", "Punkty powinny pojawić się po 1–2 sekundach.");
      dbg("kamera OK");
    }catch(e){
      console.error(e);
      dbg((e && e.message) ? e.message : String(e));
      setStatus("OFF", false);
      setHint("Błąd kamery", "Sprawdź kłódkę (kamera: zezwalaj), zamknij Teams/Zoom/OBS i odśwież.");
    }
  }

  function stop(){
    try{ if(camera) camera.stop(); }catch(_){}
    camera=null;

    if(stream) stream.getTracks().forEach(t=>t.stop());
    stream=null;

    ctx.clearRect(0,0,canvasEl.width,canvasEl.height);
    setStatus("OFF", false);
    setHint("Zatrzymano", "Kliknij „Start kamery”, aby uruchomić ponownie.");
    dbg("stop");
  }

  function snapshot(){
    try{ return canvasEl.toDataURL("image/jpeg", 0.85); }
    catch(e){ return null; }
  }

  function getLastMetrics(){
    return lastMetrics;
  }

  return { start, stop, snapshot, getLastMetrics };
}
