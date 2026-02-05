import { presets, toLabelDiscipline, toLabelGoal } from "./presets.js";

function fmtDate(ts){
  const d = new Date(ts);
  return d.toLocaleString("pl-PL", {
    year:"numeric", month:"2-digit", day:"2-digit",
    hour:"2-digit", minute:"2-digit"
  });
}

function angleText(m){
  const k = (m.knee==null ? "—" : (Math.round(m.knee)+"°"));
  const e = (m.elbow==null ? "—" : (Math.round(m.elbow)+"°"));
  const t = (m.torso==null ? "—" : (Math.round(m.torso)+"°"));
  const s = (isFinite(m.stab) ? (m.stab+"%") : "—");
  return `Kolano: ${k} • Łokieć: ${e} • Tułów: ${t} • Stabilność: ${s}`;
}

function presetText(m){
  const p = m.preset;
  if(!p || !p.knee || !p.elbow || !p.torso) return "";
  return `Progi: kolano ${p.knee[0]}–${p.knee[1]}°, łokieć ${p.elbow[0]}–${p.elbow[1]}°, tułów ${p.torso[0]}–${p.torso[1]}°.`;
}

function instructorText(m){
  const title = (m.instructorTitle || "").trim();
  const text  = (m.instructorText || "").trim();
  if(!title && !text) return "";
  if(title && text) return `Instruktor: ${title} — ${text}`;
  return `Instruktor: ${title || text}`;
}

function changeText(m){
  const c = m.change;
  if(!c) return "";

  const parts = [];
  if(c.saddleH != null) parts.push(`Siodło: ${c.saddleH>0?"+":""}${c.saddleH} mm`);
  if(c.saddleFB != null) parts.push(`Siodło przód/tył: ${c.saddleFB>0?"+":""}${c.saddleFB} mm`);
  if(c.cockpitH != null) parts.push(`Kokpit: ${c.cockpitH>0?"+":""}${c.cockpitH} mm`);
  if(c.stem != null) parts.push(`Mostek: ${c.stem>0?"+":""}${c.stem} mm`);

  const head = parts.length ? ("Zmiany: " + parts.join(" • ")) : "Zmiany: —";
  const note = c.note ? (`Notatka: ${c.note}`) : "";
  return note ? (head + "\n" + note) : head;
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
  const cur = after || session.measurements[session.measurements.length-1] || null;

  if(before && after){
    if(before.knee!=null && after.knee!=null){
      const dk = after.knee - before.knee;
      if(Math.abs(dk) >= 2) out.push(`Zmiana kąta kolana: ${dk>0?"+":""}${Math.round(dk)}° (PO vs PRZED).`);
    }
    if(before.elbow!=null && after.elbow!=null){
      const de = after.elbow - before.elbow;
      if(Math.abs(de) >= 2) out.push(`Zmiana kąta łokcia: ${de>0?"+":""}${Math.round(de)}° (PO vs PRZED).`);
    }
    if(before.torso!=null && after.torso!=null){
      const dt = after.torso - before.torso;
      if(Math.abs(dt) >= 2) out.push(`Zmiana kąta tułowia: ${dt>0?"+":""}${Math.round(dt)}° (PO vs PRZED).`);
    }
  }

  // Zmiany mechaniczne (jeśli zapisane)
  if(after && after.change){
    const ct = changeText(after);
    if(ct) out.push(ct.replace(/\n/g, " • "));
  }

  // Instruktor PRZED/PO
  if(before){
    const it = instructorText(before);
    if(it) out.push(`PRZED → ${it.replace("Instruktor: ","")}`);
  }
  if(after){
    const it = instructorText(after);
    if(it) out.push(`PO → ${it.replace("Instruktor: ","")}`);
  }

  // fallback: progi + proste sugestie, gdyby ktoś nie miał instrukcji
  if(cur){
    const p = (cur.preset && cur.preset.knee) ? cur.preset : presets(session.bike.discipline, session.bike.goal);

    if(cur.knee!=null){
      if(cur.knee < p.knee[0]) out.push("Siodło prawdopodobnie za nisko → podnieś 3–5 mm i re-test.");
      else if(cur.knee > p.knee[1]) out.push("Siodło prawdopodobnie za wysoko → opuść 3–5 mm i re-test.");
      else out.push("Wysokość siodła wygląda OK (wg kolana).");
    }
    if(cur.elbow!=null){
      if(cur.elbow > p.elbow[1]) out.push("Możliwie za duży reach → krótszy mostek (-10 mm) lub wyżej kokpit (+5–10 mm).");
      else if(cur.elbow < p.elbow[0]) out.push("Pozycja mocno zebrana → jeśli to nie aero, test dłuższy mostek (+10 mm).");
      else out.push("Reach / łokieć wygląda OK.");
    }
    if(cur.torso!=null){
      if(cur.torso < p.torso[0]) out.push("Tułów zbyt agresywny → rozważ wyżej kokpit (+5–10 mm).");
      else if(cur.torso > p.torso[1]) out.push("Tułów zbyt pionowo → jeśli chcesz sportowo, obniż kokpit (5–10 mm).");
    }
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

    els.beforeMeta.textContent = b ? `${b.label} • ${fmtDate(b.ts)} • ${toLabelDiscipline(b.discipline)} • ${toLabelGoal(b.goal)}` : "—";
    els.afterMeta.textContent  = a ? `${a.label} • ${fmtDate(a.ts)} • ${toLabelDiscipline(a.discipline)} • ${toLabelGoal(a.goal)}` : "—";

    els.beforeImg.src = (b && b.imgDataUrl) ? b.imgDataUrl : "";
    els.afterImg.src  = (a && a.imgDataUrl) ? a.imgDataUrl : "";

    const bLines = [];
    const aLines = [];

    if(b){
      bLines.push(angleText(b));
      const pt = presetText(b);
      if(pt) bLines.push(pt);
      const it = instructorText(b);
      if(it) bLines.push(it);
      const ct = changeText(b);
      if(ct) bLines.push(ct);
    }
    if(a){
      aLines.push(angleText(a));
      const pt = presetText(a);
      if(pt) aLines.push(pt);
      const it = instructorText(a);
      if(it) aLines.push(it);
      const ct = changeText(a);
      if(ct) aLines.push(ct);
    }

    els.beforeAngles.textContent = b ? bLines.join("\n") : "—";
    els.afterAngles.textContent  = a ? aLines.join("\n") : "—";

    els.recoList.innerHTML = renderReco(session, b, a);
  }

  els.beforeSel.onchange = updateCompare;
  els.afterSel.onchange = updateCompare;
  updateCompare();
}
