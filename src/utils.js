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
  
  // NOUVEAU : Cas spécifique "30min" ou "45 min" (sans 'h')
  if (str.includes('min') && !str.includes('h') && !str.includes(':')) {
    const m = parseFloat(str.replace(/[^0-9.,]/g, '').replace(',', '.'));
    return (m || 0) / 60;
  }

  // Cas classique "1h30" ou "1.5"
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
    agents: localStorage.getItem('edt-agents'),
    postes: localStorage.getItem('edt-postes'),
    periodes: localStorage.getItem('edt-periodes'),
    templateVersions: localStorage.getItem('edt-template-versions'),
    customWeeks: localStorage.getItem('edt-custom-weeks'),
    exceptions: localStorage.getItem('edt-exceptions'),
    absencesRetards: localStorage.getItem('edt-absences-retards'),
    setupDone: localStorage.getItem('edt-setup-done'),
    dotation: localStorage.getItem('edt-dotation'),
    theme: localStorage.getItem('edt-theme'),
    darkMode: localStorage.getItem('edt-dark-mode'),
    customColors: localStorage.getItem('edt-custom-colors')
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `sauvegarde_planning_cpe_${new Date().toISOString().split('T')[0]}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const executeImport = (file) => {
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const data = JSON.parse(event.target.result);
      if (data.agents) localStorage.setItem('edt-agents', data.agents);
      if (data.postes) localStorage.setItem('edt-postes', data.postes);
      if (data.periodes) localStorage.setItem('edt-periodes', data.periodes);
      if (data.templateVersions) localStorage.setItem('edt-template-versions', data.templateVersions);
      if (data.customWeeks) localStorage.setItem('edt-custom-weeks', data.customWeeks);
      if (data.exceptions) localStorage.setItem('edt-exceptions', data.exceptions);
      if (data.absencesRetards) localStorage.setItem('edt-absences-retards', data.absencesRetards);
      if (data.dotation !== undefined) localStorage.setItem('edt-dotation', data.dotation);
      if (data.theme) localStorage.setItem('edt-theme', data.theme);
      if (data.darkMode) localStorage.setItem('edt-dark-mode', data.darkMode);
      if (data.customColors) localStorage.setItem('edt-custom-colors', data.customColors);
      localStorage.setItem('edt-setup-done', 'true');
      
      window.location.reload();
    } catch (err) {
      alert("Erreur : le fichier de sauvegarde est invalide ou corrompu.");
    }
  };
  reader.readAsText(file);
};

export const importerDonnees = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!window.confirm("⚠️ Attention : l'import va écraser vos données actuelles. Continuer ?")) {
    e.target.value = null;
    return;
  }
  executeImport(file);
};

export const getJoursFerie = (year) => {
  const a = year % 19, b = Math.floor(year / 100), c = year % 100;
  const d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const monthPaques = Math.floor((h + l - 7 * m + 114) / 31);
  const dayPaques = ((h + l - 7 * m + 114) % 31) + 1;

  const paques = new Date(year, monthPaques - 1, dayPaques);
  const lundiPaques = new Date(paques); lundiPaques.setDate(paques.getDate() + 1);
  const ascension = new Date(paques); ascension.setDate(paques.getDate() + 39);
  const pentecote = new Date(paques); pentecote.setDate(paques.getDate() + 50);

  const pad = n => String(n).padStart(2, '0');
  const formatDate = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

  return [
    { nom: "Jour de l'An", date: `${year}-01-01` }, { nom: "Fête du Travail", date: `${year}-05-01` }, 
    { nom: "Victoire 1945", date: `${year}-05-08` }, { nom: "Fête Nationale", date: `${year}-07-14` }, 
    { nom: "Assomption", date: `${year}-08-15` }, { nom: "Toussaint", date: `${year}-11-01` }, 
    { nom: "Armistice", date: `${year}-11-11` }, { nom: "Noël", date: `${year}-12-25` },
    { nom: "Lundi de Pâques", date: formatDate(lundiPaques) }, 
    { nom: "Jeudi de l'Ascension", date: formatDate(ascension) }, 
    { nom: "Lundi de Pentecôte", date: formatDate(pentecote) }
  ];
};

export const generateGrid = (limitesHeures, sonneries = [], amplitude) => {
  const gridLines = [];
  const gridLabelsWeekly = []; 
  const gridLabelsDaily = []; 

  for (let i = limitesHeures.baseMins; i <= limitesHeures.baseMins + limitesHeures.span; i += 5) {
     const h = String(Math.floor(i/60)).padStart(2,'0');
     const m = String(i%60).padStart(2,'0');
     const timeStr = `${h}:${m}`;
     const isSonnerie = sonneries.includes(timeStr);
     const is15Min = i % 15 === 0;
     const isHeurePleine = i % 60 === 0;
     const topPercent = ((i - limitesHeures.baseMins) / limitesHeures.span) * 100;
     
     if ((isSonnerie || is15Min) && topPercent > 0.5) {
         gridLines.push({ timeStr, mins: i, isSonnerie, topPercent, isHeurePleine, is15Min });
     }

     if (isHeurePleine) {
         gridLabelsWeekly.push({ timeStr, mins: i, topPercent });
         gridLabelsDaily.push({ timeStr, mins: i, topPercent });
     }
  }
  return { gridLines, gridLabelsWeekly, gridLabelsDaily };
};

export const layoutDayEventsByAgent = (dayEvents, agentsList, dayIndex) => {
  const workingAgentIds = agentsList
    .filter(a => (a.jours ? a.jours[dayIndex] : true) || dayEvents.some(e => e.extendedProps?.agentId === a.id))
    .map(a => a.id);

  const totalCols = Math.max(1, workingAgentIds.length);

  return {
    workingAgentIds,
    layouted: dayEvents.map(evt => {
      const startD = new Date(evt.start);
      const endD = new Date(evt.end);
      const agentId = evt.extendedProps?.agentId;
      const col = Math.max(0, workingAgentIds.indexOf(agentId));

      return {
        evt,
        startMins: startD.getHours() * 60 + startD.getMinutes(),
        endMins: endD.getHours() * 60 + endD.getMinutes(),
        col: col !== -1 ? col : 0,
        totalCols
      };
    })
  };
};

export const detecterChevauchements = (eventsList) => {
  const idsEnConflit = new Set();
  const affectations = eventsList.filter(e => !e.extendedProps?.isBesoin && !e.extendedProps?.isAbsence && e.extendedProps?.agentId);

  for (let i = 0; i < affectations.length; i++) {
    for (let j = i + 1; j < affectations.length; j++) {
      const e1 = affectations[i];
      const e2 = affectations[j];

      if (Number(e1.extendedProps.agentId) === Number(e2.extendedProps.agentId)) {
        const start1 = new Date(e1.start).getTime();
        const end1 = new Date(e1.end).getTime();
        const start2 = new Date(e2.start).getTime();
        const end2 = new Date(e2.end).getTime();

        if (start1 < end2 && start2 < end1) {
          idsEnConflit.add(String(e1.id).split('_')[0]);
          idsEnConflit.add(String(e2.id).split('_')[0]);
        }
      }
    }
  }
  return idsEnConflit;
};