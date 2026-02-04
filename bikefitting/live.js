import { presets } from "./presets.js";

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
      window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS,
        { color: "rgba(255,255,255,0.35)", lineWidth: 3 });
      window.drawLandmarks(ctx, results.poseLandmarks,
        { color: "rgba(255,255,255,0.95)", lineWidth: 2, radius: 4 });
    }
    ctx.restore();
  }

  function computeMetrics(results, session){
    const lm=results.poseLandmarks;
    if(!lm) return;

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

    const p = presets(session.bike.discipline, session.bike.goal);

    if(kneeAng!=null){
      if(kneeAng < p.knee[0]){
        setHint("Kolano za mocno zgięte", "Najczęściej: siodło za nisko. Podnieś o 3–5 mm i zrób re-test (10–20 obrotów).");
      }else if(kneeAng > p.knee[1]){
        setHint("Kolano za proste", "Najczęściej: siodło za wysoko. Opuść o 3–5 mm i zrób re-test (10–20 obrotów).");
      }else{
        if(elbowAng!=null){
          if(elbowAng > p.elbow[1]){
            setHint("Ręce za proste / za duży reach", "Test: krótszy mostek (-10 mm) lub wyżej kokpit (+5–10 mm). Jedna zmiana naraz.");
          }else if(elbowAng < p.elbow[0]){
            setHint("Ręce mocno ugięte / pozycja zebrana", "Jeśli to nie cel aero: test dłuższy mostek (+10 mm) lub korekta kokpitu.");
          }else{
            setHint("Wygląda dobrze", "Zapisz „PRZED”, zrób jedną zmianę i zapisz „PO”.");
          }
        }else{
          setHint("Kolano OK", "Nie widzę stabilnie łokcia/nadgarstka — popraw kadr lub światło.");
        }
      }
    }

    if(isFinite(stab) && stab < 55){
      dbg("Uwaga: niska stabilność punktów ("+stab+"%). Popraw światło / kadr / obcisłe ubrania.");
    }
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
      // session będzie podany w app.js przy wywołaniu
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