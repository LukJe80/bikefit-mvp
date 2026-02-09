export function presets(discipline, goal){
  // Proste, ale działające presety MVP.
  // Później możemy dopracować zakresy (np. per aero/komfort + antropometria).
  const base = {
    road:   { knee:[145,160], elbow:[150,175], torso:[35,55] },
    gravel: { knee:[143,160], elbow:[150,176], torso:[35,58] },
    mtb:    { knee:[140,158], elbow:[155,178], torso:[40,65] }
  }[discipline] || { knee:[145,160], elbow:[150,175], torso:[35,55] };

  const g = goal || "neutral";
  const tweak = (arr, a, b) => [arr[0]+a, arr[1]+b];

  if(g === "comfort"){
    return {
      knee: base.knee,
      elbow: tweak(base.elbow, -2, -2),
      torso: tweak(base.torso, 5, 8)
    };
  }
  if(g === "aero"){
    return {
      knee: base.knee,
      elbow: tweak(base.elbow, 0, 0),
      torso: tweak(base.torso, -6, -4)
    };
  }
  return base; // neutral
}

export function toLabelDiscipline(v){
  return v==="mtb" ? "MTB" : v==="gravel" ? "GRAVEL" : "SZOSA";
}
export function toLabelGoal(v){
  return v==="comfort" ? "Komfort" : v==="aero" ? "Aero" : "Neutral";
}