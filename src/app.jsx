import { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

const BASE_HEURES_PLEINES = 1607;

// --- FONCTION DE CONVERSION HEX -> RGB POUR LE THÈME DYNAMIQUE ---
const hexToRgb = (hex) => {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
  return `${parseInt(h.substring(0,2), 16) || 0}, ${parseInt(h.substring(2,4), 16) || 0}, ${parseInt(h.substring(4,6), 16) || 0}`;
};
const getContrastYIQ = (hexcolor) => {
  if (!hexcolor) return '#ffffff';
  let hex = hexcolor.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.substr(0, 2), 16) || 0;
  const g = parseInt(hex.substr(2, 2), 16) || 0;
  const b = parseInt(hex.substr(4, 2), 16) || 0;
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#111827' : '#ffffff'; // Renvoie Noir si fond clair, Blanc si fond sombre
};
// ============================================================================
// CONFIGURATION DES THÈMES VISUELS
// ============================================================================
const THEMES = {
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

// --- FORMATAGE ET PARSING DES HEURES ---
const formatHeureMinutes = (decimal) => {
  if (decimal === undefined || decimal === null || Number.isNaN(Number(decimal))) return "";
  const arrondi = Math.round(Number(decimal) * 60) / 60; 
  const absVal = Math.abs(arrondi);
  let h = Math.floor(absVal);
  let m = Math.round((absVal - h) * 60);
  if (m === 60) { h += 1; m = 0; }
  return `${arrondi < 0 ? "-" : ""}${h}h${m.toString().padStart(2, '0')}min`;
};

const parseHeureSaisie = (chaine) => {
  if (chaine === undefined || chaine === null) return 0;
  const clean = String(chaine).toLowerCase().replace('min', '').replace('h', ':').replace(',', '.').trim();
  if (clean.includes(':')) {
    const parts = clean.split(':');
    return parseFloat(parts[0]) + (parseFloat(parts[1] || 0) / 60);
  }
  return parseFloat(clean) || 0;
};

// --- CALCULATRICE BETTY ---
const calculerContratBetty = (quotite, estEtudiant) => {
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

// --- FONCTION DE RÉINITIALISATION GLOBALE ---
const resetAllData = () => {
  if(window.confirm("⚠️ Voulez-vous vraiment effacer TOUTES les données ? Cette action est irréversible.")) {
    localStorage.clear();
    window.location.reload();
  }
};

// --- FONCTIONS D'EXPORT ET D'IMPORT ---
const exporterDonnees = () => {
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

const executeImport = (file) => {
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

const importerDonnees = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  if (!window.confirm("⚠️ Attention : l'import va écraser vos données actuelles. Continuer ?")) {
    e.target.value = null;
    return;
  }
  executeImport(file);
};

// --- MOTEUR DE CALCUL DES JOURS FÉRIÉS ---
const getJoursFerie = (year) => {
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

// ============================================================================
// ASSISTANT DE PREMIÈRE CONFIGURATION (WIZARD)
// ============================================================================
const SetupWizard = ({ onComplete, t }) => {
  const [step, setStep] = useState(1);
  const [periodes, setPeriodes] = useState([]);
  const [agents, setAgents] = useState([]);
  const [postes, setPostes] = useState([{ id: 101, nom: 'Loge', couleur: '#EF4444' }, { id: 102, nom: 'Cantine', couleur: '#F59E0B' }, { id: 103, nom: 'Grille', couleur: '#8B5CF6' }]);

  const [anneeScolaireDeBase, setAnneeScolaireDeBase] = useState(new Date().getMonth() >= 6 ? new Date().getFullYear() : new Date().getFullYear() - 1);
  const [zone, setZone] = useState("Zone C");
  const [isFetchingDates, setIsFetchingDates] = useState(false);
  const [dotation, setDotation] = useState(0);

  const [formPeriode, setFormPeriode] = useState({ nom: '', debut: '', fin: '', type: 'vacances' });
  const [formAgent, setFormAgent] = useState({ nom: '', quotite: '100', estEtudiant: false, hContrat: calculerContratBetty(100, false), couleurFond: '#3B82F6' });
  const [formPoste, setFormPoste] = useState({ nom: '', couleur: '#10B981' });

  const handleAgentChange = (champ, valeur) => {
    const newAgent = { ...formAgent, [champ]: valeur };
    if (champ === 'quotite' || champ === 'estEtudiant') {
      newAgent.hContrat = calculerContratBetty(newAgent.quotite, newAgent.estEtudiant);
    }
    setFormAgent(newAgent);
  };

  const autoGenerateDates = async () => {
    setIsFetchingDates(true);
    const year1 = anneeScolaireDeBase; 
    const year2 = anneeScolaireDeBase + 1;
    let nouvellesPeriodes = [];
    
    const feriesY1 = getJoursFerie(year1).filter(f => f.date >= `${year1}-08-15`);
    const feriesY2 = getJoursFerie(year2).filter(f => f.date <= `${year2}-08-15`);
    nouvellesPeriodes = [...feriesY1, ...feriesY2].map(f => ({ 
      id: `ferie_${Date.now()}_${Math.random()}`, nom: f.nom, debut: f.date, fin: f.date, type: 'ferie'
    }));

    nouvellesPeriodes.push({
      id: `vac_pre_${Date.now()}`, nom: "Vacances d'Été (Pré-rentrée)", debut: `${year1}-07-01`, fin: `${year1}-08-31`, type: 'vacances'
    });

    try {
      const zoneFormattee = zone.replace(' ', '+');
      const urlApi = `https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-calendrier-scolaire/records?limit=100&refine=zones%3A${zoneFormattee}&refine=annee_scolaire%3A${year1}-${year2}`;
      const res = await fetch(urlApi);
      const data = await res.json();
      
      let vacs = (data.results || [])
        .filter(r => !r.population || !r.population.toLowerCase().includes("enseignant"))
        .filter(r => r.description && r.description.toLowerCase().includes("vacances"))
        .map(r => {
           const endD = new Date(r.end_date); 
           endD.setDate(endD.getDate() - 1);
           const pad = n => String(n).padStart(2, '0');
           return { 
             id: `vac_${Date.now()}_${Math.random()}`, nom: r.description, debut: r.start_date.split('T')[0], fin: `${endD.getFullYear()}-${pad(endD.getMonth()+1)}-${pad(endD.getDate())}`, type: 'vacances'
           };
        });

      vacs = Array.from(new Map(vacs.map(item => [item.debut, item])).values());

      vacs = vacs.map(v => {
        if (v.nom.toLowerCase().includes("été") && v.fin < `${year2}-08-31`) {
          return { ...v, fin: `${year2}-08-31` };
        }
        return v;
      });

      if (vacs.length === 0 && year1 === 2026) {
         const fallback = [
           { nom: "Vacances de la Toussaint", debut: "2026-10-17", fin: "2026-11-01" }, { nom: "Vacances de Noël", debut: "2026-12-19", fin: "2027-01-03" },
           { nom: "Vacances d'Hiver", debut: zone.includes("A") ? "2027-02-06" : (zone.includes("B") ? "2027-02-13" : "2027-02-20"), fin: zone.includes("A") ? "2027-02-21" : (zone.includes("B") ? "2027-02-28" : "2027-03-07") },
           { nom: "Vacances de Printemps", debut: zone.includes("A") ? "2027-04-10" : (zone.includes("B") ? "2027-04-17" : "2027-04-24"), fin: zone.includes("A") ? "2027-04-25" : (zone.includes("B") ? "2027-05-02" : "2027-05-09") },
           { nom: "Vacances d'Été", debut: "2027-07-07", fin: "2027-08-31" }
         ];
         vacs = fallback.map(f => ({ id: `fallback_${Date.now()}_${Math.random()}`, nom: f.nom, debut: f.debut, fin: f.fin, type: 'vacances' }));
      } else if (vacs.length === 0) {
         alert(`⚠️ Les vacances scolaires de ${year1}-${year2} ne sont pas encore disponibles sur l'API.`);
      }

      nouvellesPeriodes = [...nouvellesPeriodes, ...vacs];
    } catch (e) {
      alert("Erreur de connexion. Seuls les jours fériés fixes ont pu être ajoutés.");
    }
    
    setPeriodes(nouvellesPeriodes.sort((a,b) => a.debut.localeCompare(b.debut)));
    setIsFetchingDates(false);
  };

  const finishSetup = () => {
    localStorage.setItem('edt-periodes', JSON.stringify(periodes));
    localStorage.setItem('edt-agents', JSON.stringify(agents));
    localStorage.setItem('edt-postes', JSON.stringify(postes));
    localStorage.setItem('edt-dotation', dotation.toString());
    
    const baseDate = new Date(`${anneeScolaireDeBase}-09-01`);
    const day = baseDate.getDay() || 7; 
    baseDate.setDate(baseDate.getDate() - (day - 1));
    const pad = n => String(n).padStart(2, '0');
    const startStr = `${baseDate.getFullYear()}-${pad(baseDate.getMonth()+1)}-${pad(baseDate.getDate())}`;

    localStorage.setItem('edt-template-versions', JSON.stringify([{ id: 1, nom: "Modèle Initial", dateDebut: startStr, events: [], besoins: [], statut: 'brouillon' }]));
    localStorage.setItem('edt-setup-done', 'true');
    onComplete();
  };

  return (
    <div className={`min-h-screen ${t.bgMain} flex flex-col items-center py-12 px-4 transition-colors`}>
      <div className={`w-full max-w-2xl ${t.cardBg} rounded-xl shadow-xl overflow-hidden border border-black/5`}>
        <div className={`${t.headerBg} p-6 ${t.headerText} text-center`}>
          <h1 className="text-3xl font-black tracking-wider">Planning CPE</h1><p className="opacity-80 mt-1">Configuration Initiale ({step}/4)</p>
        </div>
        
        <div className="p-8">
          {step === 1 && (
            <div className="text-center space-y-6">
              <h2 className={`text-2xl font-bold ${t.header}`}>Bienvenue !</h2>
              <p className="text-gray-500">Souhaitez-vous importer une sauvegarde existante ou paramétrer une nouvelle année scolaire ?</p>
              <div className="grid grid-cols-2 gap-4 mt-8">
                <button onClick={() => document.getElementById('import-init').click()} className="p-6 border-2 border-dashed border-emerald-500 rounded-xl hover:bg-emerald-500/10 transition group"><div className="text-4xl mb-2 group-hover:scale-110 transition">⬆️</div><div className="font-bold text-emerald-600">Importer JSON</div></button>
                <input type="file" id="import-init" accept=".json" onChange={(e) => { if(e.target.files[0]) executeImport(e.target.files[0]); }} className="hidden" />
                <button onClick={() => setStep(2)} className={`p-6 border-2 border-transparent ${t.bgLight} transition group hover:brightness-95 rounded-xl`}><div className="text-4xl mb-2 group-hover:scale-110 transition">✨</div><div className={`font-bold ${t.header}`}>Nouvelle Année</div></button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className={`text-xl font-bold ${t.header} border-b pb-2`}>1. Vacances & Jours Fériés</h2>
              <p className="text-sm text-gray-500">Générez automatiquement toutes les dates de fermeture en choisissant votre zone et l'année de rentrée.</p>
              
              <div className={`flex gap-4 p-4 ${t.bgLight} border ${t.borderLight} rounded-xl items-end shadow-inner`}>
                <div className="w-1/4"><label className={`text-xs font-bold ${t.header} block mb-1`}>Année Rentrée</label><input type="number" value={anneeScolaireDeBase} onChange={e=>setAnneeScolaireDeBase(Number(e.target.value))} className="w-full p-2 rounded border bg-transparent" /></div>
                <div className="flex-1"><label className={`text-xs font-bold ${t.header} block mb-1`}>Zone Académique</label><select value={zone} onChange={e=>setZone(e.target.value)} className="w-full p-2 rounded border bg-transparent"><option value="Zone A">Zone A</option><option value="Zone B">Zone B</option><option value="Zone C">Zone C</option><option value="Corse">Corse</option></select></div>
                <div><button onClick={autoGenerateDates} disabled={isFetchingDates} className={`${t.btnPrimary} px-4 py-2 rounded font-bold shadow disabled:opacity-50`}>{isFetchingDates ? '⏳ Calcul...' : '⚡ Générer'}</button></div>
              </div>
              
              <ul className="space-y-2 max-h-48 overflow-y-auto p-2 rounded border border-black/10">
                {periodes.length === 0 && <p className="text-xs text-gray-500 italic text-center py-4">Aucune date configurée.</p>}
                {periodes.map(p => ( 
                  <li key={p.id} className={`flex justify-between items-center ${t.bgLight} p-2 rounded shadow-sm text-sm border ${t.borderLight}`}>
                    <span className="font-bold text-gray-700">{p.nom} 
                      <span className={`ml-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white ${p.type === 'ferie' ? 'bg-green-600' : 'bg-blue-600'}`}>
                        {p.type === 'ferie' ? 'Férié (Payé)' : 'Vacances (0h)'}
                      </span>
                      <span className="font-normal text-gray-500 text-xs ml-2">({p.debut}{p.debut !== p.fin ? ` au ${p.fin}` : ''})</span>
                    </span>
                    <button onClick={() => setPeriodes(periodes.filter(x => x.id !== p.id))} className="text-red-500 hover:text-red-700 font-bold px-2">✖</button>
                  </li> 
                ))}
              </ul>

              <div className="flex gap-2 border-t border-black/10 pt-4 flex-wrap">
                <input type="text" placeholder="Ajout manuel..." value={formPeriode.nom} onChange={e=>setFormPeriode({...formPeriode, nom: e.target.value})} className="flex-1 border p-2 rounded text-sm min-w-[150px] bg-transparent" />
                <select value={formPeriode.type} onChange={e=>setFormPeriode({...formPeriode, type: e.target.value})} className="border p-2 rounded text-sm w-32 bg-transparent">
                  <option value="vacances">Vacances</option>
                  <option value="ferie">Férié</option>
                </select>
                <input type="date" value={formPeriode.debut} onChange={e=>setFormPeriode({...formPeriode, debut: e.target.value})} className="border p-2 rounded text-sm w-32 bg-transparent" />
                <input type="date" value={formPeriode.fin} onChange={e=>setFormPeriode({...formPeriode, fin: e.target.value})} className="border p-2 rounded text-sm w-32 bg-transparent" />
                <button onClick={() => { if(formPeriode.nom && formPeriode.debut) { setPeriodes([...periodes, {id: Date.now(), ...formPeriode}].sort((a,b) => a.debut.localeCompare(b.debut))); setFormPeriode({nom:'', debut:'', fin:'', type:'vacances'}); } }} className={`${t.btnPrimary} px-3 rounded font-bold`}>+</button>
              </div>

              <div className="flex justify-between pt-4 mt-4 border-t border-black/10"><button onClick={() => setStep(1)} className="text-gray-500 font-bold px-4 py-2">⬅ Retour</button><button onClick={() => setStep(3)} className={`${t.btnPrimary} px-6 py-2 rounded-lg font-bold shadow`}>Suivant ➔</button></div>
            </div>
          )}

          {step === 3 && (() => {
            // Calcul parfait sécurisé contre les erreurs de décimales JS
            const totalETP = Math.round(agents.reduce((sum, a) => sum + Number(a.quotite), 0)) / 100;
            const isOverflow = dotation > 0 && totalETP > dotation;
            const isExact = dotation > 0 && totalETP === dotation;

            return (
              <div className="space-y-6 animate-in fade-in">
                <h2 className={`text-xl font-bold ${t.header} border-b pb-2`}>2. Équipe AED & Dotation</h2>
                <p className="text-sm text-gray-500">Saisissez la dotation globale de votre établissement, puis ajoutez les agents.</p>
                
                <div className={`p-5 rounded-xl border flex justify-between items-center transition-all ${isOverflow ? 'bg-red-900/10 border-red-500/50' : `${t.bgLight} ${t.borderLight} shadow-sm`}`}>
                  <div>
                    <label className={`text-[10px] font-bold ${t.header} uppercase tracking-wider block mb-1`}>Dotation Globale (Budget)</label>
                    <div className="flex items-center gap-2">
                      <input type="number" step="0.5" value={dotation || ''} onChange={e => setDotation(parseFloat(e.target.value) || 0)} placeholder="Ex: 5.5" className={`border ${t.borderLight} p-2 w-24 text-center rounded-lg font-black text-2xl ${t.header} bg-transparent outline-none focus:ring-2 transition-all`} />
                      <span className="font-bold text-gray-500">ETP</span>
                    </div>
                  </div>
                  
                  <div className="text-right flex flex-col justify-center">
                    <label className={`text-[10px] font-bold ${t.header} uppercase tracking-wider block mb-1`}>Budget Consommé</label>
                    <div className="flex items-end justify-end gap-1">
                      <span className={`text-4xl font-black leading-none ${isOverflow ? 'text-red-500' : (isExact ? 'text-emerald-500' : t.textAccent)}`}>
                        {totalETP.toFixed(2)}
                      </span>
                      <span className="text-sm font-bold text-gray-500 mb-1">/ {dotation || '?'} ETP</span>
                    </div>
                    {dotation > 0 && (
                      <span className={`text-xs font-bold mt-1 ${isOverflow ? 'text-red-500' : 'text-emerald-500'}`}>
                        {isOverflow 
                          ? `⚠️ Dépassement : +${(totalETP - dotation).toFixed(2)} ETP` 
                          : `✅ Reste à pourvoir : ${(dotation - totalETP).toFixed(2)} ETP`}
                      </span>
                    )}
                  </div>
                </div>

<div className={`${t.bgLight} p-4 rounded-xl border ${t.borderLight} grid grid-cols-12 gap-3 items-end`}>
                  <div className="col-span-4"><label className={`text-[10px] font-bold ${t.header} uppercase`}>Nom</label><input type="text" value={formAgent.nom} onChange={e=>handleAgentChange('nom', e.target.value)} className="w-full p-2 text-sm rounded border bg-transparent" placeholder="Ex: Célia" /></div>
                  <div className="col-span-2"><label className={`text-[10px] font-bold ${t.header} uppercase`}>Quot. (%)</label><input type="number" step="0.1" value={formAgent.quotite} onChange={e=>handleAgentChange('quotite', e.target.value)} className="w-full p-2 text-sm rounded border bg-transparent font-bold text-center" /></div>
                  <div className="col-span-3 flex items-center justify-center pb-2"><label className={`flex items-center gap-1 text-[10px] font-bold ${t.header} cursor-pointer bg-transparent px-2 py-1.5 border rounded shadow-sm`}><input type="checkbox" checked={formAgent.estEtudiant} onChange={e=>handleAgentChange('estEtudiant', e.target.checked)} className="w-3 h-3" />🎓 Étudiant</label></div>
                  <div className="col-span-3"><label className={`text-[10px] font-bold ${t.header} uppercase`}>Contrat</label><input type="text" value={typeof formAgent.hContrat === 'number' ? formatHeureMinutes(formAgent.hContrat) : formAgent.hContrat} onChange={e=>setFormAgent({...formAgent, hContrat: e.target.value})} onBlur={e=>setFormAgent({...formAgent, hContrat: parseHeureSaisie(e.target.value)})} className="w-full p-2 text-sm rounded border font-mono text-center bg-transparent" /></div>
                  
                  <div className="col-span-2"><label className={`text-[10px] font-bold ${t.header} uppercase`}>Coul.</label><input type="color" value={formAgent.couleurFond} onChange={e=>setFormAgent({...formAgent, couleurFond: e.target.value})} className="w-full h-9 rounded cursor-pointer p-0 border-0" /></div>
                  <div className="col-span-10 mt-1">
                    <button type="button" onClick={() => { if(formAgent.nom) { const hC = typeof formAgent.hContrat === 'string' ? parseHeureSaisie(formAgent.hContrat) : formAgent.hContrat; setAgents([...agents, {id: Date.now(), nom: formAgent.nom, quotite: parseFloat(formAgent.quotite), estEtudiant: formAgent.estEtudiant, hContrat: hC, couleurFond: formAgent.couleurFond}]); setFormAgent({...formAgent, nom: '', estEtudiant: false}); } }} className={`w-full ${t.btnPrimary} px-4 py-2 rounded text-sm font-bold shadow`}>Ajouter cet agent</button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {agents.map(a => (
                    <span key={a.id} className="text-sm font-bold px-3 py-1 rounded-full flex items-center gap-2 shadow-sm" style={{ backgroundColor: a.couleurFond, color: getContrastYIQ(a.couleurFond) }}>
                      {a.nom} {a.estEtudiant && '🎓'} ({a.quotite}%) 
                      <button onClick={()=>setAgents(agents.filter(x=>x.id!==a.id))} className="hover:opacity-60 transition-opacity">✖</button>
                    </span>
                  ))}
                </div>

                <div className="flex justify-between pt-4 mt-8 border-t border-black/10"><button onClick={() => setStep(2)} className="text-gray-500 font-bold px-4 py-2">⬅ Retour</button><button onClick={() => { if(agents.length === 0 && !window.confirm("Aucun agent ajouté. Continuer ?")) return; setStep(4); }} className={`${t.btnPrimary} px-6 py-2 rounded-lg font-bold shadow`}>Suivant ➔</button></div>
              </div>
            );
          })()}
          
          {step === 4 && (
            <div className="space-y-6 animate-in fade-in">
              <h2 className={`text-xl font-bold ${t.header} border-b pb-2`}>3. Postes / Lieux</h2>
              <p className="text-sm text-gray-500">Définissez les postes clés du planning de l'établissement.</p>
              
              <div className="flex gap-2">
                <input type="text" placeholder="Nom du poste..." value={formPoste.nom} onChange={e=>setFormPoste({...formPoste, nom: e.target.value})} className={`flex-1 border ${t.borderLight} p-2 rounded text-sm bg-transparent`} />
                <input type="color" value={formPoste.couleur} onChange={e=>setFormPoste({...formPoste, couleur: e.target.value})} className="w-10 h-10 rounded cursor-pointer p-0 border-0" />
                <button onClick={() => { if(formPoste.nom) { setPostes([...postes, {id: Date.now(), nom: formPoste.nom, couleur: formPoste.couleur}]); setFormPoste({...formPoste, nom: ''}); } }} className={`${t.btnPrimary} px-4 rounded font-bold`}>+</button>
              </div>

              <div className="flex flex-wrap gap-2">
                {postes.map(p => (
                  <span key={p.id} className="text-sm font-bold px-3 py-1 rounded-full flex items-center gap-2 shadow-sm" style={{ backgroundColor: p.couleur, color: getContrastYIQ(p.couleur) }}>
                    {p.nom} 
                    <button onClick={()=>setPostes(postes.filter(x=>x.id!==p.id))} className="hover:opacity-60 transition-opacity">✖</button>
                  </span>
                ))}
              </div>

              <div className="flex justify-between pt-4 mt-8 border-t border-black/10">
                <button onClick={() => setStep(3)} className="text-gray-500 font-bold px-4 py-2">⬅ Retour</button>
                <button onClick={finishSetup} className={`${t.btnPrimary} px-8 py-3 rounded-lg font-black shadow-lg text-lg animate-pulse`}>Lancer l'Application 🚀</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ALGORITHME ANTI-CHEVAUCHEMENT POUR L'IMPRESSION DU PLANNING
// ============================================================================
const layoutDayEvents = (dayEvents) => {
  const items = dayEvents.map(evt => {
    const startD = new Date(evt.start);
    const endD = new Date(evt.end);
    return {
      evt,
      startMins: startD.getHours() * 60 + startD.getMinutes(),
      endMins: endD.getHours() * 60 + endD.getMinutes(),
      col: 0,
      totalCols: 1
    };
  }).sort((a, b) => a.startMins - b.startMins || b.endMins - a.endMins);

  if (items.length === 0) return [];

  const clusters = [];
  let currentCluster = [items[0]];

  for (let i = 1; i < items.length; i++) {
    const item = items[i];
    const overlaps = currentCluster.some(c => !(item.endMins <= c.startMins || item.startMins >= c.endMins));
    if (overlaps) {
      currentCluster.push(item);
    } else {
      clusters.push(currentCluster);
      currentCluster = [item];
    }
  }
  clusters.push(currentCluster);

  const layouted = [];
  clusters.forEach(cluster => {
    const cols = [];
    cluster.forEach(item => {
      let col = 0;
      while (cols[col] && cols[col] > item.startMins) {
        col++;
      }
      cols[col] = item.endMins;
      item.col = col;
    });
    const maxCol = cols.length;
    cluster.forEach(item => {
      item.totalCols = maxCol;
      layouted.push(item);
    });
  });

  return layouted;
};
// ============================================================================
// GRILLES D'IMPRESSION
// ============================================================================
const PrintTimeGridView = ({ events, titre, sonneries }) => {
  const planningEvents = events.filter(e => !e.extendedProps?.isBesoin);
  const nomsJours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const BASE_MINS = 460;
  const TOTAL_SPAN = 600;

  return (
    <div className="print-weekly-page flex flex-col bg-white p-2">
      <div className="text-center mb-2 border-b border-black pb-1 shrink-0">
        <h2 className="text-xl font-black uppercase tracking-wider text-gray-900">{titre}</h2>
        <p className="text-gray-500 font-bold text-xs">Édité le {new Date().toLocaleDateString('fr-FR')}</p>
      </div>

      <div className="flex flex-1 border border-black relative overflow-hidden bg-white">
        <div className="w-14 flex flex-col border-r border-black bg-gray-100 text-[10px] font-bold text-gray-600 shrink-0 relative">
          {sonneries.map(s => {
            const [h, m] = s.split(':').map(Number);
            const topPercent = (((h * 60 + m) - BASE_MINS) / TOTAL_SPAN) * 100;
            if (topPercent < 0 || topPercent > 100) return null;
            return (
              <div key={s} className="absolute w-full pr-2 text-right" style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}>{s}</div>
            );
          })}
        </div>

        <div className="flex-1 grid grid-cols-5 relative bg-white">
          {[1, 2, 3, 4, 5].map(day => {
            const dayEvents = planningEvents.filter(e => new Date(e.start).getDay() === day);
            const layoutedEvents = layoutDayEvents(dayEvents); 

            return (
              <div key={day} className="flex flex-col border-r border-black last:border-r-0 relative">
                <div className="bg-gray-200 font-black text-center py-1 border-b border-black uppercase text-xs text-gray-800 shrink-0">{nomsJours[day - 1]}</div>
                <div className="flex-1 relative bg-white">
                  {sonneries.map(s => {
                    const [h, m] = s.split(':').map(Number);
                    const topPercent = (((h * 60 + m) - BASE_MINS) / TOTAL_SPAN) * 100;
                    if (topPercent < 0 || topPercent > 100) return null;
                    return (<div key={s} className="absolute w-full border-b border-gray-200 pointer-events-none" style={{ top: `${topPercent}%` }}></div>);
                  })}

                  {layoutedEvents.map(item => {
                    const { evt, startMins, endMins, col, totalCols } = item;
                    const startD = new Date(evt.start);
                    const endD = new Date(evt.end);
                    const top = Math.max(0, ((startMins - BASE_MINS) / TOTAL_SPAN) * 100);
                    const height = Math.min(100 - top, ((endMins - startMins) / TOTAL_SPAN) * 100);
                    
                    const isAbs = evt.extendedProps?.isAbsence;
                    const couleur = isAbs ? (evt.extendedProps?.typeAbsence === 'absence' ? '#ef4444' : '#f59e0b') : (evt.borderColor || '#3b82f6');
                    const bgClass = isAbs ? (evt.extendedProps?.typeAbsence === 'absence' ? 'bg-red-50 text-red-900' : 'bg-orange-50 text-orange-900') : 'bg-blue-50 text-blue-900';

                    const widthPercent = 100 / totalCols;
                    const leftPercent = col * widthPercent;

                    return (
                      <div key={evt.id} className={`absolute rounded p-1 border overflow-hidden shadow-xs ${bgClass}`}
                        style={{ top: `${top}%`, height: `${Math.max(height, 4)}%`, left: `${leftPercent}%`, width: `${widthPercent}%`, borderLeftColor: couleur, borderLeftWidth: '4px', fontSize: '9px', lineHeight: '1.1', boxSizing: 'border-box' }}
                      >
                        <div className="font-black truncate text-[9px]" style={{ color: couleur }}>{isAbs ? (evt.extendedProps?.typeAbsence === 'absence' ? 'ABSENCE' : 'RETARD') : evt.extendedProps?.posteNom}</div>
                        <div className="font-bold truncate text-[8px] text-gray-800">{evt.extendedProps?.agentName || evt.extendedProps?.agentNom}</div>
                        <div className="text-[7px] opacity-75 font-mono">{startD.getHours()}h{String(startD.getMinutes()).padStart(2,'0')}-{endD.getHours()}h{String(endD.getMinutes()).padStart(2,'0')}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const PrintAgentYearlyView = ({ agent, baseYear, anneeScolaire, getMondayStr, getInfosPeriode, exceptions, formatHeureTableau, absences, getHeuresTheoriquesJour, getHeuresAbsence }) => {
  const semestre1 = anneeScolaire.slice(0, 6); 
  const semestre2 = anneeScolaire.slice(6);    
  const nomsJours = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

  const renderTable = (moisList, title, pageNum) => (
    <div className="print-agent-page flex flex-col justify-between p-4 bg-white">
      <div className="text-center font-black text-lg uppercase mb-3 text-black border-b-2 border-black pb-2 shrink-0">
        Bilan Annuel : {agent?.nom} — {title} ({baseYear}-{baseYear+1})
      </div>
      <div className="flex-1 flex flex-col justify-center">
        <table className="w-full text-center border-collapse text-black border-2 border-black table-fixed">
          <thead>
            <tr>
              {moisList.map((mois, i) => (
                <th key={i} className="border border-black bg-yellow-400 py-1.5 uppercase font-bold text-[11px]">{mois.nom}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 31 }, (_, i) => i + 1).map(jourNum => (
              <tr key={jourNum}>
                {moisList.map((mois, idx) => {
                  const daysInMonth = new Date(mois.y, mois.m + 1, 0).getDate();
                  if (jourNum > daysInMonth) return <td key={idx} className="border border-gray-400 bg-gray-200"></td>;

                  const dateObj = new Date(mois.y, mois.m, jourNum);
                  const dateStr = `${mois.y}-${String(mois.m+1).padStart(2,'0')}-${String(jourNum).padStart(2,'0')}`;
                  
                  const dayOfWeek = dateObj.getDay();
                  const nomJour = nomsJours[dayOfWeek];
                  const infoPeriode = getInfosPeriode(dateObj);

                  const exc = exceptions[`${agent.id}_${dateStr}`];
                  
                  let hFinal = exc ? exc.h : getHeuresTheoriquesJour(agent.id, dateStr);
                  
                  const absDuJour = absences.filter(a => a.agentId === agent.id && a.start.startsWith(dateStr));
                  const hDeduct = absDuJour.filter(a => a.deduire).reduce((tot, a) => tot + getHeuresAbsence(a), 0);
                  hFinal = Math.max(0, hFinal - hDeduct);

                  let noteAffichage = infoPeriode ? infoPeriode.nom : (exc ? exc.note : '');
                  if (absDuJour.length > 0) {
                    const txtAbs = absDuJour.map(a => `${a.type.toUpperCase()}${a.deduire?' (-h)':''}`).join(', ');
                    noteAffichage = noteAffichage ? `${noteAffichage} / ${txtAbs}` : txtAbs;
                  }

                  let bgJour = "bg-white"; 
                  if (dayOfWeek === 0) bgJour = "bg-gray-100"; 
                  if (dayOfWeek === 6) bgJour = "bg-gray-50";  
                  
                  if (infoPeriode) {
                    if (infoPeriode.type === 'ferie') bgJour = "bg-green-100 text-green-900 font-bold";
                    else bgJour = "bg-blue-50 text-blue-900"; 
                  }

                  if (absDuJour.length > 0) bgJour = "bg-red-100 text-red-900 font-bold";

                  return (
                    <td key={idx} className="border border-black p-0 h-[18px]">
                      <div className="flex h-full items-stretch text-[9px] overflow-hidden">
                        <div className={`w-7 flex-shrink-0 flex items-center justify-center border-r border-black font-bold ${bgJour}`}>
                          <span className="opacity-70 mr-0.5 text-[7px]">{nomJour[0]}</span>{jourNum}
                        </div>
                        <div className={`w-9 flex-shrink-0 flex items-center justify-center font-bold font-mono border-r border-black text-[9px] ${exc || absDuJour.length > 0 ? 'bg-orange-100 text-orange-900' : ''}`}>
                          {formatHeureTableau(hFinal)}
                        </div>
                        <div className="flex-1 flex items-center px-1 text-[8px] text-gray-900 font-medium whitespace-nowrap overflow-hidden">
                          {noteAffichage}
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-right text-[10px] text-black font-bold mt-1 shrink-0">
        Page {pageNum} / 2
      </div>
    </div>
  );

  return (
    <div className="w-full bg-white print-agent-container">
      {renderTable(semestre1, "Semestre 1", 1)}
      {renderTable(semestre2, "Semestre 2", 2)}
    </div>
  );
};

// ============================================================================
// COMPOSANT PRINCIPAL DE L'APPLICATION GESTION
// ============================================================================
const MainApp = ({ t, themeId, changeTheme, isDarkMode, toggleDarkMode, customColors, updateCustomColor }) => {
  const [vueActive, setVueActive] = useState('template'); 
  const [agentConsulte, setAgentConsulte] = useState(null); 
  const [jourConsulte, setJourConsulte] = useState(() => {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  });

  const [agents, setAgents] = useState(() => JSON.parse(localStorage.getItem('edt-agents') || '[]'));
  const [postes, setPostes] = useState(() => JSON.parse(localStorage.getItem('edt-postes') || '[]'));
  
  const [periodesFeriees, setPeriodesFeriees] = useState(() => {
    const s = localStorage.getItem('edt-periodes');
    if (!s) return [];
    return JSON.parse(s).map(p => ({
      ...p,
      type: p.type || (p.nom.toLowerCase().includes('vacance') ? 'vacances' : 'ferie')
    }));
  });
  
  const [dotation, setDotation] = useState(() => parseFloat(localStorage.getItem('edt-dotation')) || 0);

  const [templateVersions, setTemplateVersions] = useState(() => {
    const s = localStorage.getItem('edt-template-versions');
    return s ? JSON.parse(s).map(p => ({ ...p, statut: p.statut || 'valide' })) : [];
  });
  window.__templateVersions__ = templateVersions;

  const [activeTemplateId, setActiveTemplateId] = useState(() => {
    const s = localStorage.getItem('edt-template-versions');
    return s ? JSON.parse(s)[0].id : 1;
  });

  const [customWeeks, setCustomWeeks] = useState(() => JSON.parse(localStorage.getItem('edt-custom-weeks') || '{}'));
  const [exceptions, setExceptions] = useState(() => JSON.parse(localStorage.getItem('edt-exceptions') || '{}'));
const [sonneries, setSonneries] = useState(() => {
    const s = localStorage.getItem('edt-sonneries');
    return s ? JSON.parse(s) : ['08:00', '08:55', '10:05', '11:00', '11:55', '12:50', '13:45', '14:40', '15:50', '16:45', '17:40'];
  });
  const [sonneriesText, setSonneriesText] = useState(() => sonneries.join(', '));
  
  const handleSonneriesBlur = () => {
    const arr = sonneriesText.split(',')
      .map(s => s.trim().replace('h', ':'))
      .filter(s => /^\d{1,2}:\d{2}$/.test(s))
      .map(s => { let [h, m] = s.split(':'); return `${h.padStart(2,'0')}:${m.padStart(2,'0')}`; })
      .sort();
    if(arr.length === 0) arr.push('08:00'); // Failsafe
    setSonneries(arr); setSonneriesText(arr.join(', '));
    localStorage.setItem('edt-sonneries', JSON.stringify(arr));
  };
  
  const renderSlotLabel = (arg) => {
    const timeStr = `${String(arg.date.getHours()).padStart(2,'0')}:${String(arg.date.getMinutes()).padStart(2,'0')}`;
    if (sonneries.includes(timeStr)) {
      return { html: `<span class="font-bold opacity-80" style="font-size:11px;">${timeStr}</span>` };
    }
    return { html: '' };
  };
  // Détermination de l'année scolaire de référence dynamique
  const getSchoolYearBase = () => {
     if (templateVersions.length > 0 && templateVersions[0].dateDebut) {
        const d = new Date(templateVersions[0].dateDebut);
        return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
     }
     const now = new Date(); return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  };
  const baseYear = getSchoolYearBase();
  const anneeScolaire = [
    { m: 8, y: baseYear, nom: 'SEPTEMBRE' }, { m: 9, y: baseYear, nom: 'OCTOBRE' },
    { m: 10, y: baseYear, nom: 'NOVEMBRE' }, { m: 11, y: baseYear, nom: 'DECEMBRE' },
    { m: 0, y: baseYear+1, nom: 'JANVIER' }, { m: 1, y: baseYear+1, nom: 'FEVRIER' },
    { m: 2, y: baseYear+1, nom: 'MARS' }, { m: 3, y: baseYear+1, nom: 'AVRIL' },
    { m: 4, y: baseYear+1, nom: 'MAI' }, { m: 5, y: baseYear+1, nom: 'JUIN' },
    { m: 6, y: baseYear+1, nom: 'JUILLET' }
  ];

  const [absences, setAbsences] = useState(() => {
    const s = localStorage.getItem('edt-absences-retards');
    if (!s) return [];
    const parsed = JSON.parse(s);
    return parsed.map(a => {
      if (a.start && a.end) return a;
      const h = a.heures || Math.floor(a.dureeTotale || a.duree || 0);
      const m = a.minutes || Math.round(((a.dureeTotale || a.duree || 0) - h) * 60);
      const startD = new Date(`${a.date}T08:00:00`);
      const endD = new Date(startD);
      endD.setHours(startD.getHours() + h, startD.getMinutes() + m);
      const pad = n => String(n).padStart(2, '0');
      const formatLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
      
      return {
        id: a.id || String(Date.now() + Math.random()),
        agentId: a.agentId,
        type: a.type || 'absence',
        start: formatLocal(startD),
        end: formatLocal(endD),
        motif: a.motif || '',
        deduire: a.deduire !== undefined ? a.deduire : (a.type === 'retard'),
        rattrape: a.rattrape || false,
        journeeComplete: a.journeeComplete
      };
    });
  });

  const currentTemplate = templateVersions.find(tv => tv.id === activeTemplateId) || templateVersions[0] || {id:1, events:[], besoins:[]};

  const [modalCreation, setModalCreation] = useState({ isOpen: false, eventId: null, start: null, end: null });
  const [formTypeEvent, setFormTypeEvent] = useState('affectation'); 
  const [formTypeAbsence, setFormTypeAbsence] = useState('absence'); 
  const [formAbsenceDeduire, setFormAbsenceDeduire] = useState(false);
  const [formAgent, setFormAgent] = useState('');
  const [formPoste, setFormPoste] = useState('');
  const [formNote, setFormNote] = useState('');

  const [modalNewVersion, setModalNewVersion] = useState({ isOpen: false, dateDebut: `${baseYear+1}-01-04`, nom: 'Évolution Hiver' });
  const [modalNewPoste, setModalNewPoste] = useState({ isOpen: false, nom: '' });
  const [modalException, setModalException] = useState({ isOpen: false, agentId: null, dateStr: null, h: '0h00', note: '' });

  const [formAbsence, setFormAbsence] = useState({
    agentId: '',
    type: 'absence', 
    journeeComplete: true,
    dateDebut: new Date().toISOString().split('T')[0],
    dateFin: '',
    heures: '0',
    minutes: '0',
    deduireHeures: false,
    motif: 'Maladie'
  });

  const [modalBesoinMulti, setModalBesoinMulti] = useState({ isOpen: false, posteId: '', qte: 1, slots: [] });
  const [modalEditBesoin, setModalEditBesoin] = useState({ isOpen: false, id: null, posteId: '', qte: 1, start: '', end: '' });
  const [modalAgent, setModalAgent] = useState({ isOpen: false, id: null, nom: '', quotite: 100, estEtudiant: false, hContrat: calculerContratBetty(100, false), couleurFond: '#10B981' });
  const [modalParametres, setModalParametres] = useState(false);
  const [formPeriode, setFormPeriode] = useState({ nom: '', debut: '', fin: '', type: 'vacances' });

  const [modalPrint, setModalPrint] = useState(false);
  const [printFilter, setPrintFilter] = useState({ type: 'all', id: null });
  const [isPrinting, setIsPrinting] = useState(false);

  const [modeEdition, setModeEdition] = useState('agents'); 
  const [formBesoinQte, setFormBesoinQte] = useState(1);
  const [agentActif, setAgentActif] = useState(null);
  const [posteActif, setPosteActif] = useState(null);
  const [currentViewMonday, setCurrentViewMonday] = useState(null);

  const isInitialMount = useRef(true);
  const [needsBackup, setNeedsBackup] = useState(false);

  useEffect(() => {
    let isModified = false;
    let newPeriodes = [...periodesFeriees];

    newPeriodes = newPeriodes.map(p => {
      if (!p.type) {
        isModified = true;
        return { ...p, type: p.nom.toLowerCase().includes('vacance') ? 'vacances' : 'ferie' };
      }
      return p;
    });

    const hasSummerPre = newPeriodes.some(p => p.nom.includes("Pré-rentrée") || (p.debut <= `${baseYear}-08-15` && p.fin >= `${baseYear}-08-31`));
    if (!hasSummerPre) {
      newPeriodes.push({
        id: `vac_pre_auto_${Date.now()}`,
        nom: "Vacances d'Été (Pré-rentrée)",
        debut: `${baseYear}-07-01`,
        fin: `${baseYear}-08-31`,
        type: 'vacances'
      });
      isModified = true;
    }

    newPeriodes = newPeriodes.map(p => {
      if (p.nom.toLowerCase().includes("été") && p.debut >= `${baseYear+1}-06-01` && p.fin < `${baseYear+1}-08-31`) {
        isModified = true;
        return { ...p, fin: `${baseYear+1}-08-31` };
      }
      return p;
    });

    if (isModified) {
      setPeriodesFeriees(newPeriodes.sort((a, b) => a.debut.localeCompare(b.debut)));
    }
  }, [baseYear]); 
  
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      setNeedsBackup(true); 
    }
  }, [agents, postes, periodesFeriees, templateVersions, customWeeks, exceptions, absences, dotation]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (needsBackup) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [needsBackup]);

  const handleExport = () => {
    exporterDonnees();
    setNeedsBackup(false);
  };

  useEffect(() => { localStorage.setItem('edt-agents', JSON.stringify(agents)); }, [agents]);
  useEffect(() => { localStorage.setItem('edt-postes', JSON.stringify(postes)); }, [postes]);
  useEffect(() => { localStorage.setItem('edt-periodes', JSON.stringify(periodesFeriees)); }, [periodesFeriees]);
  useEffect(() => { localStorage.setItem('edt-template-versions', JSON.stringify(templateVersions)); }, [templateVersions]);
  useEffect(() => { localStorage.setItem('edt-custom-weeks', JSON.stringify(customWeeks)); }, [customWeeks]);
  useEffect(() => { localStorage.setItem('edt-exceptions', JSON.stringify(exceptions)); }, [exceptions]);
  useEffect(() => { localStorage.setItem('edt-absences-retards', JSON.stringify(absences)); }, [absences]);
  useEffect(() => { localStorage.setItem('edt-dotation', dotation.toString()); }, [dotation]);

  useEffect(() => { if (vueActive === 'planning') setModeEdition('agents'); }, [vueActive]);

  const formatHeureTableau = (decimal, showZero = false) => {
    if (decimal === undefined || decimal === null || Number.isNaN(decimal)) return "";
    const arrondi = Math.round(decimal * 60) / 60; 
    if (arrondi === 0) return showZero ? "0h00" : "";
    const absVal = Math.abs(arrondi);
    let h = Math.floor(absVal);
    let m = Math.round((absVal - h) * 60);
    if (m === 60) { h += 1; m = 0; }
    return `${arrondi < 0 ? "-" : ""}${h}h${m.toString().padStart(2, '0')}`;
  };

  const parseHeureSaisie = (chaine) => {
    if (!chaine) return 0;
    const clean = chaine.replace('h', ':').replace(',', '.');
    if (clean.includes(':')) {
      const parts = clean.split(':');
      return parseFloat(parts[0]) + (parseFloat(parts[1]) / 60);
    }
    return parseFloat(clean) || 0;
  };

  const getMondayStr = (dInput) => {
    const d = new Date(dInput);
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - (day - 1));
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  };

  const extractTimeStr = (dateObjOrStr) => {
    if (!dateObjOrStr) return '08:00';
    if (typeof dateObjOrStr === 'string') {
      if (dateObjOrStr.includes('T')) return dateObjOrStr.split('T')[1].substring(0, 5);
      if (dateObjOrStr.includes(':')) return dateObjOrStr.substring(0, 5);
    }
    const d = new Date(dateObjOrStr);
    if (!isNaN(d.getTime())) return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    return '08:00';
  };

  const shiftEventToWeek = (evt, targetMondayStr) => {
    const origMondayStr = getMondayStr(evt.start);
    if (origMondayStr === targetMondayStr) return { ...evt, id: String(evt.id).includes('_') ? evt.id : evt.id + '_' + targetMondayStr };

    const startD = new Date(evt.start);
    const endD = new Date(evt.end);
    const dayOffset = (startD.getDay() || 7) - 1;
    const endDayOffset = (endD.getDay() || 7) - 1;
    
    const parts = targetMondayStr.split('-');
    const targetM = new Date(parts[0], parts[1] - 1, parts[2]); 
    
    const newStart = new Date(targetM.getFullYear(), targetM.getMonth(), targetM.getDate() + dayOffset, startD.getHours(), startD.getMinutes());
    const newEnd = new Date(targetM.getFullYear(), targetM.getMonth(), targetM.getDate() + endDayOffset, endD.getHours(), endD.getMinutes());

    const pad = n => String(n).padStart(2, '0');
    const formatLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

    return { ...evt, start: formatLocal(newStart), end: formatLocal(newEnd), id: String(evt.id).includes('_') ? evt.id : evt.id + '_' + targetMondayStr };
  };

  const nomsJours = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

  const getInfosPeriode = (date) => {
    const pad = n => String(n).padStart(2, '0');
    const str = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
    let vacs = null;
    let ferie = null;

    for (const v of periodesFeriees) {
      if (str >= v.debut && str <= v.fin) {
        if (v.type === 'vacances') vacs = v;
        else if (v.type === 'ferie') ferie = v;
      }
    }

    if (vacs) return { type: 'vacances', nom: ferie ? `${vacs.nom} (${ferie.nom})` : vacs.nom };
    if (ferie) return { type: 'ferie', nom: ferie.nom };
    return null;
  };

  const gabarits = (() => {
    const g = {};
    templateVersions.forEach(tv => {
      g[tv.id] = {};
      agents.forEach(a => { g[tv.id][a.id] = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, totalHebdo: 0 }; });
      tv.events.forEach(evt => {
        const agentId = evt.extendedProps?.agentId;
        if (g[tv.id][agentId] && !evt.extendedProps?.isAbsence) {
          const d = new Date(evt.start);
          const duree = (new Date(evt.end) - d) / 3600000;
          g[tv.id][agentId][d.getDay()] += duree;
          g[tv.id][agentId].totalHebdo += duree;
        }
      });
    });
    return g;
  })();

  const getHeuresTheoriquesJour = (agentId, dateStr) => {
    const dateObj = new Date(dateStr);
    const mondayStr = getMondayStr(dateObj);
    const dayOfWeek = dateObj.getDay();
    const estWeekEnd = dayOfWeek === 0 || dayOfWeek === 6;
    const infoPeriode = getInfosPeriode(dateObj);
    const applicableTemplate = [...templateVersions].sort((a,b)=>b.dateDebut.localeCompare(a.dateDebut)).find(t => t.dateDebut <= dateStr) || templateVersions[0];
    
    const exc = exceptions[`${agentId}_${dateStr}`];
    if (exc) return exc.h;

    let aDesEvenementsReels = false;
    let hJour = 0;
    if (customWeeks[mondayStr]) {
      const evtsJour = customWeeks[mondayStr].filter(e => e.extendedProps?.agentId === agentId && e.start.startsWith(dateStr) && !e.extendedProps?.isAbsence && !e.extendedProps?.isBesoin);
      if (evtsJour.length > 0) {
        hJour = evtsJour.reduce((tot, e) => tot + ((new Date(e.end) - new Date(e.start)) / 3600000), 0);
        aDesEvenementsReels = true;
      }
    }

    if (!aDesEvenementsReels) {
      if (infoPeriode) {
        if (infoPeriode.type === 'ferie') {
          hJour = gabarits[applicableTemplate?.id]?.[agentId]?.[dayOfWeek] || 0;
        } else {
          hJour = 0; 
        }
      } else {
        if (customWeeks[mondayStr]) hJour = 0; 
        else if (!estWeekEnd) hJour = gabarits[applicableTemplate?.id]?.[agentId]?.[dayOfWeek] || 0;
      }
    }
    return hJour;
  };

  const getHeuresAbsence = (a) => {
    const dateStr = a.start.split('T')[0];
    const dureeSaisie = (new Date(a.end) - new Date(a.start)) / 3600000;
    const estJourneeComplete = a.journeeComplete !== undefined ? a.journeeComplete : (dureeSaisie >= 9);
    
    if (estJourneeComplete) {
      return getHeuresTheoriquesJour(a.agentId, dateStr);
    }
    return dureeSaisie;
  };

  const statsAgents = agents.map(agent => {
    let heuresConsommees = 0;
    for (let m = 8; m < 20; m++) {
      const year = baseYear + Math.floor(m / 12);
      const month = m % 12;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        
        const hJour = getHeuresTheoriquesJour(agent.id, dateStr);
        const absDuJour = absences.filter(a => a.agentId === agent.id && a.start.startsWith(dateStr) && a.deduire);
        const hDeduct = absDuJour.reduce((tot, a) => tot + getHeuresAbsence(a), 0);

        heuresConsommees += Math.max(0, hJour - hDeduct);
      }
    }
    
    const soldeGlobalBrut = agent.hContrat - heuresConsommees;
    const soldeGlobal = Math.round(soldeGlobalBrut * 60) / 60;
    
    const applicableTemplate = templateVersions.find(tv => tv.id === activeTemplateId) || templateVersions[0];
    const hHebdoType = gabarits[applicableTemplate?.id]?.[agent.id]?.totalHebdo || 0;

    return { ...agent, heuresConsommees, soldeGlobal, hHebdoType };
  });

  const checkCoverage = (besoin, realEventsForWeek, weekAbsences) => {
    let minCount = Infinity;
    const tStart = new Date(besoin.start).getTime();
    const tEnd = new Date(besoin.end).getTime();
    const step = 15 * 60 * 1000; 
    
    const posteShifts = realEventsForWeek.filter(e => e.extendedProps?.posteId === besoin.extendedProps.posteId && !e.extendedProps?.isBesoin && !e.extendedProps?.isAbsence);

    let missingAgents = new Set();

    for (let t = tStart; t < tEnd; t += step) {
      const shiftsAtT = posteShifts.filter(e => new Date(e.start).getTime() <= t && new Date(e.end).getTime() > t);
      
      let presentCount = 0;
      shiftsAtT.forEach(shift => {
        const isAbsentAtT = weekAbsences.some(abs => 
          abs.agentId === shift.extendedProps.agentId && 
          new Date(abs.start).getTime() <= t && 
          new Date(abs.end).getTime() > t
        );
        if (!isAbsentAtT) {
          presentCount++;
        } else {
          missingAgents.add(shift.extendedProps.agentNom);
        }
      });

      if (presentCount < minCount) minCount = presentCount;
    }
    if (minCount === Infinity) minCount = 0;
    
    return { isSousEffectif: minCount < Number(besoin.extendedProps.qte), minCount, missingAgents: Array.from(missingAgents) };
  };

  const getEventsForWeek = (mondayStr) => {
    if (!mondayStr) return [];
    if (customWeeks[mondayStr]) return customWeeks[mondayStr]; 
    const applicableTemplate = [...templateVersions].sort((a,b)=>b.dateDebut.localeCompare(a.dateDebut)).find(t => t.dateDebut <= mondayStr) || templateVersions[0];
    return applicableTemplate.events.map(e => shiftEventToWeek(e, mondayStr)).filter(e => {
      const info = getInfosPeriode(new Date(e.start.split('T')[0]));
      return !info || info.type !== 'vacances';
    }); 
  };

  const targetMonday = currentViewMonday || getMondayStr(currentTemplate?.dateDebut || new Date()); 
  let currentRealEvents;
  let currentBesoins;

  if ((vueActive === 'planning' || vueActive === 'journee') && currentViewMonday) {
    currentRealEvents = getEventsForWeek(currentViewMonday);
    const applicableTemplate = [...templateVersions].sort((a,b)=>b.dateDebut.localeCompare(a.dateDebut)).find(t => t.dateDebut <= currentViewMonday) || templateVersions[0];
    currentBesoins = applicableTemplate.besoins.map(b => shiftEventToWeek(b, currentViewMonday)).filter(b => {
      const info = getInfosPeriode(new Date(b.start.split('T')[0]));
      return !info || info.type !== 'vacances';
    }); 
  } else {
    currentRealEvents = currentTemplate.events.map(e => shiftEventToWeek(e, targetMonday));
    currentBesoins = currentTemplate.besoins.map(b => shiftEventToWeek(b, targetMonday));
  }

  const alertesSousEffectif = [];
  const besoinsEvents = currentBesoins.map(b => {
    const { isSousEffectif, minCount, missingAgents } = checkCoverage(b, currentRealEvents, absences);
    if (isSousEffectif) alertesSousEffectif.push({ ...b, minCount, missingAgents });
    return { ...b, backgroundColor: isSousEffectif ? '#fee2e2' : '#dcfce7', borderColor: isSousEffectif ? '#ef4444' : '#22c55e', extendedProps: { ...b.extendedProps, isBesoin: true, isSousEffectif, minCount } };
  });

  const allCalendarEvents = modeEdition === 'besoins' ? besoinsEvents : currentRealEvents;
  const displayEvents = [
    ...allCalendarEvents.filter(e => {
      if (printFilter.type === 'all') return true;
      if (printFilter.type === 'agent') return e.extendedProps?.agentId === printFilter.id;
      if (printFilter.type === 'poste') return e.extendedProps?.posteId === printFilter.id || e.extendedProps?.isBesoin;
      return true;
    }),
    ...absences.map(a => ({
      id: `abs_${a.id}`,
      start: a.start,
      end: a.end,
      title: `${a.type === 'absence' ? '🚫 ABSENCE' : '⏰ RETARD'} - ${agents.find(ag=>ag.id===a.agentId)?.nom}`,
      backgroundColor: a.type === 'absence' ? '#EF4444' : '#F59E0B',
      borderColor: a.type === 'absence' ? '#DC2626' : '#D97706',
      extendedProps: {
        isAbsence: true,
        agentId: a.agentId,
        typeAbsence: a.type,
        motif: a.motif,
        deduire: a.deduire,
        rattrape: a.rattrape
      }
    })).filter(e => {
      if (printFilter.type === 'agent' && e.extendedProps.agentId !== printFilter.id) return false;
      return true;
    })
  ];

const declencherImpression = (e) => {
    if (e) e.preventDefault();
    setPrintFilter({ type: 'all', id: null }); // Force la vue globale par défaut
    setIsPrinting(true); 
    setTimeout(() => { 
      window.print(); 
      setIsPrinting(false); 
    }, 800);
  };
  
  const updateCurrentTemplate = (newEvents, newBesoins) => {
    const newVersions = templateVersions.map(tv => tv.id === activeTemplateId ? { ...tv, events: newEvents || tv.events, besoins: newBesoins || tv.besoins } : tv);
    setTemplateVersions(newVersions);
  };

  const validerModele = () => {
    setTemplateVersions(templateVersions.map(tv => tv.id === activeTemplateId ? { ...tv, statut: 'valide' } : tv));
    
    const sorted = [...templateVersions].sort((a,b) => a.dateDebut.localeCompare(b.dateDebut));
    const currentIndex = sorted.findIndex(t => t.id === activeTemplateId);
    const nextTemplate = sorted[currentIndex + 1];
    const dateFin = nextTemplate ? nextTemplate.dateDebut : '9999-12-31';

    const affectedWeeks = Object.keys(customWeeks).filter(m => m >= currentTemplate.dateDebut && m < dateFin);
    
    if (affectedWeeks.length > 0) {
      if (confirm(`Voulez-vous propager ces corrections aux semaines réelles (du ${currentTemplate.dateDebut} au ${nextTemplate ? nextTemplate.dateDebut : 'fin d\'année'}) ?\n\nAttention : Cela écrasera les éventuelles permanences manuelles saisies sur cette période.`)) {
        const newCustomWeeks = { ...customWeeks };
        affectedWeeks.forEach(m => delete newCustomWeeks[m]);
        setCustomWeeks(newCustomWeeks);
      }
    }
  };

  const deverrouillerModele = () => {
    if (confirm("⚠️ Déverrouiller permet de corriger une erreur. Si vous modifiez les heures, les soldes passés des agents seront recalculés.\n\nContinuer ?")) {
      setTemplateVersions(templateVersions.map(tv => tv.id === activeTemplateId ? { ...tv, statut: 'brouillon' } : tv));
    }
  };

  const validerCreationVersionModal = (e) => {
    e.preventDefault();
    if (!modalNewVersion.dateDebut || !modalNewVersion.nom.trim()) return;
    const newVersion = { id: Date.now(), nom: modalNewVersion.nom.trim(), dateDebut: modalNewVersion.dateDebut, statut: 'brouillon', events: [...currentTemplate.events], besoins: [...currentTemplate.besoins] };
    const newArr = [...templateVersions, newVersion].sort((a,b) => b.dateDebut.localeCompare(a.dateDebut)); 
    setTemplateVersions(newArr);
    setActiveTemplateId(newVersion.id);
    setModalNewVersion({ isOpen: false, dateDebut: `${baseYear+1}-01-04`, nom: 'Évolution Hiver' });
  };

  const importerModele = (templateId) => {
    const template = templateVersions.find(t => t.id === Number(templateId));
    if (!template) return;
    if (confirm(`Appliquer le modèle "${template.nom}" sur la semaine du ${currentViewMonday} ?\n\nCela écrasera vos éventuelles modifications pour cette semaine, et forcera l'enregistrement de ces horaires (même pendant les vacances).`)) {
      const shiftedEvents = template.events.map(e => shiftEventToWeek(e, currentViewMonday));
      setCustomWeeks({ ...customWeeks, [currentViewMonday]: shiftedEvents });
    }
  };

  const applyAction = (action, info) => {
    const cleanId = String(info.id).split('_')[0]; 
    if (vueActive === 'template') {
      let mod = [...currentTemplate.events];
      if (action === 'add') mod.push({ ...info, id: cleanId });
      if (action === 'update') mod = mod.map(e => String(e.id).split('_')[0] === cleanId ? { ...e, start: info.start, end: info.end } : e);
      if (action === 'update_content') mod = mod.map(e => String(e.id).split('_')[0] === cleanId ? { ...e, ...info } : e);
      if (action === 'delete') mod = mod.filter(e => String(e.id).split('_')[0] !== cleanId);
      updateCurrentTemplate(mod, null);
    } else if (vueActive === 'planning' || vueActive === 'journee') {
      const monStr = getMondayStr(info.start);
      const currentWeek = customWeeks[monStr] ? [...customWeeks[monStr]] : getEventsForWeek(monStr);
      let mod = currentWeek;
      if (action === 'add') mod.push(info);
      if (action === 'update') mod = mod.map(e => String(e.id).split('_')[0] === cleanId ? { ...e, start: info.start, end: info.end } : e);
      if (action === 'update_content') mod = mod.map(e => String(e.id).split('_')[0] === cleanId ? { ...e, ...info } : e);
      if (action === 'delete') mod = mod.filter(e => String(e.id).split('_')[0] !== cleanId);
      setCustomWeeks({ ...customWeeks, [monStr]: mod });
    }
  };

  const ajouterAbsenceRetard = (e) => {
    e.preventDefault();
    if (!formAbsence.agentId || !formAbsence.dateDebut) return alert("Sélectionnez un agent et une date.");

    const agentId = Number(formAbsence.agentId);
    let datesToProcess = [];
    const startD = new Date(formAbsence.dateDebut);
    
    if (formAbsence.type === 'absence' && formAbsence.journeeComplete && formAbsence.dateFin) {
      const endD = new Date(formAbsence.dateFin);
      if (endD < startD) return alert("La date de fin doit être après la date de début.");
      for (let dt = new Date(startD); dt <= endD; dt.setDate(dt.getDate() + 1)) {
        datesToProcess.push(new Date(dt).toISOString().split('T')[0]);
      }
    } else {
      datesToProcess.push(formAbsence.dateDebut);
    }

    let newAbs = [...absences];

    datesToProcess.forEach(dateStr => {
      let startStr = `${dateStr}T08:00:00`;
      let endStr = `${dateStr}T17:30:00`;

      if (!formAbsence.journeeComplete) {
        const h = parseFloat(formAbsence.heures) || 0;
        const m = parseFloat(formAbsence.minutes) || 0;
        if (h === 0 && m === 0) return;
        
        const pad = n => String(n).padStart(2, '0');
        const startT = new Date(`${dateStr}T08:00:00`);
        const endT = new Date(startT);
        endT.setHours(startT.getHours() + h, startT.getMinutes() + m);
        startStr = `${dateStr}T08:00:00`;
        endStr = `${dateStr}T${pad(endT.getHours())}:${pad(endT.getMinutes())}:00`;
      }

      newAbs.push({
        id: String(Date.now() + Math.random()),
        agentId,
        type: formAbsence.type,
        start: startStr,
        end: endStr,
        motif: formAbsence.motif,
        deduire: formAbsence.deduireHeures,
        rattrape: false,
        journeeComplete: formAbsence.journeeComplete
      });
    });

    setAbsences(newAbs);
    alert("Opération enregistrée !");
    setFormAbsence({ agentId: '', type: 'absence', journeeComplete: true, dateDebut: new Date().toISOString().split('T')[0], dateFin: '', heures: '0', minutes: '0', deduireHeures: false, motif: 'Maladie' });
  };

  const supprimerAbsence = (id) => {
    if (confirm("Supprimer cet enregistrement et restituer le planning de l'agent ?")) {
      setAbsences(absences.filter(a => String(a.id) !== String(id).replace('abs_','')));
    }
  };

  const toggleRattrape = (id) => {
    setAbsences(absences.map(a => String(a.id) === String(id) ? { ...a, rattrape: !a.rattrape } : a));
  };

  const bilanAbsences = agents.map(ag => {
    const agAbs = absences.filter(a => a.agentId === ag.id);
    const abs = agAbs.filter(a => a.type === 'absence');
    const ret = agAbs.filter(a => a.type === 'retard');
    const retNonRat = ret.filter(a => !a.rattrape && a.deduire);

    return {
      id: ag.id,
      nom: ag.nom,
      couleur: ag.couleurFond,
      nbAbs: abs.length,
      hAbs: abs.reduce((sum, a) => sum + getHeuresAbsence(a), 0),
      nbRet: ret.length,
      hRet: ret.reduce((sum, a) => sum + getHeuresAbsence(a), 0),
      nbRetRat: retNonRat.length,
      hRetRat: retNonRat.reduce((sum, a) => sum + getHeuresAbsence(a), 0)
    };
  });

  const validerBesoinMultiModal = (e) => {
    e.preventDefault();
    if (!modalBesoinMulti.posteId) return alert('Sélectionnez un poste.');
    const poste = postes.find(p => p.id === Number(modalBesoinMulti.posteId));
    const newBesoins = [];
    
    const baseMonday = new Date(getMondayStr(currentTemplate.dateDebut));

    modalBesoinMulti.slots.forEach(slot => {
      if (slot.start && slot.end) {
        [1, 2, 3, 4, 5].forEach(dayIndex => {
          if (slot.days[dayIndex]) {
            const d = new Date(baseMonday);
            d.setDate(d.getDate() + dayIndex - 1);
            const pad = n => String(n).padStart(2, '0');
            const dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

            newBesoins.push({
              id: String(Date.now() + Math.random()),
              start: `${dateStr}T${slot.start}:00`,
              end: `${dateStr}T${slot.end}:00`,
              extendedProps: { posteId: poste.id, posteNom: poste.nom, qte: Number(modalBesoinMulti.qte) }
            });
          }
        });
      }
    });
    if (newBesoins.length > 0) updateCurrentTemplate(null, [...currentTemplate.besoins, ...newBesoins]);
    setModalBesoinMulti({ ...modalBesoinMulti, isOpen: false });
  };

  const validerEditBesoin = (e) => {
    e.preventDefault();
    const existing = currentTemplate.besoins.find(b => String(b.id) === String(modalEditBesoin.id));
    if (!existing) return;
    const dateStr = existing.start.split('T')[0];
    const newBesoins = currentTemplate.besoins.map(b => 
      String(b.id) === String(modalEditBesoin.id) ? { ...b, start: `${dateStr}T${modalEditBesoin.start}:00`, end: `${dateStr}T${modalEditBesoin.end}:00`, extendedProps: { ...b.extendedProps, qte: Number(modalEditBesoin.qte) } } : b
    );
    updateCurrentTemplate(null, newBesoins);
    setModalEditBesoin({ ...modalEditBesoin, isOpen: false });
  };

  const gererSelection = (selectInfo) => {
    if (vueActive === 'template' && currentTemplate.statut === 'valide') return;
    selectInfo.view.calendar.unselect();
    
    let dateJour = selectInfo.startStr;
    if (dateJour.includes('T')) {
      dateJour = dateJour.split('T')[0];
    }

    if (modeEdition === 'besoins') {
      if (!posteActif) return alert("Sélectionnez un poste à gauche.");
      const poste = postes.find(p => p.id === posteActif);
      if (vueActive === 'template') updateCurrentTemplate(null, [...currentTemplate.besoins, { id: String(Date.now()), start: selectInfo.startStr, end: selectInfo.endStr, extendedProps: { posteId: poste.id, posteNom: poste.nom, qte: formBesoinQte } }]);
      return;
    }

    setFormTypeEvent('affectation');
    setFormTypeAbsence('absence');
    setFormAbsenceDeduire(false);
    setFormAgent(agentActif || (agents[0] ? agents[0].id : ''));
    setFormPoste(posteActif || (postes[0] ? postes[0].id : ''));
    setFormNote('');
    setModalCreation({
      isOpen: true,
      eventId: null,
      date: dateJour,
      start: extractTimeStr(selectInfo.startStr),
      end: extractTimeStr(selectInfo.endStr)
    });
  };

  const gererModificationEvenement = (changeInfo) => { 
    if (vueActive === 'template' && currentTemplate.statut === 'valide') {
      changeInfo.revert();
      return;
    }
    if (changeInfo.event.extendedProps.isBesoin) {
      const cleanId = String(changeInfo.event.id).split('_')[0];
      const newBesoins = currentTemplate.besoins.map(b => String(b.id) === cleanId ? { ...b, start: changeInfo.event.startStr, end: changeInfo.event.endStr } : b);
      updateCurrentTemplate(null, newBesoins);
    } else if (changeInfo.event.extendedProps.isAbsence) {
      const cleanId = String(changeInfo.event.id).replace('abs_', '').split('_')[0];
      const updated = absences.map(a => String(a.id) === cleanId ? { ...a, start: changeInfo.event.startStr, end: changeInfo.event.endStr } : a);
      setAbsences(updated);
    } else {
      applyAction('update', { id: changeInfo.event.id, start: changeInfo.event.startStr, end: changeInfo.event.endStr }); 
    }
  };

  const gererClicEvenement = (evt) => { 
    if (vueActive === 'template' && currentTemplate.statut === 'valide') return;
    if (evt.extendedProps.isBesoin) {
      if (vueActive === 'template') {
        updateCurrentTemplate(null, currentTemplate.besoins.filter(b => String(b.id) !== String(evt.id).split('_')[0])); 
      } else {
        alert("Pour supprimer un besoin structurel, veuillez repasser en vue 'Modèle'.");
      }
    } else if (evt.extendedProps.isAbsence) {
      const cleanId = String(evt.id).replace('abs_', '').split('_')[0];
      supprimerAbsence(cleanId);
    } else {
      applyAction('delete', { id: evt.id, start: evt.start }); 
    }
  };

  const ouvrirEditionBesoin = (evt) => {
    if (vueActive !== 'template') return alert("Passez en vue 'Modèle' pour modifier les besoins structurels.");
    setModalEditBesoin({ isOpen: true, id: String(evt.id).split('_')[0], posteId: evt.extendedProps.posteId, qte: evt.extendedProps.qte, start: extractTimeStr(evt.start), end: extractTimeStr(evt.end) });
  };

  const ouvrirEdition = (evt) => {
    const isAbs = evt.extendedProps ? evt.extendedProps.isAbsence : false;
    let dateJour = evt.startStr || evt.start;
    if (dateJour && dateJour.includes('T')) {
      dateJour = dateJour.split('T')[0];
    }
    const extProps = evt.extendedProps || {};

    setFormTypeEvent(isAbs ? 'absence' : 'affectation');
    setFormTypeAbsence(extProps.typeAbsence || 'absence');
    setFormAbsenceDeduire(extProps.deduire || false);
    setFormAgent(extProps.agentId || '');
    setFormPoste(extProps.posteId || postes.find(p => p.nom === extProps.posteNom)?.id || '');
    setFormNote(extProps.motif || extProps.note || '');
    setModalCreation({ 
      isOpen: true, 
      eventId: evt.id, 
      date: dateJour,
      start: extractTimeStr(evt.startStr || evt.start), 
      end: extractTimeStr(evt.endStr || evt.end) 
    });
  };

  const validerCreationModal = (e) => {
    e.preventDefault();
    if (!formAgent) return alert('Veuillez sélectionner un agent.');
    const agent = agents.find(a => a.id === Number(formAgent));
    const newStart = `${modalCreation.date}T${extractTimeStr(modalCreation.start)}:00`;
    const newEnd = `${modalCreation.date}T${extractTimeStr(modalCreation.end)}:00`;

    if (formTypeEvent === 'absence') {
      const isEdit = !!modalCreation.eventId;
      const cleanId = isEdit ? String(modalCreation.eventId).replace('abs_','') : String(Date.now());
      
      const newAbs = {
        id: cleanId,
        agentId: agent.id,
        type: formTypeAbsence,
        start: newStart,
        end: newEnd,
        motif: formNote || (formTypeAbsence === 'absence' ? 'Absence' : 'Retard'),
        deduire: formAbsenceDeduire,
        rattrape: false,
        journeeComplete: (new Date(newEnd) - new Date(newStart)) / 3600000 >= 9
      };
      
      if (isEdit) {
        setAbsences(absences.map(a => String(a.id) === cleanId ? { ...a, ...newAbs } : a));
      } else {
        setAbsences([...absences, newAbs]);
      }
    } else {
      if (!formPoste) return alert('Veuillez sélectionner un poste.');
      const poste = postes.find(p => p.id === Number(posteActif || formPoste));
      const data = { 
        title: `${poste.nom} - ${agent.nom}`, 
        backgroundColor: agent.couleurFond, 
        borderColor: agent.couleurFond, 
        extendedProps: { agentId: agent.id, agentNom: agent.nom, posteId: poste.id, posteNom: poste.nom, posteCouleur: poste.couleur, note: formNote } 
      };

      if (modalCreation.eventId) applyAction('update_content', { id: modalCreation.eventId, start: newStart, end: newEnd, ...data });
      else applyAction('add', { id: String(Date.now()), start: newStart, end: newEnd, ...data });
    }
    setModalCreation({ isOpen: false, eventId: null, date: null, start: '08:00', end: '09:00' });
  };

const renderEventContent = (arg) => {
    const tS = arg.event.start;
    const tE = arg.event.end;
    const timeStr = (tS && tE) ? `${tS.getHours()}h${String(tS.getMinutes()).padStart(2,'0')}-${tE.getHours()}h${String(tE.getMinutes()).padStart(2,'0')}` : '';
    
    const isLocked = vueActive === 'template' && currentTemplate.statut === 'valide';
    const textColor = t.isDark ? '#e5e7eb' : '#111827';
    
    // Détection des événements ultra-courts
    const durationMins = tS && tE ? (tE - tS) / 60000 : 60;
    const isShort = durationMins <= 15;

    if (arg.event.extendedProps.isBesoin) {
      const isSous = arg.event.extendedProps.isSousEffectif;
      if (isShort) {
        return (
          <div onClick={() => !isLocked && ouvrirEditionBesoin(arg.event)} className="flex items-center w-full h-full overflow-hidden rounded text-[9px] shadow-sm relative group" style={{ backgroundColor: isSous ? '#dc2626' : '#16a34a', color: '#ffffff' }}>
            <span className="px-1 truncate font-bold">🎯 {arg.event.extendedProps.posteNom} ({arg.event.extendedProps.minCount}/{arg.event.extendedProps.qte})</span>
          </div>
        );
      }
      return (
        <div onClick={() => !isLocked && ouvrirEditionBesoin(arg.event)} className={`flex flex-col w-full h-full overflow-hidden rounded text-[11px] shadow-sm relative group transition-all ${!isLocked ? 'cursor-pointer hover:ring-2 hover:ring-red-400' : ''}`} style={{ color: textColor }}>
          <div className="px-1 py-0.5 font-bold flex justify-between items-center" style={{ backgroundColor: isSous ? '#dc2626' : '#16a34a', color: '#ffffff' }}>
            <span className="truncate">🎯 {arg.event.extendedProps.posteNom} <span className="text-[9px] font-normal opacity-90 ml-1">({timeStr})</span></span>
            {!isLocked && <button onClick={(e) => { e.stopPropagation(); gererClicEvenement(arg.event); }} className="no-print text-white bg-black/30 hover:bg-white/50 rounded px-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✖</button>}
          </div>
          <div className="p-1 flex flex-col justify-center items-center flex-1 leading-tight text-center" style={{ backgroundColor: isSous ? '#fee2e2' : '#dcfce7' }}>
            <span className="font-bold text-sm" style={{ color: isSous ? '#991b1b' : '#166534' }}>{arg.event.extendedProps.minCount} / {arg.event.extendedProps.qte} pers.</span>
          </div>
        </div>
      );
    }

    if (arg.event.extendedProps.isAbsence) {
      const typeAbs = arg.event.extendedProps.typeAbsence;
      const isAbs = typeAbs === 'absence';
      const ded = arg.event.extendedProps.deduire;
      if (isShort) {
        return (
          <div onClick={() => ouvrirEdition(arg.event)} className={`flex items-center w-full h-full overflow-hidden rounded text-[9px] font-bold shadow-md relative group cursor-pointer ${isAbs ? 'bg-red-500' : 'bg-orange-500'}`} style={{ color: '#ffffff' }}>
            <span className="px-1 truncate">{isAbs ? '🚫 ABS' : '⏰ RET'} : {arg.event.extendedProps.agentNom}</span>
          </div>
        );
      }
      return (
        <div onClick={() => ouvrirEdition(arg.event)} className={`flex flex-col w-full h-full overflow-hidden rounded text-[11px] border border-black/10 shadow-md relative group cursor-pointer hover:ring-2 transition-all z-50 opacity-90 ${isAbs ? 'bg-red-500/20 border-red-500' : 'bg-orange-500/20 border-orange-500'}`} style={{ color: textColor }}>
          <div className={`px-1 py-0.5 font-bold flex justify-between items-center ${isAbs ? 'bg-red-500' : 'bg-orange-500'}`} style={{ color: '#ffffff' }}>
            <span className="truncate">{isAbs ? '🚫 ABSENCE' : '⏰ RETARD'} {ded && '(-H)'} <span className="text-[9px] font-normal opacity-90 ml-1">({timeStr})</span></span>
            <button onClick={(e) => { e.stopPropagation(); gererClicEvenement(arg.event); }} className="no-print text-white bg-black/30 hover:bg-red-700 rounded px-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✖</button>
          </div>
          <div className="p-1 flex flex-col flex-1 leading-tight justify-center">
            <span className="font-bold truncate">{arg.event.extendedProps.agentNom}</span>
            <span className="text-[10px] italic truncate">{arg.event.extendedProps.motif}</span>
          </div>
        </div>
      );
    }
    
    const agentColor = arg.event.backgroundColor || '#3b82f6';
    const bgColorWithOpacity = agentColor + '66';
    const headerColor = arg.event.extendedProps.posteCouleur || '#3b82f6';
    const headerTextColor = getContrastYIQ(headerColor);

    if (isShort) {
      return (
        <div onClick={() => !isLocked && ouvrirEdition(arg.event)} 
             className={`flex items-center w-full h-full overflow-hidden rounded text-[9px] shadow-sm relative group transition-all ${!isLocked ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''}`}
             style={{ backgroundColor: headerColor, color: headerTextColor, border: `1px solid ${agentColor}` }}>
          <div className="flex-1 truncate px-1">
            <strong>{arg.event.extendedProps.posteNom}</strong> <span className="opacity-80">({arg.event.extendedProps.agentNom})</span>
          </div>
        </div>
      );
    }

    return (
      <div onClick={() => !isLocked && ouvrirEdition(arg.event)} 
           className={`flex flex-col w-full h-full overflow-hidden rounded text-[11px] border border-black/10 shadow-sm relative group transition-all ${!isLocked ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''}`}
           style={{ backgroundColor: bgColorWithOpacity, border: `1px solid ${agentColor}`, color: textColor }}>
        <div className="px-1 py-0.5 font-bold flex justify-between items-center" style={{ backgroundColor: headerColor, color: headerTextColor }}>
          <span className="truncate">{arg.event.extendedProps.posteNom} <span className="text-[9px] font-normal opacity-90 ml-1">({timeStr})</span></span>
          {!isLocked && <button onClick={(e) => { e.stopPropagation(); gererClicEvenement(arg.event); }} className="no-print bg-black/20 hover:bg-red-500 rounded px-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: headerTextColor }}>✖</button>}
        </div>
        <div className="p-1 flex flex-col flex-1 leading-tight">
          <div className="flex justify-between items-start"><span className="font-semibold truncate pr-1">{arg.event.extendedProps.agentNom}</span></div>
          {arg.event.extendedProps.note && <span className="text-[10px] opacity-80 truncate italic mt-1 bg-black/5 dark:bg-white/10 rounded px-1">{arg.event.extendedProps.note}</span>}
        </div>
      </div>
    );
  };

  const handleEditAgentChange = (champ, valeur) => {
    const newAgent = { ...modalAgent, [champ]: valeur };
    if (champ === 'quotite' || champ === 'estEtudiant') {
      newAgent.hContrat = calculerContratBetty(newAgent.quotite, newAgent.estEtudiant);
    }
    setModalAgent(newAgent);
  };

  const validerAgentModal = (e) => {
    e.preventDefault();
    if (!modalAgent.nom.trim()) return alert('Obligatoire.');
    const q = parseFloat(String(modalAgent.quotite).replace(',', '.')) || 100;
    const hC = typeof modalAgent.hContrat === 'string' ? parseHeureSaisie(modalAgent.hContrat) : modalAgent.hContrat;
    
    if (modalAgent.id) {
      setAgents(agents.map(a => a.id === modalAgent.id ? { ...a, nom: modalAgent.nom, quotite: q, estEtudiant: modalAgent.estEtudiant, hContrat: hC, couleurFond: modalAgent.couleurFond } : a));
      updateCurrentTemplate(currentTemplate.events.map(evt => evt.extendedProps?.agentId === modalAgent.id ? { ...evt, extendedProps: { ...evt.extendedProps, agentNom: modalAgent.nom }, backgroundColor: modalAgent.couleurFond, borderColor: modalAgent.couleurFond } : evt), null);
    } else {
      setAgents([...agents, { id: Date.now(), nom: modalAgent.nom, quotite: q, estEtudiant: modalAgent.estEtudiant, hContrat: hC, couleurFond: modalAgent.couleurFond }]);
    }
    setModalAgent({ ...modalAgent, isOpen: false });
  };

  const supprimerAgent = (id, n, e) => { e.stopPropagation(); if(confirm(`Supprimer l'agent ${n} ?`)) { setAgents(agents.filter(a => a.id !== id)); updateCurrentTemplate(currentTemplate.events.filter(e => e.extendedProps?.agentId !== id), null); if (agentActif === id) setAgentActif(null); } };
  
  const validerNouveauPoste = (e) => {
    e.preventDefault();
    if (modalNewPoste.nom.trim()) {
      setPostes([...postes, { id: Date.now(), nom: modalNewPoste.nom.trim(), couleur: '#8B5CF6' }]);
      setModalNewPoste({ isOpen: false, nom: '' });
    }
  };

  const supprimerPoste = (id, e) => { e.stopPropagation(); setPostes(postes.filter(p => p.id !== id)); };

  const gererClicJourAgent = (agentId, dateStr, hActuel, noteActuelle) => {
    setModalException({
      isOpen: true,
      agentId,
      dateStr,
      h: formatHeureTableau(hActuel, true) || '0h00',
      note: noteActuelle || ''
    });
  };

  const validerExceptionJourModal = (e) => {
    e.preventDefault();
    const hDecimal = parseHeureSaisie(modalException.h);
    const newExceptions = { ...exceptions };
    newExceptions[`${modalException.agentId}_${modalException.dateStr}`] = { h: hDecimal, note: modalException.note || '' };
    setExceptions(newExceptions);
    setModalException({ isOpen: false, agentId: null, dateStr: null, h: '0h00', note: '' });
  };

  const reinitialiserSemaineReelle = () => {
    if(confirm('Annuler toutes les modifications de cette semaine ?')) {
      const newCustom = {...customWeeks};
      delete newCustom[currentViewMonday];
      setCustomWeeks(newCustom);
    }
  };

  const ajouterPeriodeFeriee = (e) => {
    e.preventDefault();
    if (!formPeriode.nom || !formPeriode.debut) return;
    const dateFin = formPeriode.fin || formPeriode.debut;
    if (dateFin < formPeriode.debut) return alert("La date de fin doit être après le début.");
    setPeriodesFeriees([...periodesFeriees, { id: Date.now(), nom: formPeriode.nom, debut: formPeriode.debut, fin: dateFin, type: formPeriode.type }].sort((a,b) => a.debut.localeCompare(b.debut)));
    setFormPeriode({ nom: '', debut: '', fin: '', type: 'vacances' });
  };
  const supprimerPeriodeFeriee = (id) => setPeriodesFeriees(periodesFeriees.filter(p => p.id !== id));

  const changeJourQuotidien = (jours) => {
    const d = new Date(jourConsulte);
    d.setDate(d.getDate() + jours);
    const pad = n => String(n).padStart(2, '0');
    setJourConsulte(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`);
  };

  const BandeauAlerte = () => {
    if (isPrinting || alertesSousEffectif.length === 0) return null;
    return (
      <div className="bg-red-500/10 border-l-4 border-red-500 p-3 mb-3 rounded shadow-sm flex flex-col text-sm no-print">
        <span className="font-bold text-red-500 mb-1">⚠️ Alertes de sous-effectif détectées :</span>
        <ul className="grid grid-cols-2 gap-1 text-red-400">
          {alertesSousEffectif.map(a => {
            const dStart = new Date(a.start);
            const dEnd = new Date(a.end);
            const rmp = a.missingAgents?.length > 0 ? ` (Remplacement nécessaire: ${a.missingAgents.join(', ')})` : '';
            return (
              <li key={a.id} className={`${t.bgLight} px-2 py-1 rounded`}>
                <strong>{nomsJours[dStart.getDay()]} {dStart.getHours()}h{String(dStart.getMinutes()).padStart(2,'0')}-{dEnd.getHours()}h{String(dEnd.getMinutes()).padStart(2,'0')}</strong> : {a.extendedProps.posteNom} (<em>{a.minCount} / {a.extendedProps.qte} pers.</em>)
                <span className="font-bold">{rmp}</span>
              </li>
            )
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className={`flex h-screen w-screen ${t.bgMain} font-sans overflow-hidden transition-colors`}>
      
      {/* MODALE NOUVELLE VERSION */}
      {modalNewVersion.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
          <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 border ${t.borderLight}`}>
            <div className={`${t.headerBg} ${t.headerText} p-4`}><h3 className="font-bold text-lg">➕ Créer une évolution</h3></div>
            <form onSubmit={validerCreationVersionModal}>
              <div className="p-5 space-y-4">
                <div>
                  <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Date de début</label>
                  <input type="date" required value={modalNewVersion.dateDebut} onChange={e => setModalNewVersion({...modalNewVersion, dateDebut: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Nom court du modèle</label>
                  <input type="text" required value={modalNewVersion.nom} onChange={e => setModalNewVersion({...modalNewVersion, nom: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} />
                </div>
              </div>
              <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-end gap-3`}>
                <button type="button" onClick={() => setModalNewVersion({...modalNewVersion, isOpen: false})} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded font-medium">Annuler</button>
                <button type="submit" className={`px-5 py-2 ${t.btnPrimary} rounded font-medium`}>Créer</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE NOUVEAU POSTE */}
      {modalNewPoste.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
          <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 border ${t.borderLight}`}>
            <div className={`${t.headerBg} ${t.headerText} p-4`}><h3 className="font-bold text-lg">➕ Ajouter un poste</h3></div>
            <form onSubmit={validerNouveauPoste}>
              <div className="p-5 space-y-4">
                <div>
                  <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Nom du poste</label>
                  <input type="text" required value={modalNewPoste.nom} onChange={e => setModalNewPoste({isOpen: true, nom: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} autoFocus />
                </div>
              </div>
              <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-end gap-3`}>
                <button type="button" onClick={() => setModalNewPoste({isOpen: false, nom: ''})} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded font-medium">Annuler</button>
                <button type="submit" className={`px-5 py-2 ${t.btnPrimary} rounded font-medium`}>Ajouter</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE EXCEPTION JOUR AGENT */}
      {modalException.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
          <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 border ${t.borderLight}`}>
            <div className={`${t.headerBg} ${t.headerText} p-4`}><h3 className="font-bold text-lg">Modifier le jour ({modalException.dateStr})</h3></div>
            <form onSubmit={validerExceptionJourModal}>
              <div className="p-5 space-y-4">
                <div>
                  <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Heures travaillées (ex: 8h45 ou 0)</label>
                  <input type="text" required value={modalException.h} onChange={e => setModalException({...modalException, h: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} autoFocus />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Motif / Note (ex: Toussaint, Stage)</label>
                  <input type="text" value={modalException.note} onChange={e => setModalException({...modalException, note: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} />
                </div>
              </div>
              <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-end gap-3`}>
                <button type="button" onClick={() => setModalException({isOpen: false, agentId: null, dateStr: null, h: '0h00', note: ''})} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded font-medium">Annuler</button>
                <button type="submit" className={`px-5 py-2 ${t.btnPrimary} rounded font-medium`}>Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}

{/* MODALES PARAMETRES ET IMPRESSION */}
      {modalParametres && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 no-print">
          <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] border ${t.borderLight}`}>
            <div className={`${t.headerBg} ${t.headerText} p-5 flex justify-between items-center shrink-0`}>
              <h3 className="font-bold text-xl">⚙️ Paramètres Généraux</h3>
              <button onClick={() => setModalParametres(false)} className="hover:opacity-50 font-bold text-xl transition-opacity">✖</button>
            </div>
            
            <div className={`p-6 overflow-y-auto flex-1 ${t.bgMain}`}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* COLONNE GAUCHE (7/12) : DATES & SONNERIES */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                  
                  {/* SONNERIES EN HAUT */}
                  <div className={`${t.cardBg} p-5 rounded-xl border ${t.borderLight} shadow-sm`}>
                    <h4 className={`font-bold text-lg ${t.header} mb-1`}>🔔 Horaires des Sonneries</h4>
                    <p className="text-xs text-gray-500 mb-3">Personnalisez les heures affichées à gauche du planning (séparez par des virgules).</p>
                    <textarea 
                      value={sonneriesText} 
                      onChange={(e) => setSonneriesText(e.target.value)}
                      onBlur={handleSonneriesBlur}
                      className={`w-full border ${t.borderLight} rounded-lg p-3 text-sm bg-transparent font-mono shadow-inner`}
                      rows="2"
                      placeholder="Ex: 08:00, 08:55, 10:05..."
                    />
                  </div>

                  {/* GESTION DES VACANCES ET FÉRIÉS */}
                  <div className={`${t.cardBg} p-5 rounded-xl border ${t.borderLight} shadow-sm flex-1 flex flex-col`}>
                    <h4 className={`font-bold text-lg ${t.header} mb-4`}>🏖️ Périodes de Vacances & Fériés</h4>
                    
                    {/* FORMULAIRE D'AJOUT JUSTE EN DESSOUS */}
                    <form onSubmit={ajouterPeriodeFeriee} className={`p-4 rounded-lg border ${t.borderLight} ${t.bgLight} mb-6`}>
                      <h5 className="font-bold text-xs text-gray-500 uppercase mb-3">➕ Ajouter une nouvelle période</h5>
                      <div className="space-y-3">
                        <div className="flex gap-3">
                          <input type="text" required placeholder="Nom (ex: Pont Ascension)" value={formPeriode.nom} onChange={e => setFormPeriode({...formPeriode, nom: e.target.value})} className="flex-[2] border rounded p-2 text-sm bg-transparent" />
                          <select value={formPeriode.type} onChange={e => setFormPeriode({...formPeriode, type: e.target.value})} className="flex-1 border rounded p-2 text-sm bg-transparent">
                            <option value="vacances">Vacances (0h)</option>
                            <option value="ferie">Jour Férié / Pont</option>
                          </select>
                        </div>
                        <div className="flex gap-3">
                          <div className="flex-1"><label className="text-xs font-bold text-gray-500">Début</label><input type="date" required value={formPeriode.debut} onChange={e => setFormPeriode({...formPeriode, debut: e.target.value})} className="w-full border rounded p-2 text-sm bg-transparent" /></div>
                          <div className="flex-1"><label className="text-xs font-bold text-gray-500">Fin (Optionnel)</label><input type="date" value={formPeriode.fin} onChange={e => setFormPeriode({...formPeriode, fin: e.target.value})} className="w-full border rounded p-2 text-sm bg-transparent" /></div>
                          <div className="flex items-end"><button type="submit" className={`h-9 px-5 ${t.btnPrimary} rounded text-sm font-bold shadow`}>Ajouter</button></div>
                        </div>
                      </div>
                    </form>

                    {/* LISTE DES PÉRIODES RELÉGUÉE EN BAS */}
                    <h5 className="font-bold text-xs text-gray-500 uppercase mb-2">Périodes enregistrées</h5>
                    <ul className="space-y-2 overflow-y-auto pr-2 flex-1 max-h-[250px]">
                      {periodesFeriees.length === 0 && <p className="text-sm italic text-gray-500 text-center py-4">Aucune période configurée.</p>}
                      {periodesFeriees.map(p => (
                        <li key={p.id} className={`${t.bgMain} p-3 rounded-lg border ${t.borderLight} flex justify-between items-center text-sm shadow-sm`}>
                          <div>
                            <span className={`font-bold ${isDarkMode ? 'text-gray-200' : 'text-gray-800'}`}>{p.nom}</span> 
                            <span className={`ml-2 px-2 py-0.5 rounded text-[10px] uppercase font-bold text-white ${p.type === 'ferie' ? 'bg-green-600' : 'bg-blue-600'}`}>
                              {p.type === 'ferie' ? 'Férié (Payé)' : 'Vacances (0h)'}
                            </span>
                            <br/><span className="text-gray-500 text-xs">({p.debut === p.fin ? p.debut : `Du ${p.debut} au ${p.fin}`})</span>
                          </div>
                          <button onClick={() => supprimerPeriodeFeriee(p.id)} className="text-red-500 hover:bg-red-500/20 px-2 py-1 rounded transition-colors font-bold">✖</button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* COLONNE DROITE (5/12) : THEMES */}
                <div className="lg:col-span-5 flex flex-col gap-6">
                  <div className={`${t.cardBg} p-5 rounded-xl border ${t.borderLight} shadow-sm`}>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className={`font-bold text-lg ${t.header}`}>🎨 Thème visuel</h4>
                      <button type="button" onClick={toggleDarkMode} className={`px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all ${isDarkMode ? 'bg-gray-700 text-yellow-300 border border-gray-600' : 'bg-white text-gray-800 border border-gray-300'}`}>
                        {isDarkMode ? '☀️ Mode Clair' : '🌙 Mode Sombre'}
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3 mb-6">
                      {Object.entries(THEMES).filter(([id]) => id !== 'personnalise').map(([id, theme]) => {
                        const currentMode = isDarkMode ? theme.dark : theme.light;
                        return (
                          <button type="button" key={id} onClick={() => changeTheme(id)} className={`p-4 rounded-xl border-2 flex items-center gap-4 transition-all ${themeId === id ? `border-[${theme.fcPrimary}] shadow-md ${currentMode.cardBg}` : `border-transparent hover:border-black/5 dark:hover:border-white/5 ${t.bgMain}`}`}>
                            <div className={`flex shrink-0 overflow-hidden rounded-full w-10 h-10 border border-black/10 dark:border-white/10 shadow-inner ${currentMode.cardBg}`}>
                              <div className={`w-1/2 h-full ${currentMode.sidebar.split(' ')[0]}`}></div>
                              <div className={`w-1/2 h-full ${theme.btnPrimary.split(' ')[0]}`}></div>
                            </div>
                            <span className={`text-sm font-bold text-left leading-tight ${t.header}`}>{theme.nom}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* THÈME PERSONNALISÉ */}
                    <div className={`pt-5 border-t ${t.borderLight}`}>
                      <h5 className={`font-bold text-sm mb-3 ${t.header}`}>✨ Thème Personnalisé</h5>
                      <div className="flex items-end gap-3">
                        <label className={`flex flex-col text-[10px] font-bold uppercase ${t.textMenuMuted}`}>
                          Dominante
                          <input type="color" value={customColors.primary} onChange={(e) => updateCustomColor('primary', e.target.value)} className="w-12 h-10 mt-1 cursor-pointer border-0 rounded p-0 bg-transparent" />
                        </label>
                        <label className={`flex flex-col text-[10px] font-bold uppercase ${t.textMenuMuted}`}>
                          Accent
                          <input type="color" value={customColors.accent} onChange={(e) => updateCustomColor('accent', e.target.value)} className="w-12 h-10 mt-1 cursor-pointer border-0 rounded p-0 bg-transparent" />
                        </label>
                        <button type="button" onClick={() => changeTheme('personnalise')} className={`flex-1 px-3 h-10 text-xs font-bold rounded shadow transition-all ${themeId === 'personnalise' ? 'bg-blue-600 text-white' : `${t.bgLight} ${t.header} hover:opacity-80`}`}>
                          {themeId === 'personnalise' ? '✅ Actif' : 'Activer'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE CRÉATION AFFECTATION */}
      {modalCreation.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
          <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 border ${t.borderLight}`}>
            <div className={`${t.headerBg} ${t.headerText} p-4`}><h3 className="font-bold text-lg">{modalCreation.eventId ? 'Modifier l\'affectation' : 'Nouvelle affectation'}</h3></div>
            <form onSubmit={validerCreationModal}>
              <div className="p-5 space-y-4">
                {(vueActive === 'planning' || vueActive === 'journee') && !modalCreation.eventId && (
                  <div>
                    <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Type d'action</label>
                    <select value={formTypeEvent} onChange={e => setFormTypeEvent(e.target.value)} className={`w-full border ${t.borderLight} rounded p-2 ${t.bgLight} font-bold text-sm`}>
                      <option value="affectation">Affectation de poste</option>
                      <option value="absence">Absence ou Retard</option>
                    </select>
                  </div>
                )}

                <div><label className={`block text-sm font-semibold mb-1 ${t.header}`}>👤 Agent</label><select value={formAgent} onChange={e => setFormAgent(e.target.value)} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`}><option value="" disabled>-- Sélectionner --</option>{agents.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select></div>
                
                {formTypeEvent === 'absence' ? (
                  <>
                    <div>
                      <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Nature</label>
                      <select value={formTypeAbsence} onChange={e => setFormTypeAbsence(e.target.value)} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`}>
                        <option value="absence">Absence (Plage horaire)</option>
                        <option value="retard">Retard</option>
                      </select>
                    </div>
                    <label className={`flex items-center gap-2 text-sm font-bold ${t.textAccent} cursor-pointer ${t.bgLight} p-2 rounded border ${t.borderLight}`}>
                      <input type="checkbox" checked={formAbsenceDeduire} onChange={e => setFormAbsenceDeduire(e.target.checked)} className="w-4 h-4 cursor-pointer" />
                      Déduire ces heures du bilan
                    </label>
                  </>
                ) : (
                  <div><label className={`block text-sm font-semibold mb-1 ${t.header}`}>📍 Poste</label><select value={formPoste} onChange={e => setFormPoste(e.target.value)} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`}><option value="" disabled>-- Sélectionner --</option>{postes.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div>
                )}

                <div className="flex gap-4">
                  <div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Début</label><input type="time" required value={extractTimeStr(modalCreation.start)} onChange={e => setModalCreation({...modalCreation, start: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`} /></div>
                  <div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Fin</label><input type="time" required value={extractTimeStr(modalCreation.end)} onChange={e => setModalCreation({...modalCreation, end: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`} /></div>
                </div>
                <div><label className={`block text-sm font-semibold mb-1 ${t.header}`}>📝 {formTypeEvent === 'absence' ? 'Motif' : 'Note'}</label><input type="text" value={formNote} onChange={e => setFormNote(e.target.value)} placeholder={formTypeEvent === 'absence' ? "Ex: Maladie..." : "Ex: Réunion..."} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`} autoFocus={!!modalCreation.eventId} /></div>
</div>
              
              <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-between items-center`}>
                <div>
                  {modalCreation.eventId && (
                    <button type="button" onClick={() => {
                      if(window.confirm('Voulez-vous vraiment supprimer cet élément ?')) {
                        if (formTypeEvent === 'absence') supprimerAbsence(String(modalCreation.eventId).replace('abs_','').split('_')[0]);
                        else applyAction('delete', { id: modalCreation.eventId });
                        setModalCreation({ isOpen: false, eventId: null, date: null, start: '08:00', end: '09:00' });
                      }
                    }} className="px-3 py-2 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded font-bold transition-colors text-sm shadow-sm flex items-center gap-1">
                      🗑️ Supprimer
                    </button>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => setModalCreation({ isOpen: false, eventId: null, date: null, start: '08:00', end: '09:00' })} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded font-medium">Annuler</button>
                  <button type="submit" className={`px-5 py-2 ${t.btnPrimary} rounded font-medium`}>{modalCreation.eventId ? 'Enregistrer' : 'Créer'}</button>
                </div>
              </div>

            </form>          </div>
        </div>
      )}

      {/* MODALE GRILLAGE DE BESOINS MULTIPLES */}
      {modalBesoinMulti.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
          <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh] border ${t.borderLight}`}>
            <div className="bg-red-700 text-white p-4 shrink-0"><h3 className="font-bold text-lg">🎯 Saisie d'une grille de besoins</h3></div>
            <form onSubmit={validerBesoinMultiModal} className="flex flex-col overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="flex gap-4">
                  <div className="flex-[2]"><label className="block text-sm font-semibold mb-1 text-red-600">Poste requis</label><select required value={modalBesoinMulti.posteId} onChange={e => setModalBesoinMulti({...modalBesoinMulti, posteId: e.target.value})} className="w-full border border-red-500/50 rounded p-2 bg-transparent"><option value="" disabled>-- Sélectionner --</option>{postes.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div>
                  <div className="flex-1"><label className="block text-sm font-semibold mb-1 text-red-600">Effectif</label><input type="number" min="1" required value={modalBesoinMulti.qte} onChange={e => setModalBesoinMulti({...modalBesoinMulti, qte: e.target.value})} className="w-full border border-red-500/50 rounded p-2 text-center font-bold bg-transparent" /></div>
                </div>
                
                <div className="border border-red-500/30 rounded p-3 bg-red-900/10">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-bold text-red-600">Créez vos plages horaires et cochez les jours :</p>
                    <button type="button" onClick={() => setModalBesoinMulti({...modalBesoinMulti, slots: [...modalBesoinMulti.slots, { id: Date.now(), start: '08:00', end: '10:00', days: { 1: false, 2: false, 3: false, 4: false, 5: false } }]})} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 font-semibold shadow">➕ Plage</button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {modalBesoinMulti.slots.map((slot, idx) => (
                      <div key={idx} className="flex flex-col gap-2 border-b border-red-500/30 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <input type="time" required value={slot.start} onChange={e => {
                            const ns = [...modalBesoinMulti.slots]; ns[idx].start = e.target.value; setModalBesoinMulti({...modalBesoinMulti, slots: ns});
                          }} className="border border-red-500/50 p-1 text-sm rounded bg-transparent w-24 text-center text-red-600 font-bold" />
                          <span className="text-gray-500 text-xs font-bold">à</span>
                          <input type="time" required value={slot.end} onChange={e => {
                            const ns = [...modalBesoinMulti.slots]; ns[idx].end = e.target.value; setModalBesoinMulti({...modalBesoinMulti, slots: ns});
                          }} className="border border-red-500/50 p-1 text-sm rounded bg-transparent w-24 text-center text-red-600 font-bold" />
                          {modalBesoinMulti.slots.length > 1 && (
                            <button type="button" onClick={() => {
                              const ns = [...modalBesoinMulti.slots]; ns.splice(idx, 1); setModalBesoinMulti({...modalBesoinMulti, slots: ns});
                            }} className="text-red-400 hover:text-red-600 text-xs rounded-full w-5 h-5 flex items-center justify-center shadow-sm ml-auto" title="Retirer cette plage">✖</button>
                          )}
                        </div>
                        <div className="flex gap-2 pl-1 mt-1">
                          {[1, 2, 3, 4, 5].map(day => (
                            <label key={day} className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-bold cursor-pointer transition-colors ${slot.days[day] ? 'bg-red-600 text-white border-red-700 shadow-sm' : `bg-transparent text-gray-500 border-gray-500/30 hover:${t.bgLight}`}`}>
                              <input type="checkbox" className="hidden" checked={slot.days[day]} onChange={e => {
                                const ns = [...modalBesoinMulti.slots]; ns[idx].days[day] = e.target.checked; setModalBesoinMulti({...modalBesoinMulti, slots: ns});
                              }} />
                              {nomsJours[day % 7]}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} shrink-0 flex justify-end gap-3`}><button type="button" onClick={() => setModalBesoinMulti({ isOpen: false, posteId: '', qte: 1, slots: [] })} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded font-medium">Annuler</button><button type="submit" className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium shadow">Générer la grille</button></div>
            </form>
          </div>
        </div>
      )}

      {modalEditBesoin.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
          <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200 border ${t.borderLight}`}>
            <div className="bg-red-700 text-white p-4"><h3 className="font-bold text-lg">Modifier le besoin</h3></div>
            <form onSubmit={validerEditBesoin}>
              <div className="p-5 space-y-4">
                <div><label className="block text-sm font-semibold mb-1 text-red-600">Effectif attendu (Tapez 0 pour supprimer)</label><input type="number" min="0" required value={modalEditBesoin.qte} onChange={e => setModalEditBesoin({...modalEditBesoin, qte: e.target.value})} className="w-full border border-red-500/50 rounded p-2 text-center font-bold text-lg bg-transparent" autoFocus /></div>
                <div className="flex gap-4"><div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Début</label><input type="time" required value={modalEditBesoin.start} onChange={e => setModalEditBesoin({...modalEditBesoin, start: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`} /></div><div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Fin</label><input type="time" required value={modalEditBesoin.end} onChange={e => setModalEditBesoin({...modalEditBesoin, end: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`} /></div></div>
              </div>
              <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-end gap-3`}><button type="button" onClick={() => setModalEditBesoin({ isOpen: false, id: null, posteId: '', qte: 1, start: '', end: '' })} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded font-medium">Annuler</button><button type="submit" className="px-5 py-2 bg-red-600 text-white rounded font-medium">Mettre à jour</button></div>
            </form>
          </div>
        </div>
      )}

      {modalAgent.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
          <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-md overflow-hidden border ${t.borderLight}`}>
            <div className={`${t.headerBg} ${t.headerText} p-4`}><h3 className="font-bold text-lg">{modalAgent.id ? 'Modifier un agent' : 'Nouvel agent'}</h3></div>
            <form onSubmit={validerAgentModal}>
              <div className="p-5 space-y-4">
                <div><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Nom complet</label><input type="text" required value={modalAgent.nom} onChange={e => setModalAgent({...modalAgent, nom: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent`} autoFocus /></div>
                <div className="flex gap-4">
                  <div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Quotité (%)</label><input type="number" step="0.1" required value={modalAgent.quotite} onChange={e => handleEditAgentChange('quotite', e.target.value)} className={`w-full border ${t.borderLight} rounded p-2 font-bold text-center bg-transparent`} /></div>
                  <div className="flex-1 flex flex-col justify-end"><label className={`flex items-center gap-2 p-2 border ${t.borderLight} ${t.bgLight} rounded cursor-pointer font-bold text-sm ${t.header}`}><input type="checkbox" checked={modalAgent.estEtudiant} onChange={e => handleEditAgentChange('estEtudiant', e.target.checked)} className="w-4 h-4" />🎓 Statut Étudiant</label></div>
                </div>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Contrat (Calculé)</label>
                    <input type="text" required value={typeof modalAgent.hContrat === 'number' ? formatHeureMinutes(modalAgent.hContrat) : modalAgent.hContrat} onChange={e => setModalAgent({...modalAgent, hContrat: e.target.value})} onBlur={e => setModalAgent({...modalAgent, hContrat: parseHeureSaisie(e.target.value)})} className={`w-full border ${t.borderLight} rounded p-2 font-mono text-center bg-transparent`} />
                  </div>
                  <div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Couleur</label><div className="flex items-center gap-3"><input type="color" value={modalAgent.couleurFond} onChange={e => setModalAgent({...modalAgent, couleurFond: e.target.value})} className={`w-10 h-10 p-1 border ${t.borderLight} rounded cursor-pointer bg-transparent`} /><span className={`text-sm uppercase ${t.header}`}>{modalAgent.couleurFond}</span></div></div>
                </div>
              </div>
              <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-end gap-3`}><button type="button" onClick={() => setModalAgent({...modalAgent, isOpen: false})} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded">Annuler</button><button type="submit" className={`px-5 py-2 ${t.btnPrimary} rounded`}>{modalAgent.id ? 'Mettre à jour' : 'Créer'}</button></div>
            </form>
          </div>
        </div>
      )}
{/* PANNEAU LATÉRAL (Fixe) */}
      <div className={`w-80 ${t.sidebar} shadow-lg flex flex-col z-20 border-r ${t.borderLight} no-print shrink-0 transition-colors`}>
        <div className={`p-4 ${t.sidebarText} flex flex-col gap-3`}>
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold tracking-wider">Planning CPE</h1>
          </div>
          
          {/* Barre d'outils propre sur une seule ligne répartie */}
          <div className="flex items-center justify-between bg-black/10 p-1.5 rounded-lg gap-1">
            <input type="file" id="import-file" accept=".json" onChange={importerDonnees} className="hidden" />
            <button onClick={() => document.getElementById('import-file').click()} className={`${t.sidebarIconBtn} p-2 rounded text-xs shadow border transition-colors flex-1 flex justify-center`} title="Restaurer une sauvegarde">⬆️</button>
            <button onClick={handleExport} className={`relative p-2 rounded text-xs shadow border transition-colors flex-1 flex justify-center ${needsBackup ? 'bg-orange-600 hover:bg-orange-500 border-orange-500 text-white' : t.sidebarIconBtn}`} title="Sauvegarder les données (Fichier JSON)">
              ⬇️{needsBackup && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
            </button>
            <button onClick={toggleDarkMode} className={`${t.sidebarIconBtn} p-2 rounded text-xs shadow border transition-colors flex-1 flex justify-center`} title="Mode Sombre / Clair">{isDarkMode ? '☀️' : '🌙'}</button>
            <button onClick={() => setModalParametres(true)} className={`${t.sidebarIconBtn} p-2 rounded text-xs shadow border transition-colors flex-1 flex justify-center`} title="Paramètres">⚙️</button>
<button onClick={declencherImpression} className={`${t.sidebarIconBtn} p-2 rounded text-xs font-bold border transition-colors flex-1 flex justify-center`} title="Imprimer">🖨️</button>            <button onClick={resetAllData} className="bg-red-700 hover:bg-red-800 p-2 rounded text-xs font-bold border border-red-500 text-white flex-1 flex justify-center shadow-sm" title="Tout réinitialiser">🗑️</button>
          </div>
          <div className="flex flex-col bg-black/10 rounded p-1 shadow-inner gap-1 mt-2">
            <button onClick={() => setVueActive('journee')} className={`text-sm py-1.5 rounded transition ${vueActive === 'journee' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>⏱️ Vue Quotidienne</button>
            <button onClick={() => setVueActive('template')} className={`text-sm py-1.5 rounded transition ${vueActive === 'template' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>📐 Modèle : Semaine Type</button>
            <button onClick={() => setVueActive('planning')} className={`text-sm py-1.5 rounded transition ${vueActive === 'planning' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>📅 Planning Hebdo (Réel)</button>
            <button onClick={() => setVueActive('dashboard')} className={`text-sm py-1.5 rounded transition ${vueActive === 'dashboard' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>📊 Bilan Équipe</button>
            <button onClick={() => { setVueActive('agent'); if(!agentConsulte) setAgentConsulte(agents[0]?.id); }} className={`text-sm py-1.5 rounded transition ${vueActive === 'agent' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>👤 Calendriers Individuels</button>
            <button onClick={() => setVueActive('absences')} className={`text-sm py-1.5 rounded transition ${vueActive === 'absences' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>📋 Absences & Retards</button>
          </div>
        </div>
        
        {(vueActive === 'template' || vueActive === 'planning' || vueActive === 'journee') && (
          <div className={`p-4 flex-1 overflow-y-auto space-y-4 ${t.bgMain}`}>
            
            {vueActive === 'template' && currentTemplate.statut === 'brouillon' && (
              <div className={`flex ${t.bgLight} rounded p-1 mb-2 border ${t.borderLight}`}>
                <button onClick={() => setModeEdition('agents')} className={`flex-1 text-xs py-1.5 rounded transition ${modeEdition === 'agents' ? `${t.cardBg} font-bold ${t.textAccent} shadow-sm border ${t.borderLight}` : `${t.textMenuMuted} hover:${t.header}`}`}>🖌️ Agents</button>
                <button onClick={() => setModeEdition('besoins')} className={`flex-1 text-xs py-1.5 rounded transition ${modeEdition === 'besoins' ? `${t.cardBg} font-bold text-red-500 shadow-sm border ${t.borderLight}` : `${t.textMenuMuted} hover:${t.header}`}`}>🎯 Besoins</button>
              </div>
            )}

            {vueActive === 'template' && currentTemplate.statut === 'valide' && (
              <div className={`${t.bgLight} border ${t.borderLight} p-4 rounded text-center mb-4`}>
                <span className="text-2xl block mb-1">🔒</span>
                <p className={`text-sm font-bold ${t.header}`}>Modèle Validé</p>
                <p className="text-xs text-gray-500 mt-1">Structure verrouillée pour protéger le compte d'heures passé.</p>
                <button onClick={() => setModalNewVersion({ isOpen: true, dateDebut: `${baseYear+1}-01-04`, nom: 'Évolution Hiver' })} className={`mt-3 ${t.btnPrimary} text-xs font-bold px-3 py-2 rounded shadow w-full flex items-center justify-center gap-1`}>➕ Créer une évolution</button>
                <button onClick={deverrouillerModele} className="mt-2 text-xs text-gray-500 hover:text-gray-800 underline">🔓 Déverrouiller (Corriger erreur)</button>
              </div>
            )}

            {(vueActive === 'planning' || vueActive === 'journee' || (vueActive === 'template' && currentTemplate.statut === 'brouillon')) && modeEdition === 'agents' && (
              <div className="animate-in fade-in">
                <div>
                  <div className="flex justify-between items-center mb-2"><h2 className={`font-bold ${t.header} text-sm`}>Agents</h2><button onClick={() => setModalAgent({isOpen: true, nom: '', quotite: 100, estEtudiant: false, hContrat: calculerContratBetty(100, false), couleurFond: '#3B82F6'})} className="bg-black/10 w-5 h-5 rounded-full text-xs font-bold hover:bg-black/20 text-gray-600">+</button></div>
                  <ul className="space-y-1">
                    {statsAgents.map((agent) => (
                      <li key={agent.id} onClick={() => setAgentActif(agentActif === agent.id ? null : agent.id)} className={`flex justify-between items-center p-2 rounded border-l-4 cursor-pointer text-sm ${agentActif === agent.id ? `${t.bgLight} ${t.textAccent} font-bold ring-1 border-black/10` : `${t.cardBg} hover:opacity-80`}`} style={{ borderLeftColor: agent.couleurFond }}>
                        <div className="flex flex-col leading-tight">
                          <span className={t.header}>{agent.nom} {agent.estEtudiant && '🎓'}</span>
                          <span className={`text-[10px] font-mono mt-0.5 ${agent.soldeGlobal > 0 ? 'text-green-600' : (agent.soldeGlobal < 0 ? 'text-red-500' : 'text-gray-500')}`}>
                            Solde: {agent.soldeGlobal > 0 ? '+' : ''}{formatHeureTableau(agent.soldeGlobal, true)}
                          </span>
                        </div>
                        <div className="flex gap-1 items-center shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); setModalAgent({isOpen:true, ...agent}); }} className="text-gray-400 hover:text-gray-800 text-xs px-1">⚙️</button>
                          <button onClick={(e) => supprimerAgent(agent.id, agent.nom, e)} className="text-red-400 hover:text-red-600 text-xs px-1">✖</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2"><h2 className={`font-bold ${t.header} text-sm`}>Postes</h2><button onClick={() => setModalNewPoste({ isOpen: true, nom: '' })} className="bg-black/10 w-5 h-5 rounded-full text-xs font-bold hover:bg-black/20 text-gray-600">+</button></div>
                  <ul className="space-y-1">
                    {postes.map((poste) => (
                      <li key={poste.id} onClick={() => setPosteActif(posteActif === poste.id ? null : poste.id)} className={`flex justify-between items-center p-2 rounded border-l-4 cursor-pointer text-sm ${posteActif === poste.id ? `${t.bgLight} ${t.textAccent} font-bold ring-1 border-black/10` : `${t.cardBg} hover:opacity-80`}`} style={{ borderLeftColor: poste.couleur }}>
                        <span className={t.header}>{poste.nom}</span><button onClick={(e) => supprimerPoste(poste.id, e)} className="text-red-400 hover:text-red-600 text-xs px-1">✖</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {vueActive === 'template' && currentTemplate.statut === 'brouillon' && modeEdition === 'besoins' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-red-900/10 border border-red-500/30 p-3 rounded text-sm text-red-500">
                  <p className="font-bold mb-2">1. Création Rapide (Clavier) :</p>
                  <button onClick={() => setModalBesoinMulti({ isOpen: true, posteId: '', qte: 1, slots: [{ id: Date.now(), start: '08:00', end: '10:00', days: { 1: false, 2: false, 3: false, 4: false, 5: false } }]})} className="w-full bg-red-600 text-white rounded p-2 text-xs font-bold hover:bg-red-700 shadow flex items-center justify-center gap-1 mb-4">➕ Saisir une grille complète</button>
                  <p className="font-bold mb-2 border-t border-red-500/30 pt-3">2. Pinceau Manuel (Souris) :</p>
                  <select value={posteActif||''} onChange={e => setPosteActif(Number(e.target.value))} className="w-full p-2 rounded border border-red-500/50 mb-2 bg-transparent font-bold"><option value="" disabled>-- Poste --</option>{postes.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
                  <input type="number" min="1" value={formBesoinQte} onChange={e => setFormBesoinQte(Number(e.target.value))} className="w-full p-2 rounded border border-red-500/50 font-bold text-center mb-2 bg-transparent" />
                  <p className="text-xs italic opacity-80">Glissez la souris sur le calendrier.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ZONE PRINCIPALE D'AFFICHAGE */}
      <div id="print-area" className={`flex-1 flex flex-col h-full overflow-hidden ${t.cardBg}`}>
        
        {vueActive === 'journee' && (
          <div className={`flex-1 flex flex-col ${t.bgMain} h-full overflow-hidden`}>
            <div className="p-4 pb-2 no-print shrink-0">
              <div className="flex justify-between items-center mb-2">
                <h2 className={`text-lg font-bold ${t.header} flex items-center gap-2`}>
                  ⏱️ Vue Quotidienne
                </h2>
                <div className="flex items-center gap-3">
                  <button onClick={() => changeJourQuotidien(-1)} className={`px-3 py-1 rounded text-sm font-bold ${t.cardBg} ${t.header} border ${t.borderLight} hover:opacity-75 shadow-sm transition-colors`}>◀ Jour Précédent</button>
                  <input type="date" value={jourConsulte} onChange={(e) => setJourConsulte(e.target.value)} className={`border ${t.borderLight} rounded p-1.5 text-sm font-bold ${t.cardBg} ${t.header} outline-none shadow-sm`} />
                  <button onClick={() => changeJourQuotidien(1)} className={`px-3 py-1 rounded text-sm font-bold ${t.cardBg} ${t.header} border ${t.borderLight} hover:opacity-75 shadow-sm transition-colors`}>Jour Suivant ▶</button>
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-auto px-4 pb-4">
              <div className={`${t.cardBg} rounded-xl shadow border ${t.borderLight} min-w-[800px] flex flex-col h-full`}>
{/* En-tête des heures */}
                <div className={`flex border-b ${t.borderLight} ${t.bgLight} shrink-0 ml-32 relative h-8 rounded-t-xl`}>
                  {sonneries.map(s => {
                    const [h, m] = s.split(':').map(Number);
                    const topPercent = (((h * 60 + m) - 460) / 600) * 100;
                    if (topPercent < 0 || topPercent > 100) return null;
                    return (
                      <div key={s} className={`absolute text-[10px] font-bold ${t.header} top-2`} style={{ left: `${topPercent}%`, transform: 'translateX(-50%)' }}>{s}</div>
                    )
                  })}
                </div>
                
                {/* Grille des agents */}
                <div className="flex-1 overflow-y-auto relative">
{/* Lignes verticales de fond */}
                <div className="absolute top-0 bottom-0 left-32 right-0 pointer-events-none">
                  {sonneries.map(s => {
                    const [h, m] = s.split(':').map(Number);
                    const topPercent = (((h * 60 + m) - 460) / 600) * 100;
                    if (topPercent < 0 || topPercent > 100) return null;
                    return (<div key={s} className={`absolute top-0 bottom-0 border-l ${t.borderLight} opacity-50`} style={{ left: `${topPercent}%` }}></div>)
                  })}
                </div>
                  {agents.map(agent => {
                    const mondayStr = getMondayStr(jourConsulte);
                    const allEvents = getEventsForWeek(mondayStr);
                    const eventsDuJour = allEvents.filter(e => e.extendedProps?.agentId === agent.id && e.start.startsWith(jourConsulte));
                    const absDuJour = absences.filter(a => a.agentId === agent.id && a.start.startsWith(jourConsulte));

                    return (
                      <div key={agent.id} className={`flex border-b ${t.borderLight} min-h-[60px] relative group hover:bg-black/5 transition-colors`}>
                        {/* Colonne Agent */}
                        <div className={`w-32 shrink-0 flex flex-col items-end justify-center p-2 border-r ${t.borderLight} z-10 ${t.cardBg} group-hover:bg-transparent transition-colors`}>
                          <span className={`text-xs font-bold ${t.header} text-right leading-tight`}>{agent.nom}</span>
                        </div>
                        
                        {/* Ligne de temps */}
                        <div className="flex-1 relative my-1">
                          {eventsDuJour.map(evt => {
                            const startD = new Date(evt.start);
                            const endD = new Date(evt.end);
                            const startMins = startD.getHours() * 60 + startD.getMinutes();
                            const endMins = endD.getHours() * 60 + endD.getMinutes();
                            const left = Math.max(0, ((startMins - 460) / 600) * 100);
                            const width = Math.min(100 - left, ((endMins - startMins) / 600) * 100);
                            
                            return (
                              <div key={evt.id} className="absolute top-1 bottom-1 rounded shadow-sm text-[10px] flex flex-col justify-center px-1.5 overflow-hidden border cursor-pointer hover:ring-2 transition-all z-10"
                                style={{
                                  left: `${left}%`, width: `${width}%`,
                                  backgroundColor: evt.extendedProps?.posteCouleur || '#3b82f6', // CORRECTION : Force la couleur du poste
                                  borderColor: 'rgba(0,0,0,0.1)',
                                  color: 'white'
                                }}
                                onClick={() => ouvrirEdition(evt)}
                                title={`${evt.extendedProps?.posteNom} (${extractTimeStr(evt.start)} - ${extractTimeStr(evt.end)})`}
                              >
                                <span className="font-bold truncate">{evt.extendedProps?.posteNom}</span>
                                <span className="text-[8px] opacity-80 truncate">{extractTimeStr(evt.start)} - {extractTimeStr(evt.end)}</span>
                              </div>
                            );
                            })}
                          
                          {absDuJour.map(abs => {
                            const startD = new Date(abs.start);
                            const endD = new Date(abs.end);
                            const startMins = startD.getHours() * 60 + startD.getMinutes();
                            const endMins = endD.getHours() * 60 + endD.getMinutes();
                            const left = Math.max(0, ((startMins - 460) / 600) * 100);
                            const width = Math.min(100 - left, ((endMins - startMins) / 600) * 100);
                            const isAbs = abs.type === 'absence';
                            
                            return (
                              <div key={abs.id} className={`absolute top-1 bottom-1 rounded shadow-sm text-[10px] flex flex-col justify-center px-1.5 overflow-hidden border cursor-pointer hover:ring-2 transition-all z-20 ${isAbs ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-orange-500/20 border-orange-500 text-orange-500'}`}
                                style={{ left: `${left}%`, width: `${width}%` }}
                                title={`${isAbs ? 'ABSENCE' : 'RETARD'} - ${abs.motif}`}
                              >
                                <span className="font-bold truncate">{isAbs ? '🚫 ABSENCE' : '⏰ RETARD'}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  {agents.length === 0 && (
                    <div className="p-8 text-center text-gray-500 italic">Aucun agent configuré.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {vueActive === 'template' && (
          <div className={`flex-1 flex flex-col ${t.bgMain} h-full overflow-hidden`}>
            <div className="p-4 pb-2 no-print shrink-0">
              <div className="flex justify-between items-center mb-2">
                <h2 className={`text-lg font-bold ${t.header} flex items-center gap-2`}>
                  📐 Modèle : {currentTemplate.nom} (dès le {currentTemplate.dateDebut}) 
                  {printFilter.type === 'agent' && ` - Filtré : ${agents.find(a=>a.id===printFilter.id)?.nom}`}
                </h2>
                
                <div className="flex gap-2 items-center">
                  {currentTemplate.statut === 'brouillon' && (
                    <button onClick={validerModele} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-green-700 shadow-sm animate-pulse">✅ Valider et Appliquer</button>
                  )}
                  <select value={activeTemplateId} onChange={e => setActiveTemplateId(Number(e.target.value))} className={`border ${t.borderLight} rounded p-1.5 text-xs font-bold ${t.cardBg} ${t.header} outline-none`}>
                    {templateVersions.map(tv => <option key={tv.id} value={tv.id}>{tv.statut==='valide'?'🔒':'✏️'} {tv.nom}</option>)}
                  </select>
                </div>
              </div>
              <BandeauAlerte />
            </div>

            <div className="flex-1 overflow-hidden px-4 pb-4">
                {isPrinting ? (
                <PrintTimeGridView events={displayEvents} sonneries={sonneries} titre={`Modèle : ${currentTemplate.nom} ${printFilter.type !== 'all' ? '(Filtré)' : ''}`} />
              ) : (
                  <div className={`${t.cardBg} rounded-xl shadow border h-full p-2 ${currentTemplate.statut === 'brouillon' ? 'border-[#3B82F6] border-dashed border-2' : t.borderLight}`}>
                  <div className={`h-full transition-all duration-300 ${currentTemplate.statut === 'valide' ? 'pointer-events-none opacity-85 grayscale-[15%]' : ''}`}>
                    <FullCalendar
                      key={`cal-template-${activeTemplateId}-${currentTemplate.statut}-${isDarkMode}`}
                      plugins={[timeGridPlugin, interactionPlugin]}
                      initialView="timeGridWeek"
                      locale="fr"
                      firstDay={1} 
                      initialDate={currentTemplate.dateDebut}
                      headerToolbar={false} 
                      dayHeaderFormat={{ weekday: 'long' }} 
                      allDaySlot={false}
                      slotMinTime="07:40:00"
                      slotMaxTime="17:40:00"
                      slotDuration="00:05:00"
                      slotLabelInterval="00:05:00"
                      slotLabelContent={renderSlotLabel}
                      snapDuration="00:05:00"
                      hiddenDays={[0, 6]}
                      editable={currentTemplate.statut === 'brouillon'} 
                      selectable={currentTemplate.statut === 'brouillon'}
                      selectMirror={true}
                      dayMaxEvents={true}
                      height="100%"
                      slotEventOverlap={true}
                      events={displayEvents}
                      select={gererSelection}
                      eventChange={gererModificationEvenement}
                      eventContent={renderEventContent}
                      sonneries={sonneries}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {vueActive === 'planning' && (
          <div className={`flex-1 flex flex-col ${t.bgMain} h-full overflow-hidden`}>
            <div className="p-4 pb-2 no-print shrink-0">
              <div className="flex justify-between items-center mb-2">
                <h2 className={`text-lg font-bold ${t.header}`}>
                  📅 Planning Réel 
                  {printFilter.type === 'agent' && ` - Filtré pour : ${agents.find(a=>a.id===printFilter.id)?.nom}`}
                  {printFilter.type === 'poste' && ` - Filtré pour le poste : ${postes.find(p=>p.id===printFilter.id)?.nom}`}
                </h2>
                <div className="flex gap-2 items-center">
                  {currentViewMonday && (
                    <>
                      <select onChange={(e) => { if(e.target.value) importerModele(e.target.value); e.target.value=''; }} className={`${t.cardBg} ${t.textAccent} px-2 py-1 rounded text-xs font-bold border ${t.borderLight} shadow-sm outline-none cursor-pointer hover:opacity-75`}>
                        <option value="">📥 Appliquer un modèle...</option>
                        {templateVersions.map(tv => <option key={tv.id} value={tv.id}>{tv.nom}</option>)}
                      </select>
                      {customWeeks[currentViewMonday] && (
                        <button onClick={reinitialiserSemaineReelle} className="bg-orange-500/20 text-orange-500 hover:bg-orange-500/40 px-3 py-1 rounded text-xs font-bold border border-orange-500 shadow-sm transition">🔄 Rétablir</button>
                      )}
                    </>
                  )}
                </div>
              </div>
              <BandeauAlerte />
            </div>
            
            <div className="flex-1 overflow-hidden px-4 pb-4">
            {isPrinting ? (
                <PrintTimeGridView events={displayEvents} sonneries={sonneries} titre={`Semaine du ${currentViewMonday} ${printFilter.type !== 'all' ? '(Filtré)' : ''}`} />
              ) : (
              <div className={`${t.cardBg} rounded-xl shadow border ${t.borderLight} h-full p-2`}>
                  <FullCalendar
                    key={`cal-planning-${isDarkMode}`}
                    plugins={[timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    locale="fr"
                    firstDay={1}
                    initialDate={currentTemplate.dateDebut}
                    datesSet={(arg) => setCurrentViewMonday(getMondayStr(arg.start))}
                    headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
                    allDaySlot={false}
                    slotMinTime="07:40:00"
                    slotMaxTime="17:40:00"
                    slotDuration="00:15:00"
                    snapDuration="00:05:00"
                    hiddenDays={[0, 6]}
                    editable={true}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    height="100%"
                    slotEventOverlap={true}
                    events={displayEvents}
                    select={gererSelection}
                    eventChange={gererModificationEvenement}
                    eventContent={renderEventContent}
                  />
                </div>
              )}
            </div>
          </div>
        )}

{vueActive === 'dashboard' && (() => {
          const totalETP = Math.round(agents.reduce((sum, a) => sum + Number(a.quotite), 0)) / 100;
          
          return (
            <div className={`flex-1 p-8 overflow-auto ${t.bgMain} print-dashboard-table`}>
              <div className="flex justify-between items-end mb-6">
                <h2 className={`text-2xl font-bold ${t.header}`}>Bilan Annuel Global ({baseYear}-{baseYear+1})</h2>
                <div className={`${t.cardBg} px-5 py-3 rounded-xl shadow-sm border ${t.borderLight} flex items-center gap-6`}>
                   <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Dotation Globale</label>
                      <div className="flex items-center gap-1"><input type="number" step="0.1" value={dotation} onChange={e => setDotation(parseFloat(e.target.value)||0)} className={`w-20 p-1 border rounded text-xl font-black text-center bg-transparent ${t.header}`} /><span className="font-bold text-gray-500">ETP</span></div>
                   </div>
                   <div className="text-3xl font-light text-gray-400">/</div>
                   <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">ETP Répartis (Agents)</label>
                      <div className={`text-2xl font-black flex items-center gap-1 ${totalETP > dotation && dotation > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{totalETP.toFixed(2)}<span className="text-base">ETP</span></div>
                   </div>
                </div>
              </div>

              <div className={`${t.cardBg} rounded-xl shadow border ${t.borderLight} overflow-hidden`}>
                <table className="w-full text-sm text-left">
                  <thead className={`${t.headerBg} ${t.headerText} font-medium uppercase text-xs`}>
                    <tr><th className="p-4 border-r border-black/10">Agent</th><th className="p-4 border-r border-black/10 text-center">%</th><th className="p-4 border-r border-black/10 text-center bg-black/10">H. Contrat</th><th className="p-4 border-r border-black/10 text-center">H. Type Hebdo</th><th className="p-4 border-r border-black/10 text-center bg-black/10">H. Consommées</th><th className="p-4 text-center">Solde Final</th></tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {statsAgents.map(agent => (
                      <tr key={agent.id} className={`hover:${t.bgLight} transition-colors`}>
                        <td className={`p-4 font-bold border-r ${t.borderLight} ${t.header}`}>{agent.nom} {agent.estEtudiant && '🎓'}</td>
                        <td className={`p-4 text-center border-r ${t.borderLight}`} style={{ color: agent.couleurFond }}>{agent.quotite}%</td>
                        <td className={`p-4 text-center border-r ${t.borderLight} font-mono font-bold ${t.header}`}>{formatHeureTableau(agent.hContrat, true)}</td>
                        <td className={`p-4 text-center border-r ${t.borderLight} font-mono text-gray-500`}>{formatHeureTableau(agent.hHebdoType, true)}</td>
                        <td className={`p-4 text-center border-r ${t.borderLight} font-mono font-bold ${t.bgLight} ${t.header}`}>{formatHeureTableau(agent.heuresConsommees, true)}</td>
                        <td className={`p-4 text-center font-mono font-black text-lg ${agent.soldeGlobal > 0 ? 'bg-green-500/20 text-green-600' : (agent.soldeGlobal < 0 ? 'bg-red-500/20 text-red-500' : 'bg-emerald-500/10 text-emerald-500')}`}>{agent.soldeGlobal > 0 ? '+' : ''}{formatHeureTableau(agent.soldeGlobal, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
        {vueActive === 'absences' && (
          <div className={`flex-1 p-6 overflow-auto ${t.bgMain}`}>
            <h2 className={`text-2xl font-bold ${t.header} mb-6`}>Gestion des Absences et Retards</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {bilanAbsences.map(b => (
                <div key={b.id} className={`${t.cardBg} rounded-xl shadow-sm border ${t.borderLight} p-4 border-l-4`} style={{ borderLeftColor: b.couleur }}>
                  <div className={`font-black text-lg ${t.header} mb-3`}>{b.nom}</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><div className="text-gray-500 text-xs font-bold uppercase">Absences</div><div className="font-mono text-red-500 font-bold mt-1">{b.nbAbs} <span className="text-xs text-gray-500">({formatHeureTableau(b.hAbs, true)})</span></div></div>
                    <div><div className="text-gray-500 text-xs font-bold uppercase">Retards</div><div className="font-mono text-orange-500 font-bold mt-1">{b.nbRet} <span className="text-xs text-gray-500">({formatHeureTableau(b.hRet, true)})</span></div></div>
                  </div>
                  {b.nbRetRat > 0 && (<div className="mt-3 pt-3 border-t border-gray-500/30 text-xs font-bold text-red-500 bg-red-500/10 p-2 rounded">⚠️ {b.nbRetRat} retard(s) à rattraper ({formatHeureTableau(b.hRetRat, true)})</div>)}
                  {b.nbRet > 0 && b.nbRetRat === 0 && (<div className="mt-3 pt-3 border-t border-gray-500/30 text-xs font-bold text-green-500 bg-green-500/10 p-2 rounded">✅ Tous les retards sont rattrapés.</div>)}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className={`lg:col-span-1 ${t.cardBg} p-6 rounded-xl shadow border ${t.borderLight} h-fit`}>
                <h3 className={`font-bold text-md ${t.header} mb-4 pb-2 border-b ${t.borderLight}`}>Déclarer un événement</h3>
                <form onSubmit={ajouterAbsenceRetard} className="space-y-4">
                  <div><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Agent concerné</label><select required value={formAbsence.agentId} onChange={e => setFormAbsence({...formAbsence, agentId: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent text-sm`}><option value="" disabled>-- Choisir un agent --</option>{agents.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select></div>
                  <div><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Type</label><select value={formAbsence.type} onChange={e => setFormAbsence({...formAbsence, type: e.target.value, journeeComplete: e.target.value === 'absence', deduireHeures: e.target.value === 'retard'})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent text-sm`}><option value="absence">Absence</option><option value="retard">Retard</option></select></div>
                  {formAbsence.type === 'absence' && (<label className={`flex items-center gap-2 text-sm font-bold ${t.textAccent} cursor-pointer ${t.bgLight} p-2 rounded border ${t.borderLight}`}><input type="checkbox" checked={formAbsence.journeeComplete} onChange={e => setFormAbsence({...formAbsence, journeeComplete: e.target.checked})} className="w-4 h-4 cursor-pointer" />Journée(s) complète(s)</label>)}
                  <div className="flex gap-4">
                    <div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>{formAbsence.journeeComplete ? 'Début' : 'Date'}</label><input type="date" required value={formAbsence.dateDebut} onChange={e => setFormAbsence({...formAbsence, dateDebut: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} /></div>
                    {formAbsence.journeeComplete && (<div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Fin (Optionnel)</label><input type="date" value={formAbsence.dateFin} onChange={e => setFormAbsence({...formAbsence, dateFin: e.target.value})} min={formAbsence.dateDebut} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} /></div>)}
                  </div>
                  {!formAbsence.journeeComplete && (<div className="flex gap-4"><div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Heure Début</label><input type="time" required value={formAbsence.heureDebut} onChange={e => setFormAbsence({...formAbsence, heureDebut: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm font-bold text-center bg-transparent`} /></div><div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Heure Fin</label><input type="time" required value={formAbsence.heureFin} onChange={e => setFormAbsence({...formAbsence, heureFin: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm font-bold text-center bg-transparent`} /></div></div>)}
                  <label className="flex items-center gap-2 text-sm font-bold text-red-500 cursor-pointer bg-red-500/10 p-2 rounded border border-red-500/30"><input type="checkbox" checked={formAbsence.deduireHeures} onChange={e => setFormAbsence({...formAbsence, deduireHeures: e.target.checked})} className="w-4 h-4 cursor-pointer" />Déduire du bilan (à rattraper / sans solde)</label>
                  <div><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Motif</label><input type="text" required value={formAbsence.motif} onChange={e => setFormAbsence({...formAbsence, motif: e.target.value})} placeholder="Ex: Maladie, Grève, Panne réveil..." className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} /></div>
                  <button type="submit" className={`w-full ${t.btnPrimary} rounded p-2.5 text-sm font-bold shadow transition`}>Créer sur le planning</button>
                </form>
              </div>

              <div className={`lg:col-span-2 ${t.cardBg} rounded-xl shadow border ${t.borderLight} overflow-hidden flex flex-col`}>
                <div className={`${t.headerBg} ${t.headerText} p-4 font-bold text-sm`}>Historique complet des événements</div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-sm text-left">
                    <thead className={`${t.bgLight} ${t.header} uppercase text-xs border-b ${t.borderLight}`}><tr><th className="p-3">Date</th><th className="p-3">Agent</th><th className="p-3">Type</th><th className="p-3 text-center">Durée</th><th className="p-3">Motif</th><th className="p-3 text-center">Statut (Retards)</th><th className="p-3 text-center">Action</th></tr></thead>
                    <tbody className="divide-y divide-black/5">
                      {absences.map(a => {
                        const ag = agents.find(agent => agent.id === a.agentId); const typeAbs = a.type || 'absence'; 
                        const dureeAbs = getHeuresAbsence(a);
                        return (
                          <tr key={a.id} className={`hover:${t.bgLight} transition-colors`}>
                            <td className="p-3 font-mono text-xs text-gray-500">{a.start.split('T')[0]}</td><td className={`p-3 font-bold ${t.header}`}>{ag ? ag.nom : 'Inconnu'}</td>
                            <td className="p-3 flex items-center gap-1"><span className={`px-2 py-0.5 rounded text-xs font-bold ${typeAbs === 'absence' ? 'bg-red-500/20 text-red-500' : 'bg-orange-500/20 text-orange-500'}`}>{typeAbs.toUpperCase()}</span>{a.deduire && <span className="text-[10px] bg-red-600 text-white px-1 rounded shadow-sm" title="Déduit du bilan">DÉDUIT</span>}</td>
                            <td className={`p-3 text-center font-mono font-bold ${t.header}`}>{formatHeureTableau(dureeAbs, true)}</td><td className="p-3 text-gray-500 italic">{a.motif || ''}</td>
                            <td className="p-3 text-center">{typeAbs === 'retard' && a.deduire ? ( <button onClick={() => toggleRattrape(a.id)} className={`px-2 py-1 rounded text-xs font-bold transition shadow-sm ${a.rattrape ? 'bg-green-500/20 text-green-600 border border-green-500/30' : 'bg-red-500/20 text-red-500 border border-red-500/30 hover:opacity-80'}`}>{a.rattrape ? '✅ Rattrapé' : '❌ À rattraper'}</button> ) : ( <span className="text-gray-500 text-xs">-</span> )}</td>
                            <td className="p-3 text-center"><button onClick={() => supprimerAbsence(a.id)} className="text-gray-500 hover:text-red-500 px-2 py-1 rounded text-xs font-bold transition">✖</button></td>
                          </tr>
                        );
                      })}
                      {absences.length === 0 && ( <tr><td colSpan="7" className="p-6 text-center text-gray-500 italic">Aucune absence ou retard enregistré.</td></tr> )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {vueActive === 'agent' && agentConsulte && (
          <div className={`flex-1 flex flex-col h-full ${t.bgMain} print:h-auto print:bg-white`}>
            <div className={`flex justify-between items-center p-3 ${t.headerBg} border-b ${t.borderLight} no-print shrink-0`}>
              <div className="flex gap-4 items-center">
                <select value={agentConsulte} onChange={(e) => setAgentConsulte(Number(e.target.value))} className={`bg-transparent ${t.headerText} border ${t.borderLight} font-bold p-2 rounded outline-none`}>{agents.map(a => <option key={a.id} value={a.id}>{a.nom} ({a.quotite}%)</option>)}</select>
                <span className={`text-sm font-medium ${t.textMenuMuted}`}>Année Scolaire {baseYear}-{baseYear+1}</span>
              </div>
              <div className={`hidden print:block text-xl font-bold ${t.headerText}`}>Bilan Annuel : {agents.find(a=>a.id===agentConsulte)?.nom} ({baseYear}-{baseYear+1})</div>
              <div className={`flex gap-6 ${t.bgLight} p-2 rounded border ${t.borderLight} print:border-none`}>
                <div className="flex flex-col items-center"><span className={`text-xs ${t.textMenuMuted} print:text-black`}>H. Contrat</span><span className={`font-mono font-bold ${t.headerText}`}>{formatHeureTableau(statsAgents.find(a=>a.id===agentConsulte)?.hContrat, true)}</span></div>
                <div className="flex flex-col items-center"><span className={`text-xs ${t.textMenuMuted} print:text-black`}>H. Consommées</span><span className={`font-mono font-bold opacity-80 ${t.headerText} print:text-black`}>{formatHeureTableau(statsAgents.find(a=>a.id===agentConsulte)?.heuresConsommees, true)}</span></div>
                <div className="flex flex-col items-center">
                  <span className={`text-xs ${t.textMenuMuted} print:text-black`}>Solde Actuel</span>
                  <span className={`font-mono font-bold px-2 rounded print:border print:border-black ${statsAgents.find(a=>a.id===agentConsulte)?.soldeGlobal > 0 ? 'bg-green-500/20 text-green-600 print:text-green-800 print:bg-green-100' : (statsAgents.find(a=>a.id===agentConsulte)?.soldeGlobal < 0 ? 'bg-red-500/20 text-red-500 print:text-red-800 print:bg-red-100' : 'bg-emerald-500/20 text-emerald-500 print:text-emerald-800 print:bg-emerald-100')}`}>
                    {statsAgents.find(a=>a.id===agentConsulte)?.soldeGlobal > 0 ? '+' : ''}{formatHeureTableau(statsAgents.find(a=>a.id===agentConsulte)?.soldeGlobal, true)}
                  </span>
                </div>
              </div>
            </div>

            <div className={`flex-1 overflow-auto p-4 ${t.bgMain} print:bg-white print:hidden`}>
              <table className="w-full text-center border-collapse text-xs table-fixed min-w-[1200px] shadow-sm">
                <thead><tr>{anneeScolaire.map((mois, i) => (<th key={i} className={`border ${t.borderLight} ${t.headerBg} ${t.headerText} py-1.5 uppercase tracking-wider`}>{mois.nom}</th>))}</tr></thead>
                <tbody>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(jourNum => (
                    <tr key={jourNum}>
                      {anneeScolaire.map((mois, idx) => {
                        const daysInMonth = new Date(mois.y, mois.m + 1, 0).getDate();
                        if (jourNum > daysInMonth) return <td key={idx} className={`border ${t.borderLight} opacity-20`}></td>;
                        const dateObj = new Date(mois.y, mois.m, jourNum); const dateStr = `${mois.y}-${String(mois.m+1).padStart(2,'0')}-${String(jourNum).padStart(2,'0')}`;
                        const mondayStr = getMondayStr(dateObj); const dayOfWeek = dateObj.getDay(); const nomJour = nomsJours[dayOfWeek]; const estWeekEnd = dayOfWeek === 0 || dayOfWeek === 6; const infoPeriode = getInfosPeriode(dateObj);
                        
                        const exc = exceptions[`${agentConsulte}_${dateStr}`]; 
                        let hFinal = exc ? exc.h : getHeuresTheoriquesJour(agentConsulte, dateStr);
                        
                        const absDuJour = absences.filter(a => a.agentId === agentConsulte && a.start.startsWith(dateStr)); 
                        const hDeduct = absDuJour.filter(a => a.deduire).reduce((tot, a) => tot + getHeuresAbsence(a), 0); 
                        hFinal = Math.max(0, hFinal - hDeduct);
                        
                        let noteAffichage = infoPeriode ? infoPeriode.nom : (exc ? exc.note : ''); 
                        if (absDuJour.length > 0) { const txtAbs = absDuJour.map(a => `${a.type.toUpperCase()}${a.deduire?' (-h)':''}`).join(', '); noteAffichage = noteAffichage ? `${noteAffichage} / ${txtAbs}` : txtAbs; }
                        
                        let bgJour = t.cardBg; if (dayOfWeek === 0) bgJour = t.bgLight; if (dayOfWeek === 6) bgJour = t.bgMain;  
                        if (infoPeriode) { if (infoPeriode.type === 'ferie') bgJour = "bg-green-500/20 text-green-600 font-bold"; else bgJour = `${t.bgLight} ${t.header}`; }
                        if (absDuJour.length > 0) bgJour = "bg-red-500/20 text-red-500 font-bold";

                        const isExc = exc || absDuJour.length > 0;
                        const cellBg1 = isExc ? 'bg-orange-500/20 text-orange-500' : t.cardBg;
                        const cellBg2 = isExc ? 'bg-orange-500/10 text-orange-500 font-bold' : `${t.cardBg} ${t.textMenuMuted}`;

                        return (
                          <td key={idx} className={`border ${t.borderLight} p-0 hover:outline hover:outline-2 hover:outline-blue-500 cursor-pointer relative`} onClick={() => gererClicJourAgent(agentConsulte, dateStr, hFinal, noteAffichage)}>
                            <div className="flex h-6 items-stretch">
                              <div className={`w-8 flex-shrink-0 flex items-center justify-center border-r ${t.borderLight} text-[10px] ${bgJour}`}><span className="rotate-[-90deg] mr-1 text-[8px] opacity-70">{nomJour[0]}</span>{jourNum}</div>
                              <div className={`w-10 flex-shrink-0 flex items-center justify-center font-bold font-mono border-r ${t.borderLight} ${cellBg1}`}>{formatHeureTableau(hFinal)}</div>
                              <div className={`flex-1 flex items-center px-1 truncate text-[10px] ${cellBg2}`}>{noteAffichage}</div>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="hidden print:block w-full">
              <PrintAgentYearlyView agent={agents.find(a=>a.id===agentConsulte)} baseYear={baseYear} anneeScolaire={anneeScolaire} getMondayStr={getMondayStr} getInfosPeriode={getInfosPeriode} exceptions={exceptions} formatHeureTableau={formatHeureTableau} absences={absences} getHeuresTheoriquesJour={getHeuresTheoriquesJour} getHeuresAbsence={getHeuresAbsence} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [isSetupComplete, setIsSetupComplete] = useState(() => localStorage.getItem('edt-setup-done') === 'true');
  const [themeId, setThemeId] = useState(() => localStorage.getItem('edt-theme') || 'menthe_terracotta');
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('edt-dark-mode') === 'true');
  const [customColors, setCustomColors] = useState(() => JSON.parse(localStorage.getItem('edt-custom-colors')) || { primary: '#3B82F6', accent: '#F59E0B' });

  const baseTheme = THEMES[themeId] || THEMES.menthe_terracotta;
  const t = { ...baseTheme, ...(isDarkMode ? baseTheme.dark : baseTheme.light), isDark: isDarkMode };

  const changeTheme = (newTheme) => { setThemeId(newTheme); localStorage.setItem('edt-theme', newTheme); };
  const toggleDarkMode = () => { const newMode = !isDarkMode; setIsDarkMode(newMode); localStorage.setItem('edt-dark-mode', newMode.toString()); };
  const updateCustomColor = (key, val) => { const newColors = { ...customColors, [key]: val }; setCustomColors(newColors); localStorage.setItem('edt-custom-colors', JSON.stringify(newColors)); };

  return (
    <>
      <style>{`
        :root {
          --fc-page-bg-color: transparent;
          --fc-neutral-bg-color: rgba(0, 0, 0, 0.04);
          --fc-list-event-hover-bg-color: rgba(0, 0, 0, 0.02);
          --fc-button-bg-color: ${t.fcPrimary};
          --fc-button-border-color: ${t.fcPrimary};
          --fc-button-hover-bg-color: ${t.fcPrimaryHover};
          --fc-button-hover-border-color: ${t.fcPrimaryHover};
          --fc-button-active-bg-color: ${t.fcPrimaryHover};
          --fc-button-active-border-color: ${t.fcPrimaryHover};
          --fc-today-bg-color: ${t.fcToday};
        }

        ${themeId === 'personnalise' ? `
          :root {
            --c-prim: ${customColors.primary};
            --c-prim-rgb: ${hexToRgb(customColors.primary)};
            --c-acc: ${customColors.accent};
            --c-acc-rgb: ${hexToRgb(customColors.accent)};
            --c-dark-sidebar: color-mix(in srgb, var(--c-prim) 15%, #0b0f19);
          }
          .custom-sidebar { background-color: var(--c-prim) !important; }
          .custom-btn { background-color: var(--c-acc) !important; color: white !important; }
          .custom-text-accent { color: var(--c-acc) !important; }
          .custom-text-primary { color: var(--c-prim) !important; }
          .custom-text-primary-muted { color: rgba(var(--c-prim-rgb), 0.6) !important; }
          .custom-bg-main { background-color: rgba(var(--c-prim-rgb), 0.05) !important; }
          .custom-bg-light { background-color: rgba(var(--c-prim-rgb), 0.15) !important; }
          .custom-border { border-color: rgba(var(--c-prim-rgb), 0.2) !important; }
          .custom-card { background-color: #ffffff !important; }
          
          .custom-sidebar-dark { background-color: rgba(var(--c-prim-rgb), 0.15) !important; }
          .custom-border-dark { border-color: rgba(var(--c-prim-rgb), 0.2) !important; }
        ` : ''}

        .fc-event-main { pointer-events: auto !important; }
        .fc-timegrid-event-harness { pointer-events: none !important; }
        .fc-timegrid-slot { height: 20px !important; }
        .fc-timegrid-slot-lane { border-bottom: 1px dotted rgba(128,128,128,0.15) !important; }
        .fc-timegrid-slot-label { border-bottom: none !important; }
        /* NOUVEAU : On empêche FullCalendar de forcer un fond opaque */
        .fc-timegrid-event { background: transparent !important; border: none !important; box-shadow: none !important; }

        @media screen {
          ${t.isDark ? `
            .fc, table { color: ${t.hexText} !important; }
            .fc-theme-standard td, .fc-theme-standard th, .fc-scrollgrid { border-color: ${t.hexBorder} !important; }
            .fc-col-header-cell { background-color: ${t.hexBgMain} !important; }
            input[type="date"], input[type="time"], input[type="number"], input[type="text"], select { 
              color-scheme: dark; 
              color: ${t.hexText} !important;
            }
            ::placeholder { color: ${t.hexText}; opacity: 0.5; }
          ` : ''}
        }

@media print {
          @page { size: A4 landscape; margin: 5mm; }
          
          body, html, #root { 
            background: white !important; 
            margin: 0 !important; 
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          
          /* Neutraliser les classes de hauteur d'écran et de marges qui causent la page blanche */
          .h-screen { height: auto !important; min-height: 0 !important; }
          .w-screen { width: auto !important; min-width: 0 !important; }
          .pb-4 { padding-bottom: 0 !important; }
          .px-4 { padding-left: 0 !important; padding-right: 0 !important; }
          
          .no-print, .w-80, .md\\:hidden { display: none !important; }
          
          #print-area { 
            position: absolute !important; left: 0; top: 0; 
            width: 100% !important; height: auto !important; 
            margin: 0 !important; padding: 0 !important;
            display: block !important; background: white !important; z-index: 9999; 
          }
          
          /* Coupe stricte "au massicot" pour le planning Hebdo / Quotidien */
          .print-weekly-page { 
            width: 100%; 
            height: 180mm !important; /* Hauteur sécurisée pour 1 seule page */
            max-height: 180mm !important; 
            overflow: hidden !important; 
            box-sizing: border-box; 
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          
          /* Conserve le saut de page uniquement pour le calendrier annuel des agents */
          .print-agent-page { 
            width: 100%; height: 185mm !important; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; page-break-after: always; break-after: page; 
          }
          .print-agent-page:last-child { page-break-after: auto; break-after: auto; }
          
          .print-dashboard-table { transform: scale(0.85); transform-origin: top left; width: 115% !important; border:none; box-shadow:none; }
          
          /* Forcer les couleurs noires à l'impression pour annuler les thèmes */
          .print-agent-page td, .print-agent-page th, .print-dashboard-table td, .print-dashboard-table th { color: black !important; }
          .print-agent-page td > div > div { color: black !important; }
        }
        `}</style>

      {!isSetupComplete ? (
        <SetupWizard onComplete={() => setIsSetupComplete(true)} t={t} />
      ) : (
        <MainApp t={t} themeId={themeId} changeTheme={changeTheme} isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} customColors={customColors} updateCustomColor={updateCustomColor} />
      )}
    </>
  );
}