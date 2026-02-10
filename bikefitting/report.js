import { presets, toLabelDiscipline, toLabelGoal } from "./presets.js";

function fmtAngle(x){
  if(x == null || !isFinite(x)) return "—";
  return `${x.toFixed(1)}°`;
}
function fmtPct(x){
  if(x == null || !isFinite(x)) return "—";
  const p = Math.max(0, Math.min(1, x));
  return `${Math.round(p*100)}%`;
}
function fmtDate(ts){
  try{
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2,'0');
    const mm = String(d.getMinutes()).padStart(2,'0');
    return `${hh}:${mm}`;
  }catch(e){ return ""; }
}

function computeReco(before, after){
  if(!before || !after) return [];
  const out = [];

  const dk = (after.knee ?? NaN) - (before.knee ?? NaN);
  const de = (after.elbow ?? NaN) - (before.elbow ?? NaN);
  const dt = (after.torso ?? NaN) - (before.torso ?? NaN);

  if(isFinite(dk) && Math.abs(dk) >= 2){
    out.push(`Kąt kolana zmienił się o ${dk>0?"+":""}${dk.toFixed(1)}°. (wpływ: wysokość siodła)`);
  }
  if(isFinite(de) && Math.abs(de) >= 2){
    out.push(`Kąt łokcia zmienił się o ${de>0?"+":""}${de.toFixed(1)}°. (wpływ: reach / mostek)`);
  }
  if(isFinite(dt) && Math.abs(dt) >= 2){
    out.push(`Kąt tułowia zmienił się o ${dt>0?"+":""}${dt.toFixed(1)}°. (wpływ: drop / kokpit)`);
  }

  if(out.length === 0){
    out.push("Pomiary są bardzo podobne — wygląda na stabilną zmianę lub brak dużej korekty.");
  }
  return out;
}

function fillSelect(sel, measurements){
  sel.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "— wybierz —";
  sel.appendChild(opt0);

  for(const m of measurements){
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `${m.label} • ${fmtDate(m.ts)} • kolano ${fmtAngle(m.knee)} • łokieć ${fmtAngle(m.elbow)} • tułów ${fmtAngle(m.torso)}`;
    sel.appendChild(opt);
  }
}

function pickById(measurements, id){
  return measurements.find(x => x.id === id) || null;
}

function setShotUI(prefix, m, els){
  const metaEl = els[prefix+"Meta"];
  const imgEl = els[prefix+"Img"];
  const angEl = els[prefix+"Angles"];

  if(!m){
    metaEl.textContent = "—";
    imgEl.removeAttribute("src");
    imgEl.style.display = "none";
    angEl.textContent = "—";
    return;
  }

  metaEl.textContent = `${m.label} • ${toLabelDiscipline(m.discipline)} • ${toLabelGoal(m.goal)} • ${fmtDate(m.ts)}`;
  if(m.imgDataUrl){
    imgEl.style.display = "";
    imgEl.src = m.imgDataUrl;
  }else{
    imgEl.removeAttribute("src");
    imgEl.style.display = "none";
  }
  angEl.textContent = `Kolano: ${fmtAngle(m.knee)} • Łokieć: ${fmtAngle(m.elbow)} • Tułów: ${fmtAngle(m.torso)} • Stabilność: ${fmtPct(m.stab)}`;
}

export function renderReportUI(session, els){
  els.rClient.textContent = session.client.name ? session.client.name : "—";
  els.rDate.textContent = session.client.date ? session.client.date : "—";
  els.rBike.textContent = `${toLabelDiscipline(session.bike.discipline)} • ${toLabelGoal(session.bike.goal)}`;
  els.rNotes.textContent = session.client.notes ? session.client.notes : "—";

  // ✅ Rower klienta (opcjonalne pola z kroku Bike)
  if(els.rBikeInfoEmpty && els.rBikeInfoGrid){
    const bi = session.bikeInfo || {};
    const any = Object.values(bi).some(v => (v!=null && String(v).trim()!==""));
    els.rBikeInfoEmpty.style.display = any ? "none" : "";
    els.rBikeInfoGrid.style.display = any ? "" : "none";
    if(any){
      if(els.rBikeModel) els.rBikeModel.textContent = bi.bikeModel || "—";
      if(els.rFrameSize) els.rFrameSize.textContent = bi.frameSize || "—";
      if(els.rSaddleHeight) els.rSaddleHeight.textContent = bi.saddleHeightMm || "—";
      if(els.rSaddleSetback) els.rSaddleSetback.textContent = bi.saddleSetbackMm || "—";
      if(els.rSaddleTilt) els.rSaddleTilt.textContent = bi.saddleTiltDeg || "—";
      if(els.rCrank) els.rCrank.textContent = bi.crankLengthMm || "—";
      if(els.rStem) els.rStem.textContent = `${bi.stemLengthMm || "—"} / ${bi.stemAngleDeg || "—"}`;
      if(els.rBarWidth) els.rBarWidth.textContent = bi.barWidthMm || "—";
      if(els.rBarHeight) els.rBarHeight.textContent = bi.barHeightFromAxleMm || "—";
      if(els.rBikeNotes) els.rBikeNotes.textContent = bi.bikeNotes || "—";
    }
  }

  const ms = session.measurements || [];
  fillSelect(els.beforeSel, ms);
  fillSelect(els.afterSel, ms);

  const state = {
    beforeId: els.beforeSel.value || "",
    afterId: els.afterSel.value || ""
  };

  const sync = () => {
    const before = pickById(ms, els.beforeSel.value);
    const after = pickById(ms, els.afterSel.value);

    setShotUI("before", before, els);
    setShotUI("after", after, els);

    const reco = computeReco(before, after);
    els.recoList.innerHTML = reco.map(x => `<div>• ${x}</div>`).join("");
  };

  els.beforeSel.onchange = sync;
  els.afterSel.onchange = sync;

  // auto-podpowiedź: jeśli są >=2 pomiary, ustaw 1 i 2 jako before/after
  if(ms.length >= 2 && (!state.beforeId && !state.afterId)){
    els.beforeSel.value = ms[0].id;
    els.afterSel.value = ms[1].id;
  }

  sync();
}