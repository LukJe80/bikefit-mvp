import { toLabelDiscipline, toLabelGoal } from "./presets.js";

function fmtDeg(v){
  if(v === null || v === undefined || !Number.isFinite(Number(v))) return "—";
  return `${Number(v).toFixed(1)}°`;
}
function fmtNum(v){
  if(v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if(!Number.isFinite(n)) return String(v);
  return `${n}`;
}

function listMeasurements(session){
  return (session.measurements || []).slice().sort((a,b)=>a.ts-b.ts);
}

function buildSetupLines(setup){
  if(!setup) return [];
  const lines = [];
  const add = (label, value, unit="") => {
    if(value === null || value === undefined) return;
    const s = String(value).trim();
    if(!s) return;
    lines.push({ label, value: s + unit });
  };

  add("Model / marka", setup.bikeModel);
  add("Rozmiar ramy", setup.frameSize);
  add("Reach (ramy)", setup.frameReach, setup.frameReach ? " mm" : "");
  add("Stack (ramy)", setup.frameStack, setup.frameStack ? " mm" : "");

  add("Mostek – długość", setup.stemLength, setup.stemLength ? " mm" : "");
  add("Mostek – kąt", setup.stemAngle, setup.stemAngle ? "°" : "");

  add("Kierownica – szerokość", setup.handlebarWidth, setup.handlebarWidth ? " mm" : "");
  add("Kierownica – wysokość (opis)", setup.handlebarHeight);

  add("Siodło – model", setup.saddleModel);
  add("Wysokość siodła (od suportu)", setup.saddleHeight, setup.saddleHeight ? " mm" : "");
  add("Offset sztycy", setup.seatpostOffset, setup.seatpostOffset ? " mm" : "");
  add("Długość korby", setup.crankLength, setup.crankLength ? " mm" : "");

  return lines;
}

function renderSetup(el, setup){
  if(!el) return;
  const lines = buildSetupLines(setup);
  if(lines.length === 0){
    el.innerHTML = `<div class="small">Brak danych o rowerze klienta (opcjonalne).</div>`;
    return;
  }
  el.innerHTML = `
    <div class="setupGrid" style="margin-top:8px;">
      <div class="setupBlock">
        <div class="hmini">Rama / geometria</div>
        ${lines.filter(x=>["Model / marka","Rozmiar ramy","Reach (ramy)","Stack (ramy)"].includes(x.label))
          .map(x=>`<div class="small"><b>${x.label}:</b> ${x.value}</div>`).join("")}
      </div>
      <div class="setupBlock">
        <div class="hmini">Kokpit</div>
        ${lines.filter(x=>x.label.startsWith("Mostek") || x.label.startsWith("Kierownica"))
          .map(x=>`<div class="small"><b>${x.label}:</b> ${x.value}</div>`).join("")}
      </div>
      <div class="setupBlock">
        <div class="hmini">Siodło / napęd</div>
        ${lines.filter(x=>x.label.startsWith("Siodło") || x.label.startsWith("Wysokość siodła") || x.label.startsWith("Offset") || x.label.startsWith("Długość korby"))
          .map(x=>`<div class="small"><b>${x.label}:</b> ${x.value}</div>`).join("")}
      </div>
    </div>
  `;
}

function makeOption(m){
  const d = new Date(m.ts);
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  return `${m.label} • ${hh}:${mm}`;
}

function setShotUI(m, metaEl, imgEl, anglesEl){
  if(!m){
    metaEl.textContent = "—";
    imgEl.removeAttribute("src");
    anglesEl.textContent = "—";
    return;
  }

  const d = new Date(m.ts);
  const dt = d.toLocaleString();

  const change = m.change ? [
    (m.change.saddleH!=null ? `Siodło ↑/↓: ${m.change.saddleH} mm` : null),
    (m.change.saddleFB!=null ? `Siodło przód/tył: ${m.change.saddleFB} mm` : null),
    (m.change.cockpitH!=null ? `Kokpit ↑/↓: ${m.change.cockpitH} mm` : null),
    (m.change.stem!=null ? `Mostek: ${m.change.stem} mm` : null),
    (m.change.note ? `Notatka: ${m.change.note}` : null),
  ].filter(Boolean).join(" • ") : "";

  metaEl.textContent = `${dt}${change ? " • " + change : ""}`;
  if(m.imgDataUrl) imgEl.src = m.imgDataUrl;

  const preset = m.preset ? ` (cel: kolano ${m.preset.knee[0]}–${m.preset.knee[1]}°, łokieć ${m.preset.elbow[0]}–${m.preset.elbow[1]}°, tułów ${m.preset.torso[0]}–${m.preset.torso[1]}°)` : "";
  anglesEl.textContent = `Kolano: ${fmtDeg(m.knee)} • Łokieć: ${fmtDeg(m.elbow)} • Tułów: ${fmtDeg(m.torso)} • Stabilność: ${fmtNum(m.stab?.toFixed?.(2) ?? m.stab)}${preset}`;
}

function simpleReco(before, after){
  if(!before || !after) return ["Zapisz pomiary PRZED i PO, aby zobaczyć porównanie i rekomendacje."];
  const out = [];

  const delta = (a,b)=> (Number.isFinite(a) && Number.isFinite(b)) ? (b-a) : null;
  const dk = delta(before.knee, after.knee);
  const de = delta(before.elbow, after.elbow);
  const dt = delta(before.torso, after.torso);

  if(dk != null) out.push(`Kąt kolana: ${fmtDeg(before.knee)} → ${fmtDeg(after.knee)} (zmiana ${dk>0?"+":""}${dk.toFixed(1)}°)`);
  if(de != null) out.push(`Kąt łokcia: ${fmtDeg(before.elbow)} → ${fmtDeg(after.elbow)} (zmiana ${de>0?"+":""}${de.toFixed(1)}°)`);
  if(dt != null) out.push(`Kąt tułowia: ${fmtDeg(before.torso)} → ${fmtDeg(after.torso)} (zmiana ${dt>0?"+":""}${dt.toFixed(1)}°)`);

  if(after.change){
    const c = after.change;
    const lines = [];
    if(c.saddleH!=null) lines.push(`Siodło ↑/↓: ${c.saddleH} mm`);
    if(c.saddleFB!=null) lines.push(`Siodło przód/tył: ${c.saddleFB} mm`);
    if(c.cockpitH!=null) lines.push(`Kokpit ↑/↓: ${c.cockpitH} mm`);
    if(c.stem!=null) lines.push(`Mostek: ${c.stem} mm`);
    if(lines.length) out.push(`Wykonane zmiany: ${lines.join(" • ")}`);
    if(c.note) out.push(`Notatka: ${c.note}`);
  }

  if(after.instructorTitle || after.instructorText){
    out.push(`Instruktor (PO): ${after.instructorTitle ? after.instructorTitle + " — " : ""}${after.instructorText || ""}`);
  }

  return out.length ? out : ["Brak danych do porównania."];
}

export function renderReportUI(session, els){
  els.rClient.textContent = session.client?.name || "—";
  els.rDate.textContent = session.client?.date || "—";
  els.rBike.textContent = `${toLabelDiscipline(session.bike?.discipline)} • ${toLabelGoal(session.bike?.goal)}`;
  els.rNotes.textContent = session.client?.notes || "—";

  renderSetup(els.rSetup, session.bikeSetup);

  const ms = listMeasurements(session);

  const fillSel = (sel) => {
    sel.innerHTML = "";
    for(const m of ms){
      const opt = document.createElement("option");
      opt.value = m.id;
      opt.textContent = makeOption(m);
      sel.appendChild(opt);
    }
  };

  fillSel(els.beforeSel);
  fillSel(els.afterSel);

  const findByLabel = (lbl) => ms.find(x=>x.label===lbl);
  const beforeDefault = findByLabel("PRZED") || ms[0];
  const afterDefault = findByLabel("PO") || (ms.length>1 ? ms[1] : ms[0]);

  if(beforeDefault) els.beforeSel.value = beforeDefault.id;
  if(afterDefault) els.afterSel.value = afterDefault.id;

  const byId = (id)=> ms.find(x=>x.id===id) || null;

  function update(){
    const b = byId(els.beforeSel.value);
    const a = byId(els.afterSel.value);

    setShotUI(b, els.beforeMeta, els.beforeImg, els.beforeAngles);
    setShotUI(a, els.afterMeta, els.afterImg, els.afterAngles);

    const reco = simpleReco(b,a);
    els.recoList.innerHTML = `<ul>${reco.map(x=>`<li>${x}</li>`).join("")}</ul>`;
  }

  els.beforeSel.onchange = update;
  els.afterSel.onchange = update;
  update();
}
