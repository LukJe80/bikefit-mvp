import { presets, toLabelDiscipline, toLabelGoal } from "./presets.js";

function fmtNum(x){
  if(x==null || !isFinite(x)) return "—";
  return (Math.round(x*10)/10).toFixed(1) + "°";
}
function fmtDate(ts){
  try{
    const d = new Date(ts);
    return d.toLocaleString();
  }catch(e){ return ""; }
}

function renderSetup(session){
  const s = session.setup || {};
  const lines = [];
  const add = (label, val) => {
    const v = (val ?? "").toString().trim();
    if(v) lines.push(`<b>${label}:</b> ${escapeHtml(v)}`);
  };

  add("Model", s.bikeModel);
  add("Rozmiar ramy", s.frameSize);
  add("Mostek (mm)", s.stemLen);
  add("Kąt mostka (°)", s.stemAng);
  add("Kierownica (mm)", s.barWidth);
  add("Wys. kierownicy (mm)", s.barHeight);
  add("Wys. siodła (mm)", s.saddleHeight);
  add("Setback siodła (mm)", s.saddleSetback);
  add("Kąt siodła (°)", s.saddleTilt);
  add("Korby (mm)", s.crankLen);
  add("Uwagi", s.setupNotes);

  if(!lines.length) return "Brak danych o rowerze klienta (opcjonalne).";
  return lines.join("<br>");
}

function renderChanges(session){
  const arr = Array.isArray(session.changes) ? session.changes : [];
  if(!arr.length) return "Brak zapisanych zmian (opcjonalne).";
  const items = arr
    .slice()
    .sort((a,b)=> (a.ts||0)-(b.ts||0))
    .map(ch => `• ${escapeHtml(ch.text || "")} <span style="opacity:.7">(${escapeHtml(fmtDate(ch.ts||0))})</span>`);
  return items.join("<br>");
}

function escapeHtml(s){
  return String(s)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

function fillSelect(sel, arr){
  sel.innerHTML = "";
  const opt0 = document.createElement("option");
  opt0.value = "";
  opt0.textContent = "— wybierz —";
  sel.appendChild(opt0);
  for(const m of arr){
    const o = document.createElement("option");
    o.value = m.id;
    o.textContent = `${m.label} • ${fmtDate(m.ts)}`;
    sel.appendChild(o);
  }
}

function getById(arr, id){
  return arr.find(x => x.id === id) || null;
}

function buildReco(before, after, discipline, goal){
  if(!before || !after) return "Zapisz pomiary PRZED i PO, aby zobaczyć porównanie i rekomendacje.";

  const p = presets[discipline]?.[goal] || null;
  const lines = [];

  const diff = (a,b) => (a==null||b==null) ? null : (b-a);

  const dk = diff(before.knee, after.knee);
  const de = diff(before.elbow, after.elbow);
  const dt = diff(before.torso, after.torso);

  lines.push(`<b>PRZED:</b> kolano ${fmtNum(before.knee)}, łokieć ${fmtNum(before.elbow)}, tułów ${fmtNum(before.torso)}`);
  lines.push(`<b>PO:</b> kolano ${fmtNum(after.knee)}, łokieć ${fmtNum(after.elbow)}, tułów ${fmtNum(after.torso)}`);

  if(p){
    lines.push(`<br><b>Zakresy (preset):</b> kolano ${p.knee.min}–${p.knee.max}°, łokieć ${p.elbow.min}–${p.elbow.max}°, tułów ${p.torso.min}–${p.torso.max}°`);
  }

  if(dk!=null) lines.push(`• Zmiana kolana: ${dk>0?"+":""}${(Math.round(dk*10)/10).toFixed(1)}°`);
  if(de!=null) lines.push(`• Zmiana łokcia: ${de>0?"+":""}${(Math.round(de*10)/10).toFixed(1)}°`);
  if(dt!=null) lines.push(`• Zmiana tułowia: ${dt>0?"+":""}${(Math.round(dt*10)/10).toFixed(1)}°`);

  lines.push(`<br><b>Wskazówka:</b> Traktuj to jako szybki raport „PRZED/PO”. Docelowo dołożymy więcej metryk (np. łuk pleców, kąt stopy).`);
  return lines.join("<br>");
}

export function renderReportUI(session, ui){
  ui.rClient.textContent = session.client?.name || "—";
  ui.rDate.textContent = session.client?.date || "—";
  ui.rBike.textContent = `${toLabelDiscipline(session.bike?.discipline)} • ${toLabelGoal(session.bike?.goal)}`;
  ui.rNotes.textContent = session.client?.notes || "—";

  // setup + changes
  ui.rSetup.innerHTML = renderSetup(session);
  ui.rChanges.innerHTML = renderChanges(session);

  const arr = session.measurements || [];
  fillSelect(ui.beforeSel, arr);
  fillSelect(ui.afterSel, arr);

  function renderShot(which, m){
    const meta = which==="before" ? ui.beforeMeta : ui.afterMeta;
    const img  = which==="before" ? ui.beforeImg  : ui.afterImg;
    const ang  = which==="before" ? ui.beforeAngles : ui.afterAngles;

    if(!m){
      meta.textContent = "—";
      img.removeAttribute("src");
      img.style.display = "none";      // <-- brak ikony broken-image
      ang.textContent = "—";
      return;
    }

    meta.textContent = `${m.label} • ${fmtDate(m.ts)}`;
    if(m.imgDataUrl){
      img.src = m.imgDataUrl;
      img.style.display = "block";
    }else{
      img.removeAttribute("src");
      img.style.display = "none";
    }
    ang.textContent = `kolano ${fmtNum(m.knee)} | łokieć ${fmtNum(m.elbow)} | tułów ${fmtNum(m.torso)} | stabilność ${m.stab!=null ? Math.round(m.stab*100)+"%" : "—"}`;
  }

  function recompute(){
    const b = getById(arr, ui.beforeSel.value);
    const a = getById(arr, ui.afterSel.value);
    renderShot("before", b);
    renderShot("after", a);
    ui.recoList.innerHTML = buildReco(b, a, session.bike?.discipline, session.bike?.goal);
  }

  ui.beforeSel.onchange = recompute;
  ui.afterSel.onchange = recompute;

  // domyślne wybory
  if(arr.length >= 2){
    ui.beforeSel.value = arr[0].id;
    ui.afterSel.value = arr[1].id;
  }
  recompute();
}
