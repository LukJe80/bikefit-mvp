import { presets, toLabelDiscipline, toLabelGoal } from "./presets.js";

function safe(v){ return (v==null || v==="") ? null : v; }
function num(v){
  if(v==null) return null;
  const x = Number(String(v).replace(",", "."));
  return Number.isFinite(x) ? x : null;
}
function fmt(v, unit=""){
  if(v==null || v==="") return "—";
  return `${v}${unit}`;
}

function fmtSetup(setup){
  if(!setup) return "Brak danych o rowerze klienta (opcjonalne).";
  const lines = [];
  const bikeModel = safe(setup.bikeModel);
  const frameSize = safe(setup.frameSize);
  if(bikeModel || frameSize){
    lines.push(`• Rower: ${bikeModel || "—"} ${frameSize ? `(rozmiar: ${frameSize})` : ""}`.trim());
  }

  const stemLen = safe(setup.stemLen);
  const stemAngle = safe(setup.stemAngle);
  if(stemLen || stemAngle){
    lines.push(`• Mostek: ${stemLen ? stemLen + " mm" : "—"} ${stemAngle ? ` / ${stemAngle}°` : ""}`.trim());
  }

  const barWidth = safe(setup.barWidth);
  const barHeight = safe(setup.barHeight);
  if(barWidth || barHeight){
    lines.push(`• Kierownica: ${barWidth ? barWidth + " mm" : "—"} ${barHeight ? ` / wysokość: ${barHeight} mm` : ""}`.trim());
  }

  const saddleHeight = safe(setup.saddleHeight);
  const saddleSetback = safe(setup.saddleSetback);
  const saddleTilt = safe(setup.saddleTilt);
  if(saddleHeight || saddleSetback || saddleTilt){
    lines.push(`• Siodło: wys. ${saddleHeight ? saddleHeight + " mm" : "—"} / setback ${saddleSetback ? saddleSetback + " mm" : "—"} / kąt ${saddleTilt ? saddleTilt + "°" : "—"}`);
  }

  const crankLen = safe(setup.crankLen);
  if(crankLen){
    lines.push(`• Korby: ${crankLen} mm`);
  }

  if(lines.length===0) return "Brak danych o rowerze klienta (opcjonalne).";
  return lines.join("<br>");
}

function fmtAdjustments(adj){
  if(!adj) return "—";
  const parts = [];

  const cleatsFB = safe(adj.cleatsFB);
  const cleatsLR = safe(adj.cleatsLR);
  if(cleatsFB || cleatsLR){
    parts.push(`Bloki: przód/tył ${cleatsFB ? cleatsFB + " mm" : "—"}, lewo/prawo ${cleatsLR ? cleatsLR + " mm" : "—"}`);
  }

  const saddleH = safe(adj.saddleH);
  const saddleFB = safe(adj.saddleFB);
  const saddleTilt = safe(adj.saddleTilt);
  if(saddleH || saddleFB || saddleTilt){
    parts.push(`Siodło: wys. ${saddleH ? saddleH + " mm" : "—"}, przód/tył ${saddleFB ? saddleFB + " mm" : "—"}, kąt ${saddleTilt ? saddleTilt + "°" : "—"}`);
  }

  const stemLen = safe(adj.stemLen);
  const stemAngle = safe(adj.stemAngle);
  if(stemLen || stemAngle){
    parts.push(`Mostek: długość ${stemLen ? stemLen + " mm" : "—"}, kąt ${stemAngle ? stemAngle + "°" : "—"}`);
  }

  const misc = safe(adj.misc);
  if(misc){
    parts.push(`Inne: ${misc}`);
  }

  const notes = safe(adj.notes);
  if(notes){
    parts.push(`Notatki: ${notes}`);
  }

  if(parts.length===0) return "—";
  return "• " + parts.join("<br>• ");
}

function computeReco(session, before, after){
  const discipline = session?.bike?.discipline || "road";
  const goal = session?.bike?.goal || "neutral";

  const p = (presets?.[discipline]?.[goal]) || null;

  const recos = [];

  if(!before || !after){
    recos.push("Zapisz pomiary PRZED i PO, aby zobaczyć porównanie i rekomendacje.");
    return recos;
  }

  function inRange(x, lo, hi){
    if(x==null || lo==null || hi==null) return null;
    return x>=lo && x<=hi;
  }

  const kneeAfter = num(after.knee);
  const elbowAfter = num(after.elbow);
  const torsoAfter = num(after.torso);

  if(p){
    if(kneeAfter!=null && p.knee){
      const ok = inRange(kneeAfter, p.knee[0], p.knee[1]);
      if(ok===true) recos.push(`✅ Kąt kolana po: ${kneeAfter.toFixed(1)}° (w normie ${p.knee[0]}–${p.knee[1]}°).`);
      if(ok===false) recos.push(`⚠️ Kąt kolana po: ${kneeAfter.toFixed(1)}° (cel ${p.knee[0]}–${p.knee[1]}°). Rozważ korektę wysokości siodła.`);
    }

    if(elbowAfter!=null && p.elbow){
      const ok = inRange(elbowAfter, p.elbow[0], p.elbow[1]);
      if(ok===true) recos.push(`✅ Kąt łokcia po: ${elbowAfter.toFixed(1)}° (w normie ${p.elbow[0]}–${p.elbow[1]}°).`);
      if(ok===false) recos.push(`⚠️ Kąt łokcia po: ${elbowAfter.toFixed(1)}° (cel ${p.elbow[0]}–${p.elbow[1]}°). Rozważ korektę reach (mostek / klamki / setback).`);
    }

    if(torsoAfter!=null && p.torso){
      const ok = inRange(torsoAfter, p.torso[0], p.torso[1]);
      if(ok===true) recos.push(`✅ Kąt tułowia po: ${torsoAfter.toFixed(1)}° (w normie ${p.torso[0]}–${p.torso[1]}°).`);
      if(ok===false) recos.push(`⚠️ Kąt tułowia po: ${torsoAfter.toFixed(1)}° (cel ${p.torso[0]}–${p.torso[1]}°). Rozważ korektę dropu / wysokości kokpitu.`);
    }
  }else{
    recos.push("Brak presetu dla tej dyscypliny/celu (to nie powinno się zdarzyć).");
  }

  const stab = num(after.stab);
  if(stab!=null){
    recos.push(`ℹ️ Stabilność punktów: ${(stab*100).toFixed(0)}%.`);
  }

  const adjTxt = fmtAdjustments(session?.adjustments);
  if(adjTxt && adjTxt !== "—"){
    recos.push(`<div class="divider" style="margin:10px 0;"></div><b>Zmiany wprowadzone:</b><br>${adjTxt}`);
  }

  return recos;
}

export function renderReportUI(session, els){
  if(els.rClient) els.rClient.textContent = session?.client?.name || "—";
  if(els.rDate) els.rDate.textContent = session?.client?.date || "—";
  if(els.rBike) els.rBike.textContent = `${toLabelDiscipline(session?.bike?.discipline)} • ${toLabelGoal(session?.bike?.goal)}`;
  if(els.rNotes) els.rNotes.textContent = session?.client?.notes || "—";

  if(els.rSetup){
    els.rSetup.innerHTML = fmtSetup(session?.bikeSetup);
  }

  const ms = Array.isArray(session?.measurements) ? session.measurements : [];
  const byId = Object.fromEntries(ms.map(m => [m.id, m]));

  const beforeSel = els.beforeSel;
  const afterSel  = els.afterSel;

  function fillSelect(sel){
    if(!sel) return;
    sel.innerHTML = "";
    const opt0 = document.createElement("option");
    opt0.value = "";
    opt0.textContent = "— wybierz —";
    sel.appendChild(opt0);

    for(const m of ms){
      const o = document.createElement("option");
      o.value = m.id;
      const time = new Date(m.ts || Date.now()).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
      o.textContent = `${m.label || "pomiar"} • ${time}`;
      sel.appendChild(o);
    }
  }
  fillSelect(beforeSel);
  fillSelect(afterSel);

  if(beforeSel && beforeSel.value==="" && ms.length>=1) beforeSel.value = ms[0].id;
  if(afterSel && afterSel.value==="" && ms.length>=2) afterSel.value = ms[1].id;

  function renderPair(){
    const before = beforeSel && beforeSel.value ? byId[beforeSel.value] : null;
    const after  = afterSel && afterSel.value ? byId[afterSel.value] : null;

    if(els.beforeMeta) els.beforeMeta.textContent = before ? (before.label || "—") : "—";
    if(els.afterMeta) els.afterMeta.textContent = after ? (after.label || "—") : "—";

    if(els.beforeImg){
      els.beforeImg.src = before?.imgDataUrl || "";
      els.beforeImg.style.display = before?.imgDataUrl ? "" : "none";
    }
    if(els.afterImg){
      els.afterImg.src = after?.imgDataUrl || "";
      els.afterImg.style.display = after?.imgDataUrl ? "" : "none";
    }

    if(els.beforeAngles){
      if(before){
        els.beforeAngles.textContent =
          `Kolano: ${fmt(before.knee,"°")} • Łokieć: ${fmt(before.elbow,"°")} • Tułów: ${fmt(before.torso,"°")} • Stabilność: ${before.stab!=null ? (Number(before.stab)*100).toFixed(0)+"%" : "—"}`;
      }else els.beforeAngles.textContent = "—";
    }

    if(els.afterAngles){
      if(after){
        els.afterAngles.textContent =
          `Kolano: ${fmt(after.knee,"°")} • Łokieć: ${fmt(after.elbow,"°")} • Tułów: ${fmt(after.torso,"°")} • Stabilność: ${after.stab!=null ? (Number(after.stab)*100).toFixed(0)+"%" : "—"}`;
      }else els.afterAngles.textContent = "—";
    }

    const recos = computeReco(session, before, after);
    if(els.recoList){
      els.recoList.innerHTML = `<ul class="recoUl">${recos.map(r => `<li>${r}</li>`).join("")}</ul>`;
    }
  }

  if(beforeSel) beforeSel.onchange = renderPair;
  if(afterSel) afterSel.onchange = renderPair;

  renderPair();
}