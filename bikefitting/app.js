import { presets, toLabelDiscipline, toLabelGoal } from "./presets.js";
import { createLiveController } from "./live.js";
import { renderReportUI } from "./report.js";

const AUTH_KEY = "bikefit_auth";
const SESSION_KEY = "bikefit_session_mod_v1";

function defaultSession(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');
  return {
    client: { name:"", date:`${yyyy}-${mm}-${dd}`, notes:"" },
    body: { heightCm:"", inseamCm:"", footCm:"", armsCm:"" },
    bike: { discipline:"road", goal:"neutral" },
    bikeSetup: {
      bikeModel:"",
      frameSize:"",
      stemLen:"",
      stemAngle:"",
      barWidth:"",
      barHeight:"",
      saddleModel:"",
      saddleHeight:"",
      saddleSetback:"",
      saddleTilt:"",
      crankLen:"",
      qFactor:"",
      cleatForeAft:"",
      cleatLateral:"",
      bikeNotes:""
    },
    measurements: [],
    diagnostics: []
  };
}

function loadSession(){
  try{
    const raw = localStorage.getItem(SESSION_KEY);
    if(!raw) return defaultSession();
    const s = JSON.parse(raw);
    if(!s || !s.client || !s.body || !s.bike || !Array.isArray(s.measurements)) return defaultSession();
    if(!s.bikeSetup) s.bikeSetup = defaultSession().bikeSetup;
    if(!Array.isArray(s.diagnostics)) s.diagnostics = [];
    return s;
  }catch(e){
    return defaultSession();
  }
}
let session = loadSession();

function saveSession(){
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  updateBadge();
}

function uuid(){
  return Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function $(id){ return document.getElementById(id); }
function el(id){ return document.getElementById(id); }
function setVal(id, v){ const e = el(id); if(e) e.value = (v ?? ""); }
function on(id, ev, fn){ const e = el(id); if(e) e.addEventListener(ev, fn); }

const STEPS = [
  { id:"client", name:"Klient" },
  { id:"anthro", name:"Antropometria" },
  { id:"bike", name:"Bike / Dyscyplina" },
  { id:"live", name:"Bikefitting LIVE" },
  { id:"measure", name:"Pomiary" },
  { id:"report", name:"Raport" }
];
let currentStep = "client";

/* TOP BAR */
$("logoutBtn").addEventListener("click", () => {
  localStorage.removeItem(AUTH_KEY);
  location.replace("/");
});

const statusEl = $("status");
const dotEl = $("dot");
function setStatus(txt, on){
  statusEl.textContent = txt;
  dotEl.classList.toggle("on", !!on);
}

/* badge */
function updateBadge(){
  const b = $("badge");
  const txt = `${toLabelDiscipline(session.bike.discipline)} • ${toLabelGoal(session.bike.goal)}`;
  const visible = (["bike","live","report"].includes(currentStep));
  b.style.display = visible ? "inline-flex" : "none";
  b.textContent = txt;
}

/* steps bar */
function renderStepsBar(){
  const bar = $("stepsBar");
  bar.innerHTML = "";
  for(const s of STEPS){
    const tag = document.createElement("div");
    tag.className = "stepTag" + (s.id===currentStep ? " active" : "");
    tag.textContent = s.name;
    tag.onclick = () => showStep(s.id);
    bar.appendChild(tag);
  }
}

function showStep(id){
  currentStep = id;
  for(const s of STEPS){
    const el = $("step-"+s.id);
    if(el) el.style.display = (s.id===id) ? "" : "none";
  }
  renderStepsBar();
  updateBadge();

  if(id==="measure"){
    renderMeasure();
  }

  if(id==="report"){
    renderReport();
  }
}

/* bind inputs */
function bindInputs(){
  // klient
  setVal("clientName", session.client.name || "");
  setVal("sessionDate", session.client.date || "");
  setVal("clientNotes", session.client.notes || "");

  on("clientName","input", () => { session.client.name = (el("clientName")?.value || ""); saveSession(); });
  on("sessionDate","input", () => { session.client.date = (el("sessionDate")?.value || ""); saveSession(); });
  on("clientNotes","input", () => { session.client.notes = (el("clientNotes")?.value || ""); saveSession(); });

  // antropometria
  setVal("heightCm", session.body.heightCm || "");
  setVal("inseamCm", session.body.inseamCm || "");
  setVal("footCm", session.body.footCm || "");
  setVal("armsCm", session.body.armsCm || "");

  on("heightCm","input", () => { session.body.heightCm = (el("heightCm")?.value || ""); saveSession(); });
  on("inseamCm","input", () => { session.body.inseamCm = (el("inseamCm")?.value || ""); saveSession(); });
  on("footCm","input", () => { session.body.footCm = (el("footCm")?.value || ""); saveSession(); });
  on("armsCm","input", () => { session.body.armsCm = (el("armsCm")?.value || ""); saveSession(); });

  // dyscyplina / cel
  if(el("discipline")) el("discipline").value = session.bike.discipline || "road";
  if(el("goal")) el("goal").value = session.bike.goal || "neutral";

  on("discipline","change", () => { session.bike.discipline = (el("discipline")?.value || "road"); saveSession(); });
  on("goal","change", () => { session.bike.goal = (el("goal")?.value || "neutral"); saveSession(); });

  // rower klienta (raport)
  setVal("bikeModel", session.bikeSetup.bikeModel || "");
  setVal("frameSize", session.bikeSetup.frameSize || "");
  setVal("stemLen", session.bikeSetup.stemLen || "");
  setVal("stemAngle", session.bikeSetup.stemAngle || "");
  setVal("barWidth", session.bikeSetup.barWidth || "");
  setVal("barHeight", session.bikeSetup.barHeight || "");
  setVal("saddleModel", session.bikeSetup.saddleModel || "");
  setVal("saddleHeight", session.bikeSetup.saddleHeight || "");
  setVal("saddleSetback", session.bikeSetup.saddleSetback || "");
  setVal("saddleTilt", session.bikeSetup.saddleTilt || "");
  setVal("crankLen", session.bikeSetup.crankLen || "");
  setVal("qFactor", session.bikeSetup.qFactor || "");
  setVal("cleatForeAft", session.bikeSetup.cleatForeAft || "");
  setVal("cleatLateral", session.bikeSetup.cleatLateral || "");
  setVal("bikeNotes", session.bikeSetup.bikeNotes || "");

  on("bikeModel","input", () => { session.bikeSetup.bikeModel = (el("bikeModel")?.value || ""); saveSession(); });
  on("frameSize","input", () => { session.bikeSetup.frameSize = (el("frameSize")?.value || ""); saveSession(); });
  on("stemLen","input", () => { session.bikeSetup.stemLen = (el("stemLen")?.value || ""); saveSession(); });
  on("stemAngle","input", () => { session.bikeSetup.stemAngle = (el("stemAngle")?.value || ""); saveSession(); });
  on("barWidth","input", () => { session.bikeSetup.barWidth = (el("barWidth")?.value || ""); saveSession(); });
  on("barHeight","input", () => { session.bikeSetup.barHeight = (el("barHeight")?.value || ""); saveSession(); });
  on("saddleModel","input", () => { session.bikeSetup.saddleModel = (el("saddleModel")?.value || ""); saveSession(); });
  on("saddleHeight","input", () => { session.bikeSetup.saddleHeight = (el("saddleHeight")?.value || ""); saveSession(); });
  on("saddleSetback","input", () => { session.bikeSetup.saddleSetback = (el("saddleSetback")?.value || ""); saveSession(); });
  on("saddleTilt","input", () => { session.bikeSetup.saddleTilt = (el("saddleTilt")?.value || ""); saveSession(); });
  on("crankLen","input", () => { session.bikeSetup.crankLen = (el("crankLen")?.value || ""); saveSession(); });
  on("qFactor","input", () => { session.bikeSetup.qFactor = (el("qFactor")?.value || ""); saveSession(); });
  on("cleatForeAft","input", () => { session.bikeSetup.cleatForeAft = (el("cleatForeAft")?.value || ""); saveSession(); });
  on("cleatLateral","input", () => { session.bikeSetup.cleatLateral = (el("cleatLateral")?.value || ""); saveSession(); });
  on("bikeNotes","input", () => { session.bikeSetup.bikeNotes = (el("bikeNotes")?.value || ""); saveSession(); });
}

/* nav buttons */
$("toAnthro").onclick = () => showStep("anthro");
$("backClient").onclick = () => showStep("client");
$("toBike").onclick = () => showStep("bike");
$("backAnthro").onclick = () => showStep("anthro");
$("toLive").onclick = () => { saveSession(); showStep("live"); };
$("editBike").onclick = () => showStep("bike");
$("toReport").onclick = () => showStep("report");
$("backLive").onclick = () => showStep("live");

/* LIVE controller */
const hintTitle = $("hintTitle");
const hintText = $("hintText");
const debugEl = $("debug");

function dbg(msg){ debugEl.textContent = "DBG: " + msg; }
function setHint(title, text){
  hintTitle.textContent = title;
  hintText.textContent = text;
}

// “Tabela dla klienta” pod LIVE: lista aktywnych komunikatów jeden pod drugim.
function setClientIssues(issues){
  const ex = el("explainText");
  if(!ex) return;

  if(!Array.isArray(issues) || issues.length===0){
    ex.innerHTML = "";
    return;
  }

  const rows = issues.map((it, idx) => {
    const n = idx + 1;
    return `
      <div style="margin:10px 0; padding:10px 12px; border:1px solid rgba(255,255,255,.12); border-radius:12px;">
        <div style="font-size:15px; line-height:1.2; margin-bottom:6px;"><b>${n}. ${it.title}</b></div>
        <div style="font-size:14px; opacity:.95; line-height:1.35;">${it.text}</div>
      </div>
    `;
  }).join("");

  ex.innerHTML = `
    <div style="font-size:14px; opacity:.9; margin-bottom:10px;">
      <b>Wskazówki (na żywo):</b> ${issues.length} ${issues.length===1 ? "punkt" : "punkty"}
    </div>
    ${rows}
  `;
}
function setKpi(which, val){
  if(which==="knee") $("kneeVal").textContent = val;
  if(which==="elbow") $("elbowVal").textContent = val;
  if(which==="torso") $("torsoVal").textContent = val;
  if(which==="stab") $("stabVal").textContent = val;
}

const live = createLiveController({
  videoEl: $("video"),
  canvasEl: $("canvas"),
  setStatus,
  dbg,
  setHint,
  setClientIssues,
  setKpi
});

$("startBtn").addEventListener("click", () => live.start(session));
$("stopBtn").addEventListener("click", () => live.stop());
$("resetBtn").addEventListener("click", () => live.reset(session));

function suggestLabel(){
  const n = session.measurements.length;
  if(n === 0) return "PRZED";
  if(n === 1) return "PO";
  return "PO " + n;
}

$("saveShot").addEventListener("click", () => {
  const m = live.getLastMetrics();
  if(!m || (!isFinite(m.stab) && m.knee==null)){
    alert("Nie mam danych do zapisania. Uruchom kamerę i poczekaj aż pojawią się punkty.");
    return;
  }
  const img = live.snapshot();
  const label = suggestLabel();
  const ts = Date.now();

  session.measurements.push({
    id: uuid(),
    ts,
    label,
    discipline: session.bike.discipline,
    goal: session.bike.goal,
    knee: m.knee,
    elbow: m.elbow,
    torso: m.torso,
    stab: m.stab,
    imgDataUrl: img
  });
  saveSession();
  alert("Zapisano pomiar: " + label);
});

/* Snapshot → Pomiary (warsztat) */
function diagLabel(){
  const n = session.diagnostics.length + 1;
  return "SNAP " + n;
}

$("toMeasure").addEventListener("click", () => {
  const m = live.getLastMetrics();
  if(!m || (!isFinite(m.stab) && m.knee==null)){
    alert("Nie mam danych do snapshotu. Uruchom kamerę i poczekaj aż pojawią się punkty.");
    return;
  }
  const img = live.snapshot();
  const ts = Date.now();
  session.diagnostics.push({
    id: uuid(),
    ts,
    label: diagLabel(),
    discipline: session.bike.discipline,
    goal: session.bike.goal,
    knee: m.knee,
    elbow: m.elbow,
    torso: m.torso,
    stab: m.stab,
    imgDataUrl: img
  });
  saveSession();
  showStep("measure");
});

$("mBackToLive").addEventListener("click", () => showStep("live"));
$("mClearDiag").addEventListener("click", () => {
  if(!confirm("Wyczyścić pomiary (snapshoty) z kalkulatora?")) return;
  session.diagnostics = [];
  saveSession();
  renderMeasure();
});

function fmt(v){
  if(v==null || !isFinite(v)) return "—";
  return Math.round(v) + "°";
}

function renderMeasure(){
  const last = session.diagnostics[session.diagnostics.length-1];
  const imgEl = $("mImg");
  const emptyEl = $("mEmpty");
  const metaEl = $("mMeta");
  const tableEl = $("mTable");
  if(!last){
    if(imgEl) imgEl.style.display = "none";
    if(emptyEl) emptyEl.style.display = "";
    if(metaEl) metaEl.textContent = "";
    if(tableEl) tableEl.textContent = "";
    return;
  }
  if(imgEl){
    imgEl.src = last.imgDataUrl || "";
    imgEl.style.display = last.imgDataUrl ? "" : "none";
  }
  if(emptyEl) emptyEl.style.display = "none";
  const discTxt = toLabelDiscipline(last.discipline);
  const goalTxt = toLabelGoal(last.goal);
  const dt = new Date(last.ts);
  if(metaEl){
    metaEl.innerHTML = `<b>${last.label}</b> • ${discTxt} • ${goalTxt}<br>${dt.toLocaleString()}`;
  }

  // orientacyjne statusy wg presetów (bez mm)
  const p = presets(last.discipline, last.goal);
  const lines = [];
  if(p){
    if(isFinite(last.knee)){
      const min = p.knee?.[0], max = p.knee?.[1];
      if(isFinite(min) && last.knee < min) lines.push(`Kolano: ${fmt(last.knee)} • poza zakresem (za mało)`);
      else if(isFinite(max) && last.knee > max) lines.push(`Kolano: ${fmt(last.knee)} • poza zakresem (za dużo)`);
      else lines.push(`Kolano: ${fmt(last.knee)} • OK`);
    } else {
      lines.push(`Kolano: —`);
    }

    if(isFinite(last.elbow)){
      const min = p.elbow?.[0], max = p.elbow?.[1];
      if(isFinite(min) && last.elbow < min) lines.push(`Łokieć: ${fmt(last.elbow)} • poza zakresem (za mało)`);
      else if(isFinite(max) && last.elbow > max) lines.push(`Łokieć: ${fmt(last.elbow)} • poza zakresem (za dużo)`);
      else lines.push(`Łokieć: ${fmt(last.elbow)} • OK`);
    } else {
      lines.push(`Łokieć: —`);
    }

    if(isFinite(last.torso)){
      const min = p.torso?.[0], max = p.torso?.[1];
      if(isFinite(min) && last.torso < min) lines.push(`Tułów: ${fmt(last.torso)} • poza zakresem (za pionowo)`);
      else if(isFinite(max) && last.torso > max) lines.push(`Tułów: ${fmt(last.torso)} • poza zakresem (za agresywnie)`);
      else lines.push(`Tułów: ${fmt(last.torso)} • OK`);
    } else {
      lines.push(`Tułów: —`);
    }
  } else {
    lines.push("Brak presetów dla tego profilu.");
    lines.push(`Kolano: ${fmt(last.knee)}`);
    lines.push(`Łokieć: ${fmt(last.elbow)}`);
    lines.push(`Tułów: ${fmt(last.torso)}`);
  }
  lines.push(`Stabilność: ${isFinite(last.stab) ? Math.round(last.stab) + "%" : "—"}`);

  if(tableEl){
    tableEl.innerHTML = lines.map(s => "• " + s).join("<br>");
  }
}


/* Report */
function renderReport(){
  renderReportUI(session, {
    rClient: $("rClient"),
    rDate: $("rDate"),
    rBike: $("rBike"),
    rNotes: $("rNotes"),
    beforeSel: $("beforeSel"),
    afterSel: $("afterSel"),
    beforeMeta: $("beforeMeta"),
    afterMeta: $("afterMeta"),
    beforeImg: $("beforeImg"),
    afterImg: $("afterImg"),
    beforeAngles: $("beforeAngles"),
    afterAngles: $("afterAngles"),
    recoList: $("recoList")
  });
}

$("clearSession").addEventListener("click", () => {
  if(confirm("Na pewno wyczyścić całą sesję (klient + pomiary)?")){
    session = defaultSession();
    saveSession();
    bindInputs();
    alert("Sesja wyczyszczona.");
    showStep("client");
  }
});
$("printBtn").addEventListener("click", () => window.print());

/* init */
bindInputs();
renderStepsBar();
updateBadge();
setStatus("OFF", false);
setHint("Uruchom kamerę", "Kliknij „Start kamery” w kroku LIVE.");
dbg("gotowe.");
showStep("client");
saveSession();