import { toLabelDiscipline, toLabelGoal } from "./presets.js";
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

    // INFO do raportu (nie wpływa na obliczenia)
    setup: {
      bikeModel:"",
      frameSize:"",
      stemLen:"",
      stemAng:"",
      barWidth:"",
      barHeight:"",
      saddleHeight:"",
      saddleSetback:"",
      saddleTilt:"",
      crankLen:"",
      setupNotes:""
    },

    // lista zmian w trakcie sesji (do raportu)
    changes: [],

    measurements: []
  };
}

function loadSession(){
  try{
    const raw = localStorage.getItem(SESSION_KEY);
    if(!raw) return defaultSession();
    const s = JSON.parse(raw);

    // migracja / domyślne pola
    const d = defaultSession();
    const out = { ...d, ...s };
    out.client = { ...d.client, ...(s.client||{}) };
    out.body   = { ...d.body, ...(s.body||{}) };
    out.bike   = { ...d.bike, ...(s.bike||{}) };
    out.setup  = { ...d.setup, ...(s.setup||{}) };
    out.changes = Array.isArray(s.changes) ? s.changes : [];
    out.measurements = Array.isArray(s.measurements) ? s.measurements : [];
    return out;
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

const STEPS = [
  { id:"client", name:"Klient" },
  { id:"anthro", name:"Antropometria" },
  { id:"bike", name:"Bike / Dyscyplina" },
  { id:"live", name:"Bikefitting LIVE" },
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

  if(id==="report"){
    renderReport();
  }
}

/* bind inputs */
function bindInputs(){
  // client
  $("clientName").value = session.client.name || "";
  $("sessionDate").value = session.client.date || "";
  $("clientNotes").value = session.client.notes || "";

  // body
  $("heightCm").value = session.body.heightCm || "";
  $("inseamCm").value = session.body.inseamCm || "";
  $("footCm").value = session.body.footCm || "";
  $("armsCm").value = session.body.armsCm || "";

  // bike
  $("discipline").value = session.bike.discipline || "road";
  $("goal").value = session.bike.goal || "neutral";

  // setup
  $("bikeModel").value = session.setup.bikeModel || "";
  $("frameSize").value = session.setup.frameSize || "";
  $("stemLen").value = session.setup.stemLen || "";
  $("stemAng").value = session.setup.stemAng || "";
  $("barWidth").value = session.setup.barWidth || "";
  $("barHeight").value = session.setup.barHeight || "";
  $("saddleHeight").value = session.setup.saddleHeight || "";
  $("saddleSetback").value = session.setup.saddleSetback || "";
  $("saddleTilt").value = session.setup.saddleTilt || "";
  $("crankLen").value = session.setup.crankLen || "";
  $("setupNotes").value = session.setup.setupNotes || "";

  // listeners
  $("clientName").addEventListener("input", () => { session.client.name = $("clientName").value; saveSession(); });
  $("sessionDate").addEventListener("input", () => { session.client.date = $("sessionDate").value; saveSession(); });
  $("clientNotes").addEventListener("input", () => { session.client.notes = $("clientNotes").value; saveSession(); });

  $("heightCm").addEventListener("input", () => { session.body.heightCm = $("heightCm").value; saveSession(); });
  $("inseamCm").addEventListener("input", () => { session.body.inseamCm = $("inseamCm").value; saveSession(); });
  $("footCm").addEventListener("input", () => { session.body.footCm = $("footCm").value; saveSession(); });
  $("armsCm").addEventListener("input", () => { session.body.armsCm = $("armsCm").value; saveSession(); });

  $("discipline").addEventListener("change", () => { session.bike.discipline = $("discipline").value; saveSession(); });
  $("goal").addEventListener("change", () => { session.bike.goal = $("goal").value; saveSession(); });

  // setup fields
  const map = [
    ["bikeModel","bikeModel"], ["frameSize","frameSize"],
    ["stemLen","stemLen"], ["stemAng","stemAng"],
    ["barWidth","barWidth"], ["barHeight","barHeight"],
    ["saddleHeight","saddleHeight"], ["saddleSetback","saddleSetback"],
    ["saddleTilt","saddleTilt"], ["crankLen","crankLen"],
    ["setupNotes","setupNotes"]
  ];
  for(const [id,key] of map){
    $(id).addEventListener("input", () => { session.setup[key] = $(id).value; saveSession(); });
  }
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
  setKpi
});

$("startBtn").addEventListener("click", () => live.start(session));
$("stopBtn").addEventListener("click", () => live.stop());

function suggestLabel(){
  const n = session.measurements.length;
  if(n === 0) return "PRZED";
  if(n === 1) return "PO";
  return "PO " + n;
}

$("saveShot").addEventListener("click", () => {
  const m = live.getLastMetrics();
  if(!m || (!isFinite(m.stab) && m.knee==null)){
    alert("Nie mam danych do zapisania. Uruchom kamerę i poczekaj aż pojawią się dane.");
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

/* ZMIANY (modal) */
const modal = $("changeModal");
const changeText = $("changeText");
$("addChangeBtn").addEventListener("click", () => {
  changeText.value = "";
  modal.style.display = "";
  changeText.focus();
});
$("cancelChange").addEventListener("click", () => modal.style.display = "none");
$("saveChange").addEventListener("click", () => {
  const t = (changeText.value || "").trim();
  if(!t){ modal.style.display = "none"; return; }
  session.changes.push({ id: uuid(), ts: Date.now(), text: t });
  saveSession();
  modal.style.display = "none";
  alert("Dodano zmianę.");
});
// klik w tło zamyka
modal.addEventListener("click", (e) => {
  if(e.target === modal) modal.style.display = "none";
});

/* Report */
function renderReport(){
  renderReportUI(session, {
    rClient: $("rClient"),
    rDate: $("rDate"),
    rBike: $("rBike"),
    rNotes: $("rNotes"),
    rSetup: $("rSetup"),
    rChanges: $("rChanges"),
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
  if(confirm("Na pewno wyczyścić całą sesję (klient + pomiary + zmiany)?")){
    session = defaultSession();
    saveSession();
    // odśwież UI pól
    location.reload();
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
