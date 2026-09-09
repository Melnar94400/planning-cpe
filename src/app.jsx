import React, { useState, useEffect, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// --- IMPORTS EXTERNES ---
import { 
  THEMES, hexToRgb, getContrastYIQ, 
  formatHeureTableau, parseHeureSaisie, extractTimeStr, getMondayStr,
  resetAllData, exporterDonnees, importerDonnees,
  generateGrid, calculerContratBetty, formatHeureMinutes,
  detecterChevauchements
} from './utils';
import { SetupWizard } from './SetupWizard';
import { PrintTimeGridView, PrintDailyView, PrintAgentYearlyView } from './PrintViews';
import { TimelineTrack, TimelineEvent } from './TimelineComponents';

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
  const [jourTemplate, setJourTemplate] = useState(1); 
  const [periodesFeriees, setPeriodesFeriees] = useState(() => {
    const s = localStorage.getItem('edt-periodes');
    if (!s) return [];
    return JSON.parse(s).map(p => ({
      ...p,
      type: p.type || (p.nom.toLowerCase().includes('vacance') ? 'vacances' : 'ferie')
    }));
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const [modalPoste, setModalPoste] = useState({
    isOpen: false, id: null, nom: '', couleur: '#8B5CF6', qte: 1, slots: []
  });

  const ouvrirCreationPoste = () => {
    setModalPoste({
      isOpen: true, id: null, nom: '', couleur: '#8B5CF6', qte: 1, 
      slots: [{ id: Date.now(), start: '08:00', end: '12:00', days: { 1: true, 2: true, 3: true, 4: true, 5: true } }]
    });
  };

  const ouvrirEditionPoste = (poste) => {
    const defaultSlots = poste.slots && poste.slots.length > 0 ? poste.slots : [{ id: Date.now(), start: '08:00', end: '12:00', days: { 1: true, 2: true, 3: true, 4: true, 5: true } }];
    setModalPoste({
      isOpen: true, id: poste.id, nom: poste.nom, couleur: poste.couleur || '#8B5CF6', qte: poste.qte || 1, slots: defaultSlots
    });
  };

  const generateBesoinsFromSlots = (posteId, posteNom, qte, slots) => {
    const baseMonday = new Date(getMondayStr(currentTemplate?.dateDebut || new Date()));
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

    if (modalPoste.id) {
      setPostes(postes.map(p => p.id === modalPoste.id ? updatedPoste : p));
      const filteredBesoins = currentTemplate.besoins.filter(b => b.extendedProps?.posteId !== posteId);
      const generatedBesoins = generateBesoinsFromSlots(posteId, updatedPoste.nom, updatedPoste.qte, updatedPoste.slots);
      updateCurrentTemplate(null, [...filteredBesoins, ...generatedBesoins]);

      const updatedEvents = currentTemplate.events.map(evt => evt.extendedProps?.posteId === posteId ? {
        ...evt, extendedProps: { ...evt.extendedProps, posteNom: updatedPoste.nom, posteCouleur: updatedPoste.couleur }
      } : evt);
      updateCurrentTemplate(updatedEvents, null);
    } else {
      setPostes([...postes, updatedPoste]);
      const generatedBesoins = generateBesoinsFromSlots(posteId, updatedPoste.nom, updatedPoste.qte, updatedPoste.slots);
      updateCurrentTemplate(null, [...currentTemplate.besoins, ...generatedBesoins]);
    }
    setModalPoste({ isOpen: false, id: null, nom: '', couleur: '#8B5CF6', qte: 1, slots: [] });
  };

  const supprimerPoste = (id, e) => { e.stopPropagation(); setPostes(postes.filter(p => p.id !== id)); };

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

  const [amplitude, setAmplitude] = useState(() => {
    const s = localStorage.getItem('edt-amplitude');
    return s ? JSON.parse(s) : { start: '07:30', end: '18:00' };
  });

  const [sonneries, setSonneries] = useState(() => {
    const s = localStorage.getItem('edt-sonneries');
    return s ? JSON.parse(s) : ['08:00', '08:55', '10:05', '11:00', '11:55', '12:50', '13:45', '14:40', '15:50', '16:45', '17:40'];
  });
  const [sonneriesText, setSonneriesText] = useState(() => sonneries.join(', '));
  
  // Tableau statique des sonneries en minutes (pour le magnétisme)
  const sonneriesMins = useMemo(() => sonneries.map(s => {
    const [h, m] = s.split(':').map(Number);
    return h * 60 + m;
  }), [sonneries]);

  const [absences, setAbsences] = useState(() => {
    const s = localStorage.getItem('edt-absences-retards');
    if (!s) return [];
    const parsed = JSON.parse(s);
    return parsed.map(a => {
      let type = a.type || 'absence';
      if (type === 'recup' || type === 'rattrapage') type = 'heures_supp';
      
      let impact = a.impact;
      if (!impact) {
        if (a.rattrape || type === 'heures_supp') impact = 'local';
        else if (a.deduire) impact = 'local';
        else impact = 'global';
      }

      if (a.start && a.end) return { ...a, type, impact };
      
      const h = a.heures || Math.floor(a.dureeTotale || a.duree || 0);
      const m = a.minutes || Math.round(((a.dureeTotale || a.duree || 0) - h) * 60);
      const startD = new Date(`${a.date}T08:00:00`);
      const endD = new Date(startD);
      endD.setHours(startD.getHours() + h, startD.getMinutes() + m);
      const pad = n => String(n).padStart(2, '0');
      const formatLocal = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
      
      return { id: a.id || String(Date.now() + Math.random()), agentId: a.agentId, type, start: formatLocal(startD), end: formatLocal(endD), motif: a.motif || '', impact, journeeComplete: a.journeeComplete };
    });
  });

  const historyRef = useRef([]);
  const redoRef = useRef([]); 
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [showRedoToast, setShowRedoToast] = useState(false);

  const sauvegarderEtatPrecedent = (snapshot = null) => {
    const stateToSave = snapshot || {
      templateVersions: JSON.parse(JSON.stringify(templateVersions)),
      customWeeks: JSON.parse(JSON.stringify(customWeeks)),
      absences: JSON.parse(JSON.stringify(absences))
    };
    historyRef.current = [...historyRef.current, stateToSave].slice(-30); 
    redoRef.current = []; 
  };

  const annulerAction = () => {
    if (historyRef.current.length === 0) return;
    const currentState = {
      templateVersions: JSON.parse(JSON.stringify(templateVersions)),
      customWeeks: JSON.parse(JSON.stringify(customWeeks)),
      absences: JSON.parse(JSON.stringify(absences))
    };
    redoRef.current = [...redoRef.current, currentState].slice(-30);

    const lastState = historyRef.current.pop();
    setTemplateVersions(lastState.templateVersions);
    setCustomWeeks(lastState.customWeeks);
    setAbsences(lastState.absences);
    setShowUndoToast(true); setTimeout(() => setShowUndoToast(false), 2000);
  };

  const refaireAction = () => {
    if (redoRef.current.length === 0) return;
    const currentState = {
      templateVersions: JSON.parse(JSON.stringify(templateVersions)),
      customWeeks: JSON.parse(JSON.stringify(customWeeks)),
      absences: JSON.parse(JSON.stringify(absences))
    };
    historyRef.current = [...historyRef.current, currentState].slice(-30);

    const nextState = redoRef.current.pop();
    setTemplateVersions(nextState.templateVersions);
    setCustomWeeks(nextState.customWeeks);
    setAbsences(nextState.absences);
    setShowRedoToast(true); setTimeout(() => setShowRedoToast(false), 2000);
  };

  const [modalCreation, setModalCreation] = useState({ isOpen: false, eventId: null, start: null, end: null });
  const [formTypeEvent, setFormTypeEvent] = useState('affectation'); 
  const [formTypeAbsence, setFormTypeAbsence] = useState('absence'); 
  const [formAbsImpact, setFormAbsImpact] = useState('local');
  const [formAgent, setFormAgent] = useState('');
  const [formPoste, setFormPoste] = useState('');
  const [formNote, setFormNote] = useState('');

  const [modalNewVersion, setModalNewVersion] = useState({ isOpen: false, dateDebut: '', nom: 'Évolution' });
  const [modalException, setModalException] = useState({ isOpen: false, agentId: null, dateStr: null, h: '0h00', note: '' });

  const [formAbsence, setFormAbsence] = useState({
    agentId: '', type: 'retard',  journeeComplete: false, dateDebut: new Date().toISOString().split('T')[0],
    dateFin: '', dureeSaisie: '', impact: 'local', motif: ''
  });

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

  const [modeEdition, setModeEdition] = useState('agents'); 
  const [formBesoinQte, setFormBesoinQte] = useState(1);
  const [agentActif, setAgentActif] = useState(null);
  const [posteActif, setPosteActif] = useState(null);
  
  const [currentViewMonday, setCurrentViewMonday] = useState(() => getMondayStr(templateVersions[0]?.dateDebut || new Date())); 
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const isInitialMount = useRef(true);
  const [needsBackup, setNeedsBackup] = useState(false);
  const [copiedEvent, setCopiedEvent] = useState(null);

  const getSchoolYearBase = () => {
     if (templateVersions.length > 0 && templateVersions[0].dateDebut) {
        const d = new Date(templateVersions[0].dateDebut);
        return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
     }
     const now = new Date(); return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  };
  const baseYear = getSchoolYearBase();
  const nomsJours = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

  const currentTemplate = templateVersions.find(v => v.id === activeTemplateId) || templateVersions[0]; 

  const gabarits = useMemo(() => {
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
  }, [templateVersions, agents]);

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
          
          const hDeductGlobal = absDuJour.filter(a => ['absence', 'retard'].includes(a.type) && a.impact === 'global')
                                         .reduce((tot, a) => tot + getHeuresAbsence(a), 0);
          
          const hSuppGlobal = absDuJour.filter(a => a.type === 'heures_supp' && a.impact === 'global')
                                       .reduce((tot, a) => tot + getHeuresAbsence(a), 0);

          heuresConsommees += Math.max(0, hJour - hDeductGlobal) + hSuppGlobal;
        }
      }
      
      const soldeGlobal = Math.round((agent.hContrat - heuresConsommees) * 60) / 60;
      const applicableTemplate = templateVersions.find(tv => tv.id === activeTemplateId) || templateVersions[0];
      const hHebdoType = gabarits[applicableTemplate?.id]?.[agent.id]?.totalHebdo || 0;

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
    }),
...absences.map(a => ({
      id: `abs_${a.id}`,
      start: a.start,
      end: a.end,
      title: `${a.type === 'absence' ? '🚫 ABS' : a.type === 'retard' ? '⏰ RET' : a.type === 'recup' ? '🔵 RECUP' : '🟢 SUPP'} - ${agents.find(ag=>ag.id===a.agentId)?.nom}`,
      backgroundColor: a.type === 'absence' ? '#EF4444' : a.type === 'retard' ? '#F59E0B' : a.type === 'recup' ? '#3B82F6' : '#10B981',
      borderColor: a.type === 'absence' ? '#DC2626' : a.type === 'retard' ? '#D97706' : a.type === 'recup' ? '#2563EB' : '#059669',
      extendedProps: {
        isAbsence: true, agentId: a.agentId, typeAbsence: a.type, motif: a.motif, deduire: a.deduire, rattrape: a.rattrape
      }
    })).filter(e => {
      if (printFilter.type === 'agent' && e.extendedProps.agentId !== printFilter.id) return false;
      return true;
    })
  ];

const activeAlerts = useMemo(() => {
    const alerts = [];
    const nomsJoursAlert = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM']; 
    
    const targetMon = currentViewMonday || getMondayStr(currentTemplate?.dateDebut || new Date());
    const realEvts = customWeeks[targetMon] ? customWeeks[targetMon] : (
      [...templateVersions].sort((a,b)=>b.dateDebut.localeCompare(a.dateDebut)).find(t => t.dateDebut <= targetMon || true)?.events.map(e => shiftEventToWeek(e, targetMon)) || []
    );
    const applicableT = [...templateVersions].sort((a,b)=>b.dateDebut.localeCompare(a.dateDebut)).find(t => t.dateDebut <= targetMon) || templateVersions[0];
    const besoins = (applicableT?.besoins || []).map(b => shiftEventToWeek(b, targetMon));

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
  }, [agents, currentTemplate, currentViewMonday, customWeeks, absences, templateVersions]);

useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && copiedEvent) {
        setCopiedEvent(null);
      }
      if (e.ctrlKey || e.metaKey) {
        const key = e.key.toLowerCase();
        if (key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            refaireAction();
          } else {
            annulerAction();
          }
        } else if (key === 'y') {
          e.preventDefault();
          refaireAction();
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copiedEvent, templateVersions, customWeeks, absences]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event('resize'));
    }, 100);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => { localStorage.setItem('edt-agents', JSON.stringify(agents)); }, [agents]);
  useEffect(() => { localStorage.setItem('edt-postes', JSON.stringify(postes)); }, [postes]);
  useEffect(() => { localStorage.setItem('edt-periodes', JSON.stringify(periodesFeriees)); }, [periodesFeriees]);
  useEffect(() => { localStorage.setItem('edt-template-versions', JSON.stringify(templateVersions)); }, [templateVersions]);
  useEffect(() => { localStorage.setItem('edt-custom-weeks', JSON.stringify(customWeeks)); }, [customWeeks]);
  useEffect(() => { localStorage.setItem('edt-exceptions', JSON.stringify(exceptions)); }, [exceptions]);
  useEffect(() => { localStorage.setItem('edt-absences-retards', JSON.stringify(absences)); }, [absences]);
  useEffect(() => { localStorage.setItem('edt-dotation', dotation.toString()); }, [dotation]);
  useEffect(() => { localStorage.setItem('edt-amplitude', JSON.stringify(amplitude)); }, [amplitude]);
useEffect(() => { 
    if (vueActive === 'planning') setModeEdition('agents');
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.dispatchEvent(new Event('resize'));
      }, 100);
    });
  }, [vueActive]);

  const handleExport = () => { exporterDonnees(); setNeedsBackup(false); };

  const handleSonneriesBlur = () => {
    const arr = sonneriesText.split(',')
      .map(s => s.trim().replace('h', ':'))
      .filter(s => /^\d{1,2}:\d{2}$/.test(s))
      .map(s => { let [h, m] = s.split(':'); return `${h.padStart(2,'0')}:${m.padStart(2,'0')}`; })
      .sort();
    if(arr.length === 0) arr.push('08:00');
    setSonneries(arr); setSonneriesText(arr.join(', '));
    localStorage.setItem('edt-sonneries', JSON.stringify(arr));
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

  const renderSlotLabel = (arg) => {
    const h = String(arg.date.getHours()).padStart(2,'0');
    const m = String(arg.date.getMinutes()).padStart(2,'0');
    const timeStr = `${h}:${m}`;
    const isFullHour = m === '00';
    const isSonnerie = sonneries.includes(timeStr);

    if (isFullHour || isSonnerie) {
      const isDarkTheme = t.isDark;
      const bgColor = isDarkTheme ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';
      const textColor = isDarkTheme ? '#ffffff' : '#111827';
      const borderColor = isDarkTheme ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)';
      return { html: `<div class="font-black text-xs px-2 py-1 rounded mx-auto shadow-xs" style="background-color: ${bgColor}; color: ${textColor}; border: 1px solid ${borderColor};">${timeStr}</div>` };
    }
    return { html: '' };
  };

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
    setPrintFilter({ type: 'all', id: null }); 
    setIsPrinting(true); 
    setTimeout(() => { 
      window.print(); 
      setIsPrinting(false); 
    }, 800);
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

      if (!formAbsence.journeeComplete || ['retard', 'heures_supp'].includes(formAbsence.type)) {
        const dureeDecimal = parseHeureSaisie(formAbsence.dureeSaisie || '0');
        if (dureeDecimal <= 0) return alert("Indiquez une durée valide (ex: 0h45).");
        
        const pad = n => String(n).padStart(2, '0');
        const startT = new Date(`${dateStr}T08:00:00`);
        const endT = new Date(startT.getTime() + dureeDecimal * 3600000);
        startStr = `${dateStr}T08:00:00`;
        endStr = `${dateStr}T${pad(endT.getHours())}:${pad(endT.getMinutes())}:00`;
      }

      newAbs.push({
        id: String(Date.now() + Math.random()),
        agentId, type: formAbsence.type, start: startStr, end: endStr,
        motif: formAbsence.motif, impact: formAbsence.impact, 
        journeeComplete: formAbsence.journeeComplete && formAbsence.type === 'absence'
      });
    });

    setAbsences(newAbs);
    alert("Opération enregistrée !");
    setFormAbsence({ agentId: '', type: 'retard', journeeComplete: false, dateDebut: new Date().toISOString().split('T')[0], dateFin: '', dureeSaisie: '', impact: 'local', motif: '' });
  };
  
  const supprimerAbsence = (id) => {
    if (confirm("Supprimer cet enregistrement et restituer le planning de l'agent ?")) {
      sauvegarderEtatPrecedent();
      setAbsences(absences.filter(a => String(a.id) !== String(id).replace('abs_','')));
    }
  };

  const bilanAbsences = agents.map(ag => {
    const agAbs = absences.filter(a => a.agentId === ag.id);
    const abs = agAbs.filter(a => a.type === 'absence');
    const ret = agAbs.filter(a => a.type === 'retard');
    const supp = agAbs.filter(a => a.type === 'heures_supp');
    
    const hAbs = abs.reduce((sum, a) => sum + getHeuresAbsence(a), 0);
    const hRet = ret.reduce((sum, a) => sum + getHeuresAbsence(a), 0);
    const hSupp = supp.reduce((sum, a) => sum + getHeuresAbsence(a), 0);
    
    // Uniquement l'impact LOCAL pour la page Absences
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


  // --- GESTION CENTRALISÉE DE LA SOURIS (DRAG & DROP, LASSO, RESIZE) ---
  const updateEventTime = (evt, newStartMins, newEndMins, targetDateStr, viewName, isBesoins) => {
      const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
      const newStartISO = `${targetDateStr}T${formatTime(newStartMins)}:00`;
      const newEndISO = `${targetDateStr}T${formatTime(newEndMins)}:00`;

      sauvegarderEtatPrecedent();

      if (viewName === 'template' && isBesoins) {
          const cleanId = String(evt.id).split('_')[0];
          const newBesoins = currentTemplate.besoins.map(b => String(b.id).split('_')[0] === cleanId ? { ...b, start: newStartISO, end: newEndISO } : b);
          updateCurrentTemplate(null, newBesoins);
      } else if (viewName !== 'template' && evt.extendedProps?.isAbsence) {
          const cleanId = String(evt.id).replace('abs_', '').split('_')[0];
          setAbsences(absences.map(a => String(a.id) === cleanId ? { ...a, start: newStartISO, end: newEndISO } : a));
      } else {
          applyAction('update', { id: evt.id, start: newStartISO, end: newEndISO });
      }
  };

  const handleTrackMouseDown = (e, targetDateStr, viewName, isBesoins, rowId) => {
      if (e.target.closest('.event-item')) return;
      if (e.button !== 0 || e.ctrlKey || e.metaKey) return;
      if (viewName === 'template' && currentTemplate.statut === 'valide') return;
      
      e.preventDefault();
      const track = e.currentTarget;
      const rect = track.getBoundingClientRect();
      const startX = e.clientX;

      if (copiedEvent) {
           const startPercent = Math.max(0, Math.min(1, (startX - rect.left) / rect.width));
           const startMins = Math.round((limitesHeures.baseMins + (startPercent * limitesHeures.span)) / 5) * 5;
           const duration = copiedEvent.durationMins || 60;
           const endMins = Math.min(startMins + duration, limitesHeures.baseMins + limitesHeures.span);
           const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
           
           sauvegarderEtatPrecedent();
           const newStartISO = `${targetDateStr}T${formatTime(startMins)}:00`;
           const newEndISO = `${targetDateStr}T${formatTime(endMins)}:00`;

           if (viewName === 'template' && isBesoins && copiedEvent.extendedProps?.isBesoin) {
              const posteNom = postes.find(p=>p.id===rowId)?.nom;
              updateCurrentTemplate(null, [...currentTemplate.besoins, { 
                id: String(Date.now() + Math.random()), start: newStartISO, end: newEndISO, 
                extendedProps: { ...copiedEvent.extendedProps, posteId: rowId, posteNom, qte: formBesoinQte } 
              }]);
           } else if (!isBesoins && !copiedEvent.extendedProps?.isBesoin) {
              const agentNom = agents.find(a=>a.id===rowId)?.nom;
              applyAction('add', { 
                id: String(Date.now() + Math.random()), start: newStartISO, end: newEndISO,
                title: `${copiedEvent.extendedProps?.posteNom} - ${agentNom}`,
                backgroundColor: copiedEvent.backgroundColor, borderColor: copiedEvent.borderColor,
                extendedProps: { ...copiedEvent.extendedProps, agentId: rowId, agentNom }
              });
           }
           return;
      }

      const startPercent = Math.max(0, Math.min(1, (startX - rect.left) / rect.width));
      const startMins = Math.round((limitesHeures.baseMins + (startPercent * limitesHeures.span)) / 5) * 5;
      let currentEndMins = Math.min(startMins + 60, limitesHeures.baseMins + limitesHeures.span);
      let hasMoved = false;

      const ghostEl = document.createElement('div');
      ghostEl.className = `absolute top-1 bottom-1 rounded border-2 border-dashed z-30 pointer-events-none flex items-center justify-center text-[10px] font-bold shadow-md ${isBesoins ? 'bg-red-500/40 border-red-600 text-red-950 dark:text-red-100' : 'bg-blue-500/40 border-blue-600 text-blue-950 dark:text-blue-100'}`;
      track.appendChild(ghostEl);

      const updateGhost = (m1, m2) => {
          const minM = Math.min(m1, m2);
          const maxM = Math.max(m1, m2);
          const l = Math.max(0, ((minM - limitesHeures.baseMins) / limitesHeures.span) * 100);
          const w = Math.min(100 - l, ((maxM - minM) / limitesHeures.span) * 100);
          ghostEl.style.left = `${l}%`;
          ghostEl.style.width = `${w}%`;
          const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
          ghostEl.textContent = `${formatTime(minM)} - ${formatTime(maxM)}`;
      };
      updateGhost(startMins, currentEndMins);

      const onMouseMove = (moveEvent) => {
          if (Math.abs(moveEvent.clientX - startX) > 4) hasMoved = true;
          const movePercent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
          currentEndMins = Math.round((limitesHeures.baseMins + (movePercent * limitesHeures.span)) / 5) * 5;
          updateGhost(startMins, currentEndMins);
      };

      const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          ghostEl.remove();
          
          const finalStart = Math.min(startMins, currentEndMins);
          const finalEnd = Math.max(startMins, currentEndMins);
          const actualEnd = hasMoved ? finalEnd : (finalStart + 60);

          if (actualEnd - finalStart >= 5) {
              const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
              if (viewName === 'template' && isBesoins) {
                   const posteNom = postes.find(p => p.id === rowId)?.nom;
                   updateCurrentTemplate(null, [...currentTemplate.besoins, { 
                      id: String(Date.now()), start: `${targetDateStr}T${formatTime(finalStart)}:00`, end: `${targetDateStr}T${formatTime(actualEnd)}:00`, 
                      extendedProps: { posteId: rowId, posteNom, qte: formBesoinQte } 
                   }]);
              } else {
                   setFormTypeEvent('affectation');
                   setFormTypeAbsence('absence');
                   setFormAbsImpact('local');
                   setFormAgent(rowId);
                   setFormPoste(posteActif || (postes[0] ? postes[0].id : ''));
                   setFormNote('');
                   setModalCreation({ isOpen: true, eventId: null, date: targetDateStr, start: formatTime(finalStart), end: formatTime(actualEnd) });
              }
          }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
  };

  const handleEventMouseDown = (e, evt, startMins, endMins, targetDateStr, viewName, isBesoins) => {
      if (e.button !== 0 || (viewName === 'template' && currentTemplate.statut === 'valide')) return;
      e.stopPropagation();
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
          setCopiedEvent({ 
              title: evt.title || evt.extendedProps?.posteNom || 'Poste', 
              backgroundColor: e.currentTarget.style.backgroundColor, 
              borderColor: e.currentTarget.style.borderColor, 
              extendedProps: { ...evt.extendedProps }, 
              durationMins: endMins - startMins 
          });
          return;
      }

      const track = e.currentTarget.parentElement;
      const eventEl = e.currentTarget;
      const rect = track.getBoundingClientRect();
      const startX = e.clientX;
      let isDragging = false;
      
      const initialLeft = eventEl.style.left;
      let finalStartMins = startMins;
      let finalEndMins = endMins;
      const durationMins = endMins - startMins;

      const onMouseMove = (moveEvent) => {
          if (!isDragging && Math.abs(moveEvent.clientX - startX) > 4) {
              isDragging = true;
              eventEl.style.zIndex = '9999';
              eventEl.style.opacity = '0.8';
              eventEl.style.pointerEvents = 'none';
          }
          if (!isDragging) return;

          const deltaMins = Math.round(((moveEvent.clientX - startX) / rect.width * limitesHeures.span) / 5) * 5;
          let newStart = startMins + deltaMins;
          let newEnd = newStart + durationMins;
          
          if (newStart < limitesHeures.baseMins) {
              newStart = limitesHeures.baseMins;
              newEnd = newStart + durationMins;
          }
          if (newEnd > limitesHeures.baseMins + limitesHeures.span) {
              newEnd = limitesHeures.baseMins + limitesHeures.span;
              newStart = newEnd - durationMins;
          }

          finalStartMins = newStart;
          finalEndMins = newEnd;

          const l = Math.max(0, ((newStart - limitesHeures.baseMins) / limitesHeures.span) * 100);
          eventEl.style.left = `${l}%`;
      };

      const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          
          if (isDragging) {
              eventEl.style.zIndex = '';
              eventEl.style.opacity = '';
              eventEl.style.pointerEvents = '';
              eventEl.style.left = initialLeft;
              
              if (finalStartMins !== startMins) {
                  updateEventTime(evt, finalStartMins, finalEndMins, targetDateStr, viewName, isBesoins);
              }
          } else {
              if (evt.extendedProps?.isBesoin) ouvrirEditionBesoin(evt); else ouvrirEdition(evt);
          }
      };

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
  };

  const handleResizeMouseDown = (e, evt, startMins, endMins, targetDateStr, viewName, isBesoins, isStartHandle) => {
      if (e.button !== 0 || (viewName === 'template' && currentTemplate.statut === 'valide')) return;
      e.stopPropagation(); e.preventDefault();
      const track = e.currentTarget.parentElement.parentElement;
      const eventEl = e.currentTarget.parentElement;
      const rect = track.getBoundingClientRect();
      const startX = e.clientX;
      let isResizing = false;
      
      let finalStartMins = startMins;
      let finalEndMins = endMins;
      
      const initialLeft = eventEl.style.left;
      const initialWidth = eventEl.style.width;

      const onMouseMove = (moveEvent) => {
          if (!isResizing && Math.abs(moveEvent.clientX - startX) > 4) {
              isResizing = true;
              eventEl.style.zIndex = '9999';
              eventEl.style.opacity = '0.8';
              eventEl.style.pointerEvents = 'none';
          }
          if (!isResizing) return;

          const deltaMins = Math.round(((moveEvent.clientX - startX) / rect.width * limitesHeures.span) / 5) * 5;
          
          if (isStartHandle) {
              let newStart = startMins + deltaMins;
              newStart = Math.max(limitesHeures.baseMins, Math.min(newStart, endMins - 5));
              finalStartMins = newStart;
              
              const l = Math.max(0, ((newStart - limitesHeures.baseMins) / limitesHeures.span) * 100);
              const w = Math.min(100 - l, ((endMins - newStart) / limitesHeures.span) * 100);
              eventEl.style.left = `${l}%`;
              eventEl.style.width = `${w}%`;
          } else {
              let newEnd = endMins + deltaMins;
              newEnd = Math.max(startMins + 5, Math.min(newEnd, limitesHeures.baseMins + limitesHeures.span));
              finalEndMins = newEnd;

              const l = Math.max(0, ((startMins - limitesHeures.baseMins) / limitesHeures.span) * 100);
              const w = Math.min(100 - l, ((newEnd - startMins) / limitesHeures.span) * 100);
              eventEl.style.left = `${l}%`;
              eventEl.style.width = `${w}%`;
          }
      };

      const onMouseUp = () => {
          document.removeEventListener('mousemove', onMouseMove);
          document.removeEventListener('mouseup', onMouseUp);
          if (isResizing) {
              eventEl.style.zIndex = '';
              eventEl.style.opacity = '';
              eventEl.style.pointerEvents = '';
              eventEl.style.left = initialLeft;
              eventEl.style.width = initialWidth;

              if (finalStartMins !== startMins || finalEndMins !== endMins) {
                  updateEventTime(evt, finalStartMins, finalEndMins, targetDateStr, viewName, isBesoins);
              }
          }
      };
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
  };

  return (
    <>
{/* 1. VUE QUOTIDIENNE */}
{vueActive === 'journee' && (() => {
  const { gridLines, gridLabelsDaily } = generateGrid(limitesHeures, sonneries, amplitude);
  return (
    <div className={`flex-1 flex flex-col ${t.bgMain} h-full overflow-hidden`}>
      <div className="p-4 pb-2 no-print shrink-0">
        <div className="flex justify-between items-center mb-2">
          <h2 className={`text-lg font-bold ${t.header} flex items-center gap-2`}>⏱️ Vue Quotidienne</h2>
          <div className="flex items-center gap-3">
            <button onClick={() => changeJourQuotidien(-1)} className={`px-3 py-1 rounded text-sm font-bold ${t.cardBg} ${t.header} border ${t.borderLight} hover:opacity-75 shadow-sm transition-colors`}>◀ Jour Précédent</button>
            <input type="date" value={jourConsulte} onChange={(e) => setJourConsulte(e.target.value)} className={`border ${t.borderLight} rounded p-1.5 text-sm font-bold ${t.cardBg} ${t.header} outline-none shadow-sm`} />
            <button onClick={() => changeJourQuotidien(1)} className={`px-3 py-1 rounded text-sm font-bold ${t.cardBg} ${t.header} border ${t.borderLight} hover:opacity-75 shadow-sm transition-colors`}>Jour Suivant ▶</button>
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

<div className="flex-1 overflow-x-auto overflow-y-auto flex flex-col min-h-0">                      <div className="min-w-[800px] flex-1 flex flex-col relative">
                <div className={`flex border-b ${t.borderLight} ${t.bgLight} shrink-0 ml-32 relative h-8 items-center`}>
                  {gridLabelsDaily.map(lbl => (
                    <div key={lbl.timeStr} className={`absolute text-[11px] font-black ${t.header}`} style={{ left: `${lbl.topPercent}%`, transform: 'translateX(-50%)' }}>
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

                  {agents.map(agent => {
                    const mondayStr = getMondayStr(jourConsulte);
                    const allEvents = getEventsForWeek(mondayStr);
                    const eventsDuJour = allEvents.filter(e => e.extendedProps?.agentId === agent.id && e.start.startsWith(jourConsulte));

                    const totalMinsJour = eventsDuJour.reduce((acc, evt) => {
                      return acc + (new Date(evt.end) - new Date(evt.start)) / 60000;
                    }, 0);
                    const heuresJourStr = formatHeureTableau(totalMinsJour / 60, true);

                    const allLineSnapPoints = [...sonneriesMins, ...eventsDuJour.flatMap(e => {
                        const s = new Date(e.start), ed = new Date(e.end);
                        return [s.getHours() * 60 + s.getMinutes(), ed.getHours() * 60 + ed.getMinutes()];
                    })];

                    return (
<div key={agent.id} className={`flex border-b ${t.borderLight} flex-1 relative group hover:bg-black/5 transition-colors min-h-[60px] hover:z-50`}>
                        <div className={`w-32 shrink-0 flex flex-col items-end justify-center p-2 border-r ${t.borderLight} z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]`} style={{ backgroundColor: agent.couleurFond, color: getContrastYIQ(agent.couleurFond) }}>
                          <span className="text-sm font-black text-right leading-tight">{agent.nom}</span>
                          <span className="text-[10px] font-mono font-bold opacity-80">{heuresJourStr}</span>
                        </div>
                        
                        <TimelineTrack 
                          limitesHeures={limitesHeures} isBesoins={false} copiedEvent={copiedEvent} snapPoints={allLineSnapPoints}
                          onAddCopy={(startMins) => {
                            const duration = copiedEvent.durationMins || 60;
                            const endMins = Math.min(startMins + duration, limitesHeures.baseMins + limitesHeures.span);
                            const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                            sauvegarderEtatPrecedent();
                            applyAction('add', { 
                              id: String(Date.now() + Math.random()), start: `${jourConsulte}T${formatTime(startMins)}:00`, end: `${jourConsulte}T${formatTime(endMins)}:00`,
                              title: `${copiedEvent.extendedProps?.posteNom} - ${agent.nom}`,
                              backgroundColor: copiedEvent.backgroundColor, borderColor: copiedEvent.borderColor,
                              extendedProps: { ...copiedEvent.extendedProps, agentId: agent.id, agentNom: agent.nom }
                            });
                            setCopiedEvent(null);
                          }}
                          onAddLasso={(startMins, endMins) => {
                            const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                            setFormTypeEvent('affectation'); setFormTypeAbsence('absence'); setFormAbsImpact('local'); setFormAgent(agent.id); setFormPoste(posteActif || (postes[0]?.id || '')); setFormNote('');
                            setModalCreation({ isOpen: true, eventId: null, date: jourConsulte, start: formatTime(startMins), end: formatTime(endMins) });
                          }}
                        >
                          {eventsDuJour.map(evt => {
                            const startD = new Date(evt.start); const endD = new Date(evt.end);
                            const startMins = startD.getHours() * 60 + startD.getMinutes(); const endMins = endD.getHours() * 60 + endD.getMinutes();
                            const posteCouleur = evt.extendedProps?.posteCouleur || '#3b82f6';
                            
                            return (
                              <TimelineEvent 
                                key={evt.id} startMins={startMins} endMins={endMins} limitesHeures={limitesHeures} isLocked={false} 
                                bgColor={posteCouleur} borderColor='rgba(0,0,0,0.2)' textColor={getContrastYIQ(posteCouleur)} 
                                title={evt.extendedProps?.posteNom || 'Poste'} subtitle={agent.nom} extInfo={null} conflit={false} snapPoints={allLineSnapPoints}
                                onUpdate={(min, max) => {
                                  const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                                  sauvegarderEtatPrecedent();
                                  applyAction('update', { id: evt.id, start: `${jourConsulte}T${formatTime(min)}:00`, end: `${jourConsulte}T${formatTime(max)}:00` });
                                }}
                                onClick={() => ouvrirEdition(evt)}
                                onCopy={(dur) => setCopiedEvent({ title: evt.extendedProps?.posteNom || 'Poste', backgroundColor: posteCouleur, borderColor: 'rgba(0,0,0,0.2)', extendedProps: { ...evt.extendedProps }, durationMins: dur })}
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
  const { gridLines, gridLabelsDaily } = generateGrid(limitesHeures, sonneries, amplitude);
  const templateDateObj = new Date(currentTemplate.dateDebut);
  templateDateObj.setDate(templateDateObj.getDate() + (jourTemplate - 1));
  const pad = n => String(n).padStart(2, '0');
  const currentTemplateDateStr = `${templateDateObj.getFullYear()}-${pad(templateDateObj.getMonth()+1)}-${pad(templateDateObj.getDate())}`;

  const isBesoinsMode = modeEdition === 'besoins';
  const rowsItems = isBesoinsMode ? postes : agents;

  return (
    <div className={`flex-1 flex flex-col ${t.bgMain} h-full overflow-hidden min-h-0`}>
      <div className="p-4 pb-2 no-print shrink-0">
        <div className="flex justify-between items-center mb-2">
          <h2 className={`text-lg font-bold ${t.header} flex items-center gap-2`}>📐 Modèle : {currentTemplate.nom}</h2>
          <div className="flex gap-2 items-center">
            {currentTemplate.statut === 'brouillon' && (<button onClick={validerModele} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-green-700 shadow-sm animate-pulse">✅ Valider et Appliquer</button>)}
            <select value={activeTemplateId} onChange={e => setActiveTemplateId(Number(e.target.value))} className={`border ${t.borderLight} rounded p-1.5 text-xs font-bold ${t.cardBg} ${t.header} outline-none`}>
              {templateVersions.map(tv => <option key={tv.id} value={tv.id}>{tv.statut==='valide'?'🔒':'✏️'} {tv.nom}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-3 items-center">
          {[1, 2, 3, 4, 5].map(d => (
            <button key={d} onClick={() => setJourTemplate(d)} className={`px-5 py-1.5 rounded-lg text-sm font-bold transition-all shadow-sm ${jourTemplate === d ? t.activeTab : `${t.cardBg} ${t.textMenuMuted} border border-transparent hover:border-black/10`}`}>{['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'][d - 1]}</button>
          ))}
          <div className="ml-auto text-xs font-bold px-3 py-1.5 rounded-full border border-black/10 shadow-inner bg-black/5">Lignes : {isBesoinsMode ? '🎯 Postes (Besoins structurels)' : '👤 Agents (Affectations nominatives)'}</div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden px-4 pb-4 flex flex-col">
        <div className={`${t.cardBg} rounded-xl shadow border ${currentTemplate.statut === 'brouillon' ? 'border-[#3B82F6] border-2' : t.borderLight} flex-1 flex flex-col overflow-hidden`}>
          <div className={`h-full flex flex-col transition-all duration-300 ${currentTemplate.statut === 'valide' ? 'pointer-events-none opacity-85 grayscale-[15%]' : ''}`}>
            <div className="flex-1 overflow-x-auto overflow-y-auto flex flex-col min-h-0">
              <div className="min-w-[800px] flex-1 flex flex-col relative">
                <div className={`flex border-b ${t.borderLight} ${t.bgLight} shrink-0 ml-32 relative h-8 items-center`}>
                  {gridLabelsDaily.map(lbl => (<div key={lbl.timeStr} className={`absolute text-[11px] font-black ${t.header}`} style={{ left: `${lbl.topPercent}%`, transform: 'translateX(-50%)' }}>{lbl.timeStr}</div>))}
                </div>
                
                <div className="flex-1 relative z-10 flex flex-col">
                  <div className="absolute inset-0 left-32 pointer-events-none z-0">
                    {gridLines.map(line => (<div key={line.timeStr} className={`absolute top-0 bottom-0 ${t.borderLight} opacity-50`} style={{ left: `${line.topPercent}%`, borderLeft: line.isHeurePleine || line.isSonnerie ? '2px solid currentColor' : '1px dashed currentColor' }}></div>))}
                  </div>

                  {rowsItems.map(item => {
                    const dateStr = currentTemplateDateStr;
                    const eventsDeLaLigne = displayEvents.filter(e => {
                      if (!e.start.startsWith(dateStr)) return false;
                      if (isBesoinsMode) return e.extendedProps?.isBesoin && e.extendedProps?.posteId === item.id;
                      return !e.extendedProps?.isBesoin && e.extendedProps?.agentId === item.id;
                    });

                    const rowBgColor = isBesoinsMode ? item.couleur : item.couleurFond;
                    const totalMinsJour = eventsDeLaLigne.reduce((acc, evt) => acc + (new Date(evt.end) - new Date(evt.start)) / 60000, 0);
                    const heuresJourStr = formatHeureTableau(totalMinsJour / 60, true);

                    const allLineSnapPoints = [...sonneriesMins, ...eventsDeLaLigne.flatMap(e => {
                        const s = new Date(e.start), ed = new Date(e.end);
                        return [s.getHours() * 60 + s.getMinutes(), ed.getHours() * 60 + ed.getMinutes()];
                    })];

                    return (
                      <div key={item.id} className={`flex border-b ${t.borderLight} flex-1 relative group hover:bg-black/5 transition-colors min-h-[60px] hover:z-50`}>
                        <div className={`w-32 shrink-0 flex flex-col items-end justify-center p-2 border-r ${t.borderLight} z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]`} style={{ backgroundColor: rowBgColor, color: getContrastYIQ(rowBgColor) }}>
                          <span className="text-sm font-black text-right leading-tight">{item.nom}</span>
                          <span className="text-[10px] font-mono font-bold opacity-80">{heuresJourStr}</span>
                        </div>
                        
                        <TimelineTrack 
                          limitesHeures={limitesHeures} isBesoins={isBesoinsMode} copiedEvent={copiedEvent} snapPoints={allLineSnapPoints}
                          onAddCopy={(startMins) => {
                            if (currentTemplate.statut === 'valide') return;
                            const duration = copiedEvent.durationMins || 60;
                            const endMins = Math.min(startMins + duration, limitesHeures.baseMins + limitesHeures.span);
                            const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                            sauvegarderEtatPrecedent();
                            const newStartISO = `${currentTemplateDateStr}T${formatTime(startMins)}:00`;
                            const newEndISO = `${currentTemplateDateStr}T${formatTime(endMins)}:00`;

                            if (isBesoinsMode && copiedEvent.extendedProps?.isBesoin) {
                              updateCurrentTemplate(null, [...currentTemplate.besoins, { 
                                id: String(Date.now() + Math.random()), start: newStartISO, end: newEndISO, extendedProps: { ...copiedEvent.extendedProps, posteId: item.id, posteNom: item.nom } 
                              }]);
                            } else if (!isBesoinsMode && !copiedEvent.extendedProps?.isBesoin) {
                              applyAction('add', { 
                                id: String(Date.now() + Math.random()), start: newStartISO, end: newEndISO,
                                title: `${copiedEvent.extendedProps?.posteNom} - ${item.nom}`,
                                backgroundColor: copiedEvent.backgroundColor, borderColor: copiedEvent.borderColor,
                                extendedProps: { ...copiedEvent.extendedProps, agentId: item.id, agentNom: item.nom }
                              });
                            }
                            setCopiedEvent(null);
                          }}
                          onAddLasso={(startMins, endMins) => {
                            if (currentTemplate.statut === 'valide') return;
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
                        >
                          {eventsDeLaLigne.map(evt => {
                            const startD = new Date(evt.start); const endD = new Date(evt.end);
                            const startMins = startD.getHours() * 60 + startD.getMinutes(); const endMins = endD.getHours() * 60 + endD.getMinutes();
                            const isLocked = currentTemplate.statut === 'valide';
                            
                            let evtBgColor, evtTextColor, evtBorderColor, evtTitle, extInfo;
                            if (isBesoinsMode) {
                              const isSous = evt.extendedProps?.isSousEffectif;
                              evtBgColor = isSous ? '#dc2626' : '#16a34a'; evtBorderColor = isSous ? '#991b1b' : '#166534'; evtTextColor = '#ffffff';
                              evtTitle = `${evt.extendedProps?.minCount} / ${evt.extendedProps?.qte} pers.`;
                            } else {
                              evtBgColor = evt.extendedProps?.posteCouleur || '#3b82f6';
                              const estEnConflit = conflitsIds.has(String(evt.id).split('_')[0]);
                              if (estEnConflit) { evtBgColor = '#dc2626'; }
                              evtBorderColor = 'rgba(0,0,0,0.2)'; evtTextColor = getContrastYIQ(evtBgColor);
                              evtTitle = (estEnConflit ? '⚠️ ' : '') + (evt.extendedProps?.posteNom || 'Poste');
                              extInfo = evt.extendedProps?.note || null;
                            }
                            
                            return (
                              <TimelineEvent 
                                key={evt.id} startMins={startMins} endMins={endMins} limitesHeures={limitesHeures} isLocked={isLocked} 
                                bgColor={evtBgColor} borderColor={evtBorderColor} textColor={evtTextColor} 
                                title={evtTitle} subtitle={!isBesoinsMode ? item.nom : null} extInfo={extInfo} conflit={!isBesoinsMode && conflitsIds.has(String(evt.id).split('_')[0])} snapPoints={allLineSnapPoints}
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
                                onCopy={(dur) => setCopiedEvent({ title: evt.title || evtTitle, backgroundColor: evtBgColor, borderColor: evtBorderColor, extendedProps: { ...evt.extendedProps }, durationMins: dur })}
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
          const { gridLines, gridLabelsDaily } = generateGrid(limitesHeures, sonneries, amplitude);
          const activeMonday = currentViewMonday || getMondayStr(new Date());
          
          return (
            <div className={`flex-1 flex flex-col ${t.bgMain} h-full overflow-hidden min-h-0`}>
              <div className="p-4 pb-2 no-print shrink-0">
                <div className="flex justify-between items-center mb-2">
                  <h2 className={`text-lg font-bold ${t.header}`}>📅 Planning Réel {printFilter.type === 'agent' && ` - Filtré pour : ${agents.find(a=>a.id===printFilter.id)?.nom}`} {printFilter.type === 'poste' && ` - Filtré pour le poste : ${postes.find(p=>p.id===printFilter.id)?.nom}`}</h2>
                  <div className="flex gap-2 items-center">
                    <div className="flex items-center gap-3 mr-4">
                      <button onClick={() => { const d = new Date(activeMonday); d.setDate(d.getDate() - 7); setCurrentViewMonday(getMondayStr(d)); }} className={`px-3 py-1 rounded text-sm font-bold ${t.cardBg} ${t.header} border ${t.borderLight} hover:opacity-75 shadow-sm transition-colors`}>◀ Semaine Préc.</button>
                      <span className={`font-bold ${t.headerText} text-sm`}>Semaine du {activeMonday}</span>
                      <button onClick={() => { const d = new Date(activeMonday); d.setDate(d.getDate() + 7); setCurrentViewMonday(getMondayStr(d)); }} className={`px-3 py-1 rounded text-sm font-bold ${t.cardBg} ${t.header} border ${t.borderLight} hover:opacity-75 shadow-sm transition-colors`}>Semaine Suiv. ▶</button>
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
              </div>
              
              <div className="flex-1 overflow-hidden px-4 pb-4 flex flex-col">
                {isPrinting ? (
                  <PrintTimeGridView events={displayEvents} agents={agents} limitesHeures={limitesHeures} amplitude={amplitude} titre={`Planning Hebdo du ${activeMonday}`} />
                ) : (
                  <div className={`${t.cardBg} rounded-xl shadow border ${t.borderLight} flex-1 flex flex-col overflow-hidden`}>
                    <div className="flex-1 overflow-x-auto overflow-y-auto flex flex-col min-h-0">
                      <div className="min-w-[900px] flex-1 flex flex-col relative">
                        <div className={`flex border-b ${t.borderLight} ${t.bgLight} shrink-0 ml-32 relative h-8 items-center sticky top-0 z-30`}>
                          {gridLabelsDaily.map(lbl => (<div key={lbl.timeStr} className={`absolute text-[11px] font-black ${t.header}`} style={{ left: `${lbl.topPercent}%`, transform: 'translateX(-50%)' }}>{lbl.timeStr}</div>))}
                        </div>
                        
                        <div className="flex-1 flex flex-col relative">
                          <div className="absolute inset-0 left-32 pointer-events-none z-0">
                            {gridLines.map(line => (<div key={line.timeStr} className={`absolute top-0 bottom-0 ${t.borderLight} opacity-50`} style={{ left: `${line.topPercent}%`, borderLeft: line.isHeurePleine || line.isSonnerie ? '2px solid currentColor' : '1px dashed currentColor' }}></div>))}
                          </div>

                          {[1, 2, 3, 4, 5].map(dayIndex => {
                            const dateDuJour = new Date(activeMonday);
                            dateDuJour.setDate(dateDuJour.getDate() + dayIndex - 1);
                            const pad = n => String(n).padStart(2, '0');
                            const dateStr = `${dateDuJour.getFullYear()}-${pad(dateDuJour.getMonth()+1)}-${pad(dateDuJour.getDate())}`;
                            const nomJour = nomsJours[dayIndex];

                            return (
                              <div key={dateStr} className="flex flex-col border-b-4 border-black/15 dark:border-white/10 relative z-10 hover:z-[60]">
                                <div className={`px-4 py-1.5 font-bold uppercase text-xs tracking-wider sticky left-0 z-20 ${t.bgLight} ${t.header} border-b ${t.borderLight}`}>{nomJour} {dateDuJour.getDate()}/{dateDuJour.getMonth()+1}</div>
                                {agents.map(agent => {
                                  const eventsDeLaLigne = displayEvents.filter(e => e.start.startsWith(dateStr) && e.extendedProps?.agentId === agent.id);
                                  const totalMinsJour = eventsDeLaLigne.filter(e => !e.extendedProps?.isAbsence).reduce((acc, evt) => acc + (new Date(evt.end) - new Date(evt.start)) / 60000, 0);
                                  const heuresJourStr = formatHeureTableau(totalMinsJour / 60, true);

                                  const allLineSnapPoints = [...sonneriesMins, ...eventsDeLaLigne.flatMap(e => {
                                      const s = new Date(e.start), ed = new Date(e.end);
                                      return [s.getHours() * 60 + s.getMinutes(), ed.getHours() * 60 + ed.getMinutes()];
                                  })];

                                  return (
                                    <div key={`${dateStr}-${agent.id}`} className={`flex border-b ${t.borderLight} h-14 relative group hover:bg-black/5 hover:z-50 transition-colors`}>
                                      <div className={`w-32 shrink-0 flex flex-col items-end justify-center p-2 border-r ${t.borderLight} z-20 shadow-[2px_0_5px_rgba(0,0,0,0.05)] sticky left-0`} style={{ backgroundColor: agent.couleurFond, color: getContrastYIQ(agent.couleurFond) }}>
                                        <span className="text-sm font-black text-right leading-tight truncate w-full">{agent.nom}</span>
                                        <span className="text-[10px] font-mono font-bold opacity-80">{heuresJourStr}</span>
                                      </div>
                                      
                                      <TimelineTrack 
                                        limitesHeures={limitesHeures} isBesoins={false} copiedEvent={copiedEvent} snapPoints={allLineSnapPoints}
                                        onAddCopy={(startMins) => {
                                          const duration = copiedEvent.durationMins || 60;
                                          const endMins = Math.min(startMins + duration, limitesHeures.baseMins + limitesHeures.span);
                                          const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                                          sauvegarderEtatPrecedent();
                                          applyAction('add', { 
                                            id: String(Date.now() + Math.random()), start: `${dateStr}T${formatTime(startMins)}:00`, end: `${dateStr}T${formatTime(endMins)}:00`,
                                            title: `${copiedEvent.extendedProps?.posteNom} - ${agent.nom}`,
                                            backgroundColor: copiedEvent.backgroundColor, borderColor: copiedEvent.borderColor,
                                            extendedProps: { ...copiedEvent.extendedProps, agentId: agent.id, agentNom: agent.nom }
                                          });
                                          setCopiedEvent(null);
                                        }}
                                        onAddLasso={(startMins, endMins) => {
                                          const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                                          setFormTypeEvent('affectation'); setFormTypeAbsence('absence'); setFormAbsImpact('local'); setFormAgent(agent.id); setFormPoste(posteActif || (postes[0]?.id || '')); setFormNote('');
                                          setModalCreation({ isOpen: true, eventId: null, date: dateStr, start: formatTime(startMins), end: formatTime(endMins) });
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
                                            evtBorderColor = 'rgba(0,0,0,0.2)'; evtTextColor = getContrastYIQ(evtBgColor);
                                            evtTitle = (estEnConflit ? '⚠️ ' : '') + (evt.extendedProps?.posteNom || 'Poste');
                                            extInfo = evt.extendedProps?.note || null;
                                          }
                                          
                                          return (
                                            <TimelineEvent 
                                              key={evt.id} startMins={startMins} endMins={endMins} limitesHeures={limitesHeures} isLocked={false} 
                                              bgColor={evtBgColor} borderColor={evtBorderColor} textColor={evtTextColor} 
                                              title={evtTitle} subtitle={agent?.nom || evt.extendedProps?.agentNom || 'Agent'} extInfo={extInfo} conflit={!evt.extendedProps?.isAbsence && conflitsIds.has(String(evt.id).split('_')[0])} snapPoints={allLineSnapPoints}
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
                                              onCopy={(dur) => setCopiedEvent({ title: evt.title || evtTitle, backgroundColor: evtBgColor, borderColor: evtBorderColor, extendedProps: { ...evt.extendedProps }, durationMins: dur })}
                                            />
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
        
        {/* Le reste des Vues (Bilan & Agent) restent intactes, passez les accolades */}
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
                    <tr><th className="p-4 border-r border-black/10">Agent</th><th className="p-4 border-r border-black/10 text-center">%</th><th className="p-4 border-r border-black/10 text-center bg-black/10">H. Contrat</th><th className="p-4 border-r border-black/10 text-center">H. Type Hebdo</th><th className="p-4 border-r border-black/10 text-center bg-black/10">H. Consommées</th><th className="p-4 text-center">Solde Final</th></tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {statsAgents.map(agent => (
                      <tr key={agent.id} className={`hover:${t.bgLight} transition-colors`}>
                        <td className={`p-4 font-bold border-r ${t.borderLight} ${t.header}`}>{agent.nom} {agent.estEtudiant && '🎓'}</td>
                        <td className={`p-4 text-center border-r ${t.borderLight}`}>
                          <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: agent.couleurFond, color: getContrastYIQ(agent.couleurFond) }}>
                            {getActiveContract(agent, todayStr).quotite}% {(agent.avenants?.length > 0) && <span title="Des avenants modifient son temps de travail en cours d'année" className="ml-1 cursor-help">📝</span>}
                          </span>
                        </td>
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

        {/* 5. VUE ABSENCES & RETARDS */}
        {vueActive === 'absences' && (
          <div className={`flex-1 p-6 overflow-auto ${t.bgMain}`}>
            <h2 className={`text-2xl font-bold ${t.header} mb-6`}>Gestion des Absences et Retards</h2>
            
<div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              {bilanAbsences.map(b => (
                <div key={b.id} className={`${t.cardBg} rounded-xl shadow-sm border ${t.borderLight} p-4 border-l-4`} style={{ borderLeftColor: b.couleur }}>
                  <div className={`font-black text-lg ${t.header} mb-3`}>{b.nom}</div>
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="bg-red-500/10 rounded p-1"><div className="text-gray-500 text-[9px] font-bold uppercase">Absences</div><div className="font-mono text-red-600 font-bold mt-1 text-sm">{b.nbAbs} <span className="text-[10px] text-gray-500 block leading-none">({formatHeureTableau(b.hAbs, true)})</span></div></div>
                    <div className="bg-orange-500/10 rounded p-1"><div className="text-gray-500 text-[9px] font-bold uppercase">Retards</div><div className="font-mono text-orange-600 font-bold mt-1 text-sm">{b.nbRet} <span className="text-[10px] text-gray-500 block leading-none">({formatHeureTableau(b.hRet, true)})</span></div></div>
                    <div className="bg-green-500/10 rounded p-1"><div className="text-gray-500 text-[9px] font-bold uppercase">H. Supp / Rattrapage</div><div className="font-mono text-green-700 font-bold mt-1 text-sm">{b.nbSupp} <span className="text-[10px] text-gray-500 block leading-none">({formatHeureTableau(b.hSupp, true)})</span></div></div>
                  </div>
                  {b.hDetteRestante > 0 && (<div className="pt-2 border-t border-gray-500/30 text-xs font-bold text-red-500">⚠️ Dette Locale : {formatHeureTableau(b.hDetteRestante, true)} à rattraper.</div>)}
                  {b.hAvance > 0 && (<div className="pt-2 border-t border-gray-500/30 text-xs font-bold text-blue-600">🔵 Crédit Local : {formatHeureTableau(b.hAvance, true)} d'avance.</div>)}
                  {b.nbRet > 0 && b.hDetteRestante === 0 && b.hAvance === 0 && (<div className="pt-2 border-t border-gray-500/30 text-xs font-bold text-green-600">✅ Tous les retards locaux sont compensés.</div>)}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className={`lg:col-span-1 ${t.cardBg} p-6 rounded-xl shadow border ${t.borderLight} h-fit`}>
              <h3 className={`font-bold text-md ${t.header} mb-4 pb-2 border-b ${t.borderLight}`}>Déclarer un événement</h3>
              <form onSubmit={ajouterAbsenceRetard} className="space-y-4">
                <div><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Agent concerné</label><select required value={formAbsence.agentId} onChange={e => setFormAbsence({...formAbsence, agentId: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent text-sm`}><option value="" disabled>-- Choisir un agent --</option>{agents.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select></div>
                <div>
                  <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Type d'événement</label>
                  <select value={formAbsence.type} onChange={e => setFormAbsence({...formAbsence, type: e.target.value, journeeComplete: e.target.value === 'absence', impact: e.target.value === 'heures_supp' && formAbsence.impact === 'neutre' ? 'local' : formAbsence.impact})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent text-sm font-bold`}>
                    <option value="absence">🚫 Absence</option>
                    <option value="retard">⏰ Retard</option>
                    <option value="heures_supp">🟢 Heures Supp' / Rattrapage</option>
                  </select>
                </div>

                {formAbsence.type === 'absence' && (<label className={`flex items-center gap-2 text-sm font-bold ${t.textAccent} cursor-pointer ${t.bgLight} p-2 rounded border ${t.borderLight}`}><input type="checkbox" checked={formAbsence.journeeComplete} onChange={e => setFormAbsence({...formAbsence, journeeComplete: e.target.checked})} className="w-4 h-4 cursor-pointer" />Journée(s) complète(s)</label>)}
                
                <div className="flex gap-4">
                  <div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>{formAbsence.type === 'absence' && formAbsence.journeeComplete ? 'Début' : 'Date'}</label><input type="date" required value={formAbsence.dateDebut} onChange={e => setFormAbsence({...formAbsence, dateDebut: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} /></div>
                  {formAbsence.type === 'absence' && formAbsence.journeeComplete && (<div className="flex-1"><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Fin (Optionnel)</label><input type="date" value={formAbsence.dateFin} onChange={e => setFormAbsence({...formAbsence, dateFin: e.target.value})} min={formAbsence.dateDebut} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} /></div>)}
                </div>

                {formAbsence.type !== 'absence' || !formAbsence.journeeComplete ? (
                  <div>
                    <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Durée (ex: 0h45, 30min)</label>
                    <input type="text" required value={formAbsence.dureeSaisie || ''} onChange={e => setFormAbsence({...formAbsence, dureeSaisie: e.target.value})} placeholder="Ex: 0h45" className={`w-full border ${t.borderLight} rounded p-2 text-sm font-bold text-center bg-transparent`} />
                  </div>
                ) : null}

                <div className="p-3 border border-black/10 rounded bg-black/5 dark:bg-white/5">
                  <label className={`block text-sm font-semibold mb-2 ${t.header}`}>Impact sur les compteurs</label>
                  <select value={formAbsence.impact} onChange={e => setFormAbsence({...formAbsence, impact: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 bg-transparent font-bold text-sm`}>
                    <option value="global">🌍 Bilan Annuel Global</option>
                    <option value="local">📍 Compteur Local (Dette / Compensation)</option>
                    {['absence', 'retard'].includes(formAbsence.type) && <option value="neutre">⚪ Neutre (Ignoré)</option>}
                  </select>
                </div>

                <div><label className={`block text-sm font-semibold mb-1 ${t.header}`}>Motif / Note</label><input type="text" required={formAbsence.type === 'absence'} value={formAbsence.motif} onChange={e => setFormAbsence({...formAbsence, motif: e.target.value})} placeholder={formAbsence.type === 'heures_supp' ? "Ex: Sortie scolaire..." : "Optionnel..."} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent`} /></div>
                <button type="submit" className={`w-full ${t.btnPrimary} rounded p-2.5 text-sm font-bold shadow transition`}>Enregistrer</button>
              </form>
            </div>              <div className={`lg:col-span-2 ${t.cardBg} rounded-xl shadow border ${t.borderLight} overflow-hidden flex flex-col`}>
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
                            <td className="p-3 flex items-center gap-1"><span className={`px-2 py-0.5 rounded text-xs font-bold ${typeAbs === 'absence' ? 'bg-red-500/20 text-red-500' : typeAbs === 'retard' ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-600'}`}>{typeAbs.toUpperCase()}</span></td>
                            <td className={`p-3 text-center font-mono font-bold ${t.header}`}>{formatHeureTableau(dureeAbs, true)}</td>
                            <td className="p-3 font-bold text-xs"><span className={`px-2 py-1 rounded bg-black/5`}>{a.impact === 'global' ? '🌍 Global' : a.impact === 'local' ? '📍 Local' : '⚪ Neutre'}</span></td>
                            <td className="p-3 text-gray-500 italic">{a.motif || ''}</td>
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

        {/* 6. VUE CALENDRIER ANNUEL AGENT */}
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
                        if (absDuJour.length > 0) {
                          const txtAbs = absDuJour.map(a => `${a.type.toUpperCase()}${a.deduire?' (-h)':''}`).join(', ');
                          noteAffichage = noteAffichage ? `${noteAffichage} / ${txtAbs}` : txtAbs;
                        }

                        let bgJour = t.cardBg; 
                        if (dayOfWeek === 0) bgJour = t.bgLight; 
                        if (dayOfWeek === 6) bgJour = t.bgMain;  
                        
                        if (infoPeriode) {
                          if (infoPeriode.type === 'ferie') bgJour = "bg-green-500/20 text-green-600 font-bold";
                          else bgJour = `${t.bgLight} ${t.header}`; 
                        }

                        if (absDuJour.length > 0) bgJour = "bg-red-500/20 text-red-500 font-bold";

                        const isExc = exc || absDuJour.length > 0;
                        const cellBg1 = isExc ? 'bg-orange-500/20 text-orange-500' : t.cardBg;
                        const cellBg2 = isExc ? 'bg-orange-500/10 text-orange-500 font-bold' : `${t.cardBg} ${t.textMenuMuted}`;

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
      {/* ================================================================= */}
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
      {copiedEvent && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-3 border border-gray-700 animate-in slide-in-from-bottom duration-150 no-print">
          <span className="text-base">📋</span>
          <div className="text-xs">
            <strong>Créneau copié :</strong> {copiedEvent.extendedProps?.posteNom || 'Créneau'} ({copiedEvent.extendedProps?.agentNom}, {Math.floor(copiedEvent.durationMins/60)}h{String(copiedEvent.durationMins%60).padStart(2,'0')}) — <em>Cliquez sur le planning pour coller</em>
          </div>
          <button onClick={() => setCopiedEvent(null)} className="ml-2 text-xs bg-white/20 hover:bg-white/30 rounded-full px-2 py-0.5 font-bold cursor-pointer" title="Annuler le copier-coller">Échap ✖</button>
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
            
            /* Surcharge dynamique pour les boutons du calendrier FullCalendar */
            --fc-button-bg-color: var(--c-prim) !important;
            --fc-button-border-color: var(--c-prim) !important;
            --fc-button-hover-bg-color: var(--c-prim) !important;
            --fc-button-hover-border-color: var(--c-prim) !important;
            --fc-button-active-bg-color: var(--c-prim) !important;
            --fc-button-active-border-color: var(--c-prim) !important;
          }
          
          /* Forcer la lisibilité du texte et des icônes dans les boutons FullCalendar */
          .fc .fc-button-primary { color: ${getContrastYIQ(customColors.primary)} !important; }
          .fc .fc-button-primary .fc-icon { color: ${getContrastYIQ(customColors.primary)} !important; }
          
          /* 1. Couleurs de fond principales et contraste */
          /* 1. Couleurs de fond principales et contraste */
          .custom-sidebar { background-color: var(--c-prim) !important; color: ${getContrastYIQ(customColors.primary)} !important; }
          .custom-btn { background-color: var(--c-acc) !important; color: ${getContrastYIQ(customColors.accent)} !important; }
          
          /* 2. Forcer le contraste parfait à l'intérieur de la sidebar (Noir ou Blanc) */
          .custom-sidebar .custom-text-primary,
          .custom-sidebar .custom-text-primary-muted { 
             color: ${getContrastYIQ(customColors.primary)} !important; 
          }
          .custom-sidebar .custom-text-primary-muted { opacity: 0.7; }
          
          /* 3. Textes dans la zone principale (Mixés avec du Noir/Blanc pour garantir la lisibilité sur fond blanc) */
          .custom-text-accent { color: color-mix(in srgb, var(--c-acc) 70%, ${isDarkMode ? 'white' : 'black'}) !important; }
          .custom-text-primary { color: color-mix(in srgb, var(--c-prim) 50%, ${isDarkMode ? 'white' : 'black'}) !important; }
          .custom-text-primary-muted { color: color-mix(in srgb, var(--c-prim) 30%, ${isDarkMode ? '#9ca3af' : '#6b7280'}) !important; }
          
          /* 4. Fonds et Bordures (adaptatifs) */
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
        
        .fc-event-resizer {
          display: block !important;
          width: 100% !important;
          height: 8px !important;
          background: rgba(0,0,0,0.3) !important;
          opacity: 0;
          transition: opacity 0.2s;
          cursor: ns-resize !important;
          z-index: 99 !important;
        }
        .fc-event-resizer-start { top: 0 !important; border-radius: 4px 4px 0 0; }
        .fc-event-resizer-end { bottom: 0 !important; border-radius: 0 0 4px 4px; }
        .fc-timegrid-event:hover .fc-event-resizer { opacity: 1; }

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
            height: 196mm !important; /* 👈 Étiré au maximum de la page A4 */
            max-height: 196mm !important; 
            overflow: hidden !important; 
            box-sizing: border-box; 
            page-break-after: avoid !important;
            page-break-inside: avoid !important; 
          }          .print-agent-page { width: 100%; height: 185mm !important; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box; page-break-after: always; break-after: page; }
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