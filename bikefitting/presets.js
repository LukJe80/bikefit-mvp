export function toLabelDiscipline(d){
  return d==="mtb" ? "MTB" : (d==="gravel" ? "GRAVEL" : "SZOSA");
}
export function toLabelGoal(g){
  return g==="comfort" ? "Komfort" : (g==="aero" ? "Aero" : "Neutral");
}

export function presets(discipline, goal){
  // MVP progi — dopracujemy na Twoich testach
  const base = {
    road:   { knee:[140,155], elbow:[140,165], torso:[30,55] },
    gravel: { knee:[138,153], elbow:[138,162], torso:[28,52] },
    mtb:    { knee:[135,150], elbow:[135,158], torso:[25,48] }
  };

  const adj = (goal==="comfort")
    ? { knee:-2, elbow:-3, torso:-3 }
    : (goal==="aero")
      ? { knee:+2, elbow:+2, torso:+3 }
      : { knee:0, elbow:0, torso:0 };

  const b = base[discipline] || base.road;
  return {
    knee:[ b.knee[0]+adj.knee, b.knee[1]+adj.knee ],
    elbow:[ b.elbow[0]+adj.elbow, b.elbow[1]+adj.elbow ],
    torso:[ b.torso[0]+adj.torso, b.torso[1]+adj.torso ],
  };
}