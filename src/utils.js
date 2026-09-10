export const BASE_HEURES_PLEINES = 1607;

export const hexToRgb = (hex) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return `${parseInt(h.substring(0,2), 16) || 0}, ${parseInt(h.substring(2,4), 16) || 0}, ${parseInt(h.substring(4,6), 16) || 0}`;
};

export const getContrastYIQ = (hexcolor) => {
  if (!hexcolor) return '#ffffff';
  let hex = hexcolor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substr(0, 2), 16) || 0;
  const g = parseInt(hex.substr(2, 2), 16) || 0;
  const b = parseInt(hex.substr(4, 2), 16) || 0;
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#111827' : '#ffffff'; 
};

export const THEMES = {
  menthe_terracotta: {
    nom: "Menthe & Terracotta",
    btnPrimary: "bg-[#CB7659] hover:bg-[#B3634B] text-white transition-colors", textAccent: "text-[#CB7659]",
    fcPrimary: "#CB7659", fcPrimaryHover: "#B3634B", fcToday: "rgba(203, 118, 89, 0.15)",
    light: {
      sidebar: "bg-[#c3dbb7]", sidebarText: "text-[#2A3B32]", sidebarIconBtn: "bg-black/5 hover:bg-black/10 border-black/10",
      headerBg: "bg-[#c3dbb7]", headerText: "text-[#2A3B32]", header: "text-[#4A6B53]", textMenuMuted: "text-[#6B8572]",
      bgMain: "bg-[#E1ECE0]", bgLight: "bg-[#D4E2D3]", borderLight: "border-[#C5D6C6]", cardBg: "bg-[#F0F5EE]",
      activeTab: "bg-[#F0F5EE] text-[#CB7659] font-bold shadow-sm border border-[#D4E2D3]",
      hexBgMain: "#E1ECE0", hexCardBg: "#F0F5EE", hexBgLight: "#D4E2D3", hexBorder: "#C5D6C6", hexText: "#374151"
    },
    dark: {
      sidebar: "bg-[#15201A]", sidebarText: "text-[#E1ECE0]", sidebarIconBtn: "bg-white/5 hover:bg-white/10 border-white/10",
      headerBg: "bg-[#15201A]", headerText: "text-[#E1ECE0]", header: "text-[#c3dbb7]", textMenuMuted: "text-[#9EBAAA]",
      bgMain: "bg-[#0D1410]", bgLight: "bg-[#1A2921]", borderLight: "border-[#23382D]", cardBg: "bg-[#111A15]",
      activeTab: "bg-[#111A15] text-[#CB7659] font-bold shadow-sm border border-[#23382D]",
      hexBgMain: "#0D1410", hexCardBg: "#111A15", hexBgLight: "#1A2921", hexBorder: "#23382D", hexText: "#E5E7EB"
    }
  },
  sauge_poudre: {
    nom: "Sauge & Poudré",
    btnPrimary: "bg-[#D49A9A] hover:bg-[#BF8787] text-white transition-colors", textAccent: "text-[#D49A9A]",
    fcPrimary: "#D49A9A", fcPrimaryHover: "#BF8787", fcToday: "rgba(212, 154, 154, 0.15)",
    light: {
      sidebar: "bg-[#5C6656]", sidebarText: "text-white", sidebarIconBtn: "bg-white/10 hover:bg-white/20 border-white/20",
      headerBg: "bg-[#5C6656]", headerText: "text-white", header: "text-[#5C6656]", textMenuMuted: "text-[#A9B3A4]",
      bgMain: "bg-[#E6EBE5]", bgLight: "bg-[#D8DED7]", borderLight: "border-[#C6CDC5]", cardBg: "bg-[#F0F2F0]",
      activeTab: "bg-[#F0F2F0] text-[#D49A9A] font-bold shadow-sm border border-[#D8DED7]",
      hexBgMain: "#E6EBE5", hexCardBg: "#F0F2F0", hexBgLight: "#D8DED7", hexBorder: "#C6CDC5", hexText: "#374151"
    },
    dark: {
      sidebar: "bg-[#1C211B]", sidebarText: "text-[#E6EBE5]", sidebarIconBtn: "bg-white/5 hover:bg-white/10 border-white/10",
      headerBg: "bg-[#1C211B]", headerText: "text-[#E6EBE5]", header: "text-[#C6CDC5]", textMenuMuted: "text-[#B6C0B1]",
      bgMain: "bg-[#111410]", bgLight: "bg-[#252B23]", borderLight: "border-[#313A2E]", cardBg: "bg-[#161A15]",
      activeTab: "bg-[#161A15] text-[#D49A9A] font-bold shadow-sm border border-[#313A2E]",
      hexBgMain: "#111410", hexCardBg: "#161A15", hexBgLight: "#252B23", hexBorder: "#313A2E", hexText: "#E5E7EB"
    }
  },
  lavande_moutarde: {
    nom: "Myrtille & Moutarde",
    btnPrimary: "bg-[#DDAA3D] hover:bg-[#C29431] text-white transition-colors", textAccent: "text-[#DDAA3D]",
    fcPrimary: "#DDAA3D", fcPrimaryHover: "#C29431", fcToday: "rgba(221, 170, 61, 0.15)",
    light: {
      sidebar: "bg-[#413C58]", sidebarText: "text-white", sidebarIconBtn: "bg-white/10 hover:bg-white/20 border-white/20",
      headerBg: "bg-[#413C58]", headerText: "text-white", header: "text-[#413C58]", textMenuMuted: "text-[#A39EBC]",
      bgMain: "bg-[#E8E7ED]", bgLight: "bg-[#DCDAED]", borderLight: "border-[#C8C5DD]", cardBg: "bg-[#F2F1F5]",
      activeTab: "bg-[#F2F1F5] text-[#DDAA3D] font-bold shadow-sm border border-[#DCDAED]",
      hexBgMain: "#E8E7ED", hexCardBg: "#F2F1F5", hexBgLight: "#DCDAED", hexBorder: "#C8C5DD", hexText: "#374151"
    },
    dark: {
      sidebar: "bg-[#191623]", sidebarText: "text-[#E8E7ED]", sidebarIconBtn: "bg-white/5 hover:bg-white/10 border-white/10",
      headerBg: "bg-[#191623]", headerText: "text-[#E8E7ED]", header: "text-[#C8C5DD]", textMenuMuted: "text-[#B4B0C8]",
      bgMain: "bg-[#0E0C14]", bgLight: "bg-[#231F32]", borderLight: "border-[#2D2940]", cardBg: "bg-[#14121C]",
      activeTab: "bg-[#14121C] text-[#DDAA3D] font-bold shadow-sm border border-[#2D2940]",
      hexBgMain: "#0E0C14", hexCardBg: "#14121C", hexBgLight: "#231F32", hexBorder: "#2D2940", hexText: "#E5E7EB"
    }
  },
  classique: {
    nom: "Bleu Classique",
    btnPrimary: "bg-[#2563EB] hover:bg-[#1D4ED8] text-white transition-colors", textAccent: "text-[#1E40AF]", 
    fcPrimary: "#2563EB", fcPrimaryHover: "#1D4ED8", fcToday: "rgba(37, 99, 235, 0.15)",
    light: {
      sidebar: "bg-[#1E3A8A]", sidebarText: "text-white", sidebarIconBtn: "bg-white/10 hover:bg-white/20 border-white/20",
      headerBg: "bg-[#1E3A8A]", headerText: "text-white", header: "text-[#1E3A8A]", textMenuMuted: "text-[#93C5FD]", 
      bgMain: "bg-[#E0E7FF]", bgLight: "bg-[#DBEAFE]", borderLight: "border-[#BFDBFE]", cardBg: "bg-[#EEF2FF]",
      activeTab: "bg-[#EEF2FF] text-[#1E3A8A] font-bold shadow-sm border border-[#DBEAFE]",
      hexBgMain: "#E0E7FF", hexCardBg: "#EEF2FF", hexBgLight: "#DBEAFE", hexBorder: "#BFDBFE", hexText: "#374151"
    },
    dark: {
      sidebar: "bg-[#0A1128]", sidebarText: "text-[#E0E7FF]", sidebarIconBtn: "bg-white/5 hover:bg-white/10 border-white/10",
      headerBg: "bg-[#0A1128]", headerText: "text-[#E0E7FF]", header: "text-[#60A5FA]", textMenuMuted: "text-[#3B82F6]", 
      bgMain: "bg-[#040712]", bgLight: "bg-[#111D3D]", borderLight: "border-[#1E2E5B]", cardBg: "bg-[#080D1D]",
      activeTab: "bg-[#080D1D] text-[#60A5FA] font-bold shadow-sm border border-[#1E2E5B]",
      hexBgMain: "#040712", hexCardBg: "#080D1D", hexBgLight: "#111D3D", hexBorder: "#1E2E5B", hexText: "#E5E7EB"
    }
  },
  personnalise: {
    nom: "Personnalisé",
    btnPrimary: "custom-btn transition-colors", textAccent: "custom-text-accent",
    fcPrimary: "var(--c-acc)", fcPrimaryHover: "var(--c-acc)", fcToday: "rgba(var(--c-acc-rgb), 0.15)",
    light: {
      sidebar: "custom-sidebar", sidebarText: "text-white", sidebarIconBtn: "bg-black/10 hover:bg-black/20 border-transparent",
      headerBg: "custom-sidebar", headerText: "text-white", header: "custom-text-primary", textMenuMuted: "text-white/70",
      bgMain: "custom-bg-main", bgLight: "custom-bg-light", borderLight: "custom-border", cardBg: "custom-card",
      activeTab: "custom-card custom-text-accent font-bold shadow-sm border custom-border",
      hexBgMain: "rgba(var(--c-prim-rgb), 0.05)", hexCardBg: "#ffffff", hexBgLight: "rgba(var(--c-prim-rgb), 0.15)", hexBorder: "rgba(var(--c-prim-rgb), 0.2)", hexText: "#374151"
    },
    dark: {
      sidebar: "custom-sidebar-dark", sidebarText: "custom-text-primary", sidebarIconBtn: "bg-white/5 hover:bg-white/10 border-transparent",
      headerBg: "custom-sidebar-dark", headerText: "custom-text-primary", header: "custom-text-primary", textMenuMuted: "custom-text-primary-muted",
      bgMain: "bg-[#0f1115]", bgLight: "custom-sidebar-dark", borderLight: "custom-border-dark", cardBg: "bg-[#16181d]",
      activeTab: "bg-[#16181d] custom-text-accent font-bold shadow-sm border custom-border-dark",
      hexBgMain: "#0f1115", hexCardBg: "#16181d", hexBgLight: "rgba(var(--c-prim-rgb), 0.1)", hexBorder: "rgba(var(--c-prim-rgb), 0.2)", hexText: "#E5E7EB"
    }
  }
};

export const formatHeureMinutes = (decimal) => {
  if (decimal === undefined || decimal === null || Number.isNaN(Number(decimal))) return "";
  const arrondi = Math.round(Number(decimal) * 60) / 60; 
  const absVal = Math.abs(arrondi);
  let h = Math.floor(absVal);
  let m = Math.round((absVal - h) * 60);
  if (m === 60) { h += 1; m = 0; }
  return `${arrondi < 0 ? "-" : ""}${h}h${m.toString().padStart(2, '0')}min`;
};

export const formatHeureTableau = (decimal, showZero = false) => {
  if (decimal === undefined || decimal === null || Number.isNaN(decimal)) return "";
  const arrondi = Math.round(decimal * 60) / 60; 
  if (arrondi === 0) return showZero ? "0h00" : "";
  const absVal = Math.abs(arrondi);
  let h = Math.floor(absVal);
  let m = Math.round((absVal - h) * 60);
  if (m === 60) { h += 1; m = 0; }
  return `${arrondi < 0 ? "-" : ""}${h}h${m.toString().padStart(2, '0')}`;
};

export const parseHeureSaisie = (chaine) => {
  if (!chaine) return 0;
  const str = String(chaine).toLowerCase().trim();
  
  if (str.includes('min') && !str.includes('h') && !str.includes(':')) {
    const m = parseFloat(str.replace(/[^0-9.,]/g, '').replace(',', '.'));
    return (m || 0) / 60;
  }

  const clean = str.replace('min', '').replace('h', ':').replace(',', '.').trim();
  if (clean.includes(':')) {
    const parts = clean.split(':');
    return (parseFloat(parts[0]) || 0) + ((parseFloat(parts[1]) || 0) / 60);
  }
  return parseFloat(clean) || 0;
};

export const calculerContratBetty = (quotite, estEtudiant) => {
  const q = (parseFloat(String(quotite).replace(',', '.')) || 100) / 100;
  const baseLegale = BASE_HEURES_PLEINES - 14; 
  let hDecimale = baseLegale * q;
  if (estEtudiant) {
    hDecimale -= (200 * q);
  }
  const h = Math.floor(hDecimale);
  const m = Math.floor((hDecimale - h) * 60);
  const mArrondi = m - (m % 5); 
  return h + (mArrondi / 60);
};

export const getMondayStr = (dInput) => {
  const d = new Date(dInput);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
};

export const extractTimeStr = (dateObjOrStr) => {
  if (!dateObjOrStr) return '08:00';
  if (typeof dateObjOrStr === 'string') {
    if (dateObjOrStr.includes('T')) return dateObjOrStr.split('T')[1].substring(0, 5);
    if (dateObjOrStr.includes(':')) return dateObjOrStr.substring(0, 5);
  }
  const d = new Date(dateObjOrStr);
  if (!isNaN(d.getTime())) return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
  return '08:00';
};

export const resetAllData = () => {
  if(window.confirm("⚠️ Voulez-vous vraiment effacer TOUTES les données ? Cette action est irréversible.")) {
    localStorage.clear();
    window.location.reload();
  }
};

export const exporterDonnees = () => {
  const data = {
    agents: JSON.parse(localStorage.getItem('edt-agents') || '[]'),
    postes: JSON.parse(localStorage.getItem('edt-postes') || '[]'),
    periodes: JSON.parse(localStorage.getItem('edt-periodes') || '[]'),
    templateVersions: JSON.parse(localStorage.getItem('edt-template-versions') || '[]'),
    customWeeks: JSON.parse(localStorage.getItem('edt-custom-weeks') || '{}'),
    exceptions: JSON.parse(localStorage.getItem('edt-exceptions') || '{}'),
    absences: JSON.parse(localStorage.getItem('edt-absences-retards') || '[]'),
    dotation: localStorage.getItem('edt-dotation') || '0',
    amplitude: JSON.parse(localStorage.getItem('edt-amplitude') || '{"start":"07:30","end":"18:00"}'),
    sonneries: JSON.parse(localStorage.getItem('edt-sonneries') || '[]')
  };
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
  const dlAnchorElem = document.createElement('a');
  dlAnchorElem.setAttribute("href",     dataStr     );
  dlAnchorElem.setAttribute("download", `edt_cpe_backup_${new Date().toISOString().split('T')[0]}.json`);
  dlAnchorElem.click();
};

export const getActiveContract = (agent, dateStr) => {
  if (!agent.avenants || agent.avenants.length === 0) return agent;
  const sortedAvenants = [...agent.avenants].sort((a, b) => b.date.localeCompare(a.date));
  const activeAvenant = sortedAvenants.find(av => av.date <= dateStr);
  
  if (activeAvenant) {
    return { ...agent, quotite: activeAvenant.quotite, estEtudiant: activeAvenant.estEtudiant };
  }
  return agent; 
};

export const calculerContratProratise = (agent, baseYear, fnCalculBase) => {
  if (!agent.avenants || agent.avenants.length === 0) {
    return fnCalculBase(agent.quotite, agent.estEtudiant);
  }
  
  const start = new Date(baseYear, 8, 1); 
  const end = new Date(baseYear + 1, 7, 31); 
  const msPerDay = 1000 * 60 * 60 * 24;
  const totalDays = Math.round((end - start) / msPerDay) + 1;
  
  let totalHours = 0;
  
  for (let i = 0; i < totalDays; i++) {
    const d = new Date(start.getTime() + i * msPerDay);
    const pad = n => String(n).padStart(2, '0');
    const dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    
    const active = getActiveContract(agent, dateStr);
    const heuresAnnuellesType = fnCalculBase(active.quotite, active.estEtudiant);
    totalHours += (heuresAnnuellesType / totalDays);
  }
  
  return Math.round(totalHours * 100) / 100;
};

export const getJoursFerie = (year) => {
  const paques = (y) => {
    const a = y % 19;
    const b = Math.floor(y / 100);
    const c = y % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(y, month - 1, day);
  };

  const p = paques(year);
  const addDays = (date, days) => {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  };

  const format = (d) => {
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };

  return [
    { nom: "Jour de l'An", date: `${year}-01-01` },
    { nom: "Fête du Travail", date: `${year}-05-01` },
    { nom: "Victoire 1945", date: `${year}-05-08` },
    { nom: "Fête Nationale", date: `${year}-07-14` },
    { nom: "Assomption", date: `${year}-08-15` },
    { nom: "Toussaint", date: `${year}-11-01` },
    { nom: "Armistice 1918", date: `${year}-11-11` },
    { nom: "Noël", date: `${year}-12-25` },
    { nom: "Lundi de Pâques", date: format(addDays(p, 1)) },
    { nom: "Ascension", date: format(addDays(p, 39)) },
    { nom: "Lundi de Pentecôte", date: format(addDays(p, 50)) }
  ].sort((a, b) => a.date.localeCompare(b.date));
};

export const layoutDayEventsByAgent = (dayEvents, agents, dayIndex) => {
  const workingAgentIds = [...new Set(dayEvents.map(e => e.extendedProps?.agentId))].filter(Boolean);
  
  workingAgentIds.sort((a, b) => {
    const idxA = agents.findIndex(ag => ag.id === a);
    const idxB = agents.findIndex(ag => ag.id === b);
    return idxA - idxB;
  });

  const totalCols = Math.max(1, workingAgentIds.length);
  const layouted = [];

  dayEvents.forEach(evt => {
    const agentId = evt.extendedProps?.agentId;
    let col = workingAgentIds.indexOf(agentId);
    if (col === -1) col = 0;

    const startD = new Date(evt.start);
    const endD = new Date(evt.end);
    const startMins = startD.getHours() * 60 + startD.getMinutes();
    const endMins = endD.getHours() * 60 + endD.getMinutes();

    layouted.push({
      evt,
      startMins,
      endMins,
      col,
      totalCols
    });
  });

  return { workingAgentIds, layouted };
};

export const generateGrid = (limitesHeures, sonneries = [], amplitude = null) => {
  const lines = [];
  const labelsWeekly = [];
  const labelsDaily = [];

  for (let m = limitesHeures.baseMins; m <= limitesHeures.baseMins + limitesHeures.span; m += 15) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    const topPercent = ((m - limitesHeures.baseMins) / limitesHeures.span) * 100;
    
    const isHeurePleine = min === 0;
    const isSonnerie = sonneries.includes(timeStr);
    const isStartDay = amplitude && timeStr === amplitude.start;

    lines.push({ timeStr, topPercent, isHeurePleine, isSonnerie, isStartDay });

    if (isHeurePleine || isSonnerie) {
      labelsWeekly.push({ timeStr, topPercent, isSonnerie });
      labelsDaily.push({ timeStr, topPercent, isSonnerie });
    }
  }
  return { gridLines: lines, gridLabelsWeekly: labelsWeekly, gridLabelsDaily: labelsDaily };
};

export const detecterChevauchements = (events) => {
  const conflits = new Set();
  const affectations = events.filter(e => !e.extendedProps?.isBesoin && !e.extendedProps?.isAbsence);
  
  for (let i = 0; i < affectations.length; i++) {
    for (let j = i + 1; j < affectations.length; j++) {
      const e1 = affectations[i];
      const e2 = affectations[j];
      
      if (e1.extendedProps?.agentId === e2.extendedProps?.agentId) {
        const s1 = new Date(e1.start).getTime();
        const end1 = new Date(e1.end).getTime();
        const s2 = new Date(e2.start).getTime();
        const end2 = new Date(e2.end).getTime();
        
        if (s1 < end2 && s2 < end1) {
          conflits.add(String(e1.id).split('_')[0]);
          conflits.add(String(e2.id).split('_')[0]);
        }
      }
    }
  }
  return conflits;
};

// --- IMPORTATION SÉCURISÉE ---
export const executeImport = (data) => {
  const parseIfString = (val) => {
    if (typeof val === 'string') {
      try { return JSON.parse(val); } catch(e) { return val; }
    }
    return val;
  };

  const safeStringify = (val) => JSON.stringify(parseIfString(val));

  if (data.agents) localStorage.setItem('edt-agents', safeStringify(data.agents));
  if (data.postes) localStorage.setItem('edt-postes', safeStringify(data.postes));
  if (data.periodes) localStorage.setItem('edt-periodes', safeStringify(data.periodes));
  if (data.templateVersions) localStorage.setItem('edt-template-versions', safeStringify(data.templateVersions));
  if (data.customWeeks) localStorage.setItem('edt-custom-weeks', safeStringify(data.customWeeks));
  if (data.exceptions) localStorage.setItem('edt-exceptions', safeStringify(data.exceptions));
  
  const absData = data.absences || data.absencesRetards;
  if (absData) localStorage.setItem('edt-absences-retards', safeStringify(absData));
  
  if (data.dotation !== undefined) localStorage.setItem('edt-dotation', data.dotation.toString());
  if (data.amplitude) localStorage.setItem('edt-amplitude', safeStringify(data.amplitude));
  if (data.sonneries) localStorage.setItem('edt-sonneries', safeStringify(data.sonneries));
  
  // Indique à l'application que la configuration est terminée
  localStorage.setItem('edt-setup-done', 'true');
};

export const importerDonnees = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      executeImport(data);
      alert("Sauvegarde restaurée avec succès !");
      window.location.reload();
    } catch (err) {
      alert("Erreur lors de la lecture du fichier JSON.");
    }
  };
  reader.readAsText(file);
};