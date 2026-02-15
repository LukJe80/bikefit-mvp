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

let measureSelectedId = null;
let measureCompareAId = null;
let measureCompareBId = null;

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
    imgDataUrl: img,
    body: Object.assign({}, (session && session.body) ? session.body : {})
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
  const __sid = uuid();
  session.diagnostics.push({
    id: __sid,
    ts,
    label: diagLabel(),
    discipline: session.bike.discipline,
    goal: session.bike.goal,
    knee: m.knee,
    elbow: m.elbow,
    torso: m.torso,
    stab: m.stab,
    imgDataUrl: img,
    body: Object.assign({}, (session && session.body) ? session.body : {})
  });
  measureSelectedId = __sid;
  saveSession();
  showStep("measure");
});

$("mBackToLive").addEventListener("click", () => showStep("live"));
$("mClearDiag").addEventListener("click", () => {
  if(!confirm("Wyczyścić pomiary (snapshoty) z kalkulatora?")) return;
  session.diagnostics = [];
  measureSelectedId = null;
  saveSession();
  renderMeasure();
});

function fmt(v){
  if(v==null || !isFinite(v)) return "—";
  return Math.round(v) + "°";
}

function renderMeasure(){
  const imgEl = $("mImg");
  const emptyEl = $("mEmpty");
  const metaEl = $("mMeta");
  const tableEl = $("mTable");
  const calcEl = $("mCalc");
  const anthroEl = $("mAnthro");
  const anthroCalcEl = $("mAnthroCalc");
  const listEl = $("mList");

  const all = session.diagnostics || [];
  // wybór aktywnego snapshotu (premium lista)
  let current = null;
  if(measureSelectedId){
    current = all.find(s => s.id === measureSelectedId) || null;
  }
  if(!current) current = all[all.length-1] || null;

  // brak danych
  if(!current){
    if(imgEl) imgEl.style.display = "none";
    if(emptyEl) emptyEl.style.display = "";
    if(metaEl) metaEl.textContent = "";
    if(tableEl) tableEl.textContent = "";
    if(calcEl) calcEl.textContent = "";
    if(anthroEl) anthroEl.textContent = "";
    if(anthroCalcEl) anthroCalcEl.textContent = "";
    if(listEl) listEl.innerHTML = "";
    return;
  }

  // snapshot
  if(imgEl){
    imgEl.src = current.imgDataUrl || "";
    imgEl.style.display = current.imgDataUrl ? "" : "none";
  }
  if(emptyEl) emptyEl.style.display = "none";

  const discTxt = toLabelDiscipline(current.discipline);
  const goalTxt = toLabelGoal(current.goal);
  const dt = new Date(current.ts);
  if(metaEl){
    metaEl.innerHTML = `<b>${current.label}</b> • ${discTxt} • ${goalTxt}<br>${dt.toLocaleString()}`;
  }

  // orientacyjne statusy wg presetów (bez mm)
  const p = presets(current.discipline, current.goal);
  const lines = [];

  function badgeClassFrom(val, min, max){
    if(!isFinite(val) || !isFinite(min) || !isFinite(max)) return "";
    if(val < min || val > max) return "bad";
    return "ok";
  }

  if(p){
    if(isFinite(current.knee)){
      const min = p.knee?.[0], max = p.knee?.[1];
      if(isFinite(min) && current.knee < min) lines.push(`Kolano: ${fmt(current.knee)} • poza zakresem (za mało)`);
      else if(isFinite(max) && current.knee > max) lines.push(`Kolano: ${fmt(current.knee)} • poza zakresem (za dużo)`);
      else lines.push(`Kolano: ${fmt(current.knee)} • OK`);
    }
    if(isFinite(current.elbow)){
      const min = p.elbow?.[0], max = p.elbow?.[1];
      if(isFinite(min) && current.elbow < min) lines.push(`Łokieć: ${fmt(current.elbow)} • poza zakresem (za mało)`);
      else if(isFinite(max) && current.elbow > max) lines.push(`Łokieć: ${fmt(current.elbow)} • poza zakresem (za dużo)`);
      else lines.push(`Łokieć: ${fmt(current.elbow)} • OK`);
    }
    if(isFinite(current.torso)){
      const min = p.torso?.[0], max = p.torso?.[1];
      if(isFinite(min) && current.torso < min) lines.push(`Tułów: ${fmt(current.torso)} • poza zakresem (za pionowo)`);
      else if(isFinite(max) && current.torso > max) lines.push(`Tułów: ${fmt(current.torso)} • poza zakresem (za agresywnie)`);
      else lines.push(`Tułów: ${fmt(current.torso)} • OK`);
    }
  } else {
    // fallback: zawsze pokaż surowe kąty
    if(isFinite(current.knee)) lines.push(`Kolano: ${fmt(current.knee)}`);
    if(isFinite(current.elbow)) lines.push(`Łokieć: ${fmt(current.elbow)}`);
    if(isFinite(current.torso)) lines.push(`Tułów: ${fmt(current.torso)}`);
    lines.push("Brak presetów dla tego profilu.");
  }

  if(isFinite(current.stab)) lines.push(`Stabilność: ${Math.round(current.stab)}%`);

  if(tableEl){
    tableEl.innerHTML = lines.map(t=>`<div>• ${t}</div>`).join("");
  }

  // Kalkulator orientacyjny (bez mm) – dla fitera
  if(calcEl){
    const hints = [];
    const pills = [];

    // krótkie pigułki statusów
    if(p){
      if(isFinite(current.knee) && Array.isArray(p.knee)){
        const [mn,mx]=p.knee;
        const cls = (isFinite(mn)&&current.knee<mn)||(isFinite(mx)&&current.knee>mx) ? "bad":"ok";
        pills.push(`<span class="pill ${cls}">Kolano</span>`);
        if(isFinite(mn) && current.knee < mn) hints.push("Kolano (BDC) za mocno zgięte: sprawdź wysokość siodła (możliwe: za nisko) oraz czy biodro nie jest „zamknięte” (np. zbyt długa korba / duży drop).");
        else if(isFinite(mx) && current.knee > mx) hints.push("Kolano (BDC) zbyt wyprostowane: sprawdź wysokość siodła (możliwe: za wysoko).");
      }
      if(isFinite(current.elbow) && Array.isArray(p.elbow)){
        const [mn,mx]=p.elbow;
        const cls = (isFinite(mn)&&current.elbow<mn)||(isFinite(mx)&&current.elbow>mx) ? "bad":"ok";
        pills.push(`<span class="pill ${cls}">Łokieć</span>`);
        if(isFinite(mn) && current.elbow < mn) hints.push("Łokieć mocno ugięty: sprawdź reach (mostek/kierownica) i czy pozycja nie jest zbyt „zebrana” (często: reach za długi lub drop za duży).");
        else if(isFinite(mx) && current.elbow > mx) hints.push("Łokieć zbyt prosty: sprawdź reach (często: reach za krótki / za daleko odsunięty tułów).");
      }
      if(isFinite(current.torso) && Array.isArray(p.torso)){
        const [mn,mx]=p.torso;
        const cls = (isFinite(mn)&&current.torso<mn)||(isFinite(mx)&&current.torso>mx) ? "bad":"ok";
        pills.push(`<span class="pill ${cls}">Tułów</span>`);
        // Uwaga: w tej aplikacji mniejszy kąt = bardziej pionowo, większy = bardziej agresywnie
        if(isFinite(mn) && current.torso < mn) hints.push("Tułów zbyt pionowo: sprawdź czy kokpit nie jest za wysoko / reach za krótki (możliwe: brakuje „sięgnięcia” do przodu).");
        else if(isFinite(mx) && current.torso > mx) hints.push("Tułów zbyt agresywnie: sprawdź drop (kierownica za nisko) lub reach (za długi).");
      }
    }

    const bike = (session && session.bikeSetup) ? session.bikeSetup : {};
    const bikeLineParts = [];
    if(bike.crankLen) bikeLineParts.push(`Korba: ${bike.crankLen} mm`);
    if(bike.saddleHeight) bikeLineParts.push(`Siodło: ${bike.saddleHeight} mm`);
    if(bike.saddleSetback) bikeLineParts.push(`Setback: ${bike.saddleSetback} mm`);
    if(bike.stemLen) bikeLineParts.push(`Mostek: ${bike.stemLen} mm`);
    if(bike.barHeight) bikeLineParts.push(`Kokpit: ${bike.barHeight} mm`);

    const bikeLine = bikeLineParts.length ? `<div class="small" style="margin-bottom:10px;">${bikeLineParts.map(t=>`<span class="pill">${t}</span>`).join(" ")}</div>` : "";

    const body = hints.length
      ? hints.map(t=>`<div class="calcItem">• ${t}</div>`).join("")
      : `<div class="calcItem">Brak dodatkowych uwag – według presetów wygląda OK.</div>`;

    calcEl.innerHTML = bikeLine + (pills.length?(`<div style="margin-bottom:10px;">${pills.join(" ")}</div>`):"") + body + `<div class="calcNote">To jest orientacyjna diagnoza (bez milimetrów). Zapisz snapshoty PRZED/PO i weryfikuj zmianę po jeździe.</div>`;
  }

  // lista snapshotów (czytelna)
  if(listEl){
    listEl.innerHTML = all.map(s=>{
      const d = new Date(s.ts);
      const time = d.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
      const disc = toLabelDiscipline(s.discipline);
      const goal = toLabelGoal(s.goal);
      const p2 = presets(s.discipline, s.goal);

      function mkBadge(name, val, rng){
        if(!p2 || !isFinite(val) || !rng) return `<span class="snapBadge">${name}: ${isFinite(val)?fmt(val):"-"}</span>`;
        const min=rng[0], max=rng[1];
        let cls="ok";
        if(isFinite(min) && val < min) cls="bad";
        else if(isFinite(max) && val > max) cls="bad";
        return `<span class="snapBadge ${cls}">${name}: ${fmt(val)}</span>`;
      }

      const kneeB = mkBadge("Kolano", s.knee, p2?.knee);
      const torsoB = mkBadge("Tułów", s.torso, p2?.torso);
      const stabB = `<span class="snapBadge">${isFinite(s.stab)?("Stab: "+Math.round(s.stab)+"%"):"Stab: -"}</span>`;

      const active = (current && s.id===current.id) ? "active" : "";
      return `
        <div class="snapRow ${active}" data-sid="${s.id}">
          <div class="snapRowTop">
            <div class="snapRowTitle">${s.label}</div>
            <div class="snapRowMeta">${time}</div>
          </div>
          <div class="snapRowSub">${disc} • ${goal}</div>
          <div class="snapBadges">
            ${kneeB}
            ${torsoB}
            ${stabB}
          </div>
        </div>`;
    }).join("");

    Array.from(listEl.querySelectorAll(".snapRow")).forEach(el=>{
      el.addEventListener("click", ()=>{
        measureSelectedId = el.getAttribute("data-sid");
        renderMeasure();
      });
    });
  }



  // ===== ANTHRO_PREVIEW_BOX_V3 =====
  // Dane klienta (Antropometria) – tylko podgląd (nie wpływa na obliczenia)
  if(anthroEl){
    const b = (current && current.body) ? current.body : ((session && session.body) ? session.body : {});
    const v = (x) => (x !== undefined && x !== null && String(x).trim() !== "") ? String(x).trim() : "—";
    anthroEl.innerHTML =
      '<div>• Wzrost: <b>' + v(b.heightCm) + ' cm</b></div>' +
      '<div>• Przekrok: <b>' + v(b.inseamCm) + ' cm</b></div>' +
      '<div>• Ramiona: <b>' + v(b.armsCm) + ' cm</b></div>' +
      '<div class="muted" style="margin-top:8px;">Podgląd danych: dla tego snapshotu (jeśli zapisane) lub z kroku Antropometria. Nie zmienia wyników kątów ani presetów.</div>';
  }
  
  
  // ===== ANTHRO_WORKSHOP_BOX_V1 =====
  // Wzorzec (orientacyjnie) – warsztatowe podpowiedzi na podstawie antropometrii (nie wpływa na wyniki)
  if(anthroCalcEl){
    const b = (current && current.body) ? current.body : ((session && session.body) ? session.body : {});
    const num = (x) => {
      const n = parseFloat(String(x||"").replace(",", "."));
      return isFinite(n) ? n : null;
    };
    const h = num(b.heightCm);
    const i = num(b.inseamCm);

    // 1) Wysokość siodła – klasyczny wzorzec (LeMond ~0.883 * przekrok) jako punkt startowy
    let saddleTxt = "• Wysokość siodła (BB→szczyt): —";
    if(i){
      const mm = Math.round(i * 0.883 * 10); // cm -> mm
      saddleTxt = `• Wysokość siodła (BB→szczyt): <b>${mm} mm</b> (start) • zakres testu: ±10 mm`;
    }

    // 2) Długość korby – orientacyjnie (zakres)
    let crankTxt = "• Długość korby: —";
    if(i){
      let rec = 172.5;
      if(i < 75) rec = 165;
      else if(i < 80) rec = 170;
      else if(i < 86) rec = 172.5;
      else rec = 175;
      crankTxt = `• Długość korby: <b>${rec} mm</b> (orientacyjnie) • zakres: ${rec-2.5}–${rec+2.5} mm`;
    }

    // 3) Drop kierownicy – zależnie od profilu (bez mierzenia, tylko zakres)
    const disc = (current && current.discipline) ? current.discipline : (session?.bike?.discipline || "road");
    const goal = (current && current.goal) ? current.goal : (session?.bike?.goal || "neutral");

    const dropRanges = {
      road:    { comfort:"0–60 mm", neutral:"40–90 mm", aero:"70–130 mm" },
      gravel:  { comfort:"0–50 mm", neutral:"20–70 mm", aero:"40–90 mm" },
      mtb:     { comfort:"0–40 mm", neutral:"0–50 mm",  aero:"10–60 mm" }
    };
    const drop = (dropRanges[disc] && dropRanges[disc][goal]) ? dropRanges[disc][goal] : "—";
    const dropTxt = `• Drop (siodło→kierownica): <b>${drop}</b> (zakres dla profilu)`;

    // 4) Szybkie przypomnienie: to nie jest „ustaw na sztywno”
    const note = `
      <div class="muted" style="margin-top:8px;">
        To są <b>wzorce startowe</b> (warsztat). Ustawiasz, robisz SNAP, korygujesz i weryfikujesz w jeździe.
        Nie zmienia wyników LIVE ani raportu.
      </div>`;

    anthroCalcEl.innerHTML = `
      <div>${saddleTxt}</div>
      <div>${crankTxt}</div>
      <div>${dropTxt}</div>
      ${note}
    `;
  }
renderMeasureCompare(all, current);
}


function renderMeasureCompare(all, current){
  const selA = $("mCmpA");
  const selB = $("mCmpB");
  const out = $("mCmpOut");
  if(!selA || !selB || !out){
    return;
  }

  // gdy brak danych
  if(!Array.isArray(all) || all.length === 0){
    selA.innerHTML = "";
    selB.innerHTML = "";
    out.innerHTML = "<div class='small muted'>Brak snapshotów do porównania.</div>";
    measureCompareAId = null;
    measureCompareBId = null;
    return;
  }

  // domyślne wybory: ostatnie dwa
  const last = all[all.length-1];
  const prev = all.length > 1 ? all[all.length-2] : all[all.length-1];

  // jeśli nie ustawione lub nie istnieją już, ustaw sensownie
  const exists = (id) => all.some(s => s.id === id);
  if(!measureCompareBId || !exists(measureCompareBId)) measureCompareBId = last.id;
  if(!measureCompareAId || !exists(measureCompareAId)) measureCompareAId = prev.id;

  // Jeśli A == B i mamy >=2, ustaw A na poprzedni
  if(measureCompareAId === measureCompareBId && all.length > 1){
    measureCompareAId = prev.id;
    if(measureCompareAId === measureCompareBId){
      measureCompareAId = all[0].id;
    }
  }

  // opcje selectów
  const optHtml = all.map(s=>{
    const dt = new Date(s.ts);
    const t = dt.toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    const disc = toLabelDiscipline(s.discipline);
    const goal = toLabelGoal(s.goal);
    return `<option value="${s.id}">${s.label} • ${t} • ${disc}/${goal}</option>`;
  }).join("");

  selA.innerHTML = optHtml;
  selB.innerHTML = optHtml;

  selA.value = measureCompareAId;
  selB.value = measureCompareBId;

  // eventy (jednorazowo)
  if(!selA.__bound){
    selA.addEventListener("change", ()=>{
      measureCompareAId = selA.value;
      renderMeasure();
    });
    selA.__bound = true;
  }
  if(!selB.__bound){
    selB.addEventListener("change", ()=>{
      measureCompareBId = selB.value;
      renderMeasure();
    });
    selB.__bound = true;
  }

  const A = all.find(s=>s.id===measureCompareAId) || prev;
  const B = all.find(s=>s.id===measureCompareBId) || last;

  function deltaLine(label, a, b, unit){
    if(!isFinite(a) || !isFinite(b)) return `<div>• ${label}: —</div>`;
    const d = b - a;
    const sign = d > 0 ? "+" : "";
    const cls = Math.abs(d) >= 4 ? "bad" : "ok";
    return `<div>• <b>${label}</b>: ${fmt(a)} → ${fmt(b)} <span class="snapBadge ${cls}">${sign}${Math.round(d)}${unit||""}</span></div>`;
  }

  const rows = [];
  rows.push(`<div class="small muted" style="margin-bottom:6px;">Porównanie: <b>${A.label}</b> → <b>${B.label}</b></div>`);
  rows.push(deltaLine("Kolano", A.knee, B.knee, "°"));
  rows.push(deltaLine("Łokieć", A.elbow, B.elbow, "°"));
  rows.push(deltaLine("Tułów", A.torso, B.torso, "°"));
  if(isFinite(A.stab) && isFinite(B.stab)){
    const d = Math.round(B.stab - A.stab);
    const sign = d>0?"+":"";
    const cls = Math.abs(d) >= 5 ? "bad" : "ok";
    rows.push(`<div>• <b>Stabilność</b>: ${Math.round(A.stab)}% → ${Math.round(B.stab)}% <span class="snapBadge ${cls}">${sign}${d}%</span></div>`);
  } else {
    rows.push(`<div>• <b>Stabilność</b>: —</div>`);
  }

  out.innerHTML = rows.join("");
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