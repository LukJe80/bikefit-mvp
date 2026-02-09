import { presets, toLabelDiscipline, toLabelGoal } from "./presets.js";
import { createLiveController } from "./live.js";
import { renderReportUI } from "./report.js";

const AUTH_KEY = "bikefit_auth";
const SESSION_KEY = "bikefit_session_mod_v1";

/** =========================
 *  Sesja
 *  ========================= */
function defaultSession(){
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const dd = String(d.getDate()).padStart(2,'0');

  return {
    client: { name:"", date:`${yyyy}-${mm}-${dd}`, notes:"" },
    body: { heightCm:"", inseamCm:"", footCm:"", armsCm:"" },
    bike: { discipline:"road", goal:"neutral" },

    // Rower klienta (stan wyjściowy – informacja do raportu)
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

function ensureSessionShape(s){
  const d = defaultSession();
  if(!s || typeof s !== "object") return d;

  if(!s.client) s.client = d.client;
  if(!s.body) s.body = d.body;
  if(!s.bike) s.bike = d.bike;

  if(!s.bikeSetup) s.bikeSetup = d.bikeSetup;
  for(const k of Object.keys(d.bikeSetup)){
    if(!(k in s.bikeSetup)) s.bikeSetup[k] = d.bikeSetup[k];
  }

  if(!Array.isArray(s.measurements)) s.measurements = [];
  return s;
}

function loadSession(){
  try{
    const raw = localStorage.getItem(SESSION_KEY);
    if(!raw) return defaultSession();
    return ensureSessionShape(JSON.parse(raw));
  }catch{
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

/** =========================
 *  Kroki
 *  ========================= */
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

  if(id==="bike") updatePresetUI();
  if(id==="report") renderReport();
}

/** =========================
 *  Presety (UI)
 *  ========================= */
function updatePresetUI(){
  const rk = $("rangeKnee");
  const re = $("rangeElbow");
  const rt = $("rangeTorso");
  const hint = $("presetHint");

  const p = presets(session.bike.discipline, session.bike.goal);
  rk.textContent = `${p.knee[0]}–${p.knee[1]}°`;
  re.textContent = `${p.elbow[0]}–${p.elbow[1]}°`;
  rt.textContent = `${p.torso[0]}–${p.torso[1]}°`;
  if(hint) hint.textContent = `Preset: ${toLabelDiscipline(session.bike.discipline)} • ${toLabelGoal(session.bike.goal)}`;
}

/** =========================
 *  Bind inputs
 *  ========================= */
function bindInputs(){
  // KROK 1
  $("clientName").value = session.client.name || "";
  $("sessionDate").value = session.client.date || "";
  $("clientNotes").value = session.client.notes || "";

  // KROK 2
  $("heightCm").value = session.body.heightCm || "";
  $("inseamCm").value = session.body.inseamCm || "";
  $("footCm").value = session.body.footCm || "";
  $("armsCm").value = session.body.armsCm || "";

  // KROK 3
  $("discipline").value = session.bike.discipline || "road";
  $("goal").value = session.bike.goal || "neutral";

  // bikeSetup
  const bs = session.bikeSetup;
  $("bikeModel").value = bs.bikeModel || "";
  $("frameSize").value = bs.frameSize || "";
  $("frameReach").value = bs.frameReach || "";
  $("frameStack").value = bs.frameStack || "";
  $("stemLength").value = bs.stemLength || "";
  $("stemAngle").value = bs.stemAngle || "";
  $("handlebarWidth").value = bs.handlebarWidth || "";
  $("handlebarHeight").value = bs.handlebarHeight || "";
  $("saddleModel").value = bs.saddleModel || "";
  $("saddleHeight").value = bs.saddleHeight || "";
  $("seatpostOffset").value = bs.seatpostOffset || "";
  $("crankLength").value = bs.crankLength || "";

  // listeners
  $("clientName").addEventListener("input", () => { session.client.name = $("clientName").value; saveSession(); });
  $("sessionDate").addEventListener("input", () => { session.client.date = $("sessionDate").value; saveSession(); });
  $("clientNotes").addEventListener("input", () => { session.client.notes = $("clientNotes").value; saveSession(); });

  $("heightCm").addEventListener("input", () => { session.body.heightCm = $("heightCm").value; saveSession(); });
  $("inseamCm").addEventListener("input", () => { session.body.inseamCm = $("inseamCm").value; saveSession(); });
  $("footCm").addEventListener("input", () => { session.body.footCm = $("footCm").value; saveSession(); });
  $("armsCm").addEventListener("input", () => { session.body.armsCm = $("armsCm").value; saveSession(); });

  $("discipline").addEventListener("change", () => { session.bike.discipline = $("discipline").value; saveSession(); updatePresetUI(); });
  $("goal").addEventListener("change", () => { session.bike.goal = $("goal").value; saveSession(); updatePresetUI(); });

  const bindSetup = (id, key) => {
    $(id).addEventListener("input", () => {
      session.bikeSetup[key] = $(id).value;
      saveSession();
    });
  };
  bindSetup("bikeModel","bikeModel");
  bindSetup("frameSize","frameSize");
  bindSetup("frameReach","frameReach");
  bindSetup("frameStack","frameStack");
  bindSetup("stemLength","stemLength");
  bindSetup("stemAngle","stemAngle");
  bindSetup("handlebarWidth","handlebarWidth");
  bindSetup("handlebarHeight","handlebarHeight");
  bindSetup("saddleModel","saddleModel");
  bindSetup("saddleHeight","saddleHeight");
  bindSetup("seatpostOffset","seatpostOffset");
  bindSetup("crankLength","crankLength");
}

/** =========================
 *  Nawigacja
 *  ========================= */
$("toAnthro").onclick = () => showStep("anthro");
$("backClient").onclick = () => showStep("client");
$("toBike").onclick = () => showStep("bike");
$("backAnthro").onclick = () => showStep("anthro");
$("toLive").onclick = () => { saveSession(); showStep("live"); };
$("editBike").onclick = () => showStep("bike");
$("toReport").onclick = () => showStep("report");
$("backLive").onclick = () => showStep("live");

/** =========================
 *  LIVE controller
 *  ========================= */
const hintTitle = $("hintTitle");
const hintText = $("hintText");
const debugEl = $("debug");

function dbg(msg){ debugEl.textContent = "DBG: " + msg; }
function setHint(title, text){ hintTitle.textContent = title; hintText.textContent = text; }
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

/** =========================
 *  Zmiana przed pomiarem
 *  ========================= */
let pendingChange = null;

const changePanel = $("changePanel");
const chg = {
  saddleH: $("chgSaddleH"),
  saddleFB: $("chgSaddleFB"),
  cockpitH: $("chgCockpitH"),
  stem: $("chgStem"),
  note: $("chgNote")
};

function showChangePanel(show){
  changePanel.style.display = show ? "" : "none";
}

function parseNumOrNull(v){
  const s = String(v ?? "").trim();
  if(!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function clearChangeInputs(){
  for(const k of Object.keys(chg)){
    chg[k].value = "";
  }
}

$("addChangeBtn").addEventListener("click", () => {
  showChangePanel(true);
  if(pendingChange){
    chg.saddleH.value = pendingChange.saddleH ?? "";
    chg.saddleFB.value = pendingChange.saddleFB ?? "";
    chg.cockpitH.value = pendingChange.cockpitH ?? "";
    chg.stem.value = pendingChange.stem ?? "";
    chg.note.value = pendingChange.note ?? "";
  }
});

$("chgCancel").addEventListener("click", () => showChangePanel(false));

$("chgApply").addEventListener("click", () => {
  pendingChange = {
    saddleH: parseNumOrNull(chg.saddleH.value),
    saddleFB: parseNumOrNull(chg.saddleFB.value),
    cockpitH: parseNumOrNull(chg.cockpitH.value),
    stem: parseNumOrNull(chg.stem.value),
    note: (chg.note.value || "").trim()
  };

  const hasAny =
    pendingChange.saddleH!=null ||
    pendingChange.saddleFB!=null ||
    pendingChange.cockpitH!=null ||
    pendingChange.stem!=null ||
    !!pendingChange.note;

  if(!hasAny) pendingChange = null;
  showChangePanel(false);
});

/** =========================
 *  Snapshot pomiaru
 *  ========================= */
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
    imgDataUrl: img,
    preset: presets(session.bike.discipline, session.bike.goal),
    change: pendingChange
  });

  saveSession();

  pendingChange = null;
  clearChangeInputs();

  alert("Zapisano pomiar: " + label);
});

/** =========================
 *  Raport
 *  ========================= */
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
  if(confirm("Na pewno wyczyścić całą sesję (klient + pomiary + ustawienia roweru)?")){
    session = defaultSession();
    saveSession();
    bindInputs();
    alert("Sesja wyczyszczona.");
    showStep("client");
  }
});

$("printBtn").addEventListener("click", () => window.print());

/** =========================
 *  init
 *  ========================= */
bindInputs();
renderStepsBar();
updateBadge();
updatePresetUI();
setStatus("OFF", false);
setHint("Uruchom kamerę", "Kliknij „Start kamery” w kroku LIVE.");
dbg("gotowe.");
showStep("client");
saveSession();