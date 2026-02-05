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

    // NOWE: Rower klienta (stan wyjściowy)
    bikeSetup: {
      bikeModel: "",
      frameSize: "",
      frameReach: "",
      frameStack: "",
      stemLength: "",
      stemAngle: "",
      handlebarWidth: "",
      handlebarHeight: "",
      saddleModel: "",
      saddleHeight: "",
      seatpostOffset: "",
      crankLength: ""
    },

    measurements: []
  };
}

function loadSession(){
  try{
    const raw = localStorage.getItem(SESSION_KEY);
    if(!raw) return defaultSession();
    const s = JSON.parse(raw);
    if(!s || !s.client || !s.body || !s.bike || !Array.isArray(s.measurements)) return defaultSession();

    // zapewnij nowe pola w starszych sesjach
    if(!s.bikeSetup) s.bikeSetup = defaultSession().bikeSetup;

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
  $("clientName").value = session.client.name || "";
  $("sessionDate").value = session.client.date || "";
  $("clientNotes").value = session.client.notes || "";

  $("heightCm").value = session.body.heightCm || "";
  $("inseamCm").value = session.body.inseamCm || "";
  $("footCm").value = session.body.footCm || "";
  $("armsCm").value = session.body.armsCm || "";

  $("discipline").value = session.bike.discipline || "road";
  $("goal").value = session.bike.goal || "neutral";

  // Rower klienta (stan wyjściowy)
  $("bikeModel").value = session.bikeSetup.bikeModel || "";
  $("frameSize").value = session.bikeSetup.frameSize || "";
  $("frameReach").value = session.bikeSetup.frameReach || "";
  $("frameStack").value = session.bikeSetup.frameStack || "";
  $("stemLength").value = session.bikeSetup.stemLength || "";
  $("stemAngle").value = session.bikeSetup.stemAngle || "";
  $("handlebarWidth").value = session.bikeSetup.handlebarWidth || "";
  $("handlebarHeight").value = session.bikeSetup.handlebarHeight || "";
  $("saddleModel").value = session.bikeSetup.saddleModel || "";
  $("saddleHeight").value = session.bikeSetup.saddleHeight || "";
  $("seatpostOffset").value = session.bikeSetup.seatpostOffset || "";
  $("crankLength").value = session.bikeSetup.crankLength || "";

  $("clientName").addEventListener("input", () => { session.client.name = $("clientName").value; saveSession(); });
  $("sessionDate").addEventListener("input", () => { session.client.date = $("sessionDate").value; saveSession(); });
  $("clientNotes").addEventListener("input", () => { session.client.notes = $("clientNotes").value; saveSession(); });

  $("heightCm").addEventListener("input", () => { session.body.heightCm = $("heightCm").value; saveSession(); });
  $("inseamCm").addEventListener("input", () => { session.body.inseamCm = $("inseamCm").value; saveSession(); });
  $("footCm").addEventListener("input", () => { session.body.footCm = $("footCm").value; saveSession(); });
  $("armsCm").addEventListener("input", () => { session.body.armsCm = $("armsCm").value; saveSession(); });

  $("discipline").addEventListener("change", () => { session.bike.discipline = $("discipline").value; saveSession(); });
  $("goal").addEventListener("change", () => { session.bike.goal = $("goal").value; saveSession(); });

  // Rower klienta (stan wyjściowy)
  $("bikeModel").addEventListener("input", () => { session.bikeSetup.bikeModel = $("bikeModel").value; saveSession(); });
  $("frameSize").addEventListener("input", () => { session.bikeSetup.frameSize = $("frameSize").value; saveSession(); });
  $("frameReach").addEventListener("input", () => { session.bikeSetup.frameReach = $("frameReach").value; saveSession(); });
  $("frameStack").addEventListener("input", () => { session.bikeSetup.frameStack = $("frameStack").value; saveSession(); });
  $("stemLength").addEventListener("input", () => { session.bikeSetup.stemLength = $("stemLength").value; saveSession(); });
  $("stemAngle").addEventListener("input", () => { session.bikeSetup.stemAngle = $("stemAngle").value; saveSession(); });
  $("handlebarWidth").addEventListener("input", () => { session.bikeSetup.handlebarWidth = $("handlebarWidth").value; saveSession(); });
  $("handlebarHeight").addEventListener("input", () => { session.bikeSetup.handlebarHeight = $("handlebarHeight").value; saveSession(); });
  $("saddleModel").addEventListener("input", () => { session.bikeSetup.saddleModel = $("saddleModel").value; saveSession(); });
  $("saddleHeight").addEventListener("input", () => { session.bikeSetup.saddleHeight = $("saddleHeight").value; saveSession(); });
  $("seatpostOffset").addEventListener("input", () => { session.bikeSetup.seatpostOffset = $("seatpostOffset").value; saveSession(); });
  $("crankLength").addEventListener("input", () => { session.bikeSetup.crankLength = $("crankLength").value; saveSession(); });
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

/* ===== ZMIANY (co przestawiłem) ===== */
let pendingChange = null;

function numOrNull(v){
  if(v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function openChangePanel(open){
  const p = $("changePanel");
  if(!p) return;
  p.style.display = open ? "" : "none";
}

function clearChangeInputs(){
  if($("chgSaddleH")) $("chgSaddleH").value = "";
  if($("chgSaddleFB")) $("chgSaddleFB").value = "";
  if($("chgCockpitH")) $("chgCockpitH").value = "";
  if($("chgStem")) $("chgStem").value = "";
  if($("chgNote")) $("chgNote").value = "";
}

$("addChangeBtn")?.addEventListener("click", () => openChangePanel(true));
$("chgCancel")?.addEventListener("click", () => openChangePanel(false));

$("chgApply")?.addEventListener("click", () => {
  pendingChange = {
    saddleH:  numOrNull($("chgSaddleH")?.value),
    saddleFB: numOrNull($("chgSaddleFB")?.value),
    cockpitH: numOrNull($("chgCockpitH")?.value),
    stem:     numOrNull($("chgStem")?.value),
    note:     ($("chgNote")?.value || "").trim()
  };
  openChangePanel(false);
  alert("Zapisano zmianę. Teraz kliknij „Zapisz pomiar”, aby przypisać ją do kolejnego pomiaru.");
});

/* ===== Presety na ekranie Bike ===== */
function updatePresetUI(){
  const p = presets(session.bike.discipline, session.bike.goal);
  $("rangeKnee").textContent = `${p.knee[0]}–${p.knee[1]}°`;
  $("rangeElbow").textContent = `${p.elbow[0]}–${p.elbow[1]}°`;
  $("rangeTorso").textContent = `${p.torso[0]}–${p.torso[1]}°`;
  $("presetHint").textContent = `Preset: ${toLabelDiscipline(session.bike.discipline)} • ${toLabelGoal(session.bike.goal)}`;
}
$("discipline").addEventListener("change", updatePresetUI);
$("goal").addEventListener("change", updatePresetUI);

$("saveShot").addEventListener("click", () => {
  const m = live.getLastMetrics();
  const p = presets(session.bike.discipline, session.bike.goal);

  if(!m || (!isFinite(m.stab) && m.knee==null)){
    alert("Nie mam danych do zapisania. Uruchom kamerę i poczekaj aż pojawią się punkty.");
    return;
  }
  const img = live.snapshot();
  const label = suggestLabel();
  const ts = Date.now();

  const lastInstructor = live.getLastInstructor?.() || { title:"", text:"", ts };

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

    imgDataUrl: img,

    instructorTitle: lastInstructor.title || "",
    instructorText: lastInstructor.text || "",
    instructorAt: lastInstructor.ts || ts,

    preset: {
      knee: p.knee,
      elbow: p.elbow,
      torso: p.torso
    },

    // zmiany przed tym pomiarem (jeśli dodane)
    change: pendingChange
  });

  saveSession();

  // wyczyść „pendingChange” po zapisie
  pendingChange = null;
  clearChangeInputs();

  alert("Zapisano pomiar: " + label);
});

/* Report */
function renderReport(){
  renderReportUI(session, {
    rClient: $("rClient"),
    rDate: $("rDate"),
    rBike: $("rBike"),
    rNotes: $("rNotes"),
    rSetup: $("rSetup"),

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
updatePresetUI();
