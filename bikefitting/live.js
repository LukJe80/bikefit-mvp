export function createLiveController({ videoEl, canvasEl, setStatus, dbg, setHint, setKpi }){
  let stream = null;
  let pose = null;
  let running = false;

  let lastMetrics = { knee:null, elbow:null, torso:null, stab:null };

  const ctx = canvasEl.getContext("2d", { alpha:true });

  function resizeCanvas(){
    const w = videoEl.videoWidth || 1280;
    const h = videoEl.videoHeight || 720;
    canvasEl.width = w;
    canvasEl.height = h;
    canvasEl.style.width = "100%";
    canvasEl.style.height = "100%";
  }

  function angle(a,b,c){
    // kąt ABC (b jako wierzchołek)
    const ab = { x: a.x - b.x, y: a.y - b.y };
    const cb = { x: c.x - b.x, y: c.y - b.y };
    const dot = ab.x*cb.x + ab.y*cb.y;
    const lab = Math.hypot(ab.x,ab.y);
    const lcb = Math.hypot(cb.x,cb.y);
    if(!lab || !lcb) return null;
    let v = dot / (lab*lcb);
    v = Math.max(-1, Math.min(1, v));
    return Math.acos(v) * (180/Math.PI);
  }

  function pick(landmarks, idx){
    const p = landmarks[idx];
    return p ? { x:p.x, y:p.y, v: p.visibility ?? 0 } : null;
  }

  function compute(landmarks){
    // MediaPipe Pose indexes:
    // 11 l_shoulder, 12 r_shoulder
    // 13 l_elbow, 14 r_elbow
    // 15 l_wrist, 16 r_wrist
    // 23 l_hip, 24 r_hip
    // 25 l_knee, 26 r_knee
    // 27 l_ankle,28 r_ankle

    // bok: bierzemy stronę bardziej widoczną (większa suma visibility)
    const left = {
      sh: pick(landmarks,11), el: pick(landmarks,13), wr: pick(landmarks,15),
      hip: pick(landmarks,23), knee: pick(landmarks,25), ank: pick(landmarks,27)
    };
    const right = {
      sh: pick(landmarks,12), el: pick(landmarks,14), wr: pick(landmarks,16),
      hip: pick(landmarks,24), knee: pick(landmarks,26), ank: pick(landmarks,28)
    };

    const sumV = (s) => (s.sh?.v||0)+(s.el?.v||0)+(s.wr?.v||0)+(s.hip?.v||0)+(s.knee?.v||0)+(s.ank?.v||0);
    const side = sumV(right) > sumV(left) ? right : left;

    const stab = sumV(side)/6; // 0..1
    const knee = (side.hip && side.knee && side.ank) ? angle(side.hip, side.knee, side.ank) : null;
    const elbow = (side.sh && side.el && side.wr) ? angle(side.sh, side.el, side.wr) : null;

    // tułów: kąt (shoulder-hip) względem pionu
    let torso = null;
    if(side.sh && side.hip){
      const dx = side.sh.x - side.hip.x;
      const dy = side.sh.y - side.hip.y;
      const ang = Math.atan2(Math.abs(dx), Math.abs(dy)) * (180/Math.PI); // 0 pion, 90 poziom
      torso = ang;
    }

    return { knee, elbow, torso, stab, side };
  }

  function drawFrame(video){
    ctx.clearRect(0,0,canvasEl.width, canvasEl.height);
    ctx.drawImage(video, 0,0,canvasEl.width, canvasEl.height);
    // punkty świadomie “narazie bez” — zostawiamy tylko obraz
  }

  async function start(session){
    if(running) return;
    running = true;

    try{
      setStatus("ON", true);
      setHint("Ładowanie…", "Uruchamiam kamerę i analizę.");

      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode:"user", width:{ideal:1280}, height:{ideal:720} },
        audio: false
      });
      videoEl.srcObject = stream;
      await videoEl.play();
      resizeCanvas();

      // MediaPipe Pose
      pose = new Pose.Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        smoothSegmentation: false,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      pose.onResults((res) => {
        if(!running) return;
        drawFrame(videoEl);

        if(!res.poseLandmarks){
          lastMetrics = { knee:null, elbow:null, torso:null, stab:0 };
          setKpi("knee","—");
          setKpi("elbow","—");
          setKpi("torso","—");
          setKpi("stab","—");
          setHint("Brak sylwetki", "Ustaw się bokiem i upewnij się, że biodro–kolano–kostka są w kadrze.");
          return;
        }

        const m = compute(res.poseLandmarks);
        lastMetrics = { knee:m.knee, elbow:m.elbow, torso:m.torso, stab:m.stab };

        setKpi("knee", m.knee==null ? "—" : (Math.round(m.knee*10)/10).toFixed(1)+"°");
        setKpi("elbow", m.elbow==null ? "—" : (Math.round(m.elbow*10)/10).toFixed(1)+"°");
        setKpi("torso", m.torso==null ? "—" : (Math.round(m.torso*10)/10).toFixed(1)+"°");
        setKpi("stab", m.stab==null ? "—" : Math.round(m.stab*100)+"%");

        // prosta wskazówka stabilności
        if((m.stab||0) < 0.35){
          setHint("Słaba widoczność", "Popraw światło lub ustaw kamerę tak, by widoczne były kluczowe punkty.");
        }else{
          setHint("OK", "Możesz kręcić i zapisać pomiar. W razie zmian użyj „Dodaj zmianę”.");
        }
      });

      // loop
      const tick = async () => {
        if(!running) return;
        try{
          await pose.send({ image: videoEl });
        }catch(e){
          // bywa przy szybkich stop/start
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      dbg("kamera uruchomiona");
    }catch(err){
      dbg("błąd kamery: " + (err?.message || err));
      setHint("Brak kamery", "Sprawdź zezwolenia (kłódka), zamknij Teams/Zoom/OBS i spróbuj ponownie.");
      setStatus("OFF", false);
      running = false;
    }
  }

  function stop(){
    running = false;
    setStatus("OFF", false);
    setHint("Stop", "Kamera zatrzymana.");

    try{ if(videoEl) videoEl.pause(); }catch(e){}
    if(stream){
      for(const t of stream.getTracks()) t.stop();
      stream = null;
    }
    videoEl.srcObject = null;
    dbg("stop");
  }

  function getLastMetrics(){
    return lastMetrics;
  }

  function snapshot(){
    try{
      // snapshot = aktualny canvas (wideo)
      return canvasEl.toDataURL("image/jpeg", 0.85);
    }catch(e){
      return "";
    }
  }

  return { start, stop, getLastMetrics, snapshot };
}
