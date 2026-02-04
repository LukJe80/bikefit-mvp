import { presets, toLabelDiscipline, toLabelGoal } from "./presets.js";

function fmtDate(ts){
  const d = new Date(ts);
  return d.toLocaleString("pl-PL", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" });
}
function angleText(m){
  const k = (m.knee==null ? "—" : (Math.round(m.knee)+"°"));
  const e = (m.elbow==null ? "—" : (Math.round(m.elbow)+"°"));
  const t = (m.torso==null ? "—" : (Math.round(m.torso)+"°"));
  const s = (isFinite(m.stab) ? (m.stab+"%") : "—");
  return `Kolano: ${k} • Łokieć: ${e} • Tułów: ${t} • Stabilność: ${s}`;
}

function fillSelect(sel, measurements){
  sel.innerHTML = "";
  if(!measurements.length){
    const opt = document.createElement("option");
    opt.value = "";
    opt.textContent = "Brak pomiarów";
    sel.appendChild(opt);
    sel.disabled = true;
    return;
  }
  sel.disabled = false;
  measurements.forEach((m, idx) => {
    const opt = document.createElement("option");
    opt.value = m.id;
    opt.textContent = `${idx+1}. ${m.label} • ${fmtDate(m.ts)}`;
    sel.appendChild(opt);
  });
}

function getMeasurementById(session, id){
  return session.measurements.find(m => m.id === id) || null;
}

function renderReco(session, before, after){
  const out = [];
  const p = presets(session.bike.discipline, session.bike.goal);
  const cur = after || session.measurements[session.measurements.length-1] || null;

  if(before && after){
    if(before.knee!=null && after.knee!=null){
      const dk = after.knee - before.knee;
      if(Math.abs(dk) >= 2) out.push(`Zmiana kąta kolana: ${dk>0?"+":""}${Math.round(dk)}° (po).`);
    }
    if(before.elbow!=null && after.elbow!=null){
      const de = after.elbow - before.elbow;
      if(Math.abs(de) >= 2) out.push(`Zmiana kąta łokcia: ${de>0?"+":""}${Math.round(de)}° (po).`);
    }
  }

  if(cur && cur.knee!=null){
    if(cur.knee < p.knee[0]) out.push("Siodło prawdopodobnie za nisko → podnieś 3–5 mm i re-test.");
    else if(cur.knee > p.knee[1]) out.push("Siodło prawdopodobnie za wysoko → opuść 3–5 mm i re-test.");
    else out.push("Wysokość siodła wygląda OK (wg kolana).");
  }
  if(cur && cur.elbow!=null){
    if(cur.elbow > p.elbow[1]) out.push("Możliwie za duży reach → krótszy mostek (-10 mm) lub wyżej kokpit (+5–10 mm).");
    else if(cur.elbow < p.elbow[0]) out.push("Pozycja mocno zebrana → jeśli to nie aero, test dłuższy mostek (+10 mm).");
    else out.push("Reach / łokieć wygląda OK.");
  }

  if(!out.length) return "Brak danych — zrób pomiary w LIVE i zapisz „PRZED” i „PO”.";
  return "<ul style='margin:8px 0 0 18px;'>" + out.map(x=>`<li>${x}</li>`).join("") + "</ul>";
}

export function renderReportUI(session, els){
  els.rClient.textContent = session.client.name || "—";
  els.rDate.textContent = session.client.date || "—";
  els.rBike.textContent = `${toLabelDiscipline(session.bike.discipline)} • ${toLabelGoal(session.bike.goal)}`;
  els.rNotes.textContent = session.client.notes ? session.client.notes : "—";

  fillSelect(els.beforeSel, session.measurements);
  fillSelect(els.afterSel, session.measurements);

  if(session.measurements.length >= 1){
    els.beforeSel.value = session.measurements[0].id;
    els.afterSel.value = session.measurements[session.measurements.length-1].id;
  }

  function updateCompare(){
    const b = getMeasurementById(session, els.beforeSel.value);
    const a = getMeasurementById(session, els.afterSel.value);

    els.beforeMeta.textContent = b ? `${b.label} • ${fmtDate(b.ts)}` : "—";
    els.afterMeta.textContent = a ? `${a.label} • ${fmtDate(a.ts)}` : "—";

    els.beforeImg.src = (b && b.imgDataUrl) ? b.imgDataUrl : "";
    els.afterImg.src = (a && a.imgDataUrl) ? a.imgDataUrl : "";

    els.beforeAngles.textContent = b ? angleText(b) : "—";
    els.afterAngles.textContent = a ? angleText(a) : "—";

    els.recoList.innerHTML = renderReco(session, b, a);
  }

  els.beforeSel.onchange = updateCompare;
  els.afterSel.onchange = updateCompare;
  updateCompare();
}