import React, { useState, useEffect, useMemo, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// --- IMPORTS EXTERNES ---
// --- IMPORTS EXTERNES ---
import { 
  THEMES, hexToRgb, getContrastYIQ, 
  formatHeureTableau, parseHeureSaisie, extractTimeStr, getMondayStr,
  resetAllData, exporterDonnees, importerDonnees,
  generateGrid, calculerContratBetty, formatHeureMinutes,
  detecterChevauchements // 👈 AJOUTEZ CECI
} from './utils';
import { SetupWizard } from './SetupWizard';

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

  const [modalCreation, setModalCreation] = useState({ isOpen: false, eventId: null, start: null, end: null });
  const [formTypeEvent, setFormTypeEvent] = useState('affectation'); 
  const [formTypeAbsence, setFormTypeAbsence] = useState('absence'); 
  const [formAbsenceDeduire, setFormAbsenceDeduire] = useState(false);
  const [formAgent, setFormAgent] = useState('');
  const [formPoste, setFormPoste] = useState('');
  const [formNote, setFormNote] = useState('');

  const [modalNewVersion, setModalNewVersion] = useState({ isOpen: false, dateDebut: '', nom: 'Évolution' });
  const [modalException, setModalException] = useState({ isOpen: false, agentId: null, dateStr: null, h: '0h00', note: '' });

  const [formAbsence, setFormAbsence] = useState({
    agentId: '', type: 'absence',  journeeComplete: true, dateDebut: new Date().toISOString().split('T')[0],
    dateFin: '', heures: '0', minutes: '0', deduireHeures: false, motif: 'Maladie'
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
  
  const [currentViewMonday, setCurrentViewMonday] = useState(null);
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const isInitialMount = useRef(true);
  const [needsBackup, setNeedsBackup] = useState(false);
  const [copiedEvent, setCopiedEvent] = useState(null);

  // --- VARIABLES DERIVEES OPTIMISEES ---
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
          const absDuJour = absences.filter(a => a.agentId === agent.id && a.start.startsWith(dateStr) && a.deduire);
          const hDeduct = absDuJour.reduce((tot, a) => tot + getHeuresAbsence(a), 0);
          heuresConsommees += Math.max(0, hJour - hDeduct);
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
      title: `${a.type === 'absence' ? '🚫 ABSENCE' : '⏰ RETARD'} - ${agents.find(ag=>ag.id===a.agentId)?.nom}`,
      backgroundColor: a.type === 'absence' ? '#EF4444' : '#F59E0B',
      borderColor: a.type === 'absence' ? '#DC2626' : '#D97706',
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

    // 1. Vérification des sous-effectifs
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

    // 2. 🆕 Vérification des doubles affectations (chevauchements)
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
  // --- EFFETS ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && copiedEvent) {
        setCopiedEvent(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [copiedEvent]);

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

  useEffect(() => { localStorage.setItem('edt-agents', JSON.stringify(agents)); }, [agents]);
  useEffect(() => { localStorage.setItem('edt-postes', JSON.stringify(postes)); }, [postes]);
  useEffect(() => { localStorage.setItem('edt-periodes', JSON.stringify(periodesFeriees)); }, [periodesFeriees]);
  useEffect(() => { localStorage.setItem('edt-template-versions', JSON.stringify(templateVersions)); }, [templateVersions]);
  useEffect(() => { localStorage.setItem('edt-custom-weeks', JSON.stringify(customWeeks)); }, [customWeeks]);
  useEffect(() => { localStorage.setItem('edt-exceptions', JSON.stringify(exceptions)); }, [exceptions]);
  useEffect(() => { localStorage.setItem('edt-absences-retards', JSON.stringify(absences)); }, [absences]);
  useEffect(() => { localStorage.setItem('edt-dotation', dotation.toString()); }, [dotation]);
  useEffect(() => { localStorage.setItem('edt-amplitude', JSON.stringify(amplitude)); }, [amplitude]);
  useEffect(() => { if (vueActive === 'planning') setModeEdition('agents'); }, [vueActive]);


  // --- METHODES ---
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
    { m: 6, y: baseYear+1, nom: 'JUILLET' }
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
        agentId, type: formAbsence.type, start: startStr, end: endStr,
        motif: formAbsence.motif, deduire: formAbsence.deduireHeures, rattrape: false, journeeComplete: formAbsence.journeeComplete
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
      id: ag.id, nom: ag.nom, couleur: ag.couleurFond, nbAbs: abs.length,
      hAbs: abs.reduce((sum, a) => sum + getHeuresAbsence(a), 0),
      nbRet: ret.length, hRet: ret.reduce((sum, a) => sum + getHeuresAbsence(a), 0),
      nbRetRat: retNonRat.length, hRetRat: retNonRat.reduce((sum, a) => sum + getHeuresAbsence(a), 0)
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
              id: String(Date.now() + Math.random()), start: `${dateStr}T${slot.start}:00`, end: `${dateStr}T${slot.end}:00`,
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
    
    // --- COLLER UN CRÉNEAU COPIÉ ---
    if (copiedEvent) {
      const startD = new Date(selectInfo.startStr);
      const endD = new Date(startD.getTime() + (copiedEvent.durationMins || 60) * 60000);
      const pad = n => String(n).padStart(2, '0');
      const formatISO = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

      const newEvt = {
        id: String(Date.now() + Math.random()),
        start: formatISO(startD),
        end: formatISO(endD),
        title: copiedEvent.title,
        backgroundColor: copiedEvent.backgroundColor,
        borderColor: copiedEvent.borderColor,
        extendedProps: { ...copiedEvent.extendedProps }
      };

      applyAction('add', newEvt);

      if (!selectInfo.jsEvent?.ctrlKey && !selectInfo.jsEvent?.metaKey) {
        setCopiedEvent(null);
      }
      return;
    }

    // --- CRÉATION NORMALE ---
    let dateJour = selectInfo.startStr;
    if (dateJour.includes('T')) dateJour = dateJour.split('T')[0];

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
    if (vueActive === 'template' && currentTemplate.statut === 'valide') return changeInfo.revert();
    applyAction('update_content', { id: changeInfo.event.id, start: changeInfo.event.startStr, end: changeInfo.event.endStr }); 
  };

  const gererClicEvenement = (evt) => { 
    if (vueActive === 'template' && currentTemplate.statut === 'valide') {
      alert("Ce modèle est verrouillé. Cliquez sur '🔓 Déverrouiller' dans le menu latéral pour le modifier.");
      return;
    }
    if (evt.extendedProps.isBesoin) {
      if (vueActive === 'template') {
        const cleanId = String(evt.id).split('_')[0];
        updateCurrentTemplate(null, currentTemplate.besoins.filter(b => String(b.id).split('_')[0] !== cleanId)); 
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
        id: cleanId, agentId: agent.id, type: formTypeAbsence, start: newStart, end: newEnd,
        motif: formNote || (formTypeAbsence === 'absence' ? 'Absence' : 'Retard'), deduire: formAbsenceDeduire, rattrape: false, journeeComplete: (new Date(newEnd) - new Date(newStart)) / 3600000 >= 9
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
    
    const durationMins = tS && tE ? Math.round((tE - tS) / 60000) : 60;
    const isShort = durationMins <= 20;

    const handleEventClick = (e) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        e.stopPropagation();
        setCopiedEvent({
          title: arg.event.title,
          backgroundColor: arg.event.backgroundColor,
          borderColor: arg.event.borderColor,
          extendedProps: { ...arg.event.extendedProps },
          durationMins
        });
        return;
      }
      if (!isLocked) ouvrirEdition(arg.event);
    };

    if (arg.event.extendedProps.isBesoin) {
      const isSous = arg.event.extendedProps.isSousEffectif;
      if (isShort) {
        return (
          <div onClick={() => !isLocked && ouvrirEditionBesoin(arg.event)} className="flex items-center w-full h-full overflow-hidden rounded text-xs shadow-sm relative group" style={{ backgroundColor: isSous ? '#dc2626' : '#16a34a', color: '#ffffff' }}>
            <div className="flex-1 truncate px-1.5 flex justify-between items-center">
              <span>🎯 {arg.event.extendedProps.posteNom} ({arg.event.extendedProps.minCount}/{arg.event.extendedProps.qte})</span>
              <span className="opacity-90 font-mono text-[10px] ml-1 shrink-0">{timeStr}</span>
            </div>
          </div>
        );
      }
      return (
        <div onClick={() => !isLocked && ouvrirEditionBesoin(arg.event)} className={`flex flex-col w-full h-full overflow-hidden rounded text-xs shadow-sm relative group transition-all ${!isLocked ? 'cursor-pointer hover:ring-2 hover:ring-red-400' : ''}`} style={{ color: textColor }}>
          <div className="px-1.5 py-1 font-bold flex justify-between items-center" style={{ backgroundColor: isSous ? '#dc2626' : '#16a34a', color: '#ffffff' }}>
            <span className="truncate">🎯 {arg.event.extendedProps.posteNom} <span className="text-[10px] font-normal opacity-90 ml-1">({timeStr})</span></span>
            {!isLocked && <button onClick={(e) => { e.stopPropagation(); gererClicEvenement(arg.event); }} className="no-print text-white bg-black/30 hover:bg-white/50 rounded px-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">✖</button>}
          </div>
          <div className="p-1.5 flex flex-col justify-center items-center flex-1 leading-tight text-center" style={{ backgroundColor: isSous ? '#fee2e2' : '#dcfce7' }}>
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
          <div onClick={() => ouvrirEdition(arg.event)} className={`flex items-center w-full h-full overflow-hidden rounded text-xs font-bold shadow-md relative group cursor-pointer ${isAbs ? 'bg-red-500' : 'bg-orange-500'}`} style={{ color: '#ffffff' }}>
            <div className="flex-1 truncate px-1.5 flex justify-between items-center">
              <span>{isAbs ? '🚫 ABS' : '⏰ RET'} : {arg.event.extendedProps.agentNom}</span>
              <span className="opacity-90 font-mono text-[10px] ml-1 shrink-0">{timeStr}</span>
            </div>
          </div>
        );
      }
      return (
        <div onClick={() => ouvrirEdition(arg.event)} className={`flex flex-col w-full h-full overflow-hidden rounded text-xs border border-black/10 shadow-md relative group cursor-pointer hover:ring-2 transition-all z-50 opacity-90 ${isAbs ? 'bg-red-500/20 border-red-500' : 'bg-orange-500/20 border-orange-500'}`} style={{ color: textColor }}>
          <div className={`px-1.5 py-1 font-bold flex justify-between items-center ${isAbs ? 'bg-red-500' : 'bg-orange-500'}`} style={{ color: '#ffffff' }}>
            <span className="truncate">{isAbs ? '🚫 ABSENCE' : '⏰ RETARD'} {ded && '(-H)'} <span className="text-[10px] font-normal opacity-90 ml-1">({timeStr})</span></span>
            <button onClick={(e) => { e.stopPropagation(); gererClicEvenement(arg.event); }} className="no-print text-white bg-black/30 hover:bg-red-700 rounded px-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity">✖</button>
          </div>
          <div className="p-1.5 flex flex-col flex-1 leading-tight justify-center">
            <span className="font-bold text-sm truncate">{arg.event.extendedProps.agentNom}</span>
            <span className="text-[11px] italic truncate mt-0.5">{arg.event.extendedProps.motif}</span>
          </div>
        </div>
      );
    }
    
const agentColor = arg.event.backgroundColor || '#3b82f6';
    const bgColorWithOpacity = agentColor + '66';
    const headerColor = arg.event.extendedProps?.posteCouleur || '#3b82f6';
    const headerTextColor = getContrastYIQ(headerColor);

    // 🎯 Utilisation directe de la liste globale des conflits
    const cleanEvtId = String(arg.event.id).split('_')[0];
    const estEnConflit = conflitsIds.has(cleanEvtId);

    if (isShort) {
      return (
        <div onClick={handleEventClick} 
             className={`flex items-center w-full h-full overflow-hidden rounded text-xs shadow-sm relative group transition-all ${!isLocked ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''} ${estEnConflit ? 'ring-4 ring-red-600 animate-pulse bg-red-500/40' : ''}`}
             style={{ backgroundColor: estEnConflit ? '#dc2626' : headerColor, color: headerTextColor, border: `1px solid ${estEnConflit ? '#991b1b' : agentColor}` }}
             title={estEnConflit ? "⚠️ CONFLIT : Double affectation !" : "Clic pour modifier • Ctrl+Clic pour copier"}>
          <div className="flex-1 truncate px-1.5 flex justify-between items-center">
            <span><strong>{estEnConflit ? '⚠️ ' : ''}{arg.event.extendedProps?.posteNom}</strong> <span className="opacity-80 hidden md:inline">({arg.event.extendedProps?.agentNom})</span></span>
            <span className="font-mono text-[10px] opacity-90 ml-1 shrink-0">{timeStr}</span>
          </div>
        </div>
      );
    }

    return (
      <div onClick={handleEventClick} 
           className={`flex flex-col w-full h-full overflow-hidden rounded text-xs border shadow-sm relative group transition-all ${!isLocked ? 'cursor-pointer hover:ring-2 hover:ring-blue-400' : ''} ${estEnConflit ? 'ring-4 ring-red-600 animate-pulse' : ''}`}
           style={{ backgroundColor: estEnConflit ? '#fee2e2' : bgColorWithOpacity, border: `1px solid ${estEnConflit ? '#dc2626' : agentColor}`, color: textColor }}
           title={estEnConflit ? "⚠️ CONFLIT : Double affectation !" : "Clic pour modifier • Ctrl+Clic pour copier"}>
        <div className="px-1.5 py-1 font-bold flex justify-between items-center" style={{ backgroundColor: estEnConflit ? '#dc2626' : headerColor, color: headerTextColor }}>
          <span className="truncate">
            {estEnConflit ? '⚠️ CONFLIT ! ' : ''}{arg.event.extendedProps?.posteNom} <span className="text-[10px] font-normal opacity-90 ml-1">({timeStr})</span>
          </span>
          {!isLocked && <button onClick={(e) => { e.stopPropagation(); gererClicEvenement(arg.event); }} className="no-print bg-black/20 hover:bg-red-500 rounded px-1 text-xs opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: headerTextColor }}>✖</button>}
        </div>
        <div className="p-1.5 flex flex-col flex-1 leading-tight">
          <div className="flex justify-between items-start"><span className="font-semibold text-sm truncate pr-1">{arg.event.extendedProps?.agentNom}</span></div>
          {arg.event.extendedProps?.note && <span className="text-[11px] opacity-80 truncate italic mt-1 bg-black/5 dark:bg-white/10 rounded px-1">{arg.event.extendedProps?.note}</span>}
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
      setAgents(agents.map(a => a.id === modalAgent.id ? { ...a, nom: modalAgent.nom, quotite: q, estEtudiant: modalAgent.estEtudiant, hContrat: hC, couleurFond: modalAgent.couleurFond, jours: modalAgent.jours } : a));
      updateCurrentTemplate(currentTemplate.events.map(evt => evt.extendedProps?.agentId === modalAgent.id ? { ...evt, extendedProps: { ...evt.extendedProps, agentNom: modalAgent.nom }, backgroundColor: modalAgent.couleurFond, borderColor: modalAgent.couleurFond } : evt), null);
    } else {
      setAgents([...agents, { id: Date.now(), nom: modalAgent.nom, quotite: q, estEtudiant: modalAgent.estEtudiant, hContrat: hC, couleurFond: modalAgent.couleurFond, jours: modalAgent.jours }]);
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

  return (
    <div className={`flex h-screen w-screen ${t.bgMain} font-sans overflow-hidden transition-colors`}>
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

      {modalPoste.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 no-print">
          <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh] border ${t.borderLight}`}>
            <div className={`${t.headerBg} ${t.headerText} p-4 shrink-0 flex justify-between items-center`}>
              <h3 className="font-bold text-lg">{modalPoste.id ? 'Modifier le poste' : 'Nouveau poste & Grille de besoins'}</h3>
              <button type="button" onClick={() => setModalPoste({...modalPoste, isOpen: false})} className="hover:opacity-75 font-bold text-lg">✖</button>
            </div>
            <form onSubmit={validerPosteModal} className="flex flex-col overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="flex gap-4">
                  <div className="flex-[2]">
                    <label className={`block text-xs font-bold uppercase mb-1 ${t.header}`}>Nom du poste</label>
                    <input type="text" required value={modalPoste.nom} onChange={e => setModalPoste({...modalPoste, nom: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm bg-transparent font-bold`} placeholder="Ex: Loge, Cantine..." autoFocus />
                  </div>
                  <div className="flex-1">
                    <label className={`block text-xs font-bold uppercase mb-1 ${t.header}`}>Effectif (Qte)</label>
                    <input type="number" min="1" required value={modalPoste.qte} onChange={e => setModalPoste({...modalPoste, qte: e.target.value})} className={`w-full border ${t.borderLight} rounded p-2 text-sm text-center font-bold bg-transparent`} />
                  </div>
                  <div>
                    <label className={`block text-xs font-bold uppercase mb-1 ${t.header}`}>Couleur</label>
                    <input type="color" value={modalPoste.couleur} onChange={e => setModalPoste({...modalPoste, couleur: e.target.value})} className="w-10 h-10 rounded cursor-pointer p-0 border-0" />
                  </div>
                </div>
                
                <div className={`border ${t.borderLight} rounded-xl p-4 ${t.bgLight}`}>
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <h4 className={`font-bold text-sm ${t.header}`}>Grille horaire des besoins</h4>
                      <p className="text-[11px] text-gray-500">Définissez les créneaux récurrents de ce poste pour la semaine type.</p>
                    </div>
                    <button type="button" onClick={() => setModalPoste({...modalPoste, slots: [...modalPoste.slots, { id: Date.now(), start: '08:00', end: '12:00', days: { 1: true, 2: true, 3: true, 4: true, 5: true } }]})} className={`text-xs ${t.btnPrimary} px-2.5 py-1.5 rounded font-bold shadow-sm`}>➕ Ajouter une plage</button>
                  </div>

                  <div className="space-y-3">
                    {modalPoste.slots.map((slot, idx) => (
                      <div key={idx} className={`p-3 rounded-lg border ${t.borderLight} ${t.cardBg} flex flex-col gap-2 shadow-xs`}>
                        <div className="flex items-center gap-2">
                          <input type="time" required value={slot.start} onChange={e => {
                            const ns = [...modalPoste.slots]; ns[idx].start = e.target.value; setModalPoste({...modalPoste, slots: ns});
                          }} className={`border ${t.borderLight} p-1.5 text-xs rounded bg-transparent w-28 text-center font-bold ${t.header}`} />
                          <span className="text-gray-400 text-xs font-bold">à</span>
                          <input type="time" required value={slot.end} onChange={e => {
                            const ns = [...modalPoste.slots]; ns[idx].end = e.target.value; setModalPoste({...modalPoste, slots: ns});
                          }} className={`border ${t.borderLight} p-1.5 text-xs rounded bg-transparent w-28 text-center font-bold ${t.header}`} />
                          
                          <button type="button" onClick={() => {
                            const ns = [...modalPoste.slots]; ns.splice(idx, 1); setModalPoste({...modalPoste, slots: ns});
                          }} className="text-red-500 hover:text-red-700 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ml-auto" title="Retirer cette plage">✖</button>
                        </div>
                        <div className="flex gap-1.5 mt-1">
                          {[1, 2, 3, 4, 5].map(day => (
                            <label key={day} className={`flex-1 flex items-center justify-center py-1 rounded border text-[11px] font-bold cursor-pointer transition-colors ${slot.days[day] ? `${t.btnPrimary} border-transparent shadow-xs` : `bg-transparent text-gray-500 border-black/10 hover:bg-black/5`}`}>
                              <input type="checkbox" className="hidden" checked={slot.days[day]} onChange={e => {
                                const ns = [...modalPoste.slots]; ns[idx].days[day] = e.target.checked; setModalPoste({...modalPoste, slots: ns});
                              }} />
                              {nomsJours[day % 7]}
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                    {modalPoste.slots.length === 0 && (
                      <p className="text-xs italic text-gray-500 text-center py-2">Aucune plage horaire définie. Cliquez sur "Ajouter une plage".</p>
                    )}
                  </div>
                </div>
              </div>
              <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} shrink-0 flex justify-end gap-3`}>
                <button type="button" onClick={() => setModalPoste({...modalPoste, isOpen: false})} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded font-medium text-sm">Annuler</button>
                <button type="submit" className={`px-5 py-2 ${t.btnPrimary} rounded font-bold text-sm shadow`}>{modalPoste.id ? 'Mettre à jour' : 'Créer le poste'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

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

      {modalParametres && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 no-print">
          <div className={`${t.cardBg} rounded-xl shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[90vh] border ${t.borderLight}`}>
            <div className={`${t.headerBg} ${t.headerText} p-5 flex justify-between items-center shrink-0`}>
              <h3 className="font-bold text-xl">⚙️ Paramètres Généraux</h3>
              <button onClick={() => setModalParametres(false)} className="hover:opacity-50 font-bold text-xl transition-opacity">✖</button>
            </div>
            
            <div className={`p-6 overflow-y-auto flex-1 ${t.bgMain}`}>
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                <div className="lg:col-span-7 flex flex-col gap-6">
                  
                  <div className={`${t.cardBg} p-5 rounded-xl border ${t.borderLight} shadow-sm`}>
                    <h4 className={`font-bold text-lg ${t.header} mb-4`}>🕒 Horaires & Amplitude</h4>
                    
                    <div className="flex gap-4 mb-4 pb-4 border-b border-black/10 dark:border-white/10">
                      <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Début de journée</label>
                        <input type="time" value={amplitude.start} onChange={e => setAmplitude({...amplitude, start: e.target.value})} className={`mt-1 w-full border ${t.borderLight} rounded-lg p-2 text-sm bg-transparent font-bold`} />
                      </div>
                      <div className="flex-1">
                        <label className="text-xs font-bold text-gray-500 uppercase">Fin de journée</label>
                        <input type="time" value={amplitude.end} onChange={e => setAmplitude({...amplitude, end: e.target.value})} className={`mt-1 w-full border ${t.borderLight} rounded-lg p-2 text-sm bg-transparent font-bold`} />
                      </div>
                    </div>

                    <h5 className={`font-bold text-sm ${t.header} mb-1`}>🔔 Heures de Sonneries</h5>
                    <p className="text-xs text-gray-500 mb-3">Séparez par des virgules. Elles apparaîtront en traits pleins.</p>
                    <textarea 
                      value={sonneriesText} 
                      onChange={(e) => setSonneriesText(e.target.value)}
                      onBlur={handleSonneriesBlur}
                      className={`w-full border ${t.borderLight} rounded-lg p-3 text-sm bg-transparent font-mono shadow-inner`}
                      rows="2"
                      placeholder="Ex: 08:00, 08:55, 10:05..."
                    />
                  </div>

                  <div className={`${t.cardBg} p-5 rounded-xl border ${t.borderLight} shadow-sm flex-1 flex flex-col`}>
                    <h4 className={`font-bold text-lg ${t.header} mb-4`}>🏖️ Périodes de Vacances & Fériés</h4>
                    
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
                        if (formTypeEvent === 'absence') {
                          supprimerAbsence(String(modalCreation.eventId).replace('abs_','').split('_')[0]);
                        } else {
                          applyAction('delete', { 
                            id: modalCreation.eventId, 
                            start: `${modalCreation.date}T${modalCreation.start || '08:00'}:00` 
                          });
                        }
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
            </form>
          </div>
        </div>
      )}

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
                
                <div className="flex flex-col mt-2">
                  <label className={`block text-sm font-semibold mb-1 ${t.header}`}>Jours de présence (Semaine Type)</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map(day => (
                      <label key={day} className={`flex-1 flex items-center justify-center py-1.5 rounded border text-[11px] font-bold cursor-pointer transition-colors ${modalAgent.jours?.[day] ? `${t.btnPrimary} border-transparent shadow-sm` : `bg-transparent text-gray-400 border-gray-300 hover:bg-black/5`}`}>
                        <input type="checkbox" className="hidden" checked={modalAgent.jours?.[day] || false} onChange={e => setModalAgent({...modalAgent, jours: {...(modalAgent.jours || {1:true,2:true,3:true,4:true,5:true}), [day]: e.target.checked}})} />
                        {['LUN', 'MAR', 'MER', 'JEU', 'VEN'][day - 1]}
                      </label>
                    ))}
                  </div>
                </div>

              </div>
              <div className={`p-4 ${t.bgLight} border-t ${t.borderLight} flex justify-end gap-3`}><button type="button" onClick={() => setModalAgent({...modalAgent, isOpen: false})} className="px-4 py-2 text-gray-500 hover:opacity-75 rounded">Annuler</button><button type="submit" className={`px-5 py-2 ${t.btnPrimary} rounded`}>{modalAgent.id ? 'Mettre à jour' : 'Créer'}</button></div>
            </form>
          </div>
        </div>
      )}

      <div className={`w-80 ${t.sidebar} shadow-lg flex flex-col z-20 border-r ${t.borderLight} no-print shrink-0 transition-colors`}>
        <div className={`p-4 ${t.sidebarText} flex flex-col gap-3 shrink-0`}>
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold tracking-wider">Planning CPE</h1>
          </div>
          
          <div className="flex items-center justify-between bg-black/10 p-1.5 rounded-lg gap-1">
            <input type="file" id="import-file" accept=".json" onChange={importerDonnees} className="hidden" />
            <button onClick={() => document.getElementById('import-file').click()} className={`${t.sidebarIconBtn} p-2 rounded text-xs shadow border transition-colors flex-1 flex justify-center`} title="Restaurer une sauvegarde">⬆️</button>
            <button onClick={handleExport} className={`relative p-2 rounded text-xs shadow border transition-colors flex-1 flex justify-center ${needsBackup ? 'bg-orange-600 hover:bg-orange-500 border-orange-500 text-white' : t.sidebarIconBtn}`} title="Sauvegarder les données (Fichier JSON)">
              ⬇️{needsBackup && <span className="absolute -top-1 -right-1 flex h-3 w-3"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span><span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span></span>}
            </button>

            <div className="relative flex-1 flex justify-center">
              <button 
                onClick={() => setShowNotificationMenu(!showNotificationMenu)} 
                className={`${t.sidebarIconBtn} p-2 rounded text-xs shadow border transition-colors w-full flex items-center justify-center relative`}
                title="Centre de notifications"
              >
                🔔
                {activeAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black w-3.5 h-3.5 rounded-full flex items-center justify-center shadow-sm">
                    {activeAlerts.length}
                  </span>
                )}
              </button>

              {showNotificationMenu && (
                <div className={`absolute left-0 mt-9 w-72 rounded-xl shadow-2xl border ${t.borderLight} ${t.cardBg} z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150`}>
                  <div className={`${t.headerBg} p-3 flex justify-between items-center border-b ${t.borderLight}`}>
                    <h3 className={`font-bold text-xs uppercase tracking-wider ${t.headerText}`}>Centre d'alertes</h3>
                    <button onClick={() => setShowNotificationMenu(false)} className="text-xs font-bold opacity-70 hover:opacity-100">✖</button>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-2 space-y-2">
                    {activeAlerts.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-xs italic">
                        Aucun problème détecté tout est en ordre 👍
                      </div>
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

            <button onClick={toggleDarkMode} className={`${t.sidebarIconBtn} p-2 rounded text-xs shadow border transition-colors flex-1 flex justify-center`} title="Mode Sombre / Clair">{isDarkMode ? '☀️' : '🌙'}</button>
            <button onClick={() => setModalParametres(true)} className={`${t.sidebarIconBtn} p-2 rounded text-xs shadow border transition-colors flex-1 flex justify-center`} title="Paramètres">⚙️</button>
            <button onClick={declencherImpression} className={`${t.sidebarIconBtn} p-2 rounded text-xs font-bold border transition-colors flex-1 flex justify-center`} title="Imprimer">🖨️</button>
            <button onClick={resetAllData} className="bg-red-700 hover:bg-red-800 p-2 rounded text-xs font-bold border border-red-500 text-white flex-1 flex justify-center shadow-sm" title="Tout réinitialiser">🗑️</button>
          </div>

          <div className="flex flex-col bg-black/10 rounded p-2 shadow-inner gap-1 mt-2">
            <button onClick={() => setVueActive('journee')} className={`text-base font-medium py-2 rounded transition ${vueActive === 'journee' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>⏱️ Vue Quotidienne</button>
            <button onClick={() => setVueActive('template')} className={`text-base font-medium py-2 rounded transition ${vueActive === 'template' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>📐 Modèle : Semaine Type</button>
            <button onClick={() => setVueActive('planning')} className={`text-base font-medium py-2 rounded transition ${vueActive === 'planning' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>📅 Planning Hebdo (Réel)</button>
            <button onClick={() => setVueActive('dashboard')} className={`text-base font-medium py-2 rounded transition ${vueActive === 'dashboard' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>📊 Bilan Équipe</button>
            <button onClick={() => { setVueActive('agent'); if(!agentConsulte) setAgentConsulte(agents[0]?.id); }} className={`text-base font-medium py-2 rounded transition ${vueActive === 'agent' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>👤 Calendriers Individuels</button>
            <button onClick={() => setVueActive('absences')} className={`text-base font-medium py-2 rounded transition ${vueActive === 'absences' ? t.activeTab : `${t.textMenuMuted} hover:opacity-75`}`}>📋 Absences & Retards</button>
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

            {modeEdition === 'agents' && (
              <div className="animate-in fade-in">
                <div>
                  <div className="flex justify-between items-center mb-2"><h2 className={`font-bold ${t.header} text-sm`}>Agents</h2><button onClick={() => setModalAgent({isOpen: true, nom: '', quotite: 100, estEtudiant: false, hContrat: calculerContratBetty(100, false), couleurFond: '#3B82F6'})} className="bg-black/10 w-5 h-5 rounded-full text-xs font-bold hover:bg-black/20 text-gray-600">+</button></div>
                  <ul className="space-y-1">
                    {statsAgents.map((agent) => {
                    const weekEvents = vueActive === 'template' ? currentTemplate.events : getEventsForWeek(targetMonday);
                    const agentWeekMins = weekEvents.filter(e => e.extendedProps?.agentId === agent.id && !e.extendedProps?.isAbsence).reduce((acc, evt) => {
                        return acc + (new Date(evt.end) - new Date(evt.start)) / 60000;
                      }, 0);
                      const agentWeekHours = agentWeekMins / 60;
                      const objectifHebdoAgent = agent.hContrat / 36;
                      const diffAgentHebdo = agentWeekHours - objectifHebdoAgent;

                      return (
                        <li key={agent.id} onClick={() => setAgentActif(agentActif === agent.id ? null : agent.id)} className={`flex justify-between items-center p-3 rounded border-l-4 cursor-pointer ${agentActif === agent.id ? `${t.bgLight} ${t.textAccent} font-bold ring-1 border-black/10` : `${t.cardBg} hover:opacity-80`}`} style={{ borderLeftColor: agent.couleurFond }}>
                          <div className="flex flex-col leading-tight">
                            <span className={`text-base font-bold ${t.header}`}>{agent.nom} {agent.estEtudiant && '🎓'}</span>
                            <div className="flex gap-2 mt-1">
                              <span className="text-xs font-mono text-gray-500 font-semibold" title="Total planifié cette semaine">
                                Sem: {formatHeureTableau(agentWeekHours, true)}
                              </span>
                              <span className={`text-xs font-mono font-bold ${diffAgentHebdo >= 0 ? 'text-emerald-600' : 'text-orange-500'}`} title="Écart par rapport à l'objectif hebdo théorique">
                                ({diffAgentHebdo > 0 ? '+' : ''}{formatHeureTableau(diffAgentHebdo, true)})
                              </span>
                            </div>
                            <span className={`text-xs font-mono mt-1 ${agent.soldeGlobal > 0 ? 'text-green-600' : (agent.soldeGlobal < 0 ? 'text-red-500' : 'text-gray-500')}`}>
                              Solde global: {agent.soldeGlobal > 0 ? '+' : ''}{formatHeureTableau(agent.soldeGlobal, true)}
                            </span>
                          </div>
                          <div className="flex gap-1.5 items-center shrink-0">
                            <button onClick={(e) => { e.stopPropagation(); setModalAgent({isOpen:true, ...agent}); }} className="text-gray-400 hover:text-gray-800 text-sm px-1">⚙️</button>
                            <button onClick={(e) => supprimerAgent(agent.id, agent.nom, e)} className="text-red-400 hover:text-red-600 text-sm px-1">✖</button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className={`font-bold ${t.header} text-sm`}>Postes</h2>
                    <button onClick={ouvrirCreationPoste} className="bg-black/10 w-5 h-5 rounded-full text-xs font-bold hover:bg-black/20 text-gray-600 flex items-center justify-center">+</button>
                  </div>
                  <ul className="space-y-1">
                    {postes.map((poste) => (
                      <li key={poste.id} onClick={() => setPosteActif(posteActif === poste.id ? null : poste.id)} className={`flex justify-between items-center p-2 rounded border-l-4 cursor-pointer text-sm ${posteActif === poste.id ? `${t.bgLight} ${t.textAccent} font-bold ring-1 border-black/10` : `${t.cardBg} hover:opacity-80`}`} style={{ borderLeftColor: poste.couleur }}>
                        <span className={t.header}>{poste.nom}</span>
                        <div className="flex gap-1 items-center shrink-0">
                          <button onClick={(e) => { e.stopPropagation(); ouvrirEditionPoste(poste); }} className="text-gray-400 hover:text-gray-800 text-xs px-1">⚙️</button>
                          <button onClick={(e) => supprimerPoste(poste.id, e)} className="text-red-400 hover:text-red-600 text-xs px-1">✖</button>
                        </div>
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
{/* ========================================================= */}
      {/* ZONE PRINCIPALE D'AFFICHAGE (LE CALENDRIER ET LES BILANS) */}
      {/* ========================================================= */}
      <div id="print-area" className={`flex-1 flex flex-col h-full overflow-hidden ${t.cardBg}`}>  
      
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

                    <div className="flex-1 overflow-x-auto overflow-y-auto flex flex-col">
                      <div className="min-w-[800px] flex-1 flex flex-col relative">
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

                            return (
                              <div key={agent.id} className={`flex border-b ${t.borderLight} flex-1 relative group hover:bg-black/5 transition-colors min-h-[60px]`}>
                                <div className={`w-32 shrink-0 flex flex-col items-end justify-center p-2 border-r ${t.borderLight} z-10 shadow-[2px_0_5px_rgba(0,0,0,0.05)]`} style={{ backgroundColor: agent.couleurFond, color: getContrastYIQ(agent.couleurFond) }}>
                                  <span className="text-sm font-black text-right leading-tight">{agent.nom}</span>
                                  <span className="text-[10px] font-mono font-bold opacity-80">{heuresJourStr}</span>
                                </div>
                                <div className="flex-1 relative my-1 cursor-crosshair group/timeline select-none" onMouseDown={(e) => {
                                  if (e.target !== e.currentTarget) return;
                                  const track = e.currentTarget;
                                  const rect = track.getBoundingClientRect();
                                  const startPercent = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                                  const startMins = Math.round((limitesHeures.baseMins + (startPercent * limitesHeures.span)) / 5) * 5;
                                  
                                  let currentEndMins = Math.min(startMins + 60, limitesHeures.baseMins + limitesHeures.span);
                                  let hasMoved = false;

                                  const ghostEl = document.createElement('div');
                                  ghostEl.className = 'absolute top-0.5 bottom-0.5 rounded bg-blue-500/40 border border-blue-600 border-dashed z-30 pointer-events-none flex items-center justify-center text-[9px] font-bold text-blue-950 dark:text-blue-100 shadow-sm';
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
                                    hasMoved = true;
                                    const movePercent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
                                    currentEndMins = Math.round((limitesHeures.baseMins + (movePercent * limitesHeures.span)) / 5) * 5;
                                    updateGhost(startMins, currentEndMins);
                                  };

                                  const onMouseUp = () => {
                                    window.removeEventListener('mousemove', onMouseMove);
                                    window.removeEventListener('mouseup', onMouseUp);
                                    ghostEl.remove();

                                    const finalStart = Math.min(startMins, currentEndMins);
                                    const finalEnd = Math.max(startMins, currentEndMins);
                                    const actualEnd = hasMoved ? finalEnd : (finalStart + 60);

                                    if (actualEnd - finalStart >= 5) {
                                      const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                                      setFormTypeEvent('affectation');
                                      setFormTypeAbsence('absence');
                                      setFormAbsenceDeduire(false);
                                      setFormAgent(agent.id);
                                      setFormPoste(posteActif || (postes[0] ? postes[0].id : ''));
                                      setFormNote('');
                                      setModalCreation({
                                        isOpen: true,
                                        eventId: null,
                                        date: jourConsulte,
                                        start: formatTime(finalStart),
                                        end: formatTime(actualEnd)
                                      });
                                    }
                                  };

                                  window.addEventListener('mousemove', onMouseMove);
                                  window.addEventListener('mouseup', onMouseUp);
                                }}>
                                  {eventsDuJour.map(evt => {
                                    const startD = new Date(evt.start); 
                                    const endD = new Date(evt.end);
                                    const startMins = startD.getHours() * 60 + startD.getMinutes(); 
                                    const endMins = endD.getHours() * 60 + endD.getMinutes();
                                    const left = Math.max(0, ((startMins - limitesHeures.baseMins) / limitesHeures.span) * 100);
                                    const width = Math.min(100 - left, ((endMins - startMins) / limitesHeures.span) * 100);
                                    const isShort = (endMins - startMins) <= 20;
                                    
                                    const posteCouleur = evt.extendedProps?.posteCouleur || '#3b82f6';
                                    const textColor = getContrastYIQ(posteCouleur);
                                    
                                    return (
                                      <div key={evt.id} className="absolute top-0.5 bottom-0.5 rounded shadow-sm text-[10px] flex flex-col justify-center px-1 overflow-hidden border cursor-pointer hover:ring-2 transition-all z-10 group/item"
                                        style={{ left: `${left}%`, width: `${width}%`, backgroundColor: posteCouleur, borderColor: 'rgba(0,0,0,0.2)', color: textColor }}
                                        onClick={(e) => { e.stopPropagation(); ouvrirEdition(evt); }} 
                                        title={`${evt.extendedProps?.posteNom} (${extractTimeStr(evt.start)} - ${extractTimeStr(evt.end)})`}>
                                        
                                        <div className="flex justify-between items-center w-full pointer-events-none">
                                          <span className="font-bold truncate leading-tight">{evt.extendedProps?.posteNom || 'Poste'}</span>
                                          {isShort && <span className="text-[7px] opacity-90 truncate ml-1 shrink-0">{extractTimeStr(evt.start)}-{extractTimeStr(evt.end)}</span>}
                                        </div>
                                        {!isShort && <span className="text-[8px] opacity-85 truncate leading-none mt-0.5 pointer-events-none">{extractTimeStr(evt.start)} - {extractTimeStr(evt.end)}</span>}

                                        <div className="absolute left-0 inset-y-0 w-2 cursor-w-resize hover:bg-black/30 z-20 group-hover/item:opacity-100 opacity-0 transition-opacity" title="Glisser pour modifier le début"
                                          onMouseDown={(e) => {
                                            e.stopPropagation();
                                            const track = e.currentTarget.closest('.flex-1.relative.my-1');

                                            const onMouseMove = (moveEvent) => {
                                              const rect = track.getBoundingClientRect();
                                              const offsetX = moveEvent.clientX - rect.left;
                                              const percent = Math.max(0, Math.min(1, offsetX / rect.width));
                                              let newStart = Math.round((limitesHeures.baseMins + (percent * limitesHeures.span)) / 5) * 5;
                                              newStart = Math.max(limitesHeures.baseMins, Math.min(newStart, endMins - 5));
                                              
                                              const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                                              applyAction('update', { id: evt.id, start: `${jourConsulte}T${formatTime(newStart)}:00`, end: evt.end });
                                            };
                                            const onMouseUp = () => {
                                              window.removeEventListener('mousemove', onMouseMove);
                                              window.removeEventListener('mouseup', onMouseUp);
                                            };
                                            window.addEventListener('mousemove', onMouseMove);
                                            window.addEventListener('mouseup', onMouseUp);
                                          }}></div>

                                        <div className="absolute right-0 inset-y-0 w-2 cursor-e-resize hover:bg-black/30 z-20 group-hover/item:opacity-100 opacity-0 transition-opacity" title="Glisser pour modifier la fin"
                                          onMouseDown={(e) => {
                                            e.stopPropagation();
                                            const track = e.currentTarget.closest('.flex-1.relative.my-1');

                                            const onMouseMove = (moveEvent) => {
                                              const rect = track.getBoundingClientRect();
                                              const offsetX = moveEvent.clientX - rect.left;
                                              const percent = Math.max(0, Math.min(1, offsetX / rect.width));
                                              let newEnd = Math.round((limitesHeures.baseMins + (percent * limitesHeures.span)) / 5) * 5;
                                              newEnd = Math.max(startMins + 5, Math.min(newEnd, limitesHeures.baseMins + limitesHeures.span));
                                              
                                              const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                                              applyAction('update', { id: evt.id, start: evt.start, end: `${jourConsulte}T${formatTime(newEnd)}:00` });
                                            };
                                            const onMouseUp = () => {
                                              window.removeEventListener('mousemove', onMouseMove);
                                              window.removeEventListener('mouseup', onMouseUp);
                                            };
                                            window.addEventListener('mousemove', onMouseMove);
                                            window.addEventListener('mouseup', onMouseUp);
                                          }}></div>
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
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* 2. VUE MODELE (SEMAINE TYPE) */}
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
            </div>

            <div className="flex-1 overflow-hidden px-4 pb-4">
              {isPrinting ? (
                <PrintTimeGridView events={displayEvents} agents={agents} limitesHeures={limitesHeures} amplitude={amplitude} titre={`Modèle : ${currentTemplate.nom} ...`} />
              ) : (
                <div className={`${t.cardBg} rounded-xl shadow border h-full p-2 ${currentTemplate.statut === 'brouillon' ? 'border-[#3B82F6] border-dashed border-2' : t.borderLight}`}>
                  <div className={`h-full transition-all duration-300 ${currentTemplate.statut === 'valide' ? 'pointer-events-none opacity-85 grayscale-[15%]' : ''}`}>
                    <FullCalendar
                      key={`cal-${vueActive}-${isDarkMode}`}
                      plugins={[timeGridPlugin, interactionPlugin]}
                      initialView="timeGridWeek"
                      locale="fr"
                      firstDay={1} 
                      initialDate={currentTemplate.dateDebut}
                      headerToolbar={false} 
                      dayHeaderFormat={{ weekday: 'long' }} 
                      allDaySlot={false}
                      slotMinTime={limitesHeures.minStr}
                      slotMaxTime={limitesHeures.maxStr}
                      slotDuration="00:05:00"
                      slotLabelInterval="00:05:00"
                      slotLabelContent={renderSlotLabel}
                      snapDuration="00:05:00"
                      hiddenDays={[0, 6]}
                      editable={currentTemplate.statut === 'brouillon'} 
                      eventDurationEditable={true}
                      eventResizableFromStart={true}
                      selectable={currentTemplate.statut === 'brouillon'}
                      selectMirror={true}
                      dayMaxEvents={true}
                      height="100%"
                      events={displayEvents}
                      slotEventOverlap={false} 
                      eventOrder="extendedProps.agentNom,start"
                      eventResize={gererModificationEvenement}
                      eventDrop={gererModificationEvenement}
                      select={gererSelection}
                      eventContent={renderEventContent}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. VUE PLANNING REEL */}
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
            </div>
            
            <div className="flex-1 overflow-hidden px-4 pb-4">
              {isPrinting ? (
                <PrintTimeGridView events={displayEvents} agents={agents} limitesHeures={limitesHeures} amplitude={amplitude} titre={`Planning Hebdo du ${currentViewMonday}`} />
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
                    dayHeaderFormat={{ weekday: 'long' }} 
                    allDaySlot={false}
                    editable={true}
                    eventDurationEditable={true}
                    eventResizableFromStart={true}
                    slotMinTime={limitesHeures.minStr}
                    slotMaxTime={limitesHeures.maxStr}
                    slotDuration="00:05:00"
                    snapDuration="00:05:00"
                    hiddenDays={[0, 6]}
                    selectable={true}
                    selectMirror={true}
                    dayMaxEvents={true}
                    height="100%"
                    events={displayEvents}
                    slotEventOverlap={false} 
                    eventOrder="extendedProps.agentNom,start"
                    eventResize={gererModificationEvenement}
                    eventDrop={gererModificationEvenement}
                    select={gererSelection}
                    eventContent={renderEventContent}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. VUE BILAN EQUIPE */}
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
                        <td className={`p-4 text-center border-r ${t.borderLight}`}>
                          <span className="px-2 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: agent.couleurFond, color: getContrastYIQ(agent.couleurFond) }}>
                            {agent.quotite}%
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
          .print-weekly-page { width: 100%; height: 180mm !important; max-height: 180mm !important; overflow: hidden !important; box-sizing: border-box; page-break-after: avoid !important; page-break-inside: avoid !important; }
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