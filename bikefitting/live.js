:root{
  --bg:#020617;
  --panel:#0b1226;
  --panel2:#0c1633;
  --line:rgba(255,255,255,.08);
  --text:#e5e7eb;
  --muted:rgba(229,231,235,.75);
  --blue:#2563eb;
  --blue2:#1d4ed8;
  --danger:#ef4444;
  --ok:#22c55e;
  --cardRadius:18px;
}

*{ box-sizing:border-box; }
html,body{ height:100%; }
body{
  margin:0;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial;
  background: radial-gradient(1200px 600px at 20% 10%, rgba(37,99,235,.18), transparent 55%),
              radial-gradient(900px 500px at 80% 0%, rgba(59,130,246,.10), transparent 55%),
              var(--bg);
  color:var(--text);
}

a{ color:inherit; }

.page{
  width:min(1200px, 96vw);
  margin: 26px auto 60px;
}

.top{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:14px;
  margin-bottom:14px;
}
.title{
  font-weight:800;
  letter-spacing:.2px;
  font-size:26px;
}
.bar{
  display:flex;
  align-items:center;
  gap:10px;
  flex-wrap:wrap;
}

.card{
  background: linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.02));
  border: 1px solid var(--line);
  border-radius: var(--cardRadius);
  padding: 14px;
  box-shadow: 0 10px 40px rgba(0,0,0,.25);
}

.h{
  margin:0 0 10px;
  font-size:18px;
  font-weight:750;
}

.small{ color:var(--muted); font-size:13px; line-height:1.35; }

.fieldRow{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:12px;
  margin-bottom:10px;
}
@media (max-width: 820px){
  .fieldRow{ grid-template-columns: 1fr; }
}

label{ display:block; font-size:13px; color:var(--muted); margin:8px 0 6px; }
input, select, textarea{
  width:100%;
  background: rgba(0,0,0,.25);
  border:1px solid rgba(255,255,255,.10);
  color: var(--text);
  padding:10px 12px;
  border-radius: 12px;
  outline:none;
}
textarea{ min-height:90px; resize:vertical; }

input:focus, select:focus, textarea:focus{
  border-color: rgba(37,99,235,.45);
  box-shadow: 0 0 0 3px rgba(37,99,235,.12);
}

.btn{
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.04);
  color: var(--text);
  padding:10px 14px;
  border-radius: 12px;
  cursor:pointer;
  font-weight:650;
}
.btn:hover{ border-color: rgba(255,255,255,.18); }
.btn.primary{
  background: linear-gradient(180deg, var(--blue), var(--blue2));
  border-color: rgba(255,255,255,.08);
}
.btn.secondary{
  background: rgba(37,99,235,.10);
  border-color: rgba(37,99,235,.25);
}
.btn.danger{
  background: rgba(239,68,68,.12);
  border-color: rgba(239,68,68,.35);
}

.pill{
  display:inline-flex;
  align-items:center;
  gap:10px;
  padding:10px 12px;
  border-radius: 999px;
  background: rgba(255,255,255,.04);
  border:1px solid rgba(255,255,255,.10);
  font-weight:650;
}
.dot{
  width:10px; height:10px; border-radius:50%;
  background: rgba(255,255,255,.25);
}
.dot.on{ background: var(--ok); box-shadow: 0 0 0 4px rgba(34,197,94,.15); }

.badge{
  display:inline-flex;
  align-items:center;
  padding:10px 12px;
  border-radius: 999px;
  background: rgba(37,99,235,.14);
  border:1px solid rgba(37,99,235,.30);
  font-weight:750;
}

.steps{
  display:flex;
  gap:10px;
  flex-wrap:wrap;
  margin: 10px 0 14px;
}
.stepTag{
  padding:10px 12px;
  border-radius:999px;
  border:1px solid rgba(255,255,255,.10);
  background: rgba(255,255,255,.03);
  cursor:pointer;
  font-weight:650;
}
.stepTag.active{
  background: rgba(37,99,235,.18);
  border-color: rgba(37,99,235,.35);
}

.navRow{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  margin-top:14px;
}
.rightBtns{ display:flex; gap:10px; flex-wrap:wrap; }

.divider{
  height:1px;
  background: rgba(255,255,255,.10);
  margin: 12px 0;
}

.grid{
  display:grid;
  grid-template-columns: 1.2fr .8fr;
  gap:12px;
}
@media (max-width: 980px){
  .grid{ grid-template-columns: 1fr; }
}

.videoWrap{
  position:relative;
  width:100%;
  aspect-ratio: 16 / 9;
  background: #000;
  border-radius: 16px;
  overflow:hidden;
  border:1px solid rgba(255,255,255,.08);
}
video, canvas{
  position:absolute;
  inset:0;
  width:100%;
  height:100%;
  object-fit: cover;
}

.instr{
  border:1px dashed rgba(255,255,255,.14);
  border-radius: 16px;
  padding: 12px;
  margin-bottom: 12px;
  background: rgba(0,0,0,.16);
}
.instr h3{
  margin:0 0 6px;
  font-size:13px;
  color: var(--muted);
  font-weight:750;
  letter-spacing:.2px;
}
.big{ font-size:22px; font-weight:850; margin:0 0 4px; }

.kpis{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:10px;
}
@media (max-width: 520px){
  .kpis{ grid-template-columns:1fr; }
}
.kpi{ padding:12px; }
.kpi .label{ color:var(--muted); font-size:12px; font-weight:700; }
.kpi .val{ font-size:22px; font-weight:900; margin:6px 0; }
.kpi .desc{ color:var(--muted); font-size:12px; }

.debug{
  padding:10px 12px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size:12px;
  color: rgba(229,231,235,.85);
  background: rgba(0,0,0,.25);
  border-radius: 12px;
}

.liveTop{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:10px;
  flex-wrap:wrap;
}
.liveBtns{ display:flex; gap:10px; flex-wrap:wrap; }

.reportBox .small{ margin:4px 0; }

.shots{
  display:grid;
  grid-template-columns: 1fr 1fr;
  gap:10px;
  margin-top:12px;
}
@media (max-width: 980px){
  .shots{ grid-template-columns: 1fr; }
}

.shotImg{
  width:100%;
  border-radius: 14px;
  margin-top:10px;
  border:1px solid rgba(255,255,255,.10);
}

.modal{
  position:fixed;
  inset:0;
  background: rgba(0,0,0,.55);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:16px;
  z-index: 50;
}
.modalInner{
  width:min(700px, 96vw);
}
