export const presets = {
  road: {
    comfort: { knee:{min:140,max:150}, elbow:{min:85,max:105}, torso:{min:40,max:55} },
    neutral: { knee:{min:142,max:152}, elbow:{min:80,max:100}, torso:{min:35,max:50} },
    aero:    { knee:{min:145,max:155}, elbow:{min:70,max:90},  torso:{min:25,max:40} }
  },
  gravel: {
    comfort: { knee:{min:140,max:150}, elbow:{min:90,max:110}, torso:{min:40,max:55} },
    neutral: { knee:{min:142,max:152}, elbow:{min:85,max:105}, torso:{min:35,max:50} },
    aero:    { knee:{min:145,max:155}, elbow:{min:75,max:95},  torso:{min:25,max:40} }
  },
  mtb: {
    comfort: { knee:{min:140,max:150}, elbow:{min:95,max:115}, torso:{min:40,max:60} },
    neutral: { knee:{min:142,max:152}, elbow:{min:90,max:110}, torso:{min:35,max:55} },
    aero:    { knee:{min:145,max:155}, elbow:{min:80,max:100}, torso:{min:25,max:45} }
  }
};

export function toLabelDiscipline(v){
  if(v==="road") return "SZOSA";
  if(v==="gravel") return "GRAVEL";
  if(v==="mtb") return "MTB";
  return "—";
}
export function toLabelGoal(v){
  if(v==="comfort") return "Komfort";
  if(v==="neutral") return "Neutral";
  if(v==="aero") return "Aero";
  return "—";
}
