import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { loadAppData, saveAppData, clearAppData } from './storage.js';
// --- IMPORTS EXTERNES ---
import { 
  THEMES, hexToRgb, getContrastYIQ, 
  formatHeureTableau, parseHeureSaisie, extractTimeStr, getMondayStr,
  generateGrid, calculerContratBetty, formatHeureMinutes,
  detecterChevauchements, getActiveContract, calculerContratProratise
} from './utils.js';
import { SetupWizard } from './SetupWizard.jsx';
import { PrintDailyView, PrintTimeGridView, PrintTemplateView, PrintAgentYearlyView, PrintIndividualWeeklyView } from './PrintViews.jsx';
import { TimelineTrack, TimelineEvent } from './TimelineComponents.jsx';
import { useHistory } from './useHistory.js';

// --- IMPORT DES MODALES ---
import { 
  ModalPrint, ModalNewVersion, ModalPoste, ModalException, 
  ModalParametres, ModalCreation, ModalBesoinMulti, ModalEditBesoin, ModalAgent,
  ModalConfirm // <-- Ne l'oublie pas dans l'import en haut !
} from './Modals.jsx';

const MainApp = ({ t, themeId, changeTheme, isDarkMode, toggleDarkMode, customColors, updateCustomColor }) => {
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [now, setNow] = useState(new Date());
  // --- GESTIONNAIRE DE CONFIRMATION ---
  const [confirmDialog, setConfirmDialog] = useState({ isOpen: false, title: '', message: '', onConfirm: null, isDanger: true, confirmText: 'Confirmer' });
  const requestConfirm = (options) => setConfirmDialog({ isOpen: true, isDanger: true, confirmText: 'Confirmer', ...options });
  const closeConfirm = () => setConfirmDialog(prev => ({ ...prev, isOpen: false }));

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const [vueActive, setVueActive] = useState('template'); 
  const [agentConsulte, setAgentConsulte] = useState(null); 
  const [jourConsulte, setJourConsulte] = useState(() => {
    const d = new Date();
    const pad = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  });
  
  // -- ÉTATS VIDES AU DÉMARRAGE (Remontés par IndexedDB) --
  const [agents, setAgents] = useState([]);
  const [postes, setPostes] = useState([]);
  const [jourTemplate, setJourTemplate] = useState(1); 
  const [periodesFeriees, setPeriodesFeriees] = useState([]);
  const [dotation, setDotation] = useState(0);
  const [templateVersions, setTemplateVersions] = useState([{ id: 1, nom: 'Chargement...', dateDebut: `2024-09-01`, statut: 'brouillon', events: [], besoins: [] }]);
  const [activeTemplateId, setActiveTemplateId] = useState(1);
  const [customWeeks, setCustomWeeks] = useState({});
  const [exceptions, setExceptions] = useState({});
  const [amplitude, setAmplitude] = useState({ start: '07:30', end: '18:00' });
  const [sonneries, setSonneries] = useState(['08:00', '08:55', '10:05', '11:00', '11:55', '12:50', '13:45', '14:40', '15:50', '16:45', '17:40']);
  const [sonneriesText, setSonneriesText] = useState('');
  const [absences, setAbsences] = useState([]);

  // --- HELPER AMPLITUDE HORAIRE ---
  const getAmplitudeStr = (eventsList) => {
    const spanEvents = eventsList.filter(e => !e.extendedProps?.isAbsence && !e.extendedProps?.isBesoin);
    if (spanEvents.length === 0) return "";
    let min = Infinity, max = -Infinity;
    spanEvents.forEach(e => {
      const d1 = new Date(e.start), d2 = new Date(e.end);
      const startM = d1.getHours() * 60 + d1.getMinutes();
      const endM = d2.getHours() * 60 + d2.getMinutes();
      if (startM < min) min = startM;
      if (endM > max) max = endM;
    });
    const fmt = m => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    return `${fmt(min)}-${fmt(max)}`;
  };

  // =========================================================================
  // CHARGEMENT INITIAL (INDEXED DB)
  // =========================================================================
  useEffect(() => {
    const initData = async () => {
      const data = await loadAppData();
      if (data) {
        if (data.agents) setAgents(data.agents);
        if (data.postes) setPostes(data.postes);
        if (data.periodesFeriees) setPeriodesFeriees(data.periodesFeriees);
        if (data.dotation) setDotation(data.dotation);
        if (data.customWeeks) setCustomWeeks(data.customWeeks);
        if (data.exceptions) setExceptions(data.exceptions);
        if (data.absences) setAbsences(data.absences);
        if (data.amplitude) setAmplitude(data.amplitude);
        if (data.sonneries) {
          setSonneries(data.sonneries);
          setSonneriesText(data.sonneries.join(', '));
        }
        if (data.templateVersions && data.templateVersions.length > 0) {
          setTemplateVersions(data.templateVersions.map(p => ({ ...p, statut: p.statut || 'valide' })));
          setActiveTemplateId(data.templateVersions[0].id);
        } else {
          const nowD = new Date();
          const baseY = nowD.getMonth() >= 6 ? nowD.getFullYear() : nowD.getFullYear() - 1;
          setTemplateVersions([{ id: 1, nom: 'Semaine Type par défaut', dateDebut: `${baseY}-09-01`, statut: 'brouillon', events: [], besoins: [] }]);
        }
      } else {
        const nowD = new Date();
        const baseY = nowD.getMonth() >= 6 ? nowD.getFullYear() : nowD.getFullYear() - 1;
        setTemplateVersions([{ id: 1, nom: 'Semaine Type par défaut', dateDebut: `${baseY}-09-01`, statut: 'brouillon', events: [], besoins: [] }]);
        setSonneriesText(sonneries.join(', '));
      }
      setIsDataLoaded(true); 
    };
    initData();
  }, []);

  // =========================================================================
  // SAUVEGARDE SILENCIEUSE (DEBOUNCED)
  // =========================================================================
  useEffect(() => {
    if (!isDataLoaded) return;
    const timer = setTimeout(() => {
      saveAppData({ agents, postes, periodesFeriees, templateVersions, customWeeks, exceptions, absences, dotation, amplitude, sonneries });
    }, 1500); 
    return () => clearTimeout(timer);
  }, [agents, postes, periodesFeriees, templateVersions, customWeeks, exceptions, absences, dotation, amplitude, sonneries, isDataLoaded]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [modalPoste, setModalPoste] = useState({ isOpen: false, id: null, nom: '', couleur: '#8B5CF6', qte: 1, slots: [] });

  const ouvrirCreationPoste = () => {
    setModalPoste({
      isOpen: true, id: null, nom: '', couleur: '#8B5CF6', qte: 1, 
      slots: [{ id: Date.now(), start: '08:00', end: '12:00', days: { 1: true, 2: true, 3: true, 4: true, 5: true } }]
    });
  };

  const ouvrirEditionPoste = (poste) => {
    const defaultSlots = poste.slots && poste.slots.length > 0 ? poste.slots : [{ id: Date.now(), start: '08:00', end: '12:00', days: { 1: true, 2: true, 3: true, 4: true, 5: true } }];
    setModalPoste({ isOpen: true, id: poste.id, nom: poste.nom, couleur: poste.couleur || '#8B5CF6', qte: poste.qte || 1, slots: defaultSlots });
  };

  const generateBesoinsFromSlots = (posteId, posteNom, qte, slots, templateDateStr) => {
    const baseMonday = new Date(getMondayStr(templateDateStr || new Date()));
    const newBesoins = [];
    slots.forEach(slot => {
      if (slot.start && slot.end) {
        [1, 2, 3, 4, 5].forEach(dayIndex => {
          if (slot.days[dayIndex]) {
            const d = new Date(baseMonday);
            d.setDate(d.getDate() + dayIndex - 1);
            const pad = n => String(n).padStart(2, '0');
            const dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

            newBesoins.push({
              id: String(Date.now() + Math.random()), start: `${dateStr}T${slot.start}:00`, end: `${dateStr}T${slot.end}:00`,
              extendedProps: { posteId, posteNom, qte: Number(qte) }
            });
          }
        });
      }
    });
    return newBesoins;
  };

  const validerPosteModal = (e) => {
    e.preventDefault();
    if (!modalPoste.nom.trim()) return alert('Le nom du poste est obligatoire.');
    const posteId = modalPoste.id || Date.now();
    const updatedPoste = { id: posteId, nom: modalPoste.nom.trim(), couleur: modalPoste.couleur, qte: Number(modalPoste.qte) || 1, slots: modalPoste.slots || [] };

    if (modalPoste.id) setPostes(postes.map(p => p.id === modalPoste.id ? updatedPoste : p));
    else setPostes([...postes, updatedPoste]);

    const newTemplates = templateVersions.map(template => {
      const filteredBesoins = (template.besoins || []).filter(b => b.extendedProps?.posteId !== posteId);
      const generatedBesoins = generateBesoinsFromSlots(posteId, updatedPoste.nom, updatedPoste.qte, updatedPoste.slots, template.dateDebut);
      
      let updatedEvents = template.events || [];
      if (modalPoste.id) {
        updatedEvents = updatedEvents.map(evt => evt.extendedProps?.posteId === posteId ? {
          ...evt, extendedProps: { ...evt.extendedProps, posteNom: updatedPoste.nom, posteCouleur: updatedPoste.couleur }
        } : evt);
      }
      return { ...template, events: updatedEvents, besoins: [...filteredBesoins, ...generatedBesoins] };
    });
    
    setTemplateVersions(newTemplates);
    setModalPoste({ isOpen: false, id: null, nom: '', couleur: '#8B5CF6', qte: 1, slots: [] });
  };

  const supprimerPoste = (id, nom, e) => { 
    if (e) e.stopPropagation(); 
    requestConfirm({
      title: 'Supprimer un poste',
      message: `Voulez-vous vraiment supprimer le poste "${nom}" ?\nLes agents affectés dessus perdront leur étiquette.`,
      confirmText: 'Supprimer',
      onConfirm: () => setPostes(postes.filter(p => p.id !== id))
    });
  };

  const sonneriesMins = useMemo(() => sonneries.map(s => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  }), [sonneries]);

  const getCurrentState = useCallback(() => ({
    templateVersions, customWeeks, absences
  }), [templateVersions, customWeeks, absences]);

  const applyState = useCallback((state) => {
    setTemplateVersions(state.templateVersions);
    setCustomWeeks(state.customWeeks);
    setAbsences(state.absences);
  }, []);

  const { sauvegarderEtatPrecedent, showUndoToast, showRedoToast } = useHistory(getCurrentState, applyState);

  const [modalCreation, setModalCreation] = useState({ isOpen: false, eventId: null, start: null, end: null });
  const [formTypeEvent, setFormTypeEvent] = useState('affectation'); 
  const [formTypeAbsence, setFormTypeAbsence] = useState('absence'); 
  const [formAbsImpact, setFormAbsImpact] = useState('local');
  const [formAgent, setFormAgent] = useState('');
  const [formPoste, setFormPoste] = useState('');
  const [formNote, setFormNote] = useState('');

  const [modalNewVersion, setModalNewVersion] = useState({ isOpen: false, dateDebut: '', nom: 'Évolution' });
  const [modalPrint, setModalPrint] = useState({ isOpen: false, type: 'template', jours: [1, 2, 3, 4, 5], format: 'A4' });

  const [modalException, setModalException] = useState({ isOpen: false, agentId: null, dateStr: null, h: '0h00', note: '' });

  const [formAbsence, setFormAbsence] = useState({
    agentIds: [], type: 'retard',  journeeComplete: false, dateDebut: new Date().toISOString().split('T')[0],
    dateFin: '', dureeSaisie: '', impact: 'local', motif: ''
  });
  const [filtreAgentAbsence, setFiltreAgentAbsence] = useState(null);

  const [modalBesoinMulti, setModalBesoinMulti] = useState({ isOpen: false, posteId: '', qte: 1, slots: [] });
  const [modalEditBesoin, setModalEditBesoin] = useState({ isOpen: false, id: null, posteId: '', qte: 1, start: '', end: '' });
  const [modalAgent, setModalAgent] = useState({ 
    isOpen: false, id: null, nom: '', quotite: 100, estEtudiant: false, 
    hContrat: 0, couleurFond: '#10B981', jours: { 1: true, 2: true, 3: true, 4: true, 5: true } 
  });
  const [modalParametres, setModalParametres] = useState(false);
  const [formPeriode, setFormPeriode] = useState({ nom: '', debut: '', fin: '', type: 'vacances' });

  const [printFilter, setPrintFilter] = useState({ type: 'all', id: null });
  const [isPrinting, setIsPrinting] = useState(false);
  const [modeImpression, setModeImpression] = useState('global');
  
  const [modeEdition, setModeEdition] = useState('agents'); 
  const [formBesoinQte, setFormBesoinQte] = useState(1);
  const [agentActif, setAgentActif] = useState(null);
  const [posteActif, setPosteActif] = useState(null);
  
  const [currentViewMonday, setCurrentViewMonday] = useState(() => getMondayStr(new Date())); 
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const isInitialMount = useRef(true);
  const [needsBackup, setNeedsBackup] = useState(false);
  
  const [copiedEvents, setCopiedEvents] = useState([]);

  const getSchoolYearBase = () => {
     if (templateVersions.length > 0 && templateVersions[0].dateDebut) {
        const d = new Date(templateVersions[0].dateDebut);
        return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
     }
     const nowD = new Date(); return nowD.getMonth() >= 6 ? nowD.getFullYear() : nowD.getFullYear() - 1;
  };
  const baseYear = getSchoolYearBase();
  const nomsJours = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

  const currentTemplate = templateVersions.find(v => v.id === activeTemplateId) || templateVersions[0] || { id: 1, nom: 'Chargement...', dateDebut: `${baseYear}-09-01`, statut: 'brouillon', events: [], besoins: [] }; 

  const gabarits = useMemo(() => {
    const g = {};
    templateVersions.forEach(tv => {
      g[tv.id] = {};
      agents.forEach(a => { g[tv.id][a.id] = { 0:0, 1:0, 2:0, 3:0, 4:0, 5:0, 6:0, totalHebdo: 0 }; });
      (tv.events || []).forEach(evt => {
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
  }, [templateVersions, agents]);

  const getInfosPeriode = (date) => {
    const pad = n => String(n).padStart(2, '0');
    const str = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
    let vacs = null;
    let ferie = null;

    for (const v of periodesFeriees) {
      let effectiveStart = v.debut;
      if (v.type === 'vacances') {
        const dDebut = new Date(v.debut);
        if (dDebut.getDay() === 5) {
          dDebut.setDate(dDebut.getDate() + 1);
          effectiveStart = `${dDebut.getFullYear()}-${pad(dDebut.getMonth()+1)}-${pad(dDebut.getDate())}`;
        }
      }

      if (str >= effectiveStart && str <= v.fin) {
        if (v.type === 'vacances') vacs = v;
        else if (v.type === 'ferie') ferie = v;
      }
    }

    const cleanName = (name) => {
      if (!name) return name;
      if (name.toLowerCase().includes("vacances d'été") || name.toLowerCase().includes("vacances d'ete")) return "Vacances d'été";
      return name;
    };

    if (vacs) return { type: 'vacances', nom: ferie ? `${cleanName(vacs.nom)} (${ferie.nom})` : cleanName(vacs.nom) };
    if (ferie) return { type: 'ferie', nom: ferie.nom };
    return null;
  };

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
        if (infoPeriode.type === 'ferie') hJour = gabarits[applicableTemplate?.id]?.[agentId]?.[dayOfWeek] || 0;
        else hJour = 0; 
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
    if (estJourneeComplete) return getHeuresTheoriquesJour(a.agentId, dateStr);
    return dureeSaisie;
  };

  const statsAgents = useMemo(() => {
    return agents.map(agent => {
      let heuresConsommees = 0;
      for (let m = 8; m < 20; m++) {
        const year = baseYear + Math.floor(m / 12);
        const month = m % 12;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
          const hJour = getHeuresTheoriquesJour(agent.id, dateStr);
          const absDuJour = absences.filter(a => a.agentId === agent.id && a.start.startsWith(dateStr));
          
          const hDeductGlobal = absDuJour.filter(a => ['absence', 'retard'].includes(a.type) && a.impact === 'global').reduce((tot, a) => tot + getHeuresAbsence(a), 0);
          const hSuppGlobal = absDuJour.filter(a => a.type === 'heures_supp' && a.impact === 'global').reduce((tot, a) => tot + getHeuresAbsence(a), 0);

          heuresConsommees += Math.max(0, hJour - hDeductGlobal) + hSuppGlobal;
        }
      }
      
      const applicableTemplate = templateVersions.find(tv => tv.id === activeTemplateId) || templateVersions[0];
      const hHebdoType = gabarits[applicableTemplate?.id]?.[agent.id]?.totalHebdo || 0;

      // 1. Calcul du solde en minutes
      let soldeMins = (agent.hContrat - heuresConsommees) * 60;
      
      // 2. Arrondi mathématique strict au palier de 5 minutes le plus proche
      soldeMins = Math.round(soldeMins / 5) * 5;
      
      // 3. Reconversion en heures décimales
      const soldeGlobal = soldeMins / 60;

      return { ...agent, heuresConsommees, soldeGlobal, hHebdoType };
    });
  }, [agents, baseYear, absences, exceptions, customWeeks, templateVersions, activeTemplateId, gabarits]);
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

  const getEventsForWeek = (mondayStr) => {
    if (!mondayStr) return [];
    if (customWeeks[mondayStr]) return customWeeks[mondayStr]; 
    const applicableTemplate = [...templateVersions].sort((a,b)=>b.dateDebut.localeCompare(a.dateDebut)).find(t => t.dateDebut <= mondayStr) || templateVersions[0];
    if (!applicableTemplate) return [];
    return (applicableTemplate.events || []).map(e => shiftEventToWeek(e, mondayStr)).filter(e => {
      const info = getInfosPeriode(new Date(e.start.split('T')[0]));
      return !info || info.type !== 'vacances';
    }); 
  };

  const targetMonday = (vueActive === 'template') 
    ? getMondayStr(currentTemplate?.dateDebut || new Date())
    : (currentViewMonday || getMondayStr(new Date()));

  let currentRealEvents = [];
  let currentBesoins = [];

  if ((vueActive === 'planning' || vueActive === 'journee') && currentViewMonday) {
    currentRealEvents = getEventsForWeek(currentViewMonday);
    const applicableTemplate = [...templateVersions].sort((a,b)=>b.dateDebut.localeCompare(a.dateDebut)).find(t => t.dateDebut <= currentViewMonday) || templateVersions[0];
    if (applicableTemplate) {
      currentBesoins = (applicableTemplate.besoins || []).map(b => shiftEventToWeek(b, currentViewMonday)).filter(b => {
        const info = getInfosPeriode(new Date(b.start.split('T')[0]));
        return !info || info.type !== 'vacances';
      }); 
    }
  } else if (currentTemplate) {
    currentRealEvents = (currentTemplate.events || []).map(e => shiftEventToWeek(e, targetMonday));
    currentBesoins = (currentTemplate.besoins || []).map(b => shiftEventToWeek(b, targetMonday));
  }

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
        if (!isAbsentAtT) presentCount++;
        else missingAgents.add(shift.extendedProps.agentNom);
      });
      if (presentCount < minCount) minCount = presentCount;
    }
    if (minCount === Infinity) minCount = 0;
    return { isSousEffectif: minCount < Number(besoin.extendedProps.qte), minCount, missingAgents: Array.from(missingAgents) };
  };

  const alertesSousEffectif = [];
  const besoinsEvents = currentBesoins.map(b => {
    const { isSousEffectif, minCount, missingAgents } = checkCoverage(b, currentRealEvents, absences);
    if (isSousEffectif) alertesSousEffectif.push({ ...b, minCount, missingAgents });
    return { ...b, backgroundColor: isSousEffectif ? '#fee2e2' : '#dcfce7', borderColor: isSousEffectif ? '#ef4444' : '#22c55e', extendedProps: { ...b.extendedProps, isBesoin: true, isSousEffectif, minCount } };
  });

  const allCalendarEvents = modeEdition === 'besoins' ? besoinsEvents : currentRealEvents;

  const conflitsIds = useMemo(() => {
    return detecterChevauchements(allCalendarEvents);
  }, [allCalendarEvents]);

  const displayEvents = [
    ...allCalendarEvents.filter(e => {
      if (printFilter.type === 'all') return true;
      if (printFilter.type === 'agent') return e.extendedProps?.agentId === printFilter.id;
      if (printFilter.type === 'poste') return e.extendedProps?.posteId === printFilter.id || e.extendedProps?.isBesoin;
      return true;
    })
  ];

  const activeAlerts = useMemo(() => {
    const alerts = [];
    const nomsJoursAlert = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM']; 
    
    const targetMon = (vueActive === 'template') 
      ? getMondayStr(currentTemplate?.dateDebut || new Date())
      : (currentViewMonday || getMondayStr(new Date()));

    const realEvts = customWeeks[targetMon] ? customWeeks[targetMon] : (
      [...templateVersions].sort((a,b)=>b.dateDebut.localeCompare(a.dateDebut)).find(t => t.dateDebut <= targetMon || true)?.events.map(e => shiftEventToWeek(e, targetMon)) || []
    );
    const applicableT = [...templateVersions].sort((a,b)=>b.dateDebut.localeCompare(a.dateDebut)).find(t => t.dateDebut <= targetMon) || templateVersions[0];
    const besoins = applicableT ? (applicableT.besoins || []).map(b => shiftEventToWeek(b, targetMon)) : [];

    besoins.forEach(b => {
      const { isSousEffectif, minCount, missingAgents } = checkCoverage(b, realEvts, absences);
      if (isSousEffectif) {
        const dStart = new Date(b.start);
        const dEnd = new Date(b.end);
        const rmp = missingAgents?.length > 0 ? ` (Manque : ${missingAgents.join(', ')})` : '';
        alerts.push({
          title: `Sous-effectif : ${b.extendedProps?.posteNom || 'Poste'}`,
          message: `${nomsJoursAlert[dStart.getDay()]} de ${dStart.getHours()}h${String(dStart.getMinutes()).padStart(2,'0')} à ${dEnd.getHours()}h${String(dEnd.getMinutes()).padStart(2,'0')} (${minCount} / ${b.extendedProps?.qte} pers.)${rmp}`
        });
      }
    });

    const affectationsSemaine = realEvts.filter(e => !e.extendedProps?.isBesoin && !e.extendedProps?.isAbsence && e.extendedProps?.agentId);
    for (let i = 0; i < affectationsSemaine.length; i++) {
      for (let j = i + 1; j < affectationsSemaine.length; j++) {
        const e1 = affectationsSemaine[i];
        const e2 = affectationsSemaine[j];
        if (Number(e1.extendedProps.agentId) === Number(e2.extendedProps.agentId)) {
          const start1 = new Date(e1.start).getTime();
          const end1 = new Date(e1.end).getTime();
          const start2 = new Date(e2.start).getTime();
          const end2 = new Date(e2.end).getTime();

          if (start1 < end2 && start2 < end1) {
            const agentNom = e1.extendedProps.agentNom || 'Agent';
            const d = new Date(e1.start);
            alerts.push({
              title: `Double affectation : ${agentNom}`,
              message: `${agentNom} est affecté(e) sur 2 postes en même temps le ${nomsJoursAlert[d.getDay()]} !`
            });
          }
        }
      }
    }

    return alerts;
  }, [agents, currentTemplate, currentViewMonday, customWeeks, absences, templateVersions, vueActive]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. Vider le presse-papier avec Échap
      if (e.key === 'Escape' && copiedEvents.length > 0) {
        setCopiedEvents([]);
      }
      
      // 2. Supprimer les créneaux sélectionnés avec Suppr ou Retour Arrière
      if ((e.key === 'Delete' || e.key === 'Backspace') && copiedEvents.length > 0) {
        e.preventDefault();
        if (window.confirm(`Voulez-vous vraiment supprimer ces ${copiedEvents.length} créneau(x) ?`)) {
          sauvegarderEtatPrecedent();
          
          const idsAbsToDelete = copiedEvents.filter(ev => ev.extendedProps?.isAbsence).map(ev => String(ev.id).replace('abs_', '').split('_')[0]);
          const idsEvtToDelete = copiedEvents.filter(ev => !ev.extendedProps?.isAbsence).map(ev => String(ev.id).split('_')[0]);

          if (idsAbsToDelete.length > 0) {
            setAbsences(prev => prev.filter(a => !idsAbsToDelete.includes(String(a.id))));
          }

          if (idsEvtToDelete.length > 0) {
            if (vueActive === 'template') {
              const isBesoinsMode = modeEdition === 'besoins';
              const currentT = templateVersions.find(v => v.id === activeTemplateId) || templateVersions[0];
              if (isBesoinsMode) {
                const newBesoins = currentT.besoins.filter(b => !idsEvtToDelete.includes(String(b.id).split('_')[0]));
                setTemplateVersions(templateVersions.map(tv => tv.id === activeTemplateId ? { ...tv, besoins: newBesoins } : tv));
              } else {
                const newEvents = currentT.events.filter(ev => !idsEvtToDelete.includes(String(ev.id).split('_')[0]));
                setTemplateVersions(templateVersions.map(tv => tv.id === activeTemplateId ? { ...tv, events: newEvents } : tv));
              }
            } else if (vueActive === 'planning' || vueActive === 'journee') {
              const monStr = vueActive === 'journee' ? getMondayStr(jourConsulte) : (currentViewMonday || getMondayStr(new Date()));
              const currentWeek = customWeeks[monStr] ? [...customWeeks[monStr]] : getEventsForWeek(monStr);
              const mod = currentWeek.filter(ev => !idsEvtToDelete.includes(String(ev.id).split('_')[0]));
              setCustomWeeks({ ...customWeeks, [monStr]: mod });
            }
          }
          setCopiedEvents([]);
        }
      }

      // 3. Ctrl+Z / Ctrl+Y (Annuler/Refaire)
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) refaireAction();
          else annulerAction();
        } else if (key === 'y') {
          e.preventDefault();
          refaireAction();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copiedEvents, templateVersions, customWeeks, absences, vueActive, modeEdition, jourConsulte, currentViewMonday, activeTemplateId]);

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
        id: `vac_pre_auto_${Date.now()}`, nom: "Vacances d'Été (Pré-rentrée)", debut: `${baseYear}-07-01`, fin: `${baseYear}-08-31`, type: 'vacances'
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
  }, [baseYear, periodesFeriees]); 
  
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
    } else {
      if (isDataLoaded) setNeedsBackup(true); 
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

  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => { 
    if (vueActive === 'planning') setModeEdition('agents');
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    });
  }, [vueActive]);

  const handleExport = () => { 
    const dataToExport = {
      agents, postes, periodesFeriees, templateVersions, customWeeks, 
      exceptions, absences, dotation, amplitude, sonneries
    };
    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `planning_cpe_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setNeedsBackup(false); 
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        let parsed = JSON.parse(e.target.result);
        if (parsed) {
          const extractData = (newKey, oldKey) => {
            let val = parsed[newKey] !== undefined ? parsed[newKey] : parsed[oldKey];
            if (typeof val === 'string') {
              try { val = JSON.parse(val); } catch(err) {}
            }
            if (typeof val === 'string') {
              try { val = JSON.parse(val); } catch(err) {}
            }
            return val;
          };

          const importedData = {
            agents: extractData('agents', 'edt-agents') || [],
            postes: extractData('postes', 'edt-postes') || [],
            periodesFeriees: extractData('periodesFeriees', 'edt-periodes') || [],
            templateVersions: extractData('templateVersions', 'edt-template-versions') || [],
            customWeeks: extractData('customWeeks', 'edt-custom-weeks') || {},
            exceptions: extractData('exceptions', 'edt-exceptions') || {},
            absences: extractData('absences', 'edt-absences-retards') || [],
            amplitude: extractData('amplitude', 'edt-amplitude') || { start: '07:30', end: '18:00' },
            sonneries: extractData('sonneries', 'edt-sonneries') || ['08:00', '08:55', '10:05', '11:00', '11:55', '12:50', '13:45', '14:40', '15:50', '16:45', '17:40'],
            dotation: parseFloat(extractData('dotation', 'edt-dotation')) || 0
          };

          await saveAppData(importedData);
          alert("Sauvegarde importée avec succès ! L'application va redémarrer.");
          window.location.reload(); 
        }
      } catch (err) {
        alert("Erreur lors de l'importation. Le fichier est invalide.");
        console.error(err);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleResetAll = () => {
    requestConfirm({
      title: '⚠️ Remise à zéro totale',
      message: 'Voulez-vous vraiment TOUT effacer ? (Planning, Agents, Modèles, Périodes)\n\nCette action est IRRÉVERSIBLE !',
      confirmText: 'Tout effacer',
      isDanger: true,
      onConfirm: async () => {
        await clearAppData();
        window.location.reload();
      }
    });
  };

  const handleSonneriesBlur = () => {
    const arr = sonneriesText.split(',')
      .map(s => s.trim().replace('h', ':'))
      .filter(s => /^\d{1,2}:\d{2}$/.test(s))
      .map(s => { let [h, m] = s.split(':'); return `${h.padStart(2,'0')}:${m.padStart(2,'0')}`; })
      .sort();
    if(arr.length === 0) arr.push('08:00');
    setSonneries(arr); setSonneriesText(arr.join(', '));
  };

  const limitesHeures = (() => {
    const [hS, mS] = (amplitude.start || '07:30').split(':').map(Number);
    const [hE, mE] = (amplitude.end || '18:00').split(':').map(Number);
    const baseMins = hS * 60 + mS;
    const maxMins = hE * 60 + mE;
    const span = maxMins - baseMins;
    const format = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}:00`;
    return { minStr: format(baseMins), maxStr: format(maxMins), baseMins, span };
  })();

  const anneeScolaire = [
    { m: 8, y: baseYear, nom: 'SEPTEMBRE' }, { m: 9, y: baseYear, nom: 'OCTOBRE' },
    { m: 10, y: baseYear, nom: 'NOVEMBRE' }, { m: 11, y: baseYear, nom: 'DECEMBRE' },
    { m: 0, y: baseYear+1, nom: 'JANVIER' }, { m: 1, y: baseYear+1, nom: 'FEVRIER' },
    { m: 2, y: baseYear+1, nom: 'MARS' }, { m: 3, y: baseYear+1, nom: 'AVRIL' },
    { m: 4, y: baseYear+1, nom: 'MAI' }, { m: 5, y: baseYear+1, nom: 'JUIN' },
    { m: 6, y: baseYear+1, nom: 'JUILLET' }, { m: 7, y: baseYear+1, nom: 'AOÛT' } 
  ];

  const declencherImpression = (e) => {
    if (e) e.preventDefault();
    if (vueActive === 'template' || vueActive === 'planning') {
      setModalPrint({ isOpen: true, type: vueActive, jours: [1, 2, 3, 4, 5], format: 'A4' });
      return;
    }
    setPrintFilter({ type: 'all', id: null }); 
    setIsPrinting(true); 
    setTimeout(() => { window.print(); setIsPrinting(false); }, 800);
  };

  const updateCurrentTemplate = (newEvents, newBesoins) => {
    const newVersions = templateVersions.map(tv => 
      String(tv.id) === String(activeTemplateId) ? { 
        ...tv, 
        events: newEvents !== null && newEvents !== undefined ? newEvents : tv.events, 
        besoins: newBesoins !== null && newBesoins !== undefined ? newBesoins : tv.besoins 
      } : tv
    );
    setTemplateVersions(newVersions);
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
    } 
    else if (vueActive === 'planning' || vueActive === 'journee') {
      const monStr = info.start ? getMondayStr(info.start) : (currentViewMonday || getMondayStr(jourConsulte));
      const currentWeek = customWeeks[monStr] ? [...customWeeks[monStr]] : getEventsForWeek(monStr);
      let mod = currentWeek;
      if (action === 'add') mod.push(info);
      if (action === 'update') mod = mod.map(e => String(e.id).split('_')[0] === cleanId ? { ...e, start: info.start, end: info.end } : e);
      if (action === 'update_content') mod = mod.map(e => String(e.id).split('_')[0] === cleanId ? { ...e, ...info } : e);
      if (action === 'delete') mod = mod.filter(e => String(e.id).split('_')[0] !== cleanId);
      setCustomWeeks({ ...customWeeks, [monStr]: mod });
    }
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
  
  const supprimerModele = (idToSuppr) => {
    if (templateVersions.length <= 1) {
      alert("Vous ne pouvez pas supprimer le dernier modèle restant.");
      return;
    }
    const modeletest = templateVersions.find(v => v.id === idToSuppr);
    requestConfirm({
      title: 'Supprimer ce modèle',
      message: `Voulez-vous vraiment supprimer le modèle "${modeletest?.nom}" ?\nCette action est irréversible.`,
      confirmText: 'Supprimer',
      isDanger: true,
      onConfirm: () => {
        const remaining = templateVersions.filter(v => v.id !== idToSuppr);
        setTemplateVersions(remaining);
        if (activeTemplateId === idToSuppr) {
          setActiveTemplateId(remaining[0].id);
        }
      }
    });
  };

  const validerCreationVersionModal = (e) => {
    e.preventDefault();
    if (!modalNewVersion.dateDebut || !modalNewVersion.nom.trim()) return;
    const newVersion = { id: Date.now(), nom: modalNewVersion.nom.trim(), dateDebut: modalNewVersion.dateDebut, statut: 'brouillon', events: [...currentTemplate.events], besoins: [...currentTemplate.besoins] };
    const newArr = [...templateVersions, newVersion].sort((a,b) => b.dateDebut.localeCompare(a.dateDebut)); 
    setTemplateVersions(newArr);
    setActiveTemplateId(newVersion.id);
    setModalNewVersion({ isOpen: false, dateDebut: '', nom: 'Évolution' });
  };

  const importerModele = (templateId) => {
    const template = templateVersions.find(t => t.id === Number(templateId));
    if (!template) return;
    if (confirm(`Appliquer le modèle "${template.nom}" sur la semaine du ${currentViewMonday} ?\n\nCela écrasera vos éventuelles modifications pour cette semaine, et forcera l'enregistrement de ces horaires (même pendant les vacances).`)) {
      const shiftedEvents = template.events.map(e => shiftEventToWeek(e, currentViewMonday));
      setCustomWeeks({ ...customWeeks, [currentViewMonday]: shiftedEvents });
    }
  };

  const ajouterAbsenceRetard = (e) => {
    e.preventDefault();
    sauvegarderEtatPrecedent();
    if (!formAbsence.agentIds || formAbsence.agentIds.length === 0 || !formAbsence.dateDebut) return alert("Sélectionnez au moins un agent et une date.");

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
    
    let dureeDecimal = 0;
    if (!formAbsence.journeeComplete || ['retard', 'heures_supp'].includes(formAbsence.type)) {
      dureeDecimal = parseHeureSaisie(formAbsence.dureeSaisie || '0');
      if (dureeDecimal <= 0) return alert("Indiquez une durée valide (ex: 0h45).");
    }

    let newAbs = [...absences];

    formAbsence.agentIds.forEach(agentId => {
      datesToProcess.forEach(dateStr => {
        let startStr = `${dateStr}T08:00:00`;
        let endStr = `${dateStr}T17:30:00`;

        if (!formAbsence.journeeComplete || ['retard', 'heures_supp'].includes(formAbsence.type)) {
          const pad = n => String(n).padStart(2, '0');
          const startT = new Date(`${dateStr}T08:00:00`);
          const endT = new Date(startT.getTime() + dureeDecimal * 3600000);
          startStr = `${dateStr}T08:00:00`;
          endStr = `${dateStr}T${pad(endT.getHours())}:${pad(endT.getMinutes())}:00`;
        }

        newAbs.push({
          id: String(Date.now() + Math.random()),
          agentId: Number(agentId), type: formAbsence.type, start: startStr, end: endStr,
          motif: formAbsence.motif, impact: formAbsence.impact, 
          journeeComplete: formAbsence.journeeComplete && formAbsence.type === 'absence'
        });
      });
    });

    setAbsences(newAbs);
    // On garde notification silencieuse native pour simplifier, remplacé plus tard par react-hot-toast
    alert(`${formAbsence.agentIds.length} opération(s) enregistrée(s) avec succès !`);
    setFormAbsence({ agentIds: [], type: 'retard', journeeComplete: false, dateDebut: new Date().toISOString().split('T')[0], dateFin: '', dureeSaisie: '', impact: 'local', motif: '' });
  };
  
  const supprimerAbsence = (id) => {
    requestConfirm({
      title: 'Supprimer cet événement',
      message: "Voulez-vous annuler cet enregistrement et restituer les heures à l'agent ?",
      confirmText: 'Supprimer',
      onConfirm: () => {
        sauvegarderEtatPrecedent();
        setAbsences(absences.filter(a => String(a.id) !== String(id).replace('abs_','')));
      }
    });
  };

  const bilanAbsences = agents.map(ag => {
    const agAbs = absences.filter(a => a.agentId === ag.id);
    const abs = agAbs.filter(a => a.type === 'absence');
    const ret = agAbs.filter(a => a.type === 'retard');
    const supp = agAbs.filter(a => a.type === 'heures_supp');
    
    const hAbs = abs.reduce((sum, a) => sum + getHeuresAbsence(a), 0);
    const hRet = ret.reduce((sum, a) => sum + getHeuresAbsence(a), 0);
    const hSupp = supp.reduce((sum, a) => sum + getHeuresAbsence(a), 0);
    
    const hDetteLocale = agAbs.filter(a => ['absence', 'retard'].includes(a.type) && a.impact === 'local').reduce((sum, a) => sum + getHeuresAbsence(a), 0);
    const hCreditLocal = supp.filter(a => a.impact === 'local').reduce((sum, a) => sum + getHeuresAbsence(a), 0);

    const balanceLocale = hCreditLocal - hDetteLocale;
    const hDetteRestante = Math.max(0, -balanceLocale);
    const hAvance = Math.max(0, balanceLocale);

    return {
      id: ag.id, nom: ag.nom, couleur: ag.couleurFond, 
      nbAbs: abs.length, hAbs, nbRet: ret.length, hRet, nbSupp: supp.length, hSupp,
      hDetteRestante, hAvance
    };
  });

  const validerBesoinMultiModal = (e) => {
    e.preventDefault();
    if (!modalBesoinMulti.posteId) return alert("Sélectionnez un poste.");
    
    const poste = postes.find(p => p.id === Number(modalBesoinMulti.posteId));
    const generatedBesoins = generateBesoinsFromSlots(poste.id, poste.nom, modalBesoinMulti.qte, modalBesoinMulti.slots);
    
    updateCurrentTemplate(null, [...currentTemplate.besoins, ...generatedBesoins]);
    setModalBesoinMulti({ isOpen: false, posteId: '', qte: 1, slots: [] });
  };

  const validerEditBesoin = (e) => {
    e.preventDefault();
    if (modalEditBesoin.qte <= 0) {
      updateCurrentTemplate(null, currentTemplate.besoins.filter(b => String(b.id).split('_')[0] !== modalEditBesoin.id));
    } else {
      const templateDateStr = currentTemplate.dateDebut;
      const newStart = `${templateDateStr}T${modalEditBesoin.start}:00`;
      const newEnd = `${templateDateStr}T${modalEditBesoin.end}:00`;
      
      updateCurrentTemplate(null, currentTemplate.besoins.map(b => String(b.id).split('_')[0] === modalEditBesoin.id ? { 
        ...b, start: newStart, end: newEnd, extendedProps: { ...b.extendedProps, qte: Number(modalEditBesoin.qte) } 
      } : b));
    }
    setModalEditBesoin({ isOpen: false, id: null, posteId: '', qte: 1, start: '', end: '' });
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
    setFormAbsImpact(extProps.impact || 'local');
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
    sauvegarderEtatPrecedent();
    if (!formAgent) return alert('Veuillez sélectionner un agent.');
    const agent = agents.find(a => a.id === Number(formAgent));
    const newStart = `${modalCreation.date}T${extractTimeStr(modalCreation.start)}:00`;
    const newEnd = `${modalCreation.date}T${extractTimeStr(modalCreation.end)}:00`;

    if (formTypeEvent === 'absence') {
      const isEdit = !!modalCreation.eventId;
      const cleanId = isEdit ? String(modalCreation.eventId).replace('abs_','') : String(Date.now());
      
      const newAbs = {
        id: cleanId, agentId: agent.id, type: formTypeAbsence, start: newStart, end: newEnd,
        motif: formNote || (formTypeAbsence === 'absence' ? 'Absence' : formTypeAbsence === 'retard' ? 'Retard' : 'Heures Supp'), 
        impact: formAbsImpact, 
        journeeComplete: (new Date(newEnd) - new Date(newStart)) / 3600000 >= 9
      };
      
      if (isEdit) setAbsences(absences.map(a => String(a.id) === cleanId ? { ...a, ...newAbs } : a));
      else setAbsences([...absences, newAbs]);
    } else {
      if (!formPoste) return alert('Veuillez sélectionner un poste.');
      const poste = postes.find(p => p.id === Number(posteActif || formPoste));
      const data = { 
        title: `${poste.nom} - ${agent.nom}`, backgroundColor: agent.couleurFond, borderColor: agent.couleurFond, 
        extendedProps: { agentId: agent.id, agentNom: agent.nom, posteId: poste.id, posteNom: poste.nom, posteCouleur: poste.couleur, note: formNote } 
      };

      if (modalCreation.eventId) applyAction('update_content', { id: modalCreation.eventId, start: newStart, end: newEnd, ...data });
      else applyAction('add', { id: String(Date.now()), start: newStart, end: newEnd, ...data });
    }
    setModalCreation({ isOpen: false, eventId: null, date: null, start: '08:00', end: '09:00' });
  };

  const handleEditAgentChange = (champ, valeur) => {
    const newAgent = { ...modalAgent, [champ]: valeur };
    if (champ === 'quotite' || champ === 'estEtudiant') {
      newAgent.hContrat = calculerContratProratise(newAgent, baseYear, calculerContratBetty);
    }
    setModalAgent(newAgent);
  };

  const validerAgentModal = (e) => {
    e.preventDefault();
    if (!modalAgent.nom.trim()) return alert('Obligatoire.');
    const q = parseFloat(String(modalAgent.quotite).replace(',', '.')) || 100;
    const hC = typeof modalAgent.hContrat === 'string' ? parseHeureSaisie(modalAgent.hContrat) : modalAgent.hContrat;
    
    if (modalAgent.id) {
      setAgents(agents.map(a => a.id === modalAgent.id ? { ...a, nom: modalAgent.nom, quotite: q, estEtudiant: modalAgent.estEtudiant, hContrat: hC, couleurFond: modalAgent.couleurFond, jours: modalAgent.jours, avenants: modalAgent.avenants } : a));
      updateCurrentTemplate(currentTemplate.events.map(evt => evt.extendedProps?.agentId === modalAgent.id ? { ...evt, extendedProps: { ...evt.extendedProps, agentNom: modalAgent.nom }, backgroundColor: modalAgent.couleurFond, borderColor: modalAgent.couleurFond } : evt), null);
    } else {
      setAgents([...agents, { id: Date.now(), nom: modalAgent.nom, quotite: q, estEtudiant: modalAgent.estEtudiant, hContrat: hC, couleurFond: modalAgent.couleurFond, jours: modalAgent.jours, avenants: modalAgent.avenants || [] }]);
    }
    setModalAgent({ ...modalAgent, isOpen: false });
  };

  const supprimerAgent = (id, n, e) => { 
    e.stopPropagation(); 
    requestConfirm({
      title: 'Supprimer un agent',
      message: `Voulez-vous vraiment supprimer l'agent ${n} ?\nSes heures et affectations seront perdues.`,
      confirmText: 'Supprimer',
      onConfirm: () => {
        setAgents(agents.filter(a => a.id !== id)); 
        updateCurrentTemplate(currentTemplate.events.filter(evt => evt.extendedProps?.agentId !== id), null); 
        if (agentActif === id) setAgentActif(null); 
      }
    });
  };

  const gererClicJourAgent = (agentId, dateStr, hActuel, noteActuelle) => {
    setModalException({ isOpen: true, agentId, dateStr, h: formatHeureTableau(hActuel, true) || '0h00', note: noteActuelle || '' });
  };

  const supprimerExceptionJour = () => {
    const newExceptions = { ...exceptions };
    delete newExceptions[`${modalException.agentId}_${modalException.dateStr}`];
    setExceptions(newExceptions);
    setModalException({ isOpen: false, agentId: null, dateStr: null, h: '0h00', note: '' });
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

  // --- Écran de chargement avant le montage ---
  if (!isDataLoaded) {
    return (
      <div className={`flex h-screen w-screen items-center justify-center ${t.bgMain} ${t.headerText}`}>
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-bold text-lg">Chargement de votre planning...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen w-screen ${t.bgMain} font-sans overflow-hidden transition-colors`}>
      {/* -------------------- MODALES -------------------- */}
      <ModalConfirm dialog={confirmDialog} closeDialog={closeConfirm} t={t} />

      <ModalPrint modalPrint={modalPrint} setModalPrint={setModalPrint} modeImpression={modeImpression} setModeImpression={setModeImpression} setIsPrinting={setIsPrinting} t={t} />
      
      <ModalNewVersion modalNewVersion={modalNewVersion} setModalNewVersion={setModalNewVersion} validerCreationVersionModal={validerCreationVersionModal} t={t} />
      
      <ModalPoste modalPoste={modalPoste} setModalPoste={setModalPoste} validerPosteModal={validerPosteModal} t={t} />
      
      <ModalException modalException={modalException} setModalException={setModalException} validerExceptionJourModal={validerExceptionJourModal} supprimerExceptionJour={supprimerExceptionJour} t={t} />
      
      <ModalParametres 
        modalParametres={modalParametres} 
        setModalParametres={setModalParametres} 
        amplitude={amplitude} 
        setAmplitude={setAmplitude} 
        sonneriesText={sonneriesText} 
        setSonneriesText={setSonneriesText} 
        handleSonneriesBlur={handleSonneriesBlur} 
        formPeriode={formPeriode} 
        setFormPeriode={setFormPeriode} 
        ajouterPeriodeFeriee={ajouterPeriodeFeriee} 
        periodesFeriees={periodesFeriees} 
        supprimerPeriodeFeriee={supprimerPeriodeFeriee} 
        isDarkMode={isDarkMode} 
        toggleDarkMode={toggleDarkMode} 
        themeId={themeId} 
        changeTheme={changeTheme} 
        customColors={customColors} 
        updateCustomColor={updateCustomColor} 
        handleExport={handleExport} 
        handleImport={handleImport} 
        setPeriodesFeriees={setPeriodesFeriees}
        baseYear={baseYear}
        t={t} 
      />

      <ModalCreation modalCreation={modalCreation} setModalCreation={setModalCreation} validerCreationModal={validerCreationModal} formTypeEvent={formTypeEvent} setFormTypeEvent={setFormTypeEvent} formTypeAbsence={formTypeAbsence} setFormTypeAbsence={setFormTypeAbsence} formAbsImpact={formAbsImpact} setFormAbsImpact={setFormAbsImpact} formAgent={formAgent} setFormAgent={setFormAgent} formPoste={formPoste} setFormPoste={setFormPoste} formNote={formNote} setFormNote={setFormNote} agents={agents} postes={postes} posteActif={posteActif} t={t} vueActive={vueActive} supprimerAbsence={supprimerAbsence} applyAction={applyAction} />
      
      <ModalBesoinMulti modalBesoinMulti={modalBesoinMulti} setModalBesoinMulti={setModalBesoinMulti} validerBesoinMultiModal={validerBesoinMultiModal} postes={postes} t={t} />
      
      <ModalEditBesoin modalEditBesoin={modalEditBesoin} setModalEditBesoin={setModalEditBesoin} validerEditBesoin={validerEditBesoin} updateCurrentTemplate={updateCurrentTemplate} currentTemplate={currentTemplate} t={t} />
      
      <ModalAgent modalAgent={modalAgent} setModalAgent={setModalAgent} validerAgentModal={validerAgentModal} handleEditAgentChange={handleEditAgentChange} baseYear={baseYear} t={t} />

      {/* -------------------- PANEAU LATÉRAL -------------------- */}
      <div className={`${isSidebarOpen ? 'w-80' : 'w-0'} ${t.sidebar} shadow-lg flex flex-col z-20 border-r ${isSidebarOpen ? t.borderLight : 'border-transparent'} no-print shrink-0 transition-all duration-300 ease-in-out`}>
        <div className="w-80 flex flex-col h-full overflow-hidden transition-opacity duration-300" style={{ opacity: isSidebarOpen ? 1 : 0, visibility: isSidebarOpen ? 'visible' : 'hidden' }}>
          <div className={`p-4 ${t.sidebarText} flex flex-col gap-3 shrink-0`}>
            <div className="flex justify-between items-center">
              <h1 className="text-xl font-bold tracking-wider">Planning CPE</h1>
              <button onClick={() => setIsSidebarOpen(false)} className={`${t.sidebarIconBtn} w-7 h-7 rounded flex items-center justify-center text-xs shadow-sm border transition-colors hover:scale-105`} title="Masquer le menu">◀</button>
            </div>
          
            <div className="flex items-center justify-between bg-black/10 p-1.5 rounded-lg gap-1">
              <input type="file" id="import-file" accept=".json" onChange={handleImport} className="hidden" />
              <button onClick={() => document.getElementById('import-file').click()} className={`${t.sidebarIconBtn} p-2 rounded text-xs shadow border transition-colors flex-1 flex justify-center hover:scale-105`} title="Restaurer une sauvegarde">⬆️</button>
              <button onClick={handleExport} className={`relative p-2 rounded text-xs shadow border transition-colors flex-1 flex justify-center hover:scale-105 ${needsBackup ? 'bg-orange-600 hover:bg-orange-500 border-orange-500 text-white' : t.sidebarIconBtn}`} title="Sauvegarder les données (Fichier JSON)">
                ⬇️{needsBackup && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
              </button>

              <div className="relative flex-1 flex justify-center">
                <button onClick={() => setShowNotificationMenu(!showNotificationMenu)} className={`${t.sidebarIconBtn} p-2 rounded text-xs shadow border transition-colors w-full flex items-center justify-center relative hover:scale-105`} title="Centre de notifications">
                  🔔
                  {activeAlerts.length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm">
                      {activeAlerts.length}
                    </span>
                  )}
                </button>

                {showNotificationMenu && (
                  <div className={`absolute left-0 mt-9 w-72 rounded-xl shadow-2xl border ${t.borderLight} ${t.cardBg} z-[99999] overflow-hidden animate-in fade-in zoom-in-95 duration-150`}>
                    <div className={`${t.headerBg} p-3 flex justify-between items-center border-b ${t.borderLight}`}>
                      <h3 className={`font-bold text-xs uppercase tracking-wider ${t.headerText}`}>Centre d'alertes</h3>
                      <button onClick={() => setShowNotificationMenu(false)} className="text-xs font-bold opacity-70 hover:opacity-100">✖</button>
                    </div>
                    <div className="max-h-64 overflow-y-auto p-2 space-y-2">
                      {activeAlerts.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 text-xs italic">Aucun problème détecté tout est en ordre 👍</div>
                      ) : (
                        activeAlerts.map((alert, idx) => (
                          <div key={idx} className={`p-2.5 rounded-lg border ${t.borderLight} ${t.bgLight} text-xs flex gap-2 items-start shadow-xs`}>
                            <span className="text-base leading-none">⚠️</span>
                            <div className="flex-1">
                              <p className={`font-bold ${t.header}`}>{alert.title}</p>
                              <p className="text-gray-500 text-[11px] mt-0.5">{alert.message}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button onClick={toggleDarkMode} className={`${t.sidebarIconBtn} p-2 rounded text-xs shadow border transition-colors flex-1 flex justify-center hover:scale-105`} title="Mode Sombre / Clair">{isDarkMode ? '☀️' : '🌙'}</button>
              <button onClick={() => setModalParametres(true)} className={`${t.sidebarIconBtn} p-2 rounded text-xs shadow border transition-colors flex-1 flex justify-center hover:scale-105`} title="Paramètres">⚙️</button>
              <button onClick={() => setModalPrint({ isOpen: true, type: vueActive, jours: [1, 2, 3, 4, 5], format: 'A4' })} className={`${t.sidebarIconBtn} p-2 rounded text-xs shadow border transition-colors flex-1 flex justify-center hover:scale-105`} title="Imprimer le planning">🖨️</button>
              <button onClick={handleResetAll} className="bg-red-700 hover:bg-red-800 p-2 rounded text-xs font-bold border border-red-500 text-white flex-1 flex justify-center shadow-sm hover:scale-105 transition-transform" title="Tout réinitialiser">🗑️</button>
            </div>

            <div className="flex flex-col bg-black/10 rounded p-2 shadow-inner gap-1 mt-2">
              <button onClick={() => setVueActive('template')} className={`text-base font-medium py-2 rounded transition ${vueActive === 'template' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>📐 Modèle : Semaine Type</button>
              <button onClick={() => setVueActive('journee')} className={`text-base font-medium py-2 rounded transition ${vueActive === 'journee' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>⏱️ Vue Quotidienne</button>
              <button onClick={() => setVueActive('planning')} className={`text-base font-medium py-2 rounded transition ${vueActive === 'planning' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>📅 Planning Hebdo (Réel)</button>
              <button onClick={() => setVueActive('dashboard')} className={`text-base font-medium py-2 rounded transition ${vueActive === 'dashboard' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>📊 Bilan Équipe</button>
              <button onClick={() => { setVueActive('agent'); if(!agentConsulte) setAgentConsulte(agents[0]?.id); }} className={`text-base font-medium py-2 rounded transition ${vueActive === 'agent' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>👤 Calendriers Individuels</button>
              <button onClick={() => setVueActive('absences')} className={`text-base font-medium py-2 rounded transition ${vueActive === 'absences' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>📋 Absences & Retards</button>
            </div>

            {/* ENCART TUTORIEL COPIER-COLLER & SUPPRESSION */}
            {(vueActive === 'template' || vueActive === 'planning' || vueActive === 'journee') && (
              <div className={`mt-3 p-3 rounded-xl border ${t.borderLight} ${t.bgLight} text-xs shadow-sm`}>
                <p className={`font-black mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-wider ${t.header}`}>💡 Raccourcis Clavier</p>
                <ul className={`space-y-1.5 ${t.header} opacity-90 leading-tight`}>
                  <li><kbd className={`px-1 py-0.5 rounded shadow-inner font-mono text-[10px] font-bold border ${t.borderLight} ${t.cardBg} ${t.header}`}>Ctrl</kbd> + <strong className={t.header}>Clic</strong> : Sélectionner 1 créneau</li>
                  <li><kbd className={`px-1 py-0.5 rounded shadow-inner font-mono text-[10px] font-bold border ${t.borderLight} ${t.cardBg} ${t.header}`}>Ctrl</kbd> + <strong className={t.header}>Glisser</strong> : Lasso multiple</li>
                  <li className={`pt-1 mt-1 border-t ${t.borderLight}`}><strong className={t.header}>Clic</strong> (sur la grille) : Coller la sélection</li>
                  <li><kbd className={`px-1 py-0.5 rounded shadow-inner font-mono text-[10px] font-bold border ${t.borderLight} ${t.cardBg} ${t.header}`}>Suppr</kbd> : <strong className={t.header}>Supprimer</strong> la sélection</li>
                  <li><kbd className={`px-1 py-0.5 rounded shadow-inner font-mono text-[10px] font-bold border ${t.borderLight} ${t.cardBg} ${t.header}`}>Échap</kbd> : <strong className={t.header}>Vider</strong> la sélection (Annuler)</li>
                </ul>
              </div>
            )}
          </div>

          {(vueActive === 'template' || vueActive === 'planning' || vueActive === 'journee') && (
            <div className={`p-4 flex-1 overflow-y-auto space-y-4 ${t.bgMain}`}>
              {vueActive === 'template' && currentTemplate?.statut === 'brouillon' && (
                <div className={`flex ${t.bgLight} rounded p-1 mb-2 border ${t.borderLight}`}>
                  <button onClick={() => setModeEdition('agents')} className={`flex-1 text-xs py-1.5 rounded transition ${modeEdition === 'agents' ? `${t.cardBg} font-bold ${t.textAccent} shadow-sm border ${t.borderLight}` : `${t.textMenuMuted} hover:${t.header}`}`}>🖌️ Agents</button>
                  <button onClick={() => setModeEdition('besoins')} className={`flex-1 text-xs py-1.5 rounded transition ${modeEdition === 'besoins' ? `${t.cardBg} font-bold text-red-500 shadow-sm border ${t.borderLight}` : `${t.textMenuMuted} hover:${t.header}`}`}>🎯 Besoins</button>
                </div>
              )}

              {vueActive === 'template' && currentTemplate?.statut === 'valide' && (
                <div className={`${t.bgLight} border ${t.borderLight} p-4 rounded text-center mb-4`}>
                  <span className="text-2xl block mb-1">🔒</span>
                  <p className={`text-sm font-bold ${t.header}`}>Modèle Validé</p>
                  <p className="text-xs text-gray-500 mt-1">Structure verrouillée pour protéger le compte d'heures passé.</p>
                  <button onClick={() => setModalNewVersion({ isOpen: true, dateDebut: `${baseYear+1}-01-04`, nom: 'Évolution Hiver' })} className={`mt-3 ${t.btnPrimary} text-xs font-bold px-3 py-2 rounded shadow w-full flex items-center justify-center gap-1`}>➕ Créer une évolution</button>
                  <button onClick={deverrouillerModele} className="mt-2 text-xs text-gray-500 hover:text-gray-800 underline">🔓 Déverrouiller (Corriger erreur)</button>
                </div>
              )}

              {modeEdition === 'agents' && (
                <div className="animate-in fade-in">
                  <div>
                    <div className="flex justify-between items-center mb-2"><h2 className={`font-bold ${t.header} text-sm`}>Agents</h2><button onClick={() => setModalAgent({isOpen: true, nom: '', quotite: 100, estEtudiant: false, hContrat: calculerContratBetty(100, false), couleurFond: '#3B82F6'})} className="bg-black/10 w-5 h-5 rounded-full text-xs font-bold hover:bg-black/20 text-gray-600">+</button></div>
                    <ul className="space-y-1">
                      {statsAgents.map((agent) => {
                        const weekEvents = vueActive === 'template' ? (currentTemplate?.events || []) : getEventsForWeek(targetMonday);
                        const agentWeekMins = weekEvents.filter(e => e.extendedProps?.agentId === agent.id && !e.extendedProps?.isAbsence).reduce((acc, evt) => acc + (new Date(evt.end) - new Date(evt.start)) / 60000, 0);
                        const agentWeekHours = agentWeekMins / 60;
                        const activeContract = getActiveContract(agent, targetMonday);
                        const hContratVirtuelActif = calculerContratBetty(activeContract.quotite, activeContract.estEtudiant);                        
                        
                        // 1. On fixe l'objectif hebdomadaire théorique strictement au palier de 5 minutes inférieur
                        const objectifHebdoAgent = Math.floor(((hContratVirtuelActif / 39) * 60) / 5) * 5 / 60;

                        // 2. Calcul de l'écart avec sécurité pour éviter le "-0h00" dû aux imprécisions informatiques
                        let diffAgentHebdo = agentWeekHours - objectifHebdoAgent;
                        if (Math.abs(diffAgentHebdo) < 0.01) diffAgentHebdo = 0;                        
                        return (
                          <li key={agent.id} onClick={() => setAgentActif(agentActif === agent.id ? null : agent.id)} className={`flex justify-between items-center p-3 rounded border-l-4 cursor-pointer ${agentActif === agent.id ? `${t.bgLight} ${t.textAccent} font-bold ring-1 ${t.borderLight}/10` : `${t.cardBg} hover:opacity-80`}`} style={{ borderLeftColor: agent.couleurFond }}>
                            <div className="flex flex-col leading-tight">
                              <span className={`text-base font-bold ${t.header}`}>{agent.nom} {agent.estEtudiant && '🎓'}</span>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs font-mono text-gray-500 font-semibold" title="Total planifié cette semaine">Sem: {formatHeureTableau(agentWeekHours, true)}</span>
                                <span className={`text-xs font-mono font-bold ${diffAgentHebdo >= 0 ? 'text-emerald-600' : 'text-orange-500'}`} title="Écart par rapport à l'objectif hebdo théorique">({diffAgentHebdo > 0 ? '+' : ''}{formatHeureTableau(diffAgentHebdo, true)})</span>
                              </div>
                              <span className={`text-xs font-mono mt-1 ${agent.soldeGlobal > 0 ? 'text-green-600' : (agent.soldeGlobal < 0 ? 'text-red-500' : 'text-gray-500')}`}>Solde global: {agent.soldeGlobal > 0 ? '+' : ''}{formatHeureTableau(agent.soldeGlobal, true)}</span>
                            </div>
                            <div className="flex gap-1.5 items-center shrink-0">
                              <button onClick={(e) => { e.stopPropagation(); setModalAgent({isOpen:true, ...agent}); }} className={`text-gray-400 hover:opacity-75 text-sm px-1 ${t.headerText}`}>⚙️</button>
                              <button onClick={(e) => supprimerAgent(agent.id, agent.nom, e)} className="text-red-400 hover:text-red-600 text-sm px-1">✖</button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="mt-4">
                    <div className="flex justify-between items-center mb-2"><h2 className={`font-bold ${t.header} text-sm`}>Postes</h2><button onClick={ouvrirCreationPoste} className="bg-black/10 w-5 h-5 rounded-full text-xs font-bold hover:bg-black/20 text-gray-600 flex items-center justify-center">+</button></div>
                    <ul className="space-y-1">
                      {postes.map((poste) => (
                        <li key={poste.id} onClick={() => setPosteActif(posteActif === poste.id ? null : poste.id)} className={`flex justify-between items-center p-2 rounded border-l-4 cursor-pointer text-sm ${posteActif === poste.id ? `${t.bgLight} ${t.textAccent} font-bold ring-1 ${t.borderLight}/10` : `${t.cardBg} hover:opacity-80`}`} style={{ borderLeftColor: poste.couleur }}>
                          <span className={t.header}>{poste.nom}</span>
                          <div className="flex gap-1 items-center shrink-0">
                            <button onClick={(e) => { e.stopPropagation(); ouvrirEditionPoste(poste); }} className={`text-gray-400 hover:opacity-75 text-xs px-1 ${t.headerText}`}>⚙️</button>
                            <button onClick={(e) => supprimerPoste(poste.id, e)} className="text-red-400 hover:text-red-600 text-xs px-1">✖</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {vueActive === 'template' && currentTemplate?.statut === 'brouillon' && modeEdition === 'besoins' && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="bg-red-900/10 border border-red-500/30 p-3 rounded text-sm text-red-500">
                    <p className="font-bold mb-2">1. Grille Hebdo (Clavier) :</p>
                    <button onClick={() => setModalBesoinMulti({ isOpen: true, posteId: '', qte: 1, slots: [{ id: Date.now(), start: '08:00', end: '10:00', days: { 1: false, 2: false, 3: false, 4: false, 5: false } }]})} className="w-full bg-red-600 text-white rounded p-2 text-xs font-bold hover:bg-red-700 shadow flex items-center justify-center gap-1 mb-4">➕ Générer une grille complète</button>
                    <p className="font-bold mb-2 border-t border-red-500/30 pt-3">2. Dessin libre (Souris) :</p>
                    <label className="text-xs font-bold mb-1 block">Effectif requis :</label>
                    <input type="number" min="1" value={formBesoinQte} onChange={e => setFormBesoinQte(Number(e.target.value))} className="w-full p-2 rounded border border-red-500/50 font-bold text-center mb-2 bg-transparent" />
                    <p className="text-[11px] italic opacity-80 leading-tight">Glissez la souris sur la ligne d'un Poste (à droite) pour dessiner un besoin.</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* -------------------- ZONE PRINCIPALE DU CALENDRIER -------------------- */}
      <div id="print-area" className={`flex-1 flex flex-col h-full overflow-hidden ${t.cardBg}`}>
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} className={`absolute top-1/2 left-0 -translate-y-1/2 z-50 ${t.sidebar} border border-l-0 ${t.borderLight} ${t.sidebarText} py-5 px-1.5 rounded-r-xl shadow-lg flex items-center justify-center no-print hover:pl-3 transition-all duration-200 group`} title="Ouvrir le menu">
            <span className="group-hover:scale-125 transition-transform font-black">▶</span>
          </button>
        )}

        {/* 1. VUE QUOTIDIENNE */}
        {vueActive === 'journee' && (() => {
          const { gridLines, gridLabelsDaily, gridTicks } = generateGrid(limitesHeures, sonneries, amplitude);
          
          // CALCUL DE LA LIGNE DE L'HEURE ACTUELLE
          const pad = n => String(n).padStart(2, '0');
          const todayStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
          const isToday = jourConsulte === todayStr;
          const currentMins = now.getHours() * 60 + now.getMinutes();
          const showCurrentTimeLine = isToday && currentMins >= limitesHeures.baseMins && currentMins <= (limitesHeures.baseMins + limitesHeures.span);
          const currentTimePercent = ((currentMins - limitesHeures.baseMins) / limitesHeures.span) * 100;

          return (
            <div className={`flex-1 flex flex-col ${t.bgMain} h-full overflow-hidden`}>
              <div className="p-4 pb-2 no-print shrink-0">
                <div className="flex justify-between items-center mb-2">
                  <h2 className={`text-lg font-bold ${t.header} flex items-center gap-2`}>⏱️ Vue Quotidienne</h2>
                  <div className="flex items-center gap-3">
                    <button onClick={() => {
                      const d = new Date();
                      const p = n => String(n).padStart(2, '0');
                      setJourConsulte(`${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`);
                    }} className={`px-3 py-1.5 rounded text-xs uppercase tracking-wider font-bold ${t.cardBg} ${t.header} border ${t.borderLight} hover:bg-black/5 dark:hover:bg-white/5 shadow-sm transition-colors`} title="Revenir à aujourd'hui">
                      Aujourd'hui
                    </button>
                    <button onClick={() => changeJourQuotidien(-1)} className={`px-3 py-1.5 rounded text-sm font-bold ${t.cardBg} ${t.header} border ${t.borderLight} hover:bg-black/5 dark:hover:bg-white/5 shadow-sm transition-colors`} title="Jour précédent">◀</button>
                    <input type="date" value={jourConsulte} onChange={(e) => setJourConsulte(e.target.value)} className={`border ${t.borderLight} rounded p-1.5 text-sm font-bold ${t.cardBg} ${t.header} outline-none shadow-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors`} />
                    <button onClick={() => changeJourQuotidien(1)} className={`px-3 py-1.5 rounded text-sm font-bold ${t.cardBg} ${t.header} border ${t.borderLight} hover:bg-black/5 dark:hover:bg-white/5 shadow-sm transition-colors`} title="Jour suivant">▶</button>
                  </div>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden px-4 pb-4 flex flex-col">
                {isPrinting ? (
                  <PrintDailyView agents={agents} jourConsulte={jourConsulte} getEventsForWeek={getEventsForWeek} absences={absences} sonneries={sonneries} limitesHeures={limitesHeures} postes={postes} getMondayStr={getMondayStr} amplitude={amplitude} />
                ) : (
                  <div className={`${t.cardBg} rounded-xl shadow border ${t.borderLight} flex-1 flex flex-col overflow-hidden`}>
                    <div className={`flex flex-wrap gap-2 p-3 border-b ${t.borderLight} ${t.bgLight} justify-center items-center shrink-0`}>
                      <span className="text-xs font-bold text-gray-500 mr-2 uppercase tracking-wider">Légende & Postes :</span>
                      {postes.map(p => (
                        <span key={p.id} className="px-2 py-1 rounded text-[10px] font-bold shadow-sm flex items-center gap-1.5" style={{ backgroundColor: p.couleur, color: getContrastYIQ(p.couleur) }}>
                          {p.nom}
                          <button onClick={() => ouvrirEditionPoste(p)} className="hover:opacity-75 text-xs ml-0.5 cursor-pointer" title="Modifier ce poste">⚙️</button>
                          <button onClick={() => {
                            if (confirm(`Voulez-vous vraiment supprimer le poste "${p.nom}" ?`)) {
                              setPostes(postes.filter(x => x.id !== p.id));
                            }
                          }} className="hover:opacity-60 text-xs font-black ml-0.5 cursor-pointer" title="Supprimer ce poste">✖</button>
                        </span>
                      ))}
                      <button onClick={ouvrirCreationPoste} className={`ml-2 px-2.5 py-1 rounded text-xs font-bold ${t.btnPrimary} shadow-sm transition-transform hover:scale-105`}>
                        ➕ Ajouter un poste
                      </button>
                    </div>

                    <div className="flex-1 overflow-x-auto overflow-y-auto flex flex-col min-h-0">
                      <div className="min-w-[800px] flex-1 flex flex-col relative">
                        <div className={`flex border-b ${t.borderLight} ${t.bgLight} shrink-0 ml-32 relative h-8 items-center`}>
                          {gridTicks?.map(tick => (
                            <div key={tick.m} className="absolute bottom-0 w-[1px] h-2 bg-black/20 dark:bg-white/20" style={{ left: `${tick.topPercent}%` }}></div>
                          ))}
                          
                          {gridLabelsDaily.map(lbl => (
                            <div key={lbl.timeStr} className={`absolute text-[10px] font-black ${t.header} top-1/2 -translate-y-1/2`} style={{ left: `${lbl.topPercent}%`, transform: 'translateX(-50%) translateY(-50%)' }}>
                              {lbl.timeStr}
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex-1 relative z-10 flex flex-col">
                          <div className="absolute inset-0 left-32 pointer-events-none z-0">
                            {gridLines.map(line => (
                              <div key={line.timeStr} className={`absolute top-0 bottom-0 ${t.borderLight} opacity-50`} style={{ left: `${line.topPercent}%`, borderLeft: line.isHeurePleine || line.isSonnerie || line.isStartDay ? '2px solid currentColor' : '1px dashed currentColor' }}></div>
                            ))}
                          </div>

                          {showCurrentTimeLine && !isPrinting && (
                            <div className="absolute inset-0 left-32 pointer-events-none z-[60]">
                              <div 
                                className="absolute top-0 bottom-0 w-[2px] bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.8)]" 
                                style={{ left: `${currentTimePercent}%` }}
                              >
                                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm">
                                  {pad(now.getHours())}:{pad(now.getMinutes())}
                                </div>
                              </div>
                            </div>
                          )}

                          {agents.length === 0 && (
                            <div className="flex items-center justify-center h-32 text-gray-400 italic font-medium ml-32">
                              Aucun agent configuré. Ajoutez un agent dans le menu de gauche.
                            </div>
                          )}

                          {agents.map(agent => {
                            const mondayStr = getMondayStr(jourConsulte);
                            const allEvents = getEventsForWeek(mondayStr);
                            const eventsDuJour = allEvents.filter(e => e.extendedProps?.agentId === agent.id && e.start.startsWith(jourConsulte));

                            const totalMinsJour = eventsDuJour.filter(e => !e.extendedProps?.isAbsence).reduce((acc, evt) => {
                              return acc + (new Date(evt.end) - new Date(evt.start)) / 60000;
                            }, 0);
                            const heuresJourStr = formatHeureTableau(totalMinsJour / 60, true);
                            const amplitudeStr = getAmplitudeStr(eventsDuJour);

                            const allLineSnapPoints = [...sonneriesMins, ...eventsDuJour.flatMap(e => {
                                const s = new Date(e.start), ed = new Date(e.end);
                                return [s.getHours() * 60 + s.getMinutes(), ed.getHours() * 60 + ed.getMinutes()];
                            })];

                            return (
                              <div key={agent.id} className={`flex border-b ${t.borderLight} flex-1 relative group hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[60px] hover:z-50`}>
                                <div className={`w-32 shrink-0 flex flex-col items-end justify-center p-2 border-r ${t.borderLight} z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] sticky left-0`} style={{ backgroundColor: agent.couleurFond, color: getContrastYIQ(agent.couleurFond) }}>
                                  <span className="text-sm font-black text-right leading-tight truncate w-full">{agent.nom}</span>
                                  <div className="flex items-center gap-1.5 mt-0.5 justify-end w-full">
                                    {amplitudeStr && <span className="text-[9px] font-bold opacity-75">{amplitudeStr}</span>}
                                    <span className="text-[10px] font-mono font-bold bg-black/15 px-1.5 py-0.5 rounded shadow-inner leading-none">{heuresJourStr}</span>
                                  </div>
                                </div>
                                
                                <TimelineTrack 
                                  limitesHeures={limitesHeures} isBesoins={false} copiedEvents={copiedEvents} snapPoints={allLineSnapPoints}
                                  onAddCopy={(startMins) => {
                                    if (copiedEvents.length === 0) return;
                                    sauvegarderEtatPrecedent();
                                    const earliestMin = Math.min(...copiedEvents.map(e => e.startMins));
                                    const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                                    
                                    const newEvents = copiedEvents.map(copyEvt => {
                                      const offset = copyEvt.startMins - earliestMin;
                                      const endMins = Math.min(startMins + offset + copyEvt.durationMins, limitesHeures.baseMins + limitesHeures.span);
                                      return {
                                        id: String(Date.now() + Math.random()), 
                                        start: `${jourConsulte}T${formatTime(startMins + offset)}:00`, end: `${jourConsulte}T${formatTime(endMins)}:00`,
                                        title: `${copyEvt.extendedProps?.posteNom} - ${agent.nom}`, backgroundColor: copyEvt.backgroundColor, borderColor: copyEvt.borderColor,
                                        extendedProps: { ...copyEvt.extendedProps, agentId: agent.id, agentNom: agent.nom }
                                      };
                                    });

                                    const monStr = getMondayStr(jourConsulte);
                                    const currentWeek = customWeeks[monStr] ? [...customWeeks[monStr]] : getEventsForWeek(monStr);
                                    setCustomWeeks({ ...customWeeks, [monStr]: [...currentWeek, ...newEvents] });
                                  }}
                                  onAddLasso={(startMins, endMins) => {
                                    const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                                    setFormTypeEvent('affectation'); setFormTypeAbsence('absence'); setFormAbsImpact('local'); setFormAgent(agent.id); setFormPoste(posteActif || (postes[0]?.id || '')); setFormNote('');
                                    setModalCreation({ isOpen: true, eventId: null, date: jourConsulte, start: formatTime(startMins), end: formatTime(endMins) });
                                  }}
                                  onLassoSelect={(min, max) => {
                                    const selected = eventsDuJour.filter(evt => {
                                      const sD = new Date(evt.start); const eD = new Date(evt.end);
                                      const sM = sD.getHours() * 60 + sD.getMinutes(); const eM = eD.getHours() * 60 + eD.getMinutes();
                                      return sM < max && eM > min;
                                    }).map(evt => {
                                      const sD = new Date(evt.start); const sM = sD.getHours() * 60 + sD.getMinutes();
                                      const eD = new Date(evt.end); const dur = (eD.getHours() * 60 + eD.getMinutes()) - sM;
                                      let bg = evt.extendedProps?.posteCouleur || '#3b82f6', border = 'rgba(0,0,0,0.2)', title = evt.extendedProps?.posteNom || 'Poste';
                                      if (evt.extendedProps?.isAbsence) {
                                         const typeAbs = evt.extendedProps.typeAbsence; bg = typeAbs === 'absence' ? '#ef4444' : typeAbs === 'retard' ? '#f59e0b' : '#10b981'; title = typeAbs === 'absence' ? '🚫 ABS' : typeAbs === 'retard' ? '⏰ RET' : '🟢 SUPP';
                                      } else if (conflitsIds.has(String(evt.id).split('_')[0])) { bg = '#dc2626'; title = '⚠️ ' + title; }
                                      return { id: evt.id, title: evt.title || title, backgroundColor: bg, borderColor: border, extendedProps: { ...evt.extendedProps }, durationMins: dur, startMins: sM };
                                    });
                                    if (selected.length > 0) {
                                      setCopiedEvents(prev => { 
                                        const isDifferentLine = prev.length > 0 && prev[0].extendedProps?.agentId !== agent.id;
                                        const base = isDifferentLine ? [] : prev;
                                        const n = [...base]; 
                                        selected.forEach(s => { if (!n.some(p => p.id === s.id)) n.push(s); }); 
                                        return n; 
                                      });
                                    }
                                  }}
                                >
                                  {eventsDuJour.map(evt => {
                                    const startD = new Date(evt.start); const endD = new Date(evt.end);
                                    const startMins = startD.getHours() * 60 + startD.getMinutes(); const endMins = endD.getHours() * 60 + endD.getMinutes();
                                    const posteCouleur = evt.extendedProps?.posteCouleur || '#3b82f6';
                                    
                                    return (
                                      <TimelineEvent 
                                        key={evt.id} startMins={startMins} endMins={endMins} limitesHeures={limitesHeures} isLocked={false} 
                                        bgColor={posteCouleur} borderColor={isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} textColor={getContrastYIQ(posteCouleur)} 
                                        title={evt.extendedProps?.posteNom || 'Poste'} subtitle={agent.nom} extInfo={null} conflit={false} snapPoints={allLineSnapPoints}
                                        isCopied={copiedEvents.some(c => c.id === evt.id)}
                                        onUpdate={(min, max) => {
                                          const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                                          sauvegarderEtatPrecedent();
                                          applyAction('update', { id: evt.id, start: `${jourConsulte}T${formatTime(min)}:00`, end: `${jourConsulte}T${formatTime(max)}:00` });
                                        }}
                                        onClick={() => ouvrirEdition(evt)}
                                        onCopy={(dur, startM) => {
                                          setCopiedEvents(prev => {
                                            const isDifferentLine = prev.length > 0 && prev[0].extendedProps?.agentId !== agent.id;
                                            const base = isDifferentLine ? [] : prev;
                                            if (base.some(p => p.id === evt.id)) return base.filter(p => p.id !== evt.id);
                                            return [...base, { id: evt.id, title: evt.extendedProps?.posteNom || 'Poste', backgroundColor: posteCouleur, borderColor: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)', extendedProps: { ...evt.extendedProps }, durationMins: dur, startMins: startM }];
                                          });
                                        }}
                                      />
                                    );
                                  })}
                                </TimelineTrack>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 2. VUE MODELE (SEMAINE TYPE) */}
        {vueActive === 'template' && (() => {
          if (isPrinting) {
            return modeImpression === 'individuel' ? (
              <PrintIndividualWeeklyView 
                events={currentTemplate?.events || []} 
                agents={agents} 
                limitesHeures={limitesHeures} 
                amplitude={amplitude} 
                titre={`Modèle : ${currentTemplate?.nom}`} 
                joursAImprimer={modalPrint.jours} 
                sonneries={sonneries} 
              />
            ) : (
              <PrintTemplateView 
                template={currentTemplate} 
                joursAImprimer={modalPrint.jours} 
                format={modalPrint.format} 
                agents={agents} 
                limitesHeures={limitesHeures} 
                sonneries={sonneries} 
                amplitude={amplitude} 
                formatHeureTableau={formatHeureTableau} 
              />
            );
          }
          const { gridLines, gridLabelsDaily, gridTicks } = generateGrid(limitesHeures, sonneries, amplitude);
          const templateDateObj = new Date(currentTemplate?.dateDebut || baseYear + '-09-01');
          templateDateObj.setDate(templateDateObj.getDate() + (jourTemplate - 1));
          const pad = n => String(n).padStart(2, '0');
          const currentTemplateDateStr = `${templateDateObj.getFullYear()}-${pad(templateDateObj.getMonth()+1)}-${pad(templateDateObj.getDate())}`;

          const isBesoinsMode = modeEdition === 'besoins';
          const rowsItems = isBesoinsMode ? postes : agents;

          return (
            <div className={`flex-1 flex flex-col ${t.bgMain} h-full overflow-hidden min-h-0`}>
              <div className="p-4 pb-2 no-print shrink-0">
                <div className="flex justify-between items-center mb-2">
                  <h2 className={`text-lg font-bold ${t.header} flex items-center gap-2`}>📐 Modèle : {currentTemplate?.nom || 'Semaine Type'}</h2>
                  <div className="flex gap-2 items-center">
                    {currentTemplate?.statut === 'brouillon' && (<button onClick={validerModele} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-green-700 shadow-sm animate-pulse">✅ Valider et Appliquer</button>)}
                  <div className="flex items-center gap-1.5">
                    <select value={activeTemplateId} onChange={e => setActiveTemplateId(Number(e.target.value))} className={`border ${t.borderLight} rounded p-1.5 text-xs font-bold ${t.cardBg} ${t.header} outline-none`}>
                      {templateVersions.map(tv => <option key={tv.id} value={tv.id}>{tv.statut==='valide'?'🔒':'✏️'} {tv.nom}</option>)}
                    </select>
                    {templateVersions.length > 1 && (
                      <button 
                        type="button" 
                        onClick={() => supprimerModele(activeTemplateId)} 
                        className="bg-red-500/10 text-red-500 hover:bg-red-500/20 px-2 py-1.5 rounded text-xs font-bold transition-colors shadow-sm"
                        title="Supprimer le modèle actif"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-3 items-center">
                  {[1, 2, 3, 4, 5].map(d => (
                    <button key={d} onClick={() => setJourTemplate(d)} className={`px-5 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm ${jourTemplate === d ? t.activeTab : `${t.cardBg} ${t.textMenuMuted} border border-transparent hover:border-black/10 dark:hover:border-white/10`}`}>{['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'][d - 1]}</button>
                  ))}
                  <div className="ml-auto text-xs font-bold px-3 py-1.5 rounded-full border border-black/10 dark:border-white/10 shadow-inner bg-black/5 dark:bg-white/5">Lignes : {isBesoinsMode ? '🎯 Postes (Besoins structurels)' : '👤 Agents (Affectations nominatives)'}</div>
                </div>
                {/* --- BANDEAU LÉGENDE POSTES (MODÈLE) --- */}
              <div className={`flex flex-wrap gap-2 p-2.5 mt-3 border ${t.borderLight} rounded-xl ${t.bgLight} items-center justify-center shrink-0 shadow-xs`}>
                <span className="text-xs font-bold text-gray-500 mr-2 uppercase tracking-wider">Postes :</span>
                {postes.map(p => (
                  <span key={p.id} className="px-2.5 py-1 rounded text-[11px] font-bold shadow-sm flex items-center gap-1.5" style={{ backgroundColor: p.couleur, color: getContrastYIQ(p.couleur) }}>
                    {p.nom}
                    <button onClick={() => ouvrirEditionPoste(p)} className="hover:opacity-75 text-xs ml-0.5 cursor-pointer" title="Modifier ce poste">⚙️</button>
                    <button onClick={(e) => supprimerPoste(p.id, p.nom, e)} className="hover:opacity-60 text-xs font-black ml-0.5 cursor-pointer" title="Supprimer ce poste">✖</button>
                  </span>
                ))}
                <button onClick={ouvrirCreationPoste} className={`ml-2 px-2.5 py-1 rounded text-xs font-bold ${t.btnPrimary} shadow-sm transition-transform hover:scale-105`}>
                  ➕ Poste
                </button>
              </div>
              </div>

              <div className="flex-1 overflow-hidden px-4 pb-4 flex flex-col">
                <div className={`${t.cardBg} rounded-xl shadow border ${currentTemplate?.statut === 'brouillon' ? 'border-[#3B82F6] border-2' : t.borderLight} flex-1 flex flex-col overflow-hidden`}>
                  <div className={`h-full flex flex-col transition-all duration-300 ${currentTemplate?.statut === 'valide' ? 'pointer-events-none opacity-85 grayscale-[15%]' : ''}`}>
                    <div className="flex-1 overflow-x-auto overflow-y-auto flex flex-col min-h-0">
                      <div className="min-w-[800px] flex-1 flex flex-col relative">
                      <div className={`flex border-b ${t.borderLight} ${t.bgLight} shrink-0 ml-32 relative h-8 items-center`}>
                        {gridTicks?.map(tick => (
                          <div key={tick.m} className="absolute bottom-0 w-[1px] h-2 bg-black/20 dark:bg-white/20" style={{ left: `${tick.topPercent}%` }}></div>
                        ))}
                        {gridLabelsDaily.map(lbl => (
                          <div key={lbl.timeStr} className={`absolute text-[10px] font-black ${t.header} top-1/2 -translate-y-1/2`} style={{ left: `${lbl.topPercent}%`, transform: 'translateX(-50%) translateY(-50%)' }}>
                            {lbl.timeStr}
                          </div>
                        ))}
                      </div>
                        
                        <div className="flex-1 relative z-10 flex flex-col">
                          <div className="absolute inset-0 left-32 pointer-events-none z-0">
                            {gridLines.map(line => (<div key={line.timeStr} className={`absolute top-0 bottom-0 ${t.borderLight} opacity-50`} style={{ left: `${line.topPercent}%`, borderLeft: line.isHeurePleine || line.isSonnerie ? '2px solid currentColor' : '1px dashed currentColor' }}></div>))}
                          </div>

                          {rowsItems.length === 0 && (
                            <div className="flex items-center justify-center h-32 text-gray-400 italic font-medium ml-32">
                              Aucune ligne à afficher. Ajoutez des {isBesoinsMode ? 'postes' : 'agents'} dans le menu de gauche.
                            </div>
                          )}

                          {rowsItems.map(item => {
                            const dateStr = currentTemplateDateStr;
                            const eventsDeLaLigne = displayEvents.filter(e => {
                              if (!e.start.startsWith(dateStr)) return false;
                              if (isBesoinsMode) return e.extendedProps?.isBesoin && e.extendedProps?.posteId === item.id;
                              return !e.extendedProps?.isBesoin && e.extendedProps?.agentId === item.id;
                            });

                            const rowBgColor = isBesoinsMode ? item.couleur : item.couleurFond;
                            const totalMinsJour = eventsDeLaLigne.filter(e => !e.extendedProps?.isAbsence).reduce((acc, evt) => acc + (new Date(evt.end) - new Date(evt.start)) / 60000, 0);
                            const heuresJourStr = formatHeureTableau(totalMinsJour / 60, true);
                            const amplitudeStr = getAmplitudeStr(eventsDeLaLigne);

                            const allLineSnapPoints = [...sonneriesMins, ...eventsDeLaLigne.flatMap(e => {
                                const s = new Date(e.start), ed = new Date(e.end);
                                return [s.getHours() * 60 + s.getMinutes(), ed.getHours() * 60 + ed.getMinutes()];
                            })];

                            return (
                              <div key={item.id} className={`flex border-b ${t.borderLight} flex-1 relative group hover:bg-black/5 dark:hover:bg-white/5 transition-colors min-h-[60px] hover:z-50`}>
                                <div className={`w-32 shrink-0 flex flex-col items-end justify-center p-2 border-r ${t.borderLight} z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)] sticky left-0`} style={{ backgroundColor: rowBgColor, color: getContrastYIQ(rowBgColor) }}>
                                  <span className="text-sm font-black text-right leading-tight truncate w-full">{item.nom}</span>
                                  <div className="flex items-center gap-1.5 mt-0.5 justify-end w-full">
                                    {amplitudeStr && <span className="text-[9px] font-bold opacity-75">{amplitudeStr}</span>}
                                    <span className="text-[10px] font-mono font-bold bg-black/15 px-1.5 py-0.5 rounded shadow-inner leading-none">{heuresJourStr}</span>
                                  </div>
                                </div>
                                
                                <TimelineTrack 
                                  limitesHeures={limitesHeures} isBesoins={isBesoinsMode} copiedEvents={copiedEvents} snapPoints={allLineSnapPoints}
                                  onAddCopy={(startMins) => {
                                    if (currentTemplate?.statut === 'valide' || copiedEvents.length === 0) return;
                                    sauvegarderEtatPrecedent();
                                    const earliestMin = Math.min(...copiedEvents.map(e => e.startMins));
                                    const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                                    
                                    const newItems = copiedEvents.map(copyEvt => {
                                      const offset = copyEvt.startMins - earliestMin;
                                      const endMins = Math.min(startMins + offset + copyEvt.durationMins, limitesHeures.baseMins + limitesHeures.span);
                                      const newStartISO = `${currentTemplateDateStr}T${formatTime(startMins + offset)}:00`;
                                      const newEndISO = `${currentTemplateDateStr}T${formatTime(endMins)}:00`;

                                      if (isBesoinsMode && copyEvt.extendedProps?.isBesoin) {
                                        return { id: String(Date.now() + Math.random()), start: newStartISO, end: newEndISO, extendedProps: { ...copyEvt.extendedProps, posteId: item.id, posteNom: item.nom } };
                                      } else if (!isBesoinsMode && !copyEvt.extendedProps?.isBesoin) {
                                        return { 
                                          id: String(Date.now() + Math.random()), start: newStartISO, end: newEndISO,
                                          title: `${copyEvt.extendedProps?.posteNom} - ${item.nom}`, backgroundColor: copyEvt.backgroundColor, borderColor: copyEvt.borderColor,
                                          extendedProps: { ...copyEvt.extendedProps, agentId: item.id, agentNom: item.nom }
                                        };
                                      }
                                      return null;
                                    }).filter(Boolean);

                                    if (isBesoinsMode) updateCurrentTemplate(null, [...currentTemplate.besoins, ...newItems]);
                                    else updateCurrentTemplate([...currentTemplate.events, ...newItems], null);
                                  }}
                                  onAddLasso={(startMins, endMins) => {
                                    if (currentTemplate?.statut === 'valide') return;
                                    const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                                    if (isBesoinsMode) {
                                      updateCurrentTemplate(null, [...currentTemplate.besoins, { 
                                        id: String(Date.now()), start: `${currentTemplateDateStr}T${formatTime(startMins)}:00`, end: `${currentTemplateDateStr}T${formatTime(endMins)}:00`, 
                                        extendedProps: { posteId: item.id, posteNom: item.nom, qte: formBesoinQte } 
                                      }]);
                                    } else {
                                      setFormTypeEvent('affectation'); setFormTypeAbsence('absence'); setFormAbsImpact('local'); setFormAgent(item.id); setFormPoste(posteActif || (postes[0]?.id || '')); setFormNote('');
                                      setModalCreation({ isOpen: true, eventId: null, date: currentTemplateDateStr, start: formatTime(startMins), end: formatTime(endMins) });
                                    }
                                  }}
                                  onLassoSelect={(min, max) => {
                                    if (currentTemplate?.statut === 'valide') return;
                                    const selected = eventsDeLaLigne.filter(evt => {
                                      const sD = new Date(evt.start); const eD = new Date(evt.end);
                                      const sM = sD.getHours() * 60 + sD.getMinutes(); const eM = eD.getHours() * 60 + eD.getMinutes();
                                      return sM < max && eM > min;
                                    }).map(evt => {
                                      const sD = new Date(evt.start); const sM = sD.getHours() * 60 + sD.getMinutes();
                                      const eD = new Date(evt.end); const dur = (eD.getHours() * 60 + eD.getMinutes()) - sM;
                                      let bg, border, title;
                                      if (isBesoinsMode) {
                                        const isSous = evt.extendedProps?.isSousEffectif;
                                        bg = isSous ? '#dc2626' : '#16a34a'; border = isSous ? '#991b1b' : '#166534'; title = `${evt.extendedProps?.minCount} / ${evt.extendedProps?.qte} pers.`;
                                      } else {
                                        bg = evt.extendedProps?.posteCouleur || '#3b82f6'; border = isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'; title = evt.extendedProps?.posteNom || 'Poste';
                                        if (conflitsIds.has(String(evt.id).split('_')[0])) bg = '#dc2626';
                                      }
                                      return { id: evt.id, title: evt.title || title, backgroundColor: bg, borderColor: border, extendedProps: { ...evt.extendedProps }, durationMins: dur, startMins: sM };
                                    });
                                    if (selected.length > 0) {
                                      setCopiedEvents(prev => { 
                                        const isDifferentLine = prev.length > 0 && (isBesoinsMode ? prev[0].extendedProps?.posteId !== item.id : prev[0].extendedProps?.agentId !== item.id);
                                        const base = isDifferentLine ? [] : prev;
                                        const n = [...base]; 
                                        selected.forEach(s => { if (!n.some(p => p.id === s.id)) n.push(s); }); 
                                        return n; 
                                      });
                                    }
                                  }}                                >
                                  {eventsDeLaLigne.map(evt => {
                                    const startD = new Date(evt.start); const endD = new Date(evt.end);
                                    const startMins = startD.getHours() * 60 + startD.getMinutes(); const endMins = endD.getHours() * 60 + endD.getMinutes();
                                    const isLocked = currentTemplate?.statut === 'valide';
                                    
                                    let evtBgColor, evtTextColor, evtBorderColor, evtTitle, extInfo;
                                    if (isBesoinsMode) {
                                      const isSous = evt.extendedProps?.isSousEffectif;
                                      evtBgColor = isSous ? '#dc2626' : '#16a34a'; evtBorderColor = isSous ? '#991b1b' : '#166534'; evtTextColor = '#ffffff';
                                      evtTitle = `${evt.extendedProps?.minCount} / ${evt.extendedProps?.qte} pers.`;
                                    } else {
                                      evtBgColor = evt.extendedProps?.posteCouleur || '#3b82f6';
                                      const estEnConflit = conflitsIds.has(String(evt.id).split('_')[0]);
                                      if (estEnConflit) { evtBgColor = '#dc2626'; }
                                      evtBorderColor = isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'; evtTextColor = getContrastYIQ(evtBgColor);
                                      evtTitle = (estEnConflit ? '⚠️ ' : '') + (evt.extendedProps?.posteNom || 'Poste');
                                      extInfo = evt.extendedProps?.note || null;
                                    }
                                    
                                    return (
                                      <TimelineEvent 
                                        key={evt.id} startMins={startMins} endMins={endMins} limitesHeures={limitesHeures} isLocked={isLocked} 
                                        bgColor={evtBgColor} borderColor={evtBorderColor} textColor={evtTextColor} 
                                        title={evtTitle} subtitle={!isBesoinsMode ? item.nom : null} extInfo={extInfo} conflit={!isBesoinsMode && conflitsIds.has(String(evt.id).split('_')[0])} snapPoints={allLineSnapPoints}
                                        isCopied={copiedEvents.some(c => c.id === evt.id)}
                                        onUpdate={(min, max) => {
                                          const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                                          sauvegarderEtatPrecedent();
                                          if (isBesoinsMode) {
                                            const cleanId = String(evt.id).split('_')[0];
                                            const newBesoins = currentTemplate.besoins.map(b => String(b.id).split('_')[0] === cleanId ? { ...b, start: `${currentTemplateDateStr}T${formatTime(min)}:00`, end: `${currentTemplateDateStr}T${formatTime(max)}:00` } : b);
                                            updateCurrentTemplate(null, newBesoins);
                                          } else {
                                            applyAction('update', { id: evt.id, start: `${currentTemplateDateStr}T${formatTime(min)}:00`, end: `${currentTemplateDateStr}T${formatTime(max)}:00` });
                                          }
                                        }}
                                        onClick={() => { if (!isLocked) { if (evt.extendedProps?.isBesoin) ouvrirEditionBesoin(evt); else ouvrirEdition(evt); } }}
                                        onCopy={(dur, startM) => {
                                          setCopiedEvents(prev => {
                                            const isDifferentLine = prev.length > 0 && (isBesoinsMode ? prev[0].extendedProps?.posteId !== item.id : prev[0].extendedProps?.agentId !== item.id);
                                            const base = isDifferentLine ? [] : prev;
                                            if (base.some(p => p.id === evt.id)) return base.filter(p => p.id !== evt.id);
                                            return [...base, { id: evt.id, title: evt.title || evtTitle, backgroundColor: evtBgColor, borderColor: evtBorderColor, extendedProps: { ...evt.extendedProps }, durationMins: dur, startMins: startM }];
                                          });
                                        }}
                                      />
                                    );
                                  })}
                                </TimelineTrack>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* 3. VUE PLANNING REEL */}
        {vueActive === 'planning' && (() => {
          const { gridLines, gridLabelsDaily, gridTicks } = generateGrid(limitesHeures, sonneries, amplitude);
          const activeMonday = currentViewMonday || getMondayStr(new Date());
          
          return (
            <div className={`flex-1 flex flex-col ${t.bgMain} h-full overflow-hidden min-h-0`}>
              <div className="p-4 pb-2 no-print shrink-0">
                <div className="flex justify-between items-center mb-2">
                  <h2 className={`text-lg font-bold ${t.header}`}>📅 Planning Réel {printFilter.type === 'agent' && ` - Filtré pour : ${agents.find(a=>a.id===printFilter.id)?.nom}`} {printFilter.type === 'poste' && ` - Filtré pour le poste : ${postes.find(p=>p.id===printFilter.id)?.nom}`}</h2>
                  <div className="flex gap-2 items-center">
                  <div className="flex items-center gap-3 mr-4">
                      <button onClick={() => setCurrentViewMonday(getMondayStr(new Date()))} className={`px-3 py-1.5 rounded text-xs uppercase tracking-wider font-bold ${t.cardBg} ${t.header} border ${t.borderLight} hover:bg-black/5 dark:hover:bg-white/5 shadow-sm transition-colors`} title="Revenir à la semaine en cours">
                        Aujourd'hui
                      </button>
                      <button onClick={() => { const d = new Date(activeMonday); d.setDate(d.getDate() - 7); setCurrentViewMonday(getMondayStr(d)); }} className={`px-3 py-1.5 rounded text-sm font-bold ${t.cardBg} ${t.header} border ${t.borderLight} hover:bg-black/5 dark:hover:bg-white/5 shadow-sm transition-colors`} title="Semaine précédente">◀</button>
                      
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${t.header} text-sm`}>Semaine du</span>
                        <input 
                          type="date" 
                          value={activeMonday} 
                          onChange={(e) => {
                            if (e.target.value) setCurrentViewMonday(getMondayStr(e.target.value));
                          }} 
                          className={`border ${t.borderLight} rounded p-1.5 text-sm font-bold ${t.cardBg} ${t.header} outline-none shadow-sm cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors`}
                          title="Choisir une date pour y aller directement"
                        />
                      </div>

                      <button onClick={() => { const d = new Date(activeMonday); d.setDate(d.getDate() + 7); setCurrentViewMonday(getMondayStr(d)); }} className={`px-3 py-1.5 rounded text-sm font-bold ${t.cardBg} ${t.header} border ${t.borderLight} hover:bg-black/5 dark:hover:bg-white/5 shadow-sm transition-colors`} title="Semaine suivante">▶</button>
                    </div>
                    <select onChange={(e) => { if(e.target.value) importerModele(e.target.value); e.target.value=''; }} className={`${t.cardBg} ${t.textAccent} px-2 py-1 rounded text-xs font-bold border ${t.borderLight} shadow-sm outline-none cursor-pointer hover:opacity-75`}>
                      <option value="">📥 Appliquer un modèle...</option>
                      {templateVersions.map(tv => <option key={tv.id} value={tv.id}>{tv.nom}</option>)}
                    </select>
                    {customWeeks[activeMonday] && (
                      <button onClick={reinitialiserSemaineReelle} className="bg-orange-500/20 text-orange-500 hover:bg-orange-500/40 px-3 py-1 rounded text-xs font-bold border border-orange-500 shadow-sm transition">🔄 Rétablir</button>
                    )}
                  </div>
                </div>
                <div className={`flex flex-wrap gap-2 p-2.5 mt-3 border ${t.borderLight} rounded-xl ${t.bgLight} items-center justify-center shrink-0 shadow-xs`}>
                  <span className="text-xs font-bold text-gray-500 mr-2 uppercase tracking-wider">Postes :</span>
                  {postes.map(p => (
                    <span key={p.id} className="px-2.5 py-1 rounded text-[11px] font-bold shadow-sm flex items-center gap-1.5" style={{ backgroundColor: p.couleur, color: getContrastYIQ(p.couleur) }}>
                      {p.nom}
                      <button onClick={() => ouvrirEditionPoste(p)} className="hover:opacity-75 text-xs ml-0.5 cursor-pointer" title="Modifier ce poste">⚙️</button>
                      <button onClick={(e) => supprimerPoste(p.id, p.nom, e)} className="hover:opacity-60 text-xs font-black ml-0.5 cursor-pointer" title="Supprimer ce poste">✖</button>
                    </span>
                  ))}
                  <button onClick={ouvrirCreationPoste} className={`ml-2 px-2.5 py-1 rounded text-xs font-bold ${t.btnPrimary} shadow-sm transition-transform hover:scale-105`}>
                    ➕ Poste
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden px-4 pb-4 flex flex-col">
                {isPrinting ? (
                  modeImpression === 'individuel' ? (
                    <PrintIndividualWeeklyView 
                      events={displayEvents} 
                      agents={agents} 
                      limitesHeures={limitesHeures} 
                      amplitude={amplitude} 
                      titre={`Semaine du ${activeMonday}`} 
                      joursAImprimer={modalPrint.jours} 
                      sonneries={sonneries} 
                    />
                  ) : (
                    <PrintTimeGridView 
                      events={displayEvents} 
                      agents={agents} 
                      limitesHeures={limitesHeures} 
                      amplitude={amplitude} 
                      titre={`Planning Hebdo du ${activeMonday}`} 
                      joursAImprimer={modalPrint.jours} 
                      format={modalPrint.format} 
                      sonneries={sonneries} 
                    />
                  )
                ) : (
                  <div className={`${t.cardBg} rounded-xl shadow border ${t.borderLight} flex-1 flex flex-col overflow-hidden`}>
                    <div className="flex-1 overflow-x-auto overflow-y-auto flex flex-col min-h-0">
                      <div className="min-w-[900px] flex-1 flex flex-col relative">
                        <div className={`flex border-b ${t.borderLight} ${t.bgLight} shrink-0 ml-32 relative h-8 items-center`}>
                          {gridTicks?.map(tick => (
                            <div key={tick.m} className="absolute bottom-0 w-[1px] h-2 bg-black/20 dark:bg-white/20" style={{ left: `${tick.topPercent}%` }}></div>
                          ))}
                          
                          {gridLabelsDaily.map(lbl => (
                            <div key={lbl.timeStr} className={`absolute text-[10px] font-black ${t.header} top-1/2 -translate-y-1/2`} style={{ left: `${lbl.topPercent}%`, transform: 'translateX(-50%) translateY(-50%)' }}>
                              {lbl.timeStr}
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex-1 flex flex-col relative">
                          <div className="absolute inset-0 left-32 pointer-events-none z-0">
                            {gridLines.map(line => (<div key={line.timeStr} className={`absolute top-0 bottom-0 ${t.borderLight} opacity-50`} style={{ left: `${line.topPercent}%`, borderLeft: line.isHeurePleine || line.isSonnerie ? '2px solid currentColor' : '1px dashed currentColor' }}></div>))}
                          </div>

                          {agents.length === 0 && (
                            <div className="flex items-center justify-center h-32 text-gray-400 italic font-medium ml-32">
                              Aucun agent configuré.
                            </div>
                          )}

                          {[1, 2, 3, 4, 5].map(dayIndex => {
                            const dateDuJour = new Date(activeMonday);
                            dateDuJour.setDate(dateDuJour.getDate() + dayIndex - 1);
                            const pad = n => String(n).padStart(2, '0');
                            const dateStr = `${dateDuJour.getFullYear()}-${pad(dateDuJour.getMonth()+1)}-${pad(dateDuJour.getDate())}`;
                            const nomJour = nomsJours[dayIndex];

                            return (
                              <div key={dateStr} className={`flex flex-col border-b-4 border-black/10 dark:border-white/5 relative z-10 hover:z-[60]`}>
                                <div className={`px-4 py-1.5 font-bold uppercase text-xs tracking-wider sticky left-0 z-20 ${t.bgLight} ${t.header} border-b ${t.borderLight}`}>{nomJour} {dateDuJour.getDate()}/{dateDuJour.getMonth()+1}</div>
                                
                                {agents.map(agent => {
                                  const eventsDeLaLigne = displayEvents.filter(e => e.start.startsWith(dateStr) && e.extendedProps?.agentId === agent.id);
                                  const totalMinsJour = eventsDeLaLigne.filter(e => !e.extendedProps?.isAbsence).reduce((acc, evt) => acc + (new Date(evt.end) - new Date(evt.start)) / 60000, 0);
                                  const heuresJourStr = formatHeureTableau(totalMinsJour / 60, true);
                                  const amplitudeStr = getAmplitudeStr(eventsDeLaLigne);

                                  const allLineSnapPoints = [...sonneriesMins, ...eventsDeLaLigne.flatMap(e => {
                                      const s = new Date(e.start), ed = new Date(e.end);
                                      return [s.getHours() * 60 + s.getMinutes(), ed.getHours() * 60 + ed.getMinutes()];
                                  })];

                                  return (
                                    <div key={`${dateStr}-${agent.id}`} className={`flex border-b ${t.borderLight} h-14 relative group hover:bg-black/5 dark:hover:bg-white/5 hover:z-50 transition-colors`}>
                                      <div className={`w-32 shrink-0 flex flex-col items-end justify-center p-2 border-r ${t.borderLight} z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] sticky left-0`} style={{ backgroundColor: agent.couleurFond, color: getContrastYIQ(agent.couleurFond) }}>
                                        <span className="text-sm font-black text-right leading-tight truncate w-full">{agent.nom}</span>
                                        <div className="flex items-center gap-1.5 mt-0.5 justify-end w-full">
                                          {amplitudeStr && <span className="text-[9px] font-bold opacity-75">{amplitudeStr}</span>}
                                          <span className="text-[10px] font-mono font-bold bg-black/15 px-1.5 py-0.5 rounded shadow-inner leading-none">{heuresJourStr}</span>
                                        </div>
                                      </div>
                                      
                                      <TimelineTrack 
                                        limitesHeures={limitesHeures} isBesoins={false} copiedEvents={copiedEvents} snapPoints={allLineSnapPoints}
                                        onAddCopy={(startMins) => {
                                          if (copiedEvents.length === 0) return;
                                          sauvegarderEtatPrecedent();
                                          const earliestMin = Math.min(...copiedEvents.map(e => e.startMins));
                                          const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                                          
                                          const newEvents = copiedEvents.map(copyEvt => {
                                            const offset = copyEvt.startMins - earliestMin;
                                            const endMins = Math.min(startMins + offset + copyEvt.durationMins, limitesHeures.baseMins + limitesHeures.span);
                                            return {
                                              id: String(Date.now() + Math.random()), 
                                              start: `${dateStr}T${formatTime(startMins + offset)}:00`, end: `${dateStr}T${formatTime(endMins)}:00`,
                                              title: `${copyEvt.extendedProps?.posteNom} - ${agent.nom}`, backgroundColor: copyEvt.backgroundColor, borderColor: copyEvt.borderColor,
                                              extendedProps: { ...copyEvt.extendedProps, agentId: agent.id, agentNom: agent.nom }
                                            };
                                          });

                                          const monStr = getMondayStr(dateStr);
                                          const currentWeek = customWeeks[monStr] ? [...customWeeks[monStr]] : getEventsForWeek(monStr);
                                          setCustomWeeks({ ...customWeeks, [monStr]: [...currentWeek, ...newEvents] });
                                        }}
                                        onAddLasso={(startMins, endMins) => {
                                          const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                                          setFormTypeEvent('affectation'); setFormTypeAbsence('absence'); setFormAbsImpact('local'); setFormAgent(agent.id); setFormPoste(posteActif || (postes[0]?.id || '')); setFormNote('');
                                          setModalCreation({ isOpen: true, eventId: null, date: dateStr, start: formatTime(startMins), end: formatTime(endMins) });
                                        }}
                                        onLassoSelect={(min, max) => {
                                          const selected = eventsDeLaLigne.filter(evt => {
                                            const sD = new Date(evt.start); const eD = new Date(evt.end);
                                            const sM = sD.getHours() * 60 + sD.getMinutes(); const eM = eD.getHours() * 60 + eD.getMinutes();
                                            return sM < max && eM > min;
                                          }).map(evt => {
                                            const sD = new Date(evt.start); const sM = sD.getHours() * 60 + sD.getMinutes();
                                            const eD = new Date(evt.end); const dur = (eD.getHours() * 60 + eD.getMinutes()) - sM;
                                            let bg = evt.extendedProps?.posteCouleur || '#3b82f6', border = 'rgba(0,0,0,0.2)', title = evt.extendedProps?.posteNom || 'Poste';
                                            if (evt.extendedProps?.isAbsence) {
                                               const typeAbs = evt.extendedProps.typeAbsence; bg = typeAbs === 'absence' ? '#ef4444' : typeAbs === 'retard' ? '#f59e0b' : '#10b981'; title = typeAbs === 'absence' ? '🚫 ABS' : typeAbs === 'retard' ? '⏰ RET' : '🟢 SUPP';
                                            } else if (conflitsIds.has(String(evt.id).split('_')[0])) { bg = '#dc2626'; title = '⚠️ ' + title; }
                                            return { id: evt.id, title: evt.title || title, backgroundColor: bg, borderColor: border, extendedProps: { ...evt.extendedProps }, durationMins: dur, startMins: sM };
                                          });
                                          if (selected.length > 0) {
                                            setCopiedEvents(prev => { 
                                              const isDifferentLine = prev.length > 0 && prev[0].extendedProps?.agentId !== agent.id;
                                              const base = isDifferentLine ? [] : prev;
                                              const n = [...base]; 
                                              selected.forEach(s => { if (!n.some(p => p.id === s.id)) n.push(s); }); 
                                              return n; 
                                            });
                                          }
                                        }}
                                      >
                                        {eventsDeLaLigne.map(evt => {
                                          const startD = new Date(evt.start); const endD = new Date(evt.end);
                                          const startMins = startD.getHours() * 60 + startD.getMinutes(); const endMins = endD.getHours() * 60 + endD.getMinutes();
                                          
                                          let evtBgColor, evtTextColor, evtBorderColor, evtTitle, extInfo;
                                          if (evt.extendedProps?.isAbsence) {
                                            const typeAbs = evt.extendedProps.typeAbsence;
                                            evtBgColor = typeAbs === 'absence' ? '#ef4444' : typeAbs === 'retard' ? '#f59e0b' : '#10b981';
                                            evtBorderColor = 'rgba(0,0,0,0.2)'; evtTextColor = '#ffffff';
                                            evtTitle = typeAbs === 'absence' ? '🚫 ABS' : typeAbs === 'retard' ? '⏰ RET' : '🟢 SUPP';
                                            extInfo = evt.extendedProps?.motif;
                                          } else {
                                            evtBgColor = evt.extendedProps?.posteCouleur || '#3b82f6';
                                            const estEnConflit = conflitsIds.has(String(evt.id).split('_')[0]);
                                            if (estEnConflit) { evtBgColor = '#dc2626'; }
                                            evtBorderColor = isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'; evtTextColor = getContrastYIQ(evtBgColor);
                                            evtTitle = (estEnConflit ? '⚠️ ' : '') + (evt.extendedProps?.posteNom || 'Poste');
                                            extInfo = evt.extendedProps?.note || null;
                                          }
                                          
                                          return (
                                            <TimelineEvent 
                                              key={evt.id} startMins={startMins} endMins={endMins} limitesHeures={limitesHeures} isLocked={false} 
                                              bgColor={evtBgColor} borderColor={evtBorderColor} textColor={evtTextColor} 
                                              title={evtTitle} subtitle={agent?.nom || evt.extendedProps?.agentNom || 'Agent'} extInfo={extInfo} conflit={!evt.extendedProps?.isAbsence && conflitsIds.has(String(evt.id).split('_')[0])} snapPoints={allLineSnapPoints}
                                              isCopied={copiedEvents.some(c => c.id === evt.id)}
                                              onUpdate={(min, max) => {
                                                const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                                                sauvegarderEtatPrecedent();
                                                if (evt.extendedProps?.isAbsence) {
                                                  const cleanId = String(evt.id).replace('abs_', '').split('_')[0];
                                                  setAbsences(absences.map(a => String(a.id) === cleanId ? { ...a, start: `${dateStr}T${formatTime(min)}:00`, end: `${dateStr}T${formatTime(max)}:00` } : a));
                                                } else {
                                                  applyAction('update', { id: evt.id, start: `${dateStr}T${formatTime(min)}:00`, end: `${dateStr}T${formatTime(max)}:00` });
                                                }
                                              }}
                                              onClick={() => ouvrirEdition(evt)}
                                              onCopy={(dur, startM) => {
                                                setCopiedEvents(prev => {
                                                  const isDifferentLine = prev.length > 0 && prev[0].extendedProps?.agentId !== agent.id;
                                                  const base = isDifferentLine ? [] : prev;
                                                  if (base.some(p => p.id === evt.id)) return base.filter(p => p.id !== evt.id);
                                                  return [...base, { id: evt.id, title: evt.title || evtTitle, backgroundColor: evtBgColor, borderColor: evtBorderColor, extendedProps: { ...evt.extendedProps }, durationMins: dur, startMins: startM }];
                                                });
                                              }}                                            />
                                          );
                                        })}
                                      </TimelineTrack>
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 4. VUE BILAN EQUIPE */}
        {vueActive === 'dashboard' && (() => {
          const todayStr = new Date().toISOString().split('T')[0];
          const totalETP = Math.round(agents.reduce((sum, a) => sum + Number(getActiveContract(a, todayStr).quotite), 0)) / 100;
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
                    <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">ETP Actifs (Aujourd'hui)</label>
                    <div className={`text-2xl font-black flex items-center gap-1 ${totalETP !== dotation && dotation > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{totalETP.toFixed(2)}<span className="text-base">ETP</span></div>
                  </div>
                </div>
              </div>
              <div className={`${t.cardBg} rounded-xl shadow border ${t.borderLight} overflow-hidden`}>
                <table className="w-full text-sm text-left">
                  <thead className={`${t.headerBg} ${t.headerText} font-medium uppercase text-xs`}>
                    <tr><th className={`p-4 border-r ${t.borderLight}`}>Agent</th><th className={`p-4 border-r ${t.borderLight} text-center`}>%</th><th className={`p-4 border-r ${t.borderLight} text-center bg-black/10 dark:bg-white/5`}>H. Contrat</th><th className={`p-4 border-r ${t.borderLight} text-center`}>H. Type Hebdo</th><th className={`p-4 border-r ${t.borderLight} text-center bg-black/10 dark:bg-white/5`}>H. Consommées</th><th className="p-4 text-center">Solde Final</th></tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {statsAgents.map(agent => (
                      <tr key={agent.id} className={`hover:${t.bgLight} transition-colors`}>
                        <td className={`p-4 font-bold border-r ${t.borderLight} ${t.header}`}>{agent.nom} {agent.estEtudiant && '🎓'}</td>
                        <td className={`p-4 text-center border-r ${t.borderLight}`}>
                          <span className="px-2 py-1 rounded-full text-xs font-bold shadow-sm" style={{ backgroundColor: agent.couleurFond, color: getContrastYIQ(agent.couleurFond) }}>
                            {getActiveContract(agent, todayStr).quotite}% {(agent.avenants?.length > 0) && <span title="Des avenants modifient son temps de travail en cours d'année" className="ml-1 cursor-help">📝</span>}
                          </span>
                        </td>
                        <td className={`p-4 text-center border-r ${t.borderLight} font-mono font-bold ${t.header}`}>
                          {formatHeureTableau(agent.hContratProratise, true)}
                        </td>                        
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

        {/* 5. VUE ABSENCES & RETARDS */}
        {vueActive === 'absences' && (() => {
          const absencesFiltrees = [...absences]
            .filter(a => filtreAgentAbsence ? a.agentId === filtreAgentAbsence : true)
            .sort((a, b) => new Date(b.start) - new Date(a.start)); 

          return (
          <div className={`flex-1 p-6 overflow-auto ${t.bgMain}`}>
            <h2 className={`text-2xl font-bold ${t.header} mb-6`}>Gestion des Absences et Retards</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {bilanAbsences.map(b => (
                <div key={b.id} 
                     onClick={() => setFiltreAgentAbsence(filtreAgentAbsence === b.id ? null : b.id)}
                     className={`${t.cardBg} rounded-xl shadow-sm border ${t.borderLight} p-4 border-l-4 cursor-pointer transition-all ${filtreAgentAbsence === b.id ? 'ring-2 ring-blue-500 scale-[1.02]' : 'hover:opacity-80'}`} 
                     style={{ borderLeftColor: b.couleur }}
                     title="Cliquez pour filtrer l'historique sur cet agent">
                  <div className={`font-black text-lg ${t.header} mb-3 flex justify-between items-center`}>
                    {b.nom}
                    {filtreAgentAbsence === b.id && <span className="text-[10px] bg-blue-500 text-white px-2 py-1 rounded-full uppercase tracking-wider shadow-sm">Filtré</span>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="bg-red-500/10 rounded p-1"><div className="text-gray-500 text-[9px] font-bold uppercase">Absences</div><div className={`font-mono font-bold mt-1 text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{b.nbAbs} <span className="text-[10px] text-gray-500 block leading-none">({formatHeureTableau(b.hAbs, true)})</span></div></div>
                    <div className="bg-orange-500/10 rounded p-1"><div className="text-gray-500 text-[9px] font-bold uppercase">Retards</div><div className={`font-mono font-bold mt-1 text-sm ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}`}>{b.nbRet} <span className="text-[10px] text-gray-500 block leading-none">({formatHeureTableau(b.hRet, true)})</span></div></div>
                    <div className="bg-green-500/10 rounded p-1"><div className="text-gray-500 text-[9px] font-bold uppercase">H. Supp / Rattrapage</div><div className={`font-mono font-bold mt-1 text-sm ${isDarkMode ? 'text-green-400' : 'text-green-700'}`}>{b.nbSupp} <span className="text-[10px] text-gray-500 block leading-none">({formatHeureTableau(b.hSupp, true)})</span></div></div>
                  </div>
                  {b.hDetteRestante > 0 && (<div className={`pt-2 border-t border-gray-500/30 text-xs font-bold ${isDarkMode ? 'text-red-400' : 'text-red-500'}`}>⚠️ Dette Locale : {formatHeureTableau(b.hDetteRestante, true)} à rattraper.</div>)}
                  {b.hAvance > 0 && (<div className={`pt-2 border-t border-gray-500/30 text-xs font-bold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>🔵 Crédit Local : {formatHeureTableau(b.hAvance, true)} d'avance.</div>)}
                  {b.nbRet > 0 && b.hDetteRestante === 0 && b.hAvance === 0 && (<div className={`pt-2 border-t border-gray-500/30 text-xs font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`}>✅ Tous les retards locaux sont compensés.</div>)}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className={`lg:col-span-1 ${t.cardBg} p-6 rounded-xl shadow border ${t.borderLight} h-fit`}>
                <h3 className={`font-bold text-md ${t.header} mb-4 pb-2 border-b ${t.borderLight}`}>Déclarer un événement</h3>
                <form onSubmit={ajouterAbsenceRetard} className="space-y-4">
                  {/* 1. SELECTION DES AGENTS */}
                  <div>
                    <div className={`flex justify-between items-center mb-1`}>
                      <label className={`block text-sm font-semibold ${t.header}`}>Agent(s) concerné(s)</label>
                      <button type="button" onClick={() => {
                        if (formAbsence.agentIds.length === agents.length) setFormAbsence({...formAbsence, agentIds: []});
                        else setFormAbsence({...formAbsence, agentIds: agents.map(a => a.id)});
                      }} className={`text-[10px] ${t.bgLight} hover:opacity-75 px-2 py-0.5 rounded font-bold transition-colors ${t.header}`}>
                        {formAbsence.agentIds.length === agents.length ? 'Tout décocher' : 'Tous'}
                      </button>
                    </div>
                    <div className={`w-full border ${t.borderLight} rounded p-2 bg-transparent text-sm max-h-32 overflow-y-auto flex flex-col gap-1 shadow-inner`}>
                      {agents.map(a => (
                        <label key={a.id} className={`flex items-center gap-2 p-1.5 rounded cursor-pointer transition-colors ${formAbsence.agentIds.includes(a.id) ? 'bg-blue-500/10 dark:bg-blue-500/20' : `hover:bg-black/5 dark:hover:bg-white/5`}`}>
                          <input type="checkbox" className="w-4 h-4 cursor-pointer accent-blue-600 rounded"
                            checked={formAbsence.agentIds.includes(a.id)}
                            onChange={(e) => {
                              const newIds = e.target.checked 
                                ? [...formAbsence.agentIds, a.id] 
                                : formAbsence.agentIds.filter(id => id !== a.id);
                              setFormAbsence({...formAbsence, agentIds: newIds});
                            }}
                          />
                          <span className={`font-bold ${t.header}`}>{a.nom}</span>
                        </label>
                      ))}
                      {agents.length === 0 && <span className="text-xs text-gray-500 italic">Aucun agent configuré.</span>}
                    </div>
                  </div>

                  {/* 2. NATURE DE L'EVENEMENT */}
                  <div>
                    <label className={`block text-sm font-semibold mb-1 mt-3 ${t.header}`}>Type d'événement</label>
                    <select value={formAbsence.type} onChange={e => setFormAbsence({...formAbsence, type: e.target.value, journeeComplete: e.target.value === 'absence', impact: e.target.value === 'heures_supp' && formAbsence.impact === 'neutre' ? 'local' : formAbsence.impact})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent text-sm font-bold ${t.header}`}>
                      <option value="absence">🚫 Absence (Plage horaire)</option>
                      <option value="retard">⏰ Retard</option>
                      <option value="heures_supp">🟢 Heures Supp' / Rattrapage</option>
                    </select>
                  </div>

                  {formAbsence.type === 'absence' && (<label className={`flex items-center gap-2 text-sm font-bold ${t.textAccent} cursor-pointer ${t.bgLight} p-2 rounded border ${t.borderLight}`}><input type="checkbox" checked={formAbsence.journeeComplete} onChange={e => setFormAbsence({...formAbsence, journeeComplete: e.target.checked})} className="w-4 h-4 cursor-pointer" />Journée(s) complète(s)</label>)}
                  
                  <div className="flex gap-4">
                    <div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>{formAbsence.type === 'absence' && formAbsence.journeeComplete ? 'Début' : 'Date'}</label><input type="date" required value={formAbsence.dateDebut} onChange={e => setFormAbsence({...formAbsence, dateDebut: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent ${t.header}`} /></div>
                    {formAbsence.type === 'absence' && formAbsence.journeeComplete && (<div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Fin (Optionnel)</label><input type="date" value={formAbsence.dateFin} onChange={e => setFormAbsence({...formAbsence, dateFin: e.target.value})} min={formAbsence.dateDebut} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent ${t.header}`} /></div>)}
                  </div>

                  {formAbsence.type !== 'absence' || !formAbsence.journeeComplete ? (
                    <div>
                      <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Durée (ex: 0h45, 30min)</label>
                      <input type="text" required value={formAbsence.dureeSaisie || ''} onChange={e => setFormAbsence({...formAbsence, dureeSaisie: e.target.value})} placeholder="Ex: 0h45" className={`w-full border ${t.borderLight} rounded p-2 text-sm font-bold text-center bg-transparent ${t.header}`} />
                    </div>
                  ) : null}

                  <div className={`p-3 border ${t.borderLight} rounded ${t.bgLight}`}>
                    <label className={`block text-sm font-semibold mb-2 ${t.header}`}>Impact sur les compteurs</label>
                    <select value={formAbsence.impact} onChange={e => setFormAbsence({...formAbsence, impact: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent font-bold text-sm ${t.header}`}>
                      <option value="global">🌍 Bilan Annuel Global</option>
                      <option value="local">📍 Compteur Local (Dette / Compensation)</option>
                      {['absence', 'retard'].includes(formAbsence.type) && <option value="neutre">⚪ Neutre (Ignoré)</option>}
                    </select>
                  </div>

                  <div><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Motif / Note</label><input type="text" required={formAbsence.type === 'absence'} value={formAbsence.motif} onChange={e => setFormAbsence({...formAbsence, motif: e.target.value})} placeholder={formAbsence.type === 'heures_supp' ? "Ex: Réunion, Pré-rentrée..." : "Optionnel..."} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent ${t.header}`} /></div>
                  
                  <button type="submit" className={`w-full ${t.btnPrimary} rounded p-2.5 text-sm font-bold shadow transition mt-2`}>Enregistrer pour {formAbsence.agentIds.length} agent(s)</button>
                </form>
              </div>
              
              <div className={`lg:col-span-2 ${t.cardBg} rounded-xl shadow border ${t.borderLight} overflow-hidden flex flex-col`}>
                <div className={`${t.headerBg} ${t.headerText} p-4 font-bold text-sm flex justify-between items-center`}>
                  <span>Historique {filtreAgentAbsence ? `de ${agents.find(a=>a.id===filtreAgentAbsence)?.nom}` : 'complet des événements'}</span>
                  {filtreAgentAbsence && <button onClick={() => setFiltreAgentAbsence(null)} className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors shadow-sm">Afficher tout</button>}
                </div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-sm text-left">
                    <thead className={`${t.bgLight} ${t.header} uppercase text-xs border-b ${t.borderLight}`}><tr><th className="p-3">Date</th>{!filtreAgentAbsence && <th className="p-3">Agent</th>}<th className="p-3">Type</th><th className="p-3 text-center">Durée</th><th className="p-3">Motif</th><th className="p-3 text-center">Statut (Retards)</th><th className="p-3 text-center">Action</th></tr></thead>
                    <tbody className="divide-y divide-black/5 dark:divide-white/5">
                      {absencesFiltrees.map(a => {
                        const ag = agents.find(agent => agent.id === a.agentId); const typeAbs = a.type || 'absence'; 
                        const dureeAbs = getHeuresAbsence(a);
                        return (
                          <tr key={a.id} className={`hover:${t.bgLight} transition-colors`}>
                            <td className="p-3 font-mono text-xs text-gray-500">{a.start.split('T')[0]}</td>
                            {!filtreAgentAbsence && <td className={`p-3 font-bold ${t.header}`}>{ag ? ag.nom : 'Inconnu'}</td>}
                            <td className="p-3 flex items-center gap-1"><span className={`px-2 py-0.5 rounded text-xs font-bold ${typeAbs === 'absence' ? 'bg-red-500/20 text-red-500' : typeAbs === 'retard' ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-600'}`}>{typeAbs.toUpperCase()}</span></td>
                            <td className={`p-3 text-center font-mono font-bold ${t.header}`}>{formatHeureTableau(dureeAbs, true)}</td>
                            <td className="p-3 font-bold text-xs"><span className={`px-2 py-1 rounded bg-black/5 dark:bg-white/5`}>{a.impact === 'global' ? '🌍 Global' : a.impact === 'local' ? '📍 Local' : '⚪ Neutre'}</span></td>
                            <td className="p-3 text-gray-500 italic">{a.motif || ''}</td>
                            <td className="p-3 text-center"><button onClick={() => supprimerAbsence(a.id)} className="text-gray-500 hover:text-red-500 px-2 py-1 rounded text-xs font-bold transition">✖</button></td>
                          </tr>                       
                        );
                      })}
                      {absencesFiltrees.length === 0 && ( <tr><td colSpan={filtreAgentAbsence ? "6" : "7"} className="p-6 text-center text-gray-500 italic">Aucune absence ou retard enregistré{filtreAgentAbsence ? ' pour cet agent' : ''}.</td></tr> )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          );
        })()}

        {/* 6. VUE CALENDRIER ANNUEL AGENT */}
        {vueActive === 'agent' && agentConsulte && (
          <div className={`flex-1 flex flex-col h-full ${t.bgMain} print:h-auto print:bg-white`}>
            <div className={`flex justify-between items-center p-3 ${t.headerBg} border-b ${t.borderLight} no-print shrink-0`}>
              <div className="flex gap-4 items-center">
                <select value={agentConsulte} onChange={(e) => setAgentConsulte(Number(e.target.value))} className={`bg-transparent ${t.headerText} border ${t.borderLight} font-bold p-2 rounded outline-none cursor-pointer`}>
                  {agents.map(a => (
                    <option key={a.id} value={a.id} className="text-black bg-white">
                      {a.nom} ({a.quotite}%)
                    </option>
                  ))}
                </select>
                <span className={`text-sm font-medium ${t.textMenuMuted}`}>Année Scolaire {baseYear}-{baseYear+1}</span>
              </div>
              <div className={`hidden print:block text-xl font-bold ${t.headerText}`}>Bilan Annuel : {agents.find(a=>a.id===agentConsulte)?.nom} ({baseYear}-{baseYear+1})</div>
              <div className={`flex gap-6 ${t.bgLight} p-2 rounded border ${t.borderLight} print:border-none`}>
                
                <div className="flex flex-col items-center">
                  <span className={`text-xs ${t.textMenuMuted} print:text-black`}>H. Contrat</span>
                  <span className={`font-mono font-bold ${t.header}`}>
                    {formatHeureTableau(statsAgents.find(a=>a.id===agentConsulte)?.hContratProratise ?? statsAgents.find(a=>a.id===agentConsulte)?.hContrat, true)}
                  </span>
                </div>
                
                <div className="flex flex-col items-center">
                  <span className={`text-xs ${t.textMenuMuted} print:text-black`}>H. Consommées</span>
                  <span className={`font-mono font-bold opacity-80 ${t.header} print:text-black`}>
                    {formatHeureTableau(statsAgents.find(a=>a.id===agentConsulte)?.heuresConsommees, true)}
                  </span>
                </div>
                
                <div className="flex flex-col items-center">
                  <span className={`text-xs ${t.textMenuMuted} print:text-black`}>Solde Actuel</span>
                  <span className={`font-mono font-bold px-2 rounded print:border print:border-black ${
                    statsAgents.find(a=>a.id===agentConsulte)?.soldeGlobal > 0 
                      ? `bg-green-500/20 ${isDarkMode ? 'text-green-400' : 'text-green-600'} print:text-green-800 print:bg-green-100` 
                      : (statsAgents.find(a=>a.id===agentConsulte)?.soldeGlobal < 0 
                          ? `bg-red-500/20 ${isDarkMode ? 'text-red-400' : 'text-red-600'} print:text-red-800 print:bg-red-100` 
                          : `bg-blue-500/20 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} print:text-blue-800 print:bg-blue-100`)
                  }`}>
                    {statsAgents.find(a=>a.id===agentConsulte)?.soldeGlobal > 0 ? '+' : ''}{formatHeureTableau(statsAgents.find(a=>a.id===agentConsulte)?.soldeGlobal, true)}
                  </span>
                </div>
              
              </div>
            </div>
            <div className={`flex-1 overflow-auto p-4 ${t.bgMain} print:bg-white print:hidden`}>
              <table className="w-full text-center border-collapse text-xs table-fixed min-w-[1200px] shadow-sm">
                <thead>
                  <tr>
                    {anneeScolaire.map((mois, i) => {
                      const daysInMonth = new Date(mois.y, mois.m + 1, 0).getDate();
                      let totalMensuel = 0;
                      
                      for (let jourNum = 1; jourNum <= daysInMonth; jourNum++) {
                        const dateStr = `${mois.y}-${String(mois.m+1).padStart(2,'0')}-${String(jourNum).padStart(2,'0')}`;
                        const exc = exceptions[`${agentConsulte}_${dateStr}`];
                        let hFinal = exc ? exc.h : getHeuresTheoriquesJour(agentConsulte, dateStr);
                        
                        const absDuJour = absences.filter(a => a.agentId === agentConsulte && a.start.startsWith(dateStr));
                        const hDeduct = absDuJour.filter(a => a.deduire).reduce((tot, a) => tot + getHeuresAbsence(a), 0);
                        
                        totalMensuel += Math.max(0, hFinal - hDeduct);
                      }

                      return (
                        <th key={i} className={`border ${t.borderLight} ${t.headerBg} ${t.headerText} py-1.5 uppercase tracking-wider`}>
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <span>{mois.nom}</span>
                            <span className="text-[10px] font-mono bg-black/10 dark:bg-white/10 px-2 py-0.5 rounded shadow-inner tracking-normal opacity-90">
                              {formatHeureTableau(totalMensuel, true)}
                            </span>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(jourNum => (
                    <tr key={jourNum}>
                      {anneeScolaire.map((mois, idx) => {
                        const daysInMonth = new Date(mois.y, mois.m + 1, 0).getDate();
                        if (jourNum > daysInMonth) return <td key={idx} className={`border ${t.borderLight} opacity-20`}></td>;

                        const dateObj = new Date(mois.y, mois.m, jourNum);
                        const dateStr = `${mois.y}-${String(mois.m+1).padStart(2,'0')}-${String(jourNum).padStart(2,'0')}`;
                        
                        const dayOfWeek = dateObj.getDay();
                        const nomJour = nomsJours[dayOfWeek];
                        const infoPeriode = getInfosPeriode(dateObj);

                        const exc = exceptions[`${agentConsulte}_${dateStr}`];
                        
                        let hFinal = exc ? exc.h : getHeuresTheoriquesJour(agentConsulte, dateStr);
                        
                        const absDuJour = absences.filter(a => a.agentId === agentConsulte && a.start.startsWith(dateStr));
                        const hDeduct = absDuJour.filter(a => a.deduire).reduce((tot, a) => tot + getHeuresAbsence(a), 0);
                        hFinal = Math.max(0, hFinal - hDeduct);

                        let noteAffichage = infoPeriode ? infoPeriode.nom : (exc ? exc.note : '');
                        
                        if (hFinal > 0 && infoPeriode && infoPeriode.type === 'vacances') {
                          noteAffichage = exc ? exc.note : '';
                        }

                        if (absDuJour.length > 0) {
                          const txtAbs = absDuJour.map(a => `${a.type.toUpperCase()}${a.deduire?' (-h)':''}`).join(', ');
                          noteAffichage = noteAffichage ? `${noteAffichage} / ${txtAbs}` : txtAbs;
                        }

                        let bgJour = t.cardBg; 
                        if (dayOfWeek === 0) bgJour = t.bgLight; 
                        if (dayOfWeek === 6) bgJour = t.bgMain;  
                        
                        if (infoPeriode) {
                          if (infoPeriode.type === 'ferie') bgJour = `bg-green-500/20 font-bold ${isDarkMode ? 'text-green-400' : 'text-green-600'}`;
                          else bgJour = `${t.bgLight} ${t.header}`; 
                        }

                        if (absDuJour.length > 0) bgJour = `bg-red-500/20 font-bold ${isDarkMode ? 'text-red-400' : 'text-red-600'}`;

                        const isExc = exc || absDuJour.length > 0;
                        const cellBg1 = isExc ? `bg-orange-500/20 ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}` : t.cardBg;
                        const cellBg2 = isExc ? `bg-orange-500/10 font-bold ${isDarkMode ? 'text-orange-400' : 'text-orange-600'}` : `${t.cardBg} ${t.textMenuMuted}`;

                        return (
                          <td key={idx} className={`border ${t.borderLight} p-0 hover:outline hover:outline-2 hover:outline-blue-500 cursor-pointer relative`} onClick={() => gererClicJourAgent(agentConsulte, dateStr, hFinal, noteAffichage)}>
                            <div className="flex h-6 items-stretch">
                              <div className={`w-8 flex-shrink-0 flex items-center justify-center border-r ${t.borderLight} text-[10px] ${bgJour}`}>
                                <span className="rotate-[-90deg] mr-1 text-[8px] opacity-70">{nomJour[0]}</span>{jourNum}
                              </div>
                              <div className={`w-10 flex-shrink-0 flex items-center justify-center font-bold font-mono border-r ${t.borderLight} ${cellBg1}`}>
                                {formatHeureTableau(hFinal)}
                              </div>
                              <div className={`flex-1 flex items-center px-1 truncate text-[10px] ${cellBg2}`}>
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

            <div className="hidden print:block w-full">
              <PrintAgentYearlyView agent={agents.find(a=>a.id===agentConsulte)} baseYear={baseYear} anneeScolaire={anneeScolaire} getMondayStr={getMondayStr} getInfosPeriode={getInfosPeriode} exceptions={exceptions} formatHeureTableau={formatHeureTableau} absences={absences} getHeuresTheoriquesJour={getHeuresTheoriquesJour} getHeuresAbsence={getHeuresAbsence} />
            </div>
          </div>
        )}
      </div>

      {/* TOASTS ET BUBBLES */}
      {showUndoToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border border-gray-700 animate-in slide-in-from-bottom duration-150 no-print">
          <span className="text-base">↩️</span>
          <div className="text-sm font-bold">Action annulée (Ctrl+Z)</div>
        </div>
      )}
      {showRedoToast && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border border-gray-700 animate-in slide-in-from-bottom duration-150 no-print">
          <span className="text-base">↪️</span>
          <div className="text-sm font-bold">Action rétablie (Ctrl+Y)</div>
        </div>
      )}
      {copiedEvents.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border border-gray-700 animate-in slide-in-from-bottom duration-150 no-print cursor-pointer" onClick={() => setCopiedEvents([])}>
          <span className="text-base">📋</span>
          <div className="text-xs">
            <strong>{copiedEvents.length} créneau(x) en mémoire</strong> — <em>Cliquez sur le planning pour coller l'ensemble</em>
          </div>
          <button onClick={(e) => { e.stopPropagation(); setCopiedEvents([]); }} className="ml-2 text-xs bg-white/20 hover:bg-white/30 rounded-full px-2 py-0.5 font-bold cursor-pointer" title="Vider le presse-papier">Échap ✖</button>
        </div>
      )}
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
            --fc-button-bg-color: var(--c-prim) !important;
            --fc-button-border-color: var(--c-prim) !important;
            --fc-button-hover-bg-color: var(--c-prim) !important;
            --fc-button-hover-border-color: var(--c-prim) !important;
            --fc-button-active-bg-color: var(--c-prim) !important;
            --fc-button-active-border-color: var(--c-prim) !important;
          }
          .fc .fc-button-primary { color: ${getContrastYIQ(customColors.primary)} !important; }
          .fc .fc-button-primary .fc-icon { color: ${getContrastYIQ(customColors.primary)} !important; }
          .custom-sidebar { background-color: var(--c-prim) !important; color: ${getContrastYIQ(customColors.primary)} !important; }
          .custom-btn { background-color: var(--c-acc) !important; color: ${getContrastYIQ(customColors.accent)} !important; }
          .custom-sidebar .custom-text-primary,
          .custom-sidebar .custom-text-primary-muted { color: ${getContrastYIQ(customColors.primary)} !important; }
          .custom-sidebar .custom-text-primary-muted { opacity: 0.7; }
          .custom-text-accent { color: color-mix(in srgb, var(--c-acc) 70%, ${isDarkMode ? 'white' : 'black'}) !important; }
          .custom-text-primary { color: color-mix(in srgb, var(--c-prim) 50%, ${isDarkMode ? 'white' : 'black'}) !important; }
          .custom-text-primary-muted { color: color-mix(in srgb, var(--c-prim) 30%, ${isDarkMode ? '#9ca3af' : '#6b7280'}) !important; }
          .custom-bg-main { background-color: rgba(var(--c-prim-rgb), 0.05) !important; }
          .custom-bg-light { background-color: rgba(var(--c-prim-rgb), 0.15) !important; }
          .custom-border { border-color: rgba(var(--c-prim-rgb), 0.2) !important; }
          .custom-card { background-color: ${isDarkMode ? '#1f2937' : '#ffffff'} !important; }
          .custom-sidebar-dark { background-color: rgba(var(--c-prim-rgb), 0.15) !important; }
          .custom-border-dark { border-color: rgba(var(--c-prim-rgb), 0.2) !important; }
        ` : ''}

        .fc-event-main { pointer-events: auto !important; }
        .fc-timegrid-event-harness { pointer-events: auto !important; }
        .fc-timegrid-event { background: transparent !important; border: none !important; box-shadow: none !important; overflow: visible !important; }

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
          body, html, #root { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .h-screen { height: auto !important; min-height: 0 !important; }
          .w-screen { width: auto !important; min-width: 0 !important; }
          .pb-4 { padding-bottom: 0 !important; }
          .px-4 { padding-left: 0 !important; padding-right: 0 !important; }
          .no-print, .w-80, .md\\:hidden { display: none !important; }
          #print-area { position: absolute !important; left: 0; top: 0; width: 100% !important; height: auto !important; margin: 0 !important; padding: 0 !important; display: block !important; background: white !important; z-index: 9999; }
          .print-weekly-page { 
            width: 100%; 
            height: 196mm !important; 
            max-height: 196mm !important; 
            overflow: hidden !important; 
            box-sizing: border-box; 
            page-break-after: avoid !important;
            page-break-inside: avoid !important; 
          }          
          .print-agent-page { width: 100%; height: 185mm !important; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; page-break-after: always; break-after: page; }
          .print-agent-page:last-child { page-break-after: auto; break-after: auto; }
          .print-dashboard-table { transform: scale(0.85); transform-origin: top left; width: 115% !important; border:none; box-shadow:none; }
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