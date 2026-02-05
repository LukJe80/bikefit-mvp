// bikefitting/live.js
import { presets } from "./presets.js";

/**
 * LIVE controller:
 * - MediaPipe Pose (bez markerów)
 * - stabilność punktów
 * - kąty: kolano / łokieć / tułów
 * - instruktor "krok po kroku" (1 główna sugestia naraz)
 */
export function createLiveController({ videoEl, canvasEl, setStatus, dbg, setHint, setKpi }) {
  const ctx = canvasEl.getContext("2d");
  let pose = null;
  let cam = null;
  let stream = null;
  let running = false;

  let lastMetrics = { knee: null, elbow: null, torso: null, stab: null };
  let lastInstructor = { title: "", text: "", ts: 0 };

  // bufor do stabilizacji + "BDP" (przybliżenie)
  const kneeWindow = [];   // ostatnie ~2 sek max
  const elbowWindow = [];
  const torsoWindow = [];
  const stabWindow = [];
  const MAX_W = 60;

  function now() { return Date.now(); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function angleDeg(a, b, c) {
    // kąt w punkcie b dla odcinków ba i bc
    if (!a || !b || !c) return null;
    const bax = a.x - b.x, bay = a.y - b.y;
    const bcx = c.x - b.x, bcy = c.y - b.y;
    const dot = bax * bcx + bay * bcy;
    const na = Math.hypot(bax, bay);
    const nc = Math.hypot(bcx, bcy);
    if (na < 1e-6 || nc < 1e-6) return null;
    const cos = clamp(dot / (na * nc), -1, 1);
    return Math.acos(cos) * 180 / Math.PI;
  }

  function torsoAngleDeg(shoulder, hip) {
    // kąt tułowia względem poziomu (0 = poziomo, 90 = pion)
    if (!shoulder || !hip) return null;
    const dx = shoulder.x - hip.x;
    const dy = shoulder.y - hip.y;
    const ang = Math.atan2(Math.abs(dy), Math.abs(dx)) * 180 / Math.PI;
    return clamp(ang, 0, 90);
  }

  function avg(arr) {
    if (!arr.length) return null;
    return arr.reduce((s, x) => s + x, 0) / arr.length;
  }
  function max(arr) {
    if (!arr.length) return null;
    return arr.reduce((m, x) => Math.max(m, x), -Infinity);
  }

  function pushWin(arr, v) {
    if (v == null || !Number.isFinite(v)) return;
    arr.push(v);
    if (arr.length > MAX_W) arr.shift();
  }

  function vis(landmark) {
    // mediapipe: visibility 0..1
    if (!landmark) return 0;
    const v = landmark.visibility ?? landmark.presence ?? 0;
    return clamp(Number(v) || 0, 0, 1);
  }

  function pickSide(L, R) {
    // wybierz stronę z lepszą widocznością (dla ujęcia bokiem)
    const lScore =
      vis(L.hip) + vis(L.knee) + vis(L.ankle) + vis(L.shoulder) + vis(L.elbow) + vis(L.wrist);
    const rScore =
      vis(R.hip) + vis(R.knee) + vis(R.ankle) + vis(R.shoulder) + vis(R.elbow) + vis(R.wrist);
    return (rScore > lScore) ? "R" : "L";
  }

  function toPoint(lm, w, h) {
    if (!lm) return null;
    return { x: lm.x * w, y: lm.y * h };
  }

  function computeMetrics(landmarks, w, h) {
    // indeksy MediaPipe Pose:
    // L: shoulder 11, elbow 13, wrist 15, hip 23, knee 25, ankle 27
    // R: shoulder 12, elbow 14, wrist 16, hip 24, knee 26, ankle 28

    const L = {
      shoulder: landmarks[11], elbow: landmarks[13], wrist: landmarks[15],
      hip: landmarks[23], knee: landmarks[25], ankle: landmarks[27],
    };
    const R = {
      shoulder: landmarks[12], elbow: landmarks[14], wrist: landmarks[16],
      hip: landmarks[24], knee: landmarks[26], ankle: landmarks[28],
    };

    const side = pickSide(L, R);
    const S = (side === "L") ? L : R;

    const shoulder = toPoint(S.shoulder, w, h);
    const elbow = toPoint(S.elbow, w, h);
    const wrist = toPoint(S.wrist, w, h);
    const hip = toPoint(S.hip, w, h);
    const knee = toPoint(S.knee, w, h);
    const ankle = toPoint(S.ankle, w, h);

    const kneeAng = angleDeg(hip, knee, ankle);
    const elbowAng = angleDeg(shoulder, elbow, wrist);
    const torsoAng = torsoAngleDeg(shoulder, hip);

    // stabilność = średnia widoczność kluczowych punktów
    const stability =
      (vis(S.shoulder) + vis(S.elbow) + vis(S.wrist) + vis(S.hip) + vis(S.knee) + vis(S.ankle)) / 6;

    // okno czasowe (stabilizacja)
    pushWin(kneeWindow, kneeAng);
    pushWin(elbowWindow, elbowAng);
    pushWin(torsoWindow, torsoAng);
    pushWin(stabWindow, stability);

    // "BDP" dla kolana: w pedałowaniu maks. wyprost w oknie ~2s
    const kneeBDP = max(kneeWindow);
    const elbowAvg = avg(elbowWindow);
    const torsoAvg = avg(torsoWindow);
    const stabAvg = avg(stabWindow);

    return {
      side,
      knee: kneeBDP,
      elbow: elbowAvg,
      torso: torsoAvg,
      stab: stabAvg
    };
  }

  function fmt(v, d = 1) {
    if (v == null || !Number.isFinite(v)) return "—";
    return `${v.toFixed(d)}°`;
  }
  function fmtStab(v) {
    if (v == null || !Number.isFinite(v)) return "—";
    return `${(v * 100).toFixed(0)}%`;
  }

  function buildStepByStepAdvice(session, m) {
    const p = presets(session.bike.discipline, session.bike.goal);

    // jeśli słaba stabilność – najpierw "warunki pomiaru"
    if (m.stab != null && m.stab < 0.45) {
      return {
        title: "Ustaw kadr i światło",
        text:
          "Punkty są mało pewne. Zrób jaśniej, ustaw kamerę stabilnie i pokaż biodro–kolano–kostkę. " +
          "Załóż jaśniejsze ubranie. Dopiero potem rób zmiany w ustawieniach roweru."
      };
    }

    // policz odchylenia od zakresu (większe = ważniejsze)
    function deviation(val, [lo, hi]) {
      if (val == null || !Number.isFinite(val)) return null;
      if (val < lo) return lo - val;
      if (val > hi) return val - hi;
      return 0;
    }

    const dk = deviation(m.knee, p.knee);     // kolano (wysokość siodła)
    const de = deviation(m.elbow, p.elbow);   // łokieć (reach/mostek)
    const dt = deviation(m.torso, p.torso);   // tułów (drop/kokpit)

    // wybierz jedną (największą) do prowadzenia "krok po kroku"
    const items = [
      { key: "knee", dev: dk, val: m.knee, range: p.knee },
      { key: "elbow", dev: de, val: m.elbow, range: p.elbow },
      { key: "torso", dev: dt, val: m.torso, range: p.torso },
    ].filter(x => x.dev != null);

    if (!items.length) {
      return { title: "Brak danych", text: "Uruchom kamerę i poczekaj aż pojawią się kąty." };
    }

    // preferencja fittera: kolano > łokieć > tułów, ale jeśli dev dużo większe to wygra
    items.sort((a, b) => {
      if (b.dev !== a.dev) return b.dev - a.dev;
      const pr = { knee: 0, elbow: 1, torso: 2 };
      return pr[a.key] - pr[b.key];
    });

    const top = items[0];

    // w zakresie: wtedy krótki komunikat „OK”
    if (top.dev === 0) {
      return {
        title: "Wygląda dobrze",
        text:
          `Zakresy są OK dla tego presetu. ` +
          `Kolano ${fmt(m.knee)} (cel ${p.knee[0]}–${p.knee[1]}°), ` +
          `łokieć ${fmt(m.elbow)} (cel ${p.elbow[0]}–${p.elbow[1]}°), ` +
          `tułów ${fmt(m.torso)} (cel ${p.torso[0]}–${p.torso[1]}°). ` +
          `Zapisz PRZED/PO jeśli robisz mikro-korekty.`
      };
    }

    // poza zakresem: 1 sugestia + instrukcja re-testu
    if (top.key === "knee") {
      if (m.knee > p.knee[1]) {
        return {
          title: "Krok 1: Obniż siodło",
          text:
            `Kąt kolana jest zbyt prosty: ${fmt(m.knee)} (cel ${p.knee[0]}–${p.knee[1]}°). ` +
            `Zacznij od obniżenia siodła o 3–5 mm. ` +
            `Następnie kliknij „Dodaj zmianę”, wpisz siodło np. -5 i zrób „Zapisz pomiar” (PO).`
        };
      } else {
        return {
          title: "Krok 1: Podnieś siodło",
          text:
            `Kąt kolana jest zbyt mały: ${fmt(m.knee)} (cel ${p.knee[0]}–${p.knee[1]}°). ` +
            `Zacznij od podniesienia siodła o 3–5 mm. ` +
            `Potem „Dodaj zmianę” (np. +5) i „Zapisz pomiar” (PO).`
        };
      }
    }

    if (top.key === "elbow") {
      if (m.elbow > p.elbow[1]) {
        return {
          title: "Krok 1: Skróć reach (mostek)",
          text:
            `Ręce są za proste: ${fmt(m.elbow)} (cel ${p.elbow[0]}–${p.elbow[1]}°). ` +
            `Test: krótszy mostek o 10 mm (albo minimalnie wyżej kokpit). ` +
            `Zrób jedną zmianę naraz, potem „Dodaj zmianę” (mostek -10) i „Zapisz pomiar” (PO).`
        };
      } else {
        return {
          title: "Krok 1: Wydłuż reach (jeśli potrzeba)",
          text:
            `Łokieć jest mocno ugięty: ${fmt(m.elbow)} (cel ${p.elbow[0]}–${p.elbow[1]}°). ` +
            `Jeśli klient czuje „zbyt ciasno” – test: mostek +10 mm lub nieco niżej/ dalej chwyt. ` +
            `Potem „Dodaj zmianę” i „Zapisz pomiar” (PO).`
        };
      }
    }

    // torso
    if (m.torso > p.torso[1]) {
      return {
        title: "Krok 1: Zmniejsz „upright” (jeśli cel tego wymaga)",
        text:
          `Tułów jest dość pionowo: ${fmt(m.torso)} (cel ${p.torso[0]}–${p.torso[1]}°). ` +
          `Jeśli celem jest Neutral/Aero, test: niżej kokpit o 5–10 mm. ` +
          `Potem „Dodaj zmianę” (kokpit -10) i „Zapisz pomiar” (PO).`
      };
    } else {
      return {
        title: "Krok 1: Podnieś kokpit",
        text:
          `Tułów jest zbyt niski: ${fmt(m.torso)} (cel ${p.torso[0]}–${p.torso[1]}°). ` +
          `Test: podnieś kokpit o 5–10 mm (podkładki / kąt mostka). ` +
          `Potem „Dodaj zmianę” (kokpit +10) i „Zapisz pomiar” (PO).`
      };
    }
  }

  function drawOverlay(results) {
    const w = canvasEl.width, h = canvasEl.height;
    ctx.clearRect(0, 0, w, h);

    // tło: klatka z wideo
    ctx.drawImage(videoEl, 0, 0, w, h);

    // szkielety + punkty (MediaPipe)
    // drawing_utils są w globalu z CDN
    if (results.poseLandmarks && window.drawConnectors && window.drawLandmarks && window.POSE_CONNECTIONS) {
      window.drawConnectors(ctx, results.poseLandmarks, window.POSE_CONNECTIONS, { lineWidth: 2 });
      window.drawLandmarks(ctx, results.poseLandmarks, { lineWidth: 1, radius: 2 });
    }
  }

  async function start(session) {
    try {
      if (running) return;
      running = true;

      setStatus("ON", true);
      dbg("uruchamiam kamerę…");

      // kamera
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      });
      videoEl.srcObject = stream;
      await videoEl.play();

      // dopasuj canvas
      canvasEl.width = videoEl.videoWidth || 1280;
      canvasEl.height = videoEl.videoHeight || 720;

      // MediaPipe Pose
      pose = new window.Pose({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
      });
      pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        enableSegmentation: false,
        selfieMode: false,
        minDetectionConfidence: 0.55,
        minTrackingConfidence: 0.55
      });

      pose.onResults((results) => {
        if (!running) return;

        // rysuj
        drawOverlay(results);

        if (!results.poseLandmarks || results.poseLandmarks.length < 33) {
          setKpi("knee", "—");
          setKpi("elbow", "—");
          setKpi("torso", "—");
          setKpi("stab", "—");
          setHint("Szukam sylwetki", "Ustaw się bokiem i pokaż biodro–kolano–kostkę w kadrze.");
          dbg("brak landmarków");
          return;
        }

        const m = computeMetrics(results.poseLandmarks, canvasEl.width, canvasEl.height);
        lastMetrics = m;

        setKpi("knee", m.knee != null ? fmt(m.knee) : "—");
        setKpi("elbow", m.elbow != null ? fmt(m.elbow) : "—");
        setKpi("torso", m.torso != null ? fmt(m.torso) : "—");
        setKpi("stab", m.stab != null ? fmtStab(m.stab) : "—");

        const advice = buildStepByStepAdvice(session, m);
        lastInstructor = { title: advice.title, text: advice.text, ts: now() };
        setHint(advice.title, advice.text);

        dbg(`ok (side=${m.side})`);
      });

      // Camera utils (z CDN)
      cam = new window.Camera(videoEl, {
        onFrame: async () => {
          if (!pose || !running) return;
          await pose.send({ image: videoEl });
        },
        width: canvasEl.width,
        height: canvasEl.height
      });

      await cam.start();
      dbg("kamera działa");
    } catch (e) {
      running = false;
      setStatus("OFF", false);
      dbg("błąd: " + (e?.message || e));
      setHint("Brak kamery", "Sprawdź zezwolenia (kłódka), zamknij Teams/Zoom/OBS i spróbuj ponownie.");
      try { stop(); } catch {}
      alert("Nie mogę uruchomić kamery: " + (e?.message || e));
    }
  }

  function stop() {
    running = false;
    setStatus("OFF", false);
    dbg("stop");

    try { cam && cam.stop(); } catch {}
    cam = null;

    try { pose && pose.close && pose.close(); } catch {}
    pose = null;

    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      stream = null;
    }

    // wyczyść KPI
    lastMetrics = { knee: null, elbow: null, torso: null, stab: null };
    setKpi("knee", "—");
    setKpi("elbow", "—");
    setKpi("torso", "—");
    setKpi("stab", "—");
  }

  function getLastMetrics() {
    return lastMetrics;
  }

  function snapshot() {
    // zapisujemy obraz z canvasa (wideo + overlay)
    try {
      return canvasEl.toDataURL("image/jpeg", 0.85);
    } catch {
      return null;
    }
  }

  function getLastInstructor() {
    return lastInstructor;
  }

  return {
    start,
    stop,
    getLastMetrics,
    snapshot,
    getLastInstructor
  };
}
