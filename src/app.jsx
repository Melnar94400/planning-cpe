import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

// --- FONCTION DE RÉINITIALISATION GLOBALE ---
const resetAllData = () => {
  if(window.confirm("⚠️ ATTENTION ⚠️\n\nVoulez-vous vraiment effacer TOUTES les données (Modèles, Plannings, Absences, Agents) ?\nCette action est totalement irréversible.")) {
    localStorage.clear();
    window.location.reload();
  }
};

// --- ALGORITHME ANTI-CHEVAUCHEMENT POUR L'IMPRESSION DU PLANNING ---
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

// --- GRILLE HORAIRE VISUELLE POUR IMPRESSION (SEMAINE) ---
const PrintTimeGridView = ({ events, titre }) => {
  const planningEvents = events.filter(e => !e.extendedProps?.isBesoin);
  const nomsJours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
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
          {hours.map(h => {
            const hMins = h * 60;
            const topPercent = ((hMins - BASE_MINS) / TOTAL_SPAN) * 100;
            if (topPercent < 0 || topPercent > 100) return null;
            return (
              <div key={h} className="absolute w-full pr-2 text-right" style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}>
                {h}:00
              </div>
            );
          })}
        </div>

        <div className="flex-1 grid grid-cols-5 relative bg-white">
          {[1, 2, 3, 4, 5].map(day => {
            const dayEvents = planningEvents.filter(e => new Date(e.start).getDay() === day);
            const layoutedEvents = layoutDayEvents(dayEvents); 

            return (
              <div key={day} className="flex flex-col border-r border-black last:border-r-0 relative">
                <div className="bg-gray-200 font-black text-center py-1 border-b border-black uppercase text-xs text-gray-800 shrink-0">
                  {nomsJours[day - 1]}
                </div>
                
                <div className="flex-1 relative bg-white">
                  {hours.map(h => {
                    const hMins = h * 60;
                    const topPercent = ((hMins - BASE_MINS) / TOTAL_SPAN) * 100;
                    if (topPercent < 0 || topPercent > 100) return null;
                    return (
                      <div key={h} className="absolute w-full border-b border-gray-100 pointer-events-none" style={{ top: `${topPercent}%` }}></div>
                    );
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
                      <div 
                        key={evt.id} 
                        className={`absolute rounded p-1 border overflow-hidden shadow-xs ${bgClass}`}
                        style={{
                          top: `${top}%`,
                          height: `${Math.max(height, 4)}%`,
                          left: `${leftPercent}%`,
                          width: `${widthPercent}%`,
                          borderLeftColor: couleur,
                          borderLeftWidth: '4px',
                          fontSize: '9px',
                          lineHeight: '1.1',
                          boxSizing: 'border-box'
                        }}
                      >
                        <div className="font-black truncate text-[9px]" style={{ color: couleur }}>
                          {isAbs ? (evt.extendedProps?.typeAbsence === 'absence' ? 'ABSENCE' : 'RETARD') : evt.extendedProps?.posteNom}
                        </div>
                        <div className="font-bold truncate text-[8px] text-gray-800">{evt.extendedProps?.agentName || evt.extendedProps?.agentNom}</div>
                        <div className="text-[7px] opacity-75 font-mono">{startD.getHours()}h{String(startD.getMinutes()).padStart(2,'0')}-{endD.getHours()}h{String(endD.getMinutes()).padStart(2,'0')}</div>
                        {isAbs && <div className="italic text-[7px] text-gray-600 truncate">{evt.extendedProps?.motif}</div>}
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

// --- COMPOSANT D'IMPRESSION POUR CALENDRIER ANNUEL (2 PAGES / RECTO-VERSO) ---
const PrintAgentYearlyView = ({ agent, anneeScolaire, getMondayStr, getInfoJourFerie, customWeeks, gabarits, exceptions, formatHeureTableau, absences }) => {
  const semestre1 = anneeScolaire.slice(0, 6); 
  const semestre2 = anneeScolaire.slice(6);    
  const nomsJours = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

  const renderTable = (moisList, title, pageNum) => (
    <div className="print-agent-page flex flex-col justify-between p-4 bg-white">
      <div className="text-center font-black text-lg uppercase mb-3 text-black border-b-2 border-black pb-2 shrink-0">
        Bilan Annuel : {agent?.nom} — {title} (2026-2027)
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
                  const mondayStr = getMondayStr(dateObj);
                  
                  const dayOfWeek = dateObj.getDay();
                  const nomJour = nomsJours[dayOfWeek];
                  const estWeekEnd = dayOfWeek === 0 || dayOfWeek === 6;
                  const infoFerie = getInfoJourFerie(dateObj);

                  let hDefaut = 0;
                  if (!estWeekEnd && !infoFerie) {
                    const applicableTemplate = [...window.__templateVersions__].sort((a,b)=>b.dateDebut.localeCompare(a.dateDebut)).find(t => t.dateDebut <= dateStr) || window.__templateVersions__[0];
                    if (customWeeks[mondayStr]) hDefaut = customWeeks[mondayStr].filter(e => e.extendedProps?.agentId === agent.id && e.start.startsWith(dateStr) && !e.extendedProps?.isAbsence && !e.extendedProps?.isBesoin).reduce((tot, e) => tot + ((new Date(e.end) - new Date(e.start)) / 3600000), 0);
                    else hDefaut = gabarits[applicableTemplate.id]?.[agent.id]?.[dayOfWeek] || 0;
                  }
                  
                  const exc = exceptions[`${agent.id}_${dateStr}`];
                  let hFinal = exc ? exc.h : hDefaut;
                  
                  const absDuJour = absences.filter(a => a.agentId === agent.id && a.start.startsWith(dateStr));
                  const hDeduct = absDuJour.filter(a => a.deduire).reduce((tot, a) => tot + ((new Date(a.end) - new Date(a.start))/3600000), 0);
                  hFinal = Math.max(0, hFinal - hDeduct);

                  let noteAffichage = infoFerie ? infoFerie : (exc ? exc.note : '');
                  if (absDuJour.length > 0) {
                    const txtAbs = absDuJour.map(a => `${a.type.toUpperCase()}${a.deduire?' (-h)':''}`).join(', ');
                    noteAffichage = noteAffichage ? `${noteAffichage} / ${txtAbs}` : txtAbs;
                  }

                  let bgJour = "bg-[#c6f6d5]"; 
                  if (dayOfWeek === 0) bgJour = "bg-yellow-200"; 
                  if (dayOfWeek === 6) bgJour = "bg-yellow-50";  
                  if (infoFerie) bgJour = "bg-red-500 text-white font-bold";
                  if (absDuJour.length > 0) bgJour = "bg-red-200 text-red-900 font-bold";

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
      {renderTable(semestre1, "Semestre 1 (Septembre - Février)", 1)}
      {renderTable(semestre2, "Semestre 2 (Mars - Juillet)", 2)}
    </div>
  );
};

export default function App() {
  const [vueActive, setVueActive] = useState('template'); 
  const [agentConsulte, setAgentConsulte] = useState(null); 

  // --- 1. SAUVEGARDES LOCALES ---
  const [agents, setAgents] = useState(() => {
    const s = localStorage.getItem('edt-agents');
    return s ? JSON.parse(s) : [
      { id: 1, nom: 'Célia', quotite: 100, hContrat: 1607, couleurFond: '#10B981' },
      { id: 2, nom: 'Marc', quotite: 80, hContrat: 1285, couleurFond: '#3B82F6' },
      { id: 3, nom: 'Yasmine', quotite: 100, hContrat: 1393, couleurFond: '#F59E0B' }
    ];
  });

  const [postes, setPostes] = useState(() => {
    const s = localStorage.getItem('edt-postes');
    return s ? JSON.parse(s) : [
      { id: 101, nom: 'Loge', couleur: '#EF4444' },
      { id: 102, nom: 'Cantine', couleur: '#F59E0B' },
      { id: 103, nom: 'Grille', couleur: '#8B5CF6' }
    ];
  });

  const [periodesFeriees, setPeriodesFeriees] = useState(() => {
    const s = localStorage.getItem('edt-periodes');
    return s ? JSON.parse(s) : [
      { id: 1, nom: 'Toussaint', debut: '2026-10-17', fin: '2026-11-01' },
      { id: 2, nom: 'Noël', debut: '2026-12-19', fin: '2027-01-03' },
      { id: 3, nom: 'Hiver (C)', debut: '2027-02-20', fin: '2027-03-07' },
      { id: 4, nom: 'Printemps (C)', debut: '2027-04-17', fin: '2027-05-02' },
      { id: 5, nom: 'Vac. Été', debut: '2027-07-07', fin: '2028-08-31' },
      { id: 6, nom: 'Armistice', debut: '2026-11-11', fin: '2026-11-11' }
    ];
  });

  const [templateVersions, setTemplateVersions] = useState(() => {
    const s = localStorage.getItem('edt-template-versions');
    if (s) return JSON.parse(s).map(p => ({ ...p, statut: p.statut || 'valide' }));
    
    const oldEvts = JSON.parse(localStorage.getItem('edt-template-events') || '[]');
    const oldBes = JSON.parse(localStorage.getItem('edt-besoins') || '[]');
    return [{ id: 1, nom: "Modèle Initial", dateDebut: "2026-08-25", events: oldEvts, besoins: oldBes, statut: 'brouillon' }];
  });

  window.__templateVersions__ = templateVersions;

  const [activeTemplateId, setActiveTemplateId] = useState(() => {
    const s = localStorage.getItem('edt-template-versions');
    return s ? JSON.parse(s)[0].id : 1;
  });

  const [customWeeks, setCustomWeeks] = useState(() => {
    const s = localStorage.getItem('edt-custom-weeks');
    return s ? JSON.parse(s) : {}; 
  });

  const [exceptions, setExceptions] = useState(() => {
    const s = localStorage.getItem('edt-exceptions');
    return s ? JSON.parse(s) : {}; 
  });

  // MIGRATION ET SAUVEGARDE DES ABSENCES
  const [absences, setAbsences] = useState(() => {
    const s = localStorage.getItem('edt-absences-retards');
    if (!s) return [];
    const parsed = JSON.parse(s);
    return parsed.map(a => {
      if (a.start && a.end) return a;
      // Migration des anciennes sauvegardes
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
        rattrape: a.rattrape || false
      };
    });
  });

  const currentTemplate = templateVersions.find(tv => tv.id === activeTemplateId) || templateVersions[0];

  // --- ÉTATS & MODALES ---
  const [modalCreation, setModalCreation] = useState({ isOpen: false, eventId: null, start: null, end: null });
  const [formTypeEvent, setFormTypeEvent] = useState('affectation'); 
  const [formTypeAbsence, setFormTypeAbsence] = useState('absence'); 
  const [formAbsenceDeduire, setFormAbsenceDeduire] = useState(false);
  const [formAgent, setFormAgent] = useState('');
  const [formPoste, setFormPoste] = useState('');
  const [formNote, setFormNote] = useState('');

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

  const [modalBesoinMulti, setModalBesoinMulti] = useState({
    isOpen: false, posteId: '', qte: 1,
    slots: []
  });

  const [modalEditBesoin, setModalEditBesoin] = useState({ isOpen: false, id: null, posteId: '', qte: 1, start: '', end: '' });
  const [modalAgent, setModalAgent] = useState({ isOpen: false, id: null, nom: '', quotite: 100, hContrat: 1607, couleurFond: '#10B981' });
  const [modalParametres, setModalParametres] = useState(false);
  const [formPeriode, setFormPeriode] = useState({ nom: '', debut: '', fin: '' });

  const [modalPrint, setModalPrint] = useState(false);
  const [printFilter, setPrintFilter] = useState({ type: 'all', id: null });
  const [isPrinting, setIsPrinting] = useState(false);

  const [modeEdition, setModeEdition] = useState('agents'); 
  const [formBesoinQte, setFormBesoinQte] = useState(1);
  const [agentActif, setAgentActif] = useState(null);
  const [posteActif, setPosteActif] = useState(null);
  const [currentViewMonday, setCurrentViewMonday] = useState(null);

  useEffect(() => { localStorage.setItem('edt-agents', JSON.stringify(agents)); }, [agents]);
  useEffect(() => { localStorage.setItem('edt-postes', JSON.stringify(postes)); }, [postes]);
  useEffect(() => { localStorage.setItem('edt-periodes', JSON.stringify(periodesFeriees)); }, [periodesFeriees]);
  useEffect(() => { localStorage.setItem('edt-template-versions', JSON.stringify(templateVersions)); }, [templateVersions]);
  useEffect(() => { localStorage.setItem('edt-custom-weeks', JSON.stringify(customWeeks)); }, [customWeeks]);
  useEffect(() => { localStorage.setItem('edt-exceptions', JSON.stringify(exceptions)); }, [exceptions]);
  useEffect(() => { localStorage.setItem('edt-absences-retards', JSON.stringify(absences)); }, [absences]);

  useEffect(() => { if (vueActive === 'planning') setModeEdition('agents'); }, [vueActive]);

  // --- 2. GESTION DES DATES & ROBUSTESSE ---
  const formatHeureTableau = (decimal) => {
    if (!decimal || decimal === 0) return "";
    const h = Math.floor(Math.abs(decimal));
    const m = Math.round((Math.abs(decimal) - h) * 60);
    return `${decimal < 0 ? "-" : ""}${h}:${m.toString().padStart(2, '0')}`;
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

  const anneeScolaire = [
    { m: 8, y: 2026, nom: 'SEPTEMBRE' }, { m: 9, y: 2026, nom: 'OCTOBRE' },
    { m: 10, y: 2026, nom: 'NOVEMBRE' }, { m: 11, y: 2026, nom: 'DECEMBRE' },
    { m: 0, y: 2027, nom: 'JANVIER' }, { m: 1, y: 2027, nom: 'FEVRIER' },
    { m: 2, y: 2027, nom: 'MARS' }, { m: 3, y: 2027, nom: 'AVRIL' },
    { m: 4, y: 2027, nom: 'MAI' }, { m: 5, y: 2027, nom: 'JUIN' },
    { m: 6, y: 2027, nom: 'JUILLET' }
  ];
  const nomsJours = ['DIM', 'LUN', 'MAR', 'MER', 'JEU', 'VEN', 'SAM'];

  const getInfoJourFerie = (date) => {
    const pad = n => String(n).padStart(2, '0');
    const str = `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
    for (const v of periodesFeriees) {
      if (str >= v.debut && str <= v.fin) return v.nom;
    }
    return null;
  };

  // --- 3. MOTEUR ANNUEL (SOUSTRACTION INTELLIGENTE DES ABSENCES) ---
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

  const statsAgents = agents.map(agent => {
    let heuresConsommees = 0;
    for (let m = 8; m < 20; m++) {
      const year = 2026 + Math.floor(m / 12);
      const month = m % 12;
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let d = 1; d <= daysInMonth; d++) {
        const dateObj = new Date(year, month, d);
        const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
        const mondayStr = getMondayStr(dateObj);
        
        const estWeekEnd = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        const infoFerie = getInfoJourFerie(dateObj);
        const exc = exceptions[`${agent.id}_${dateStr}`];
        const applicableTemplate = [...templateVersions].sort((a,b)=>b.dateDebut.localeCompare(a.dateDebut)).find(t => t.dateDebut <= dateStr) || templateVersions[0];

        // 1. Calcul du temps de travail théorique du jour
        let hJour = 0;
        if (customWeeks[mondayStr]) {
          const evtsJour = customWeeks[mondayStr].filter(e => e.extendedProps?.agentId === agent.id && !e.extendedProps?.isAbsence && !e.extendedProps?.isBesoin && e.start.startsWith(dateStr));
          hJour = evtsJour.reduce((tot, e) => tot + ((new Date(e.end) - new Date(e.start)) / 3600000), 0);
        } else if (!estWeekEnd && !infoFerie) {
          hJour = gabarits[applicableTemplate.id]?.[agent.id]?.[dateObj.getDay()] || 0;
        }

        // 2. Remplacement manuel par le module "Exceptions" (clic sur grille annuelle)
        if (exc) {
          hJour = exc.h;
        }

        // 3. Soustraction des absences si l'option "Déduire" est activée
        const absDuJour = absences.filter(a => a.agentId === agent.id && a.start.startsWith(dateStr) && a.deduire);
        const hDeduct = absDuJour.reduce((tot, a) => tot + ((new Date(a.end) - new Date(a.start)) / 3600000), 0);

        heuresConsommees += Math.max(0, hJour - hDeduct);
      }
    }
    return { ...agent, heuresConsommees, soldeGlobal: agent.hContrat - heuresConsommees };
  });

  // --- 4. ANALYSE DES BESOINS ET ALERTES (Exclut les agents absents) ---
  const checkCoverage = (besoin, realEventsForWeek, weekAbsences) => {
    let minCount = Infinity;
    const tStart = new Date(besoin.start).getTime();
    const tEnd = new Date(besoin.end).getTime();
    const step = 15 * 60 * 1000; // Contrôle tous les quarts d'heure
    
    // Tous les créneaux affectés à ce poste
    const posteShifts = realEventsForWeek.filter(e => e.extendedProps?.posteId === besoin.extendedProps.posteId && !e.extendedProps?.isBesoin && !e.extendedProps?.isAbsence);

    let missingAgents = new Set();

    for (let t = tStart; t < tEnd; t += step) {
      const shiftsAtT = posteShifts.filter(e => new Date(e.start).getTime() <= t && new Date(e.end).getTime() > t);
      
      let presentCount = 0;
      shiftsAtT.forEach(shift => {
        // L'agent affecté est-il absent à ce moment précis ?
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
    return applicableTemplate.events.map(e => shiftEventToWeek(e, mondayStr)).filter(e => !getInfoJourFerie(new Date(e.start.split('T')[0])));
  };

  const targetMonday = currentViewMonday || '2026-09-07'; 
  let currentRealEvents;
  let currentBesoins;

  if (vueActive === 'planning' && currentViewMonday) {
    currentRealEvents = getEventsForWeek(currentViewMonday);
    const applicableTemplate = [...templateVersions].sort((a,b)=>b.dateDebut.localeCompare(a.dateDebut)).find(t => t.dateDebut <= currentViewMonday) || templateVersions[0];
    currentBesoins = applicableTemplate.besoins.map(b => shiftEventToWeek(b, currentViewMonday)).filter(b => !getInfoJourFerie(new Date(b.start.split('T')[0])));
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
    e.preventDefault();
    setModalPrint(false);
    setIsPrinting(true); 
    setTimeout(() => { 
      window.print(); 
      setIsPrinting(false); 
      setPrintFilter({ type: 'all', id: null }); 
    }, 800);
  };

  // --- 5. GESTION DES EVENEMENTS ---
  const updateCurrentTemplate = (newEvents, newBesoins) => {
    const newVersions = templateVersions.map(tv => tv.id === activeTemplateId ? { ...tv, events: newEvents || tv.events, besoins: newBesoins || tv.besoins } : tv);
    setTemplateVersions(newVersions);
  };

  const validerModele = () => setTemplateVersions(templateVersions.map(tv => tv.id === activeTemplateId ? { ...tv, statut: 'valide' } : tv));
  const deverrouillerModele = () => {
    if (confirm("⚠️ Déverrouiller permet de corriger une erreur. Si vous modifiez les heures, les soldes passés des agents seront recalculés.\n\nContinuer ?")) {
      setTemplateVersions(templateVersions.map(tv => tv.id === activeTemplateId ? { ...tv, statut: 'brouillon' } : tv));
    }
  };
  const creerNouvelleVersion = () => {
    const dateDebut = prompt("À partir de quelle date l'emploi du temps change-t-il ? (YYYY-MM-DD)", "2027-01-04");
    if (!dateDebut) return;
    const nom = prompt("Nom court pour identifier ce nouveau modèle :", "Évolution Hiver");
    if (!nom) return;
    const newVersion = { id: Date.now(), nom, dateDebut, statut: 'brouillon', events: [...currentTemplate.events], besoins: [...currentTemplate.besoins] };
    const newArr = [...templateVersions, newVersion].sort((a,b) => b.dateDebut.localeCompare(a.dateDebut)); 
    setTemplateVersions(newArr);
    setActiveTemplateId(newVersion.id);
  };

  const applyAction = (action, info) => {
    const cleanId = String(info.id).split('_')[0]; 
    if (vueActive === 'template') {
      let mod = [...currentTemplate.events];
      if (action === 'add') mod.push({ ...info, id: cleanId });
      if (action === 'update') mod = mod.map(e => String(e.id) === cleanId ? { ...e, start: info.start, end: info.end } : e);
      if (action === 'update_content') mod = mod.map(e => String(e.id) === cleanId ? { ...e, ...info } : e);
      if (action === 'delete') mod = mod.filter(e => String(e.id) !== cleanId);
      updateCurrentTemplate(mod, null);
    } else if (vueActive === 'planning' && currentViewMonday) {
      const currentWeek = customWeeks[currentViewMonday] ? [...customWeeks[currentViewMonday]] : getEventsForWeek(currentViewMonday);
      let mod = currentWeek;
      if (action === 'add') mod.push(info);
      if (action === 'update') mod = mod.map(e => (String(e.id) === String(info.id) || String(e.id) === String(info.id) + '_' + currentViewMonday) ? { ...e, start: info.start, end: info.end } : e);
      if (action === 'update_content') mod = mod.map(e => (String(e.id) === String(info.id) || String(e.id) === String(info.id) + '_' + currentViewMonday) ? { ...e, ...info } : e);
      if (action === 'delete') mod = mod.filter(e => String(e.id) !== String(info.id) && String(e.id) !== String(info.id) + '_' + currentViewMonday);
      setCustomWeeks({ ...customWeeks, [currentViewMonday]: mod });
    }
  };

  // --- NOUVEAU : MULTI-JOURS, DEB/FIN ET DÉDUCTION OPTIONNELLE ---
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
        rattrape: false
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

  // --- STATS POUR LE BILAN DES ABSENCES ---
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
      hAbs: abs.reduce((sum, a) => sum + ((new Date(a.end) - new Date(a.start))/3600000), 0),
      nbRet: ret.length,
      hRet: ret.reduce((sum, a) => sum + ((new Date(a.end) - new Date(a.start))/3600000), 0),
      nbRetRat: retNonRat.length,
      hRetRat: retNonRat.reduce((sum, a) => sum + ((new Date(a.end) - new Date(a.start))/3600000), 0)
    };
  });

  const validerBesoinMultiModal = (e) => {
    e.preventDefault();
    if (!modalBesoinMulti.posteId) return alert('Sélectionnez un poste.');
    const poste = postes.find(p => p.id === Number(modalBesoinMulti.posteId));
    const newBesoins = [];
    modalBesoinMulti.slots.forEach(slot => {
      if (slot.start && slot.end) {
        [1, 2, 3, 4, 5].forEach(dayIndex => {
          if (slot.days[dayIndex]) {
            const dateDay = 6 + Number(dayIndex); 
            const dateStr = `2026-09-${String(dateDay).padStart(2, '0')}`;
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
    if (evt.extendedProps.isBesoin) {
      updateCurrentTemplate(null, currentTemplate.besoins.filter(b => String(b.id) !== String(evt.id).split('_')[0])); 
    } else if (evt.extendedProps.isAbsence) {
      const cleanId = String(evt.id).replace('abs_', '').split('_')[0];
      supprimerAbsence(cleanId);
    } else {
      applyAction('delete', { id: evt.id }); 
    }
  };

  const ouvrirEditionBesoin = (evt) => {
    if (vueActive !== 'template') return alert("Passez en vue 'Modèle' pour modifier les besoins structurels.");
    setModalEditBesoin({ isOpen: true, id: String(evt.id).split('_')[0], posteId: evt.extendedProps.posteId, qte: evt.extendedProps.qte, start: extractTime(evt.start), end: extractTime(evt.end) });
  };

  const ouvrirEdition = (evt) => {
    const isAbs = evt.extendedProps.isAbsence;
    let dateJour = evt.startStr;
    if (dateJour.includes('T')) {
      dateJour = dateJour.split('T')[0];
    }
    setFormTypeEvent(isAbs ? 'absence' : 'affectation');
    setFormTypeAbsence(evt.extendedProps.typeAbsence || 'absence');
    setFormAbsenceDeduire(evt.extendedProps.deduire || false);
    setFormAgent(evt.extendedProps.agentId || '');
    setFormPoste(evt.extendedProps.posteId || postes.find(p => p.nom === evt.extendedProps.posteNom)?.id || '');
    setFormNote(evt.extendedProps.motif || evt.extendedProps.note || '');
    setModalCreation({ 
      isOpen: true, 
      eventId: evt.id, 
      date: dateJour,
      start: extractTimeStr(evt.startStr), 
      end: extractTimeStr(evt.endStr) 
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
        rattrape: false
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

    if (arg.event.extendedProps.isBesoin) {
      const isSous = arg.event.extendedProps.isSousEffectif;
      return (
        <div onClick={() => ouvrirEditionBesoin(arg.event)} className="flex flex-col w-full h-full overflow-hidden rounded text-[11px] shadow-sm relative group cursor-pointer transition-all hover:ring-2 hover:ring-red-400">
          <div className="px-1 py-0.5 font-bold text-white flex justify-between items-center" style={{ backgroundColor: isSous ? '#dc2626' : '#16a34a' }}>
            <span className="truncate">🎯 {arg.event.extendedProps.posteNom} <span className="text-[9px] font-normal opacity-90 ml-1">({timeStr})</span></span>
            <button onClick={(e) => { e.stopPropagation(); gererClicEvenement(arg.event); }} className="no-print text-white bg-black/30 hover:bg-white/50 rounded px-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✖</button>
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
      return (
        <div onClick={() => ouvrirEdition(arg.event)} className={`flex flex-col w-full h-full overflow-hidden rounded text-[11px] border border-black/10 shadow-md relative group cursor-pointer hover:ring-2 transition-all z-50 opacity-90 ${isAbs ? 'bg-red-50 text-red-900' : 'bg-orange-50 text-orange-900'}`}>
          <div className="px-1 py-0.5 font-bold text-white flex justify-between items-center" style={{ backgroundColor: isAbs ? '#EF4444' : '#F59E0B' }}>
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
    
    return (
      <div onClick={() => ouvrirEdition(arg.event)} className="flex flex-col w-full h-full overflow-hidden rounded text-[11px] border border-black/10 shadow-sm relative group cursor-pointer hover:ring-2 hover:ring-blue-400 transition-all">
        <div className="px-1 py-0.5 font-bold text-white flex justify-between items-center" style={{ backgroundColor: arg.event.extendedProps.posteCouleur }}>
          <span className="truncate">{arg.event.extendedProps.posteNom} <span className="text-[9px] font-normal opacity-90 ml-1">({timeStr})</span></span>
          <button onClick={(e) => { e.stopPropagation(); gererClicEvenement(arg.event); }} className="no-print text-white bg-black/30 hover:bg-red-500 rounded px-1 text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✖</button>
        </div>
        <div className="p-1 bg-white/95 text-gray-800 flex flex-col flex-1 leading-tight">
          <div className="flex justify-between items-start">
            <span className="font-semibold truncate pr-1">{arg.event.extendedProps.agentNom}</span>
          </div>
          {arg.event.extendedProps.note && <span className="text-[10px] text-gray-600 truncate italic mt-1 bg-gray-100 rounded px-1">{arg.event.extendedProps.note}</span>}
        </div>
      </div>
    );
  };

  // --- ACTIONS GLOBALES ---
  const validerAgentModal = (e) => {
    e.preventDefault();
    if (!modalAgent.nom.trim()) return alert('Obligatoire.');
    const q = parseFloat(String(modalAgent.quotite).replace(',', '.')) || 100;
    const h = parseFloat(String(modalAgent.hContrat).replace(',', '.')) || 1607;
    if (modalAgent.id) {
      setAgents(agents.map(a => a.id === modalAgent.id ? { ...a, nom: modalAgent.nom, quotite: q, hContrat: h, couleurFond: modalAgent.couleurFond } : a));
      updateCurrentTemplate(currentTemplate.events.map(evt => evt.extendedProps?.agentId === modalAgent.id ? { ...evt, extendedProps: { ...evt.extendedProps, agentNom: modalAgent.nom }, backgroundColor: modalAgent.couleurFond, borderColor: modalAgent.couleurFond } : evt), null);
    } else {
      setAgents([...agents, { id: Date.now(), nom: modalAgent.nom, quotite: q, hContrat: h, couleurFond: modalAgent.couleurFond }]);
    }
    setModalAgent({ ...modalAgent, isOpen: false });
  };
  const supprimerAgent = (id, n, e) => { e.stopPropagation(); if(confirm(`Supprimer l'agent ${n} ?`)) { setAgents(agents.filter(a => a.id !== id)); updateCurrentTemplate(currentTemplate.events.filter(e => e.extendedProps?.agentId !== id), null); if (agentActif === id) setAgentActif(null); } };
  const ajouterPoste = () => { const n = prompt("Nom du poste :"); if(n) setPostes([...postes, { id: Date.now(), nom: n, couleur: '#8B5CF6' }]); };
  const supprimerPoste = (id, e) => { e.stopPropagation(); setPostes(postes.filter(p => p.id !== id)); };

  const gererClicJourAgent = (agentId, dateStr, hActuel, noteActuelle) => {
    const inputHeures = prompt(`Heures travaillées le ${dateStr} (ex: 8:45 ou 0) :`, formatHeureTableau(hActuel) || '0');
    if (inputHeures === null) return; 
    const hDecimal = parseHeureSaisie(inputHeures);
    const note = prompt(`Motif (ex: Toussaint, Stage) :`, noteActuelle || '');
    if (note === null && hDecimal === hActuel) return; 
    const newExceptions = { ...exceptions };
    newExceptions[`${agentId}_${dateStr}`] = { h: hDecimal, note: note || '' };
    setExceptions(newExceptions);
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
    setPeriodesFeriees([...periodesFeriees, { id: Date.now(), nom: formPeriode.nom, debut: formPeriode.debut, fin: dateFin }].sort((a,b) => a.debut.localeCompare(b.debut)));
    setFormPeriode({ nom: '', debut: '', fin: '' });
  };
  const supprimerPeriodeFeriee = (id) => setPeriodesFeriees(periodesFeriees.filter(p => p.id !== id));

  const BandeauAlerte = () => {
    if (isPrinting || alertesSousEffectif.length === 0) return null;
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-3 mb-3 rounded shadow-sm flex flex-col text-sm no-print">
        <span className="font-bold text-red-800 mb-1">⚠️ Alertes de sous-effectif détectées :</span>
        <ul className="grid grid-cols-2 gap-1 text-red-700">
          {alertesSousEffectif.map(a => {
            const dStart = new Date(a.start);
            const dEnd = new Date(a.end);
            const rmp = a.missingAgents?.length > 0 ? ` (Remplacement nécessaire: ${a.missingAgents.join(', ')})` : '';
            return (
              <li key={a.id} className="bg-white/60 px-2 py-1 rounded">
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
    <div className="flex h-screen w-screen bg-gray-100 font-sans overflow-hidden">
      
      {/* MAGIE CSS - RÉSOLUTION IMPRESSION CALENDRIERS ET PLANNING */}
      <style>{`
        .fc-event-main { pointer-events: auto !important; }
        .fc-timegrid-event-harness { pointer-events: none !important; }
        
        @media print {
          @page { size: A4 landscape; margin: 8mm; }
          
          body, html, #root { 
            background: white !important; 
            height: auto !important; 
            min-height: 100vh !important;
            overflow: visible !important; 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          
          .no-print, .w-80 { display: none !important; }
          
          #print-area { 
            position: absolute; left: 0; top: 0; 
            width: 100vw !important; 
            height: auto !important; 
            overflow: visible !important; 
            display: block !important; 
            background: white !important; 
            z-index: 9999; 
          }

          .print-weekly-page {
             width: 100%; height: 98vh; overflow: hidden; box-sizing: border-box;
          }

          .print-agent-page { 
             width: 100%; height: 98vh; display: flex; flex-direction: column; overflow: hidden; box-sizing: border-box;
             page-break-after: always; break-after: page; 
          }
          .print-agent-page:last-child { page-break-after: auto; break-after: auto; }

          .print-dashboard-table {
             transform: scale(0.85); transform-origin: top left; width: 115% !important; border:none; box-shadow:none;
          }
        }
      `}</style>

      {/* MODALES PARAMETRES ET IMPRESSION */}
      {modalParametres && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gray-800 text-white p-4 flex justify-between items-center"><h3 className="font-bold text-lg">⚙️ Vacances et Jours Fériés</h3><button onClick={() => setModalParametres(false)} className="text-white hover:text-red-400 font-bold">✖</button></div>
            <div className="p-4 overflow-y-auto flex-1 bg-gray-50">
              <p className="text-sm text-gray-600 mb-4">Ces dates annulent automatiquement les heures dues par les agents dans le "Bilan Équipe" annuel.</p>
              <ul className="space-y-2 mb-6">
                {periodesFeriees.map(p => (
                  <li key={p.id} className="bg-white p-2 rounded border border-gray-200 flex justify-between items-center text-sm shadow-sm">
                    <div><span className="font-bold text-gray-800">{p.nom}</span> <span className="text-gray-500 ml-2 text-xs">({p.debut === p.fin ? p.debut : `Du ${p.debut} au ${p.fin}`})</span></div>
                    <button onClick={() => supprimerPeriodeFeriee(p.id)} className="text-red-500 hover:bg-red-50 px-2 py-1 rounded">✖</button>
                  </li>
                ))}
              </ul>
              <form onSubmit={ajouterPeriodeFeriee} className="bg-white p-4 rounded border border-gray-300 shadow-inner">
                <h4 className="font-bold text-sm text-gray-700 mb-3">➕ Ajouter une période</h4>
                <div className="space-y-3">
                  <input type="text" required placeholder="Nom (ex: Pont Ascension)" value={formPeriode.nom} onChange={e => setFormPeriode({...formPeriode, nom: e.target.value})} className="w-full border rounded p-2 text-sm" />
                  <div className="flex gap-3">
                    <div className="flex-1"><label className="text-xs font-bold text-gray-600">Début</label><input type="date" required value={formPeriode.debut} onChange={e => setFormPeriode({...formPeriode, debut: e.target.value})} className="w-full border rounded p-2 text-sm" /></div>
                    <div className="flex-1"><label className="text-xs font-bold text-gray-600">Fin (Optionnel)</label><input type="date" value={formPeriode.fin} onChange={e => setFormPeriode({...formPeriode, fin: e.target.value})} className="w-full border rounded p-2 text-sm" /></div>
                  </div>
                  <button type="submit" className="w-full bg-gray-800 text-white rounded p-2 text-sm font-bold shadow hover:bg-gray-700 mt-2">Enregistrer la date</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {modalPrint && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-900 text-white p-4"><h3 className="font-bold text-lg">🖨️ Impression (A4 Paysage)</h3></div>
            <form onSubmit={declencherImpression}>
              <div className="p-6 space-y-4">
                {(vueActive === 'template' || vueActive === 'planning') ? (
                  <>
                    <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"><input type="radio" checked={printFilter.type === 'all'} onChange={() => setPrintFilter({ type: 'all', id: null })} className="w-4 h-4 text-blue-600" /><span className="font-semibold text-gray-800">Vue Globale (Équipe)</span></label>
                    <label className="flex flex-col gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"><div className="flex items-center gap-3"><input type="radio" checked={printFilter.type === 'agent'} onChange={() => setPrintFilter({ type: 'agent', id: agents[0]?.id })} className="w-4 h-4 text-blue-600" /><span className="font-semibold text-gray-800">Filtrer par Agent</span></div>{printFilter.type === 'agent' && (<select value={printFilter.id || ''} onChange={(e) => setPrintFilter({ type: 'agent', id: Number(e.target.value) })} className="ml-7 p-2 border rounded text-sm w-64 bg-white outline-none">{agents.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select>)}</label>
                    <label className="flex flex-col gap-2 p-3 border rounded-lg cursor-pointer hover:bg-gray-50"><div className="flex items-center gap-3"><input type="radio" checked={printFilter.type === 'poste'} onChange={() => setPrintFilter({ type: 'poste', id: postes[0]?.id })} className="w-4 h-4 text-blue-600" /><span className="font-semibold text-gray-800">Filtrer par Poste</span></div>{printFilter.type === 'poste' && (<select value={printFilter.id || ''} onChange={(e) => setPrintFilter({ type: 'poste', id: Number(e.target.value) })} className="ml-7 p-2 border rounded text-sm w-64 bg-white outline-none">{postes.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>)}</label>
                  </>
                ) : <div className="text-center py-4"><span className="text-4xl mb-3 block">✅</span><p>Adaptation automatique pour le format A4 Recto-Verso (2 pages).</p></div>}
              </div>
              <div className="p-4 bg-gray-50 border-t flex justify-end gap-3"><button type="button" onClick={() => setModalPrint(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded font-medium">Annuler</button><button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded font-medium shadow flex items-center gap-2">🖨️ Lancer</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE CRÉATION AFFECTATION */}
      {modalCreation.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-blue-900 text-white p-4"><h3 className="font-bold text-lg">{modalCreation.eventId ? 'Modifier l\'affectation' : 'Nouvelle affectation'}</h3></div>
            <form onSubmit={validerCreationModal}>
              <div className="p-5 space-y-4">
                {vueActive === 'planning' && !modalCreation.eventId && (
                  <div>
                    <label className="block text-sm font-semibold mb-1">Type d'action</label>
                    <select value={formTypeEvent} onChange={e => setFormTypeEvent(e.target.value)} className="w-full border rounded p-2 bg-gray-50 font-bold text-sm">
                      <option value="affectation">Affectation de poste</option>
                      <option value="absence">Absence ou Retard</option>
                    </select>
                  </div>
                )}

                <div><label className="block text-sm font-semibold mb-1">👤 Agent</label><select value={formAgent} onChange={e => setFormAgent(e.target.value)} className="w-full border rounded p-2 bg-white"><option value="" disabled>-- Sélectionner --</option>{agents.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}</select></div>
                
                {formTypeEvent === 'absence' ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold mb-1">Nature</label>
                      <select value={formTypeAbsence} onChange={e => setFormTypeAbsence(e.target.value)} className="w-full border rounded p-2 bg-white">
                        <option value="absence">Absence (Plage horaire)</option>
                        <option value="retard">Retard</option>
                      </select>
                    </div>
                    <label className="flex items-center gap-2 text-sm font-bold text-blue-800 cursor-pointer bg-blue-50 p-2 rounded border border-blue-100">
                      <input type="checkbox" checked={formAbsenceDeduire} onChange={e => setFormAbsenceDeduire(e.target.checked)} className="w-4 h-4 cursor-pointer" />
                      Déduire ces heures du bilan
                    </label>
                  </>
                ) : (
                  <div><label className="block text-sm font-semibold mb-1">📍 Poste</label><select value={formPoste} onChange={e => setFormPoste(e.target.value)} className="w-full border rounded p-2 bg-white"><option value="" disabled>-- Sélectionner --</option>{postes.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div>
                )}

                <div className="flex gap-4">
                  <div className="flex-1"><label className="block text-sm font-semibold mb-1">Début</label><input type="time" required value={extractTimeStr(modalCreation.start)} onChange={e => setModalCreation({...modalCreation, start: e.target.value})} className="w-full border rounded p-2" /></div>
                  <div className="flex-1"><label className="block text-sm font-semibold mb-1">Fin</label><input type="time" required value={extractTimeStr(modalCreation.end)} onChange={e => setModalCreation({...modalCreation, end: e.target.value})} className="w-full border rounded p-2" /></div>
                </div>
                <div><label className="block text-sm font-semibold mb-1">📝 {formTypeEvent === 'absence' ? 'Motif' : 'Note'}</label><input type="text" value={formNote} onChange={e => setFormNote(e.target.value)} placeholder={formTypeEvent === 'absence' ? "Ex: Maladie..." : "Ex: Réunion..."} className="w-full border rounded p-2" autoFocus={!!modalCreation.eventId} /></div>
              </div>
              <div className="p-4 bg-gray-50 border-t flex justify-end gap-3"><button type="button" onClick={() => setModalCreation({ isOpen: false, eventId: null, date: null, start: '08:00', end: '09:00' })} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded font-medium">Annuler</button><button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded font-medium">{modalCreation.eventId ? 'Enregistrer' : 'Créer'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* MODALE GRILLAGE DE BESOINS MULTIPLES */}
      {modalBesoinMulti.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="bg-red-700 text-white p-4 shrink-0"><h3 className="font-bold text-lg">🎯 Saisie d'une grille de besoins</h3></div>
            <form onSubmit={validerBesoinMultiModal} className="flex flex-col overflow-hidden">
              <div className="p-5 space-y-4 overflow-y-auto">
                <div className="flex gap-4">
                  <div className="flex-[2]"><label className="block text-sm font-semibold mb-1 text-red-800">Poste requis</label><select required value={modalBesoinMulti.posteId} onChange={e => setModalBesoinMulti({...modalBesoinMulti, posteId: e.target.value})} className="w-full border border-red-300 rounded p-2 bg-white"><option value="" disabled>-- Sélectionner --</option>{postes.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</select></div>
                  <div className="flex-1"><label className="block text-sm font-semibold mb-1 text-red-800">Effectif</label><input type="number" min="1" required value={modalBesoinMulti.qte} onChange={e => setModalBesoinMulti({...modalBesoinMulti, qte: e.target.value})} className="w-full border border-red-300 rounded p-2 text-center font-bold" /></div>
                </div>
                
                <div className="border border-red-200 rounded p-3 bg-red-50">
                  <div className="flex justify-between items-center mb-3">
                    <p className="text-sm font-bold text-red-800">Créez vos plages horaires et cochez les jours :</p>
                    <button type="button" onClick={() => setModalBesoinMulti({...modalBesoinMulti, slots: [...modalBesoinMulti.slots, { id: Date.now(), start: '08:00', end: '10:00', days: { 1: false, 2: false, 3: false, 4: false, 5: false } }]})} className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 font-semibold shadow">➕ Plage</button>
                  </div>
                  <div className="flex flex-col gap-3">
                    {modalBesoinMulti.slots.map((slot, idx) => (
                      <div key={idx} className="flex flex-col gap-2 border-b border-red-200 pb-3 last:border-0 last:pb-0">
                        <div className="flex items-center gap-2">
                          <input type="time" required value={slot.start} onChange={e => {
                            const ns = [...modalBesoinMulti.slots]; ns[idx].start = e.target.value; setModalBesoinMulti({...modalBesoinMulti, slots: ns});
                          }} className="border border-red-300 p-1 text-sm rounded bg-white w-24 text-center" />
                          <span className="text-gray-500 text-xs font-bold">à</span>
                          <input type="time" required value={slot.end} onChange={e => {
                            const ns = [...modalBesoinMulti.slots]; ns[idx].end = e.target.value; setModalBesoinMulti({...modalBesoinMulti, slots: ns});
                          }} className="border border-red-300 p-1 text-sm rounded bg-white w-24 text-center" />
                          {modalBesoinMulti.slots.length > 1 && (
                            <button type="button" onClick={() => {
                              const ns = [...modalBesoinMulti.slots]; ns.splice(idx, 1); setModalBesoinMulti({...modalBesoinMulti, slots: ns});
                            }} className="text-red-400 hover:text-red-600 text-xs bg-white rounded-full w-5 h-5 flex items-center justify-center shadow-sm ml-auto" title="Retirer cette plage">✖</button>
                          )}
                        </div>
                        <div className="flex gap-2 pl-1 mt-1">
                          {[1, 2, 3, 4, 5].map(day => (
                            <label key={day} className={`flex items-center gap-1 px-2 py-1 rounded border text-xs font-bold cursor-pointer transition-colors ${slot.days[day] ? 'bg-red-600 text-white border-red-700 shadow-sm' : 'bg-white text-gray-500 border-gray-300 hover:bg-gray-100'}`}>
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
              <div className="p-4 bg-gray-50 border-t shrink-0 flex justify-end gap-3"><button type="button" onClick={() => setModalBesoinMulti({ isOpen: false, posteId: '', qte: 1, slots: [] })} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded font-medium">Annuler</button><button type="submit" className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium shadow">Générer la grille</button></div>
            </form>
          </div>
        </div>
      )}

      {modalEditBesoin.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-200">
            <div className="bg-red-700 text-white p-4"><h3 className="font-bold text-lg">Modifier le besoin</h3></div>
            <form onSubmit={validerEditBesoin}>
              <div className="p-5 space-y-4">
                <div><label className="block text-sm font-semibold mb-1">Effectif attendu (Tapez 0 pour supprimer)</label><input type="number" min="0" required value={modalEditBesoin.qte} onChange={e => setModalEditBesoin({...modalEditBesoin, qte: e.target.value})} className="w-full border rounded p-2 text-center font-bold text-lg" autoFocus /></div>
                <div className="flex gap-4"><div className="flex-1"><label className="block text-sm font-semibold mb-1">Début</label><input type="time" required value={modalEditBesoin.start} onChange={e => setModalEditBesoin({...modalEditBesoin, start: e.target.value})} className="w-full border rounded p-2" /></div><div className="flex-1"><label className="block text-sm font-semibold mb-1">Fin</label><input type="time" required value={modalEditBesoin.end} onChange={e => setModalEditBesoin({...modalEditBesoin, end: e.target.value})} className="w-full border rounded p-2" /></div></div>
              </div>
              <div className="p-4 bg-gray-50 border-t flex justify-end gap-3"><button type="button" onClick={() => setModalEditBesoin({ isOpen: false, id: null, posteId: '', qte: 1, start: '', end: '' })} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded font-medium">Annuler</button><button type="submit" className="px-5 py-2 bg-red-600 text-white rounded font-medium">Mettre à jour</button></div>
            </form>
          </div>
        </div>
      )}

      {modalAgent.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-blue-900 text-white p-4"><h3 className="font-bold text-lg">{modalAgent.id ? 'Modifier un agent' : 'Nouvel agent'}</h3></div>
            <form onSubmit={validerAgentModal}>
              <div className="p-5 space-y-4">
                <div><label className="block text-sm font-semibold mb-1">Nom complet</label><input type="text" required value={modalAgent.nom} onChange={e => setModalAgent({...modalAgent, nom: e.target.value})} className="w-full border rounded p-2" autoFocus /></div>
                <div className="flex gap-4"><div className="flex-1"><label className="block text-sm font-semibold mb-1">Quotité (%)</label><input type="number" step="0.1" required value={modalAgent.quotite} onChange={e => setModalAgent({...modalAgent, quotite: e.target.value})} className="w-full border rounded p-2" /></div><div className="flex-1"><label className="block text-sm font-semibold mb-1">Contrat (Heures)</label><input type="number" step="0.1" required value={modalAgent.hContrat} onChange={e => setModalAgent({...modalAgent, hContrat: e.target.value})} className="w-full border rounded p-2" /></div></div>
                <div><label className="block text-sm font-semibold mb-1">Couleur</label><div className="flex items-center gap-3"><input type="color" value={modalAgent.couleurFond} onChange={e => setModalAgent({...modalAgent, couleurFond: e.target.value})} className="w-12 h-12 p-1 border rounded cursor-pointer" /><span className="text-sm uppercase">{modalAgent.couleurFond}</span></div></div>
              </div>
              <div className="p-4 bg-gray-50 border-t flex justify-end gap-3"><button type="button" onClick={() => setModalAgent({...modalAgent, isOpen: false})} className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded">Annuler</button><button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded">{modalAgent.id ? 'Mettre à jour' : 'Créer'}</button></div>
            </form>
          </div>
        </div>
      )}

      {/* PANNEAU LATÉRAL (Fixe) */}
      <div className="w-80 bg-white shadow-lg flex flex-col z-20 border-r border-gray-200 no-print shrink-0">
        <div className="p-4 bg-blue-900 text-white flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-bold tracking-wider">EDT CPE</h1>
            <div className="flex gap-1">
              <button onClick={() => setModalParametres(true)} className="bg-gray-800 hover:bg-gray-700 px-2 py-1.5 rounded text-xs shadow border border-gray-600" title="Paramétrer les Vacances">⚙️</button>
              <button onClick={() => setModalPrint(true)} className="bg-blue-700 hover:bg-blue-600 px-3 py-1.5 rounded text-xs font-bold border border-blue-500">🖨️ IMPRIMER</button>
              <button onClick={resetAllData} className="bg-red-700 hover:bg-red-800 px-2 py-1.5 rounded text-xs font-bold border border-red-500 text-white text-center" title="Tout réinitialiser">🗑️</button>
            </div>
          </div>
          <div className="flex flex-col bg-blue-950 rounded p-1 shadow-inner gap-1">
            <button onClick={() => setVueActive('template')} className={`text-sm py-1.5 rounded transition ${vueActive === 'template' ? 'bg-white text-blue-900 font-bold' : 'text-blue-300 hover:text-white'}`}>📐 Modèle : Semaine Type</button>
            <button onClick={() => setVueActive('planning')} className={`text-sm py-1.5 rounded transition ${vueActive === 'planning' ? 'bg-white text-blue-900 font-bold' : 'text-blue-300 hover:text-white'}`}>📅 Planning Hebdo (Réel)</button>
            <button onClick={() => setVueActive('dashboard')} className={`text-sm py-1.5 rounded transition ${vueActive === 'dashboard' ? 'bg-white text-blue-900 font-bold' : 'text-blue-300 hover:text-white'}`}>📊 Bilan Équipe</button>
            <button onClick={() => { setVueActive('agent'); if(!agentConsulte) setAgentConsulte(agents[0]?.id); }} className={`text-sm py-1.5 rounded transition ${vueActive === 'agent' ? 'bg-white text-blue-900 font-bold' : 'text-blue-300 hover:text-white'}`}>👤 Calendriers Individuels</button>
            <button onClick={() => setVueActive('absences')} className={`text-sm py-1.5 rounded transition ${vueActive === 'absences' ? 'bg-white text-blue-900 font-bold' : 'text-blue-300 hover:text-white'}`}>📋 Absences & Retards</button>
          </div>
        </div>
        
        {(vueActive === 'template' || vueActive === 'planning') && (
          <div className="p-4 flex-1 overflow-y-auto space-y-4">
            
            {vueActive === 'template' && currentTemplate.statut === 'brouillon' && (
              <div className="flex bg-gray-200 rounded p-1 mb-2">
                <button onClick={() => setModeEdition('agents')} className={`flex-1 text-xs py-1.5 rounded transition ${modeEdition === 'agents' ? 'bg-white font-bold text-blue-700 shadow-sm' : 'text-gray-600 hover:text-black'}`}>🖌️ Agents</button>
                <button onClick={() => setModeEdition('besoins')} className={`flex-1 text-xs py-1.5 rounded transition ${modeEdition === 'besoins' ? 'bg-white font-bold text-red-600 shadow-sm' : 'text-gray-600 hover:text-black'}`}>🎯 Besoins</button>
              </div>
            )}

            {vueActive === 'template' && currentTemplate.statut === 'valide' && (
              <div className="bg-gray-100 border border-gray-300 p-4 rounded text-center mb-4">
                <span className="text-2xl block mb-1">🔒</span>
                <p className="text-sm font-bold text-gray-700">Modèle Validé</p>
                <p className="text-xs text-gray-500 mt-1">Structure verrouillée pour protéger le compte d'heures passé.</p>
                <button onClick={creerNouvelleVersion} className="mt-3 bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded shadow hover:bg-blue-700 w-full flex items-center justify-center gap-1">➕ Créer une évolution</button>
                <button onClick={deverrouillerModele} className="mt-2 text-xs text-gray-400 hover:text-gray-800 underline">🔓 Déverrouiller (Corriger erreur)</button>
              </div>
            )}

            {(vueActive === 'planning' || (vueActive === 'template' && currentTemplate.statut === 'brouillon')) && modeEdition === 'agents' && (
              <div className="animate-in fade-in">
                <div>
                  <div className="flex justify-between items-center mb-2"><h2 className="font-bold text-gray-700 text-sm">Agents</h2><button onClick={() => setModalAgent({isOpen: true, nom: '', quotite: 100, hContrat: 1607, couleurFond: '#3B82F6'})} className="bg-gray-200 w-5 h-5 rounded-full text-xs font-bold">+</button></div>
                  <ul className="space-y-1">
                    {agents.map((agent) => (
                      <li key={agent.id} onClick={() => setAgentActif(agentActif === agent.id ? null : agent.id)} className={`flex justify-between items-center p-2 rounded border-l-4 cursor-pointer text-sm ${agentActif === agent.id ? 'bg-blue-50 border-blue-600 font-bold' : 'bg-gray-50 hover:bg-gray-100'}`} style={{ borderLeftColor: agent.couleurFond }}>
                        <span style={{ color: agentActif === agent.id ? '#1e3a8a' : '#374151' }}>{agent.nom}</span>
                        <div className="flex gap-1 items-center"><button onClick={(e) => { e.stopPropagation(); setModalAgent({isOpen:true, ...agent}); }} className="text-gray-400 hover:text-blue-600 text-xs px-1">⚙️</button><button onClick={(e) => supprimerAgent(agent.id, agent.nom, e)} className="text-red-400 hover:text-red-600 text-xs px-1">✖</button></div>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2"><h2 className="font-bold text-gray-700 text-sm">Postes</h2><button onClick={ajouterPoste} className="bg-gray-200 w-5 h-5 rounded-full text-xs font-bold">+</button></div>
                  <ul className="space-y-1">
                    {postes.map((poste) => (
                      <li key={poste.id} onClick={() => setPosteActif(posteActif === poste.id ? null : poste.id)} className={`flex justify-between items-center p-2 rounded border-l-4 cursor-pointer text-sm ${posteActif === poste.id ? 'bg-indigo-50 border-indigo-600 font-bold' : 'bg-gray-50 hover:bg-gray-100'}`} style={{ borderLeftColor: poste.couleur }}>
                        <span>{poste.nom}</span><button onClick={(e) => supprimerPoste(poste.id, e)} className="text-red-400 hover:text-red-600 text-xs px-1">✖</button>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {vueActive === 'template' && currentTemplate.statut === 'brouillon' && modeEdition === 'besoins' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="bg-red-50 border border-red-200 p-3 rounded text-sm text-red-800">
                  <p className="font-bold mb-2">1. Création Rapide (Clavier) :</p>
                  <button onClick={() => setModalBesoinMulti({ isOpen: true, posteId: '', qte: 1, slots: [{ id: Date.now(), start: '08:00', end: '10:00', days: { 1: false, 2: false, 3: false, 4: false, 5: false } }]})} className="w-full bg-red-600 text-white rounded p-2 text-xs font-bold hover:bg-red-700 shadow flex items-center justify-center gap-1 mb-4">
                    ➕ Saisir une grille complète
                  </button>

                  <p className="font-bold mb-2 border-t border-red-200 pt-3">2. Pinceau Manuel (Souris) :</p>
                  <select value={posteActif||''} onChange={e => setPosteActif(Number(e.target.value))} className="w-full p-2 rounded border border-red-300 mb-2 bg-white"><option value="" disabled>-- Poste --</option>{postes.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}</select>
                  <input type="number" min="1" value={formBesoinQte} onChange={e => setFormBesoinQte(Number(e.target.value))} className="w-full p-2 rounded border border-red-300 font-bold text-center mb-2 bg-white" />
                  <p className="text-xs italic">Glissez la souris sur le calendrier.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ZONE PRINCIPALE D'AFFICHAGE */}
      <div id="print-area" className="flex-1 flex flex-col h-full overflow-hidden bg-white">
        
        {vueActive === 'template' && (
          <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden">
            <div className="p-4 pb-2 no-print shrink-0">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-blue-900 flex items-center gap-2">
                  📐 Modèle : {currentTemplate.nom} (dès le {currentTemplate.dateDebut}) 
                  {printFilter.type === 'agent' && ` - Filtré : ${agents.find(a=>a.id===printFilter.id)?.nom}`}
                </h2>
                
                <div className="flex gap-2 items-center">
                  {currentTemplate.statut === 'brouillon' && (
                    <button onClick={validerModele} className="bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded hover:bg-green-700 shadow-sm animate-pulse">✅ Valider et Appliquer</button>
                  )}
                  <select value={activeTemplateId} onChange={e => setActiveTemplateId(Number(e.target.value))} className="border border-gray-300 rounded p-1.5 text-xs font-bold bg-white outline-none">
                    {templateVersions.map(tv => <option key={tv.id} value={tv.id}>{tv.statut==='valide'?'🔒':'✏️'} {tv.nom}</option>)}
                  </select>
                </div>
              </div>
              <BandeauAlerte />
            </div>

            <div className="flex-1 overflow-hidden px-4 pb-4">
              {isPrinting ? (
                <PrintTimeGridView events={displayEvents} titre={`Modèle : ${currentTemplate.nom} ${printFilter.type !== 'all' ? '(Filtré)' : ''}`} />
              ) : (
                <div className={`bg-white rounded-xl shadow border h-full p-2 ${currentTemplate.statut === 'brouillon' ? 'border-blue-400 border-dashed border-2' : 'border-gray-200'}`}>
                  <FullCalendar
                    plugins={[timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    locale="fr"
                    firstDay={1} 
                    initialDate="2026-09-07"
                    headerToolbar={false} 
                    dayHeaderFormat={{ weekday: 'long' }} 
                    allDaySlot={false}
                    slotMinTime="07:40:00"
                    slotMaxTime="17:40:00"
                    slotDuration="00:15:00"
                    snapDuration="00:05:00"
                    hiddenDays={[0, 6]}
                    editable={true} 
                    selectable={currentTemplate.statut === 'brouillon'}
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

        {vueActive === 'planning' && (
          <div className="flex-1 flex flex-col bg-gray-50 h-full overflow-hidden">
            <div className="p-4 pb-2 no-print shrink-0">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-bold text-blue-900">
                  📅 Planning Réel 
                  {printFilter.type === 'agent' && ` - Filtré pour : ${agents.find(a=>a.id===printFilter.id)?.nom}`}
                  {printFilter.type === 'poste' && ` - Filtré pour le poste : ${postes.find(p=>p.id===printFilter.id)?.nom}`}
                </h2>
                {currentViewMonday && customWeeks[currentViewMonday] && (
                  <button onClick={reinitialiserSemaineReelle} className="bg-orange-100 text-orange-700 hover:bg-orange-200 px-3 py-1 rounded text-xs font-bold border border-orange-300 shadow-sm">
                    🔄 Réinitialiser cette semaine au Modèle
                  </button>
                )}
              </div>
              <BandeauAlerte />
            </div>
            
            <div className="flex-1 overflow-hidden px-4 pb-4">
              {isPrinting ? (
                <PrintTimeGridView events={displayEvents} titre={`Semaine du ${currentViewMonday} ${printFilter.type !== 'all' ? '(Filtré)' : ''}`} />
              ) : (
                <div className="bg-white rounded-xl shadow border border-gray-200 h-full p-2">
                  <FullCalendar
                    plugins={[timeGridPlugin, interactionPlugin]}
                    initialView="timeGridWeek"
                    locale="fr"
                    firstDay={1}
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

        {vueActive === 'dashboard' && (
          <div className="flex-1 p-8 overflow-auto bg-gray-50 print-dashboard-table">
            <h2 className="text-2xl font-bold text-blue-900 mb-6">Bilan Annuel Global de l'Équipe (2026-2027)</h2>
            <div className="bg-white rounded-xl shadow border border-gray-300 overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-blue-900 text-white font-medium uppercase text-xs">
                  <tr>
                    <th className="p-4 border-r border-blue-800">Agent</th>
                    <th className="p-4 border-r border-blue-800 text-center">%</th>
                    <th className="p-4 border-r border-blue-800 text-center bg-blue-950">H. Contrat</th>
                    <th className="p-4 border-r border-blue-800 text-center">H. Type Hebdo</th>
                    <th className="p-4 border-r border-blue-800 text-center bg-blue-950">H. Consommées</th>
                    <th className="p-4 text-center">Solde Final</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {statsAgents.map(agent => (
                    <tr key={agent.id} className="hover:bg-blue-50">
                      <td className="p-4 font-bold border-r border-gray-200 text-gray-800">{agent.nom}</td>
                      <td className="p-4 text-center border-r border-gray-200" style={{ color: agent.couleurFond }}>{agent.quotite}%</td>
                      <td className="p-4 text-center border-r border-gray-200 font-mono font-bold">{agent.hContrat}</td>
                      <td className="p-4 text-center border-r border-gray-200 font-mono text-gray-500">{formatHeureTableau(agent.hHebdoType)}</td>
                      <td className="p-4 text-center border-r border-gray-200 font-mono font-bold bg-gray-50 text-gray-700">{formatHeureTableau(agent.heuresConsommees)}</td>
                      <td className={`p-4 text-center font-mono font-black text-lg ${agent.soldeGlobal >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {agent.soldeGlobal > 0 ? '+' : ''}{formatHeureTableau(agent.soldeGlobal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- ONGLET DÉDIÉ : ABSENCES & RETARDS --- */}
        {vueActive === 'absences' && (
          <div className="flex-1 p-6 overflow-auto bg-gray-50">
            <h2 className="text-2xl font-bold text-blue-900 mb-6">Gestion des Absences et Retards</h2>
            
            {/* RÉCAPITULATIF (BILAN) PAR AGENT */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {bilanAbsences.map(b => (
                <div key={b.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 border-l-4" style={{ borderLeftColor: b.couleur }}>
                  <div className="font-black text-lg text-gray-800 mb-3">{b.nom}</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <div className="text-gray-500 text-xs font-bold uppercase">Absences</div>
                      <div className="font-mono text-red-600 font-bold mt-1">{b.nbAbs} <span className="text-xs text-gray-400">({formatHeureTableau(b.hAbs)})</span></div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs font-bold uppercase">Retards</div>
                      <div className="font-mono text-orange-500 font-bold mt-1">{b.nbRet} <span className="text-xs text-gray-400">({formatHeureTableau(b.hRet)})</span></div>
                    </div>
                  </div>
                  {b.nbRetRat > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs font-bold text-red-600 bg-red-50 p-2 rounded">
                      ⚠️ {b.nbRetRat} retard(s) à rattraper ({formatHeureTableau(b.hRetRat)})
                    </div>
                  )}
                  {b.nbRet > 0 && b.nbRetRat === 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-xs font-bold text-green-600 bg-green-50 p-2 rounded">
                      ✅ Tous les retards sont rattrapés.
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Formulaire de déclaration */}
              <div className="lg:col-span-1 bg-white p-6 rounded-xl shadow border border-gray-200 h-fit">
                <h3 className="font-bold text-md text-blue-900 mb-4 pb-2 border-b">Déclarer un événement</h3>
                <form onSubmit={ajouterAbsenceRetard} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold mb-1">Agent concerné</label>
                    <select required value={formAbsence.agentId} onChange={e => setFormAbsence({...formAbsence, agentId: e.target.value})} className="w-full border rounded p-2 bg-white text-sm">
                      <option value="" disabled>-- Choisir un agent --</option>
                      {agents.map(a => <option key={a.id} value={a.id}>{a.nom}</option>)}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-semibold mb-1">Type</label>
                    <select value={formAbsence.type} onChange={e => setFormAbsence({...formAbsence, type: e.target.value, journeeComplete: e.target.value === 'absence', deduireHeures: e.target.value === 'retard'})} className="w-full border rounded p-2 bg-white text-sm">
                      <option value="absence">Absence</option>
                      <option value="retard">Retard</option>
                    </select>
                  </div>

                  {formAbsence.type === 'absence' && (
                    <label className="flex items-center gap-2 text-sm font-bold text-blue-800 cursor-pointer bg-blue-50 p-2 rounded border border-blue-100">
                      <input type="checkbox" checked={formAbsence.journeeComplete} onChange={e => setFormAbsence({...formAbsence, journeeComplete: e.target.checked})} className="w-4 h-4 cursor-pointer" />
                      Journée(s) complète(s)
                    </label>
                  )}

                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="block text-sm font-semibold mb-1">{formAbsence.journeeComplete ? 'Début' : 'Date'}</label>
                      <input type="date" required value={formAbsence.dateDebut} onChange={e => setFormAbsence({...formAbsence, dateDebut: e.target.value})} className="w-full border rounded p-2 text-sm" />
                    </div>
                    {formAbsence.journeeComplete && (
                      <div className="flex-1">
                        <label className="block text-sm font-semibold mb-1">Fin (Optionnel)</label>
                        <input type="date" value={formAbsence.dateFin} onChange={e => setFormAbsence({...formAbsence, dateFin: e.target.value})} min={formAbsence.dateDebut} className="w-full border rounded p-2 text-sm" />
                      </div>
                    )}
                  </div>

                  {!formAbsence.journeeComplete && (
                    <div className="flex gap-4">
                      <div className="flex-1"><label className="block text-sm font-semibold mb-1">Heure Début</label><input type="time" required value={formAbsence.heureDebut} onChange={e => setFormAbsence({...formAbsence, heureDebut: e.target.value})} className="w-full border rounded p-2 text-sm font-bold text-center" /></div>
                      <div className="flex-1"><label className="block text-sm font-semibold mb-1">Heure Fin</label><input type="time" required value={formAbsence.heureFin} onChange={e => setFormAbsence({...formAbsence, heureFin: e.target.value})} className="w-full border rounded p-2 text-sm font-bold text-center" /></div>
                    </div>
                  )}

                  <label className="flex items-center gap-2 text-sm font-bold text-red-800 cursor-pointer bg-red-50 p-2 rounded border border-red-100">
                    <input type="checkbox" checked={formAbsence.deduireHeures} onChange={e => setFormAbsence({...formAbsence, deduireHeures: e.target.checked})} className="w-4 h-4 cursor-pointer" />
                    Déduire du bilan (à rattraper / sans solde)
                  </label>

                  <div>
                    <label className="block text-sm font-semibold mb-1">Motif</label>
                    <input type="text" required value={formAbsence.motif} onChange={e => setFormAbsence({...formAbsence, motif: e.target.value})} placeholder="Ex: Maladie, Grève, Panne réveil..." className="w-full border rounded p-2 text-sm" />
                  </div>

                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded p-2.5 text-sm font-bold shadow transition">
                    Créer sur le planning
                  </button>
                </form>
              </div>

              {/* Tableau de l'historique */}
              <div className="lg:col-span-2 bg-white rounded-xl shadow border border-gray-200 overflow-hidden flex flex-col">
                <div className="bg-blue-900 text-white p-4 font-bold text-sm">Historique complet des événements</div>
                <div className="overflow-x-auto flex-1">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-100 text-gray-700 uppercase text-xs border-b">
                      <tr>
                        <th className="p-3">Date</th>
                        <th className="p-3">Agent</th>
                        <th className="p-3">Type</th>
                        <th className="p-3 text-center">Durée</th>
                        <th className="p-3">Motif</th>
                        <th className="p-3 text-center">Statut (Retards)</th>
                        <th className="p-3 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {absences.map(a => {
                        const ag = agents.find(agent => agent.id === a.agentId);
                        const typeAbs = a.type || 'absence';
                        
                        let h = a.heures;
                        let m = a.minutes;
                        if (h === undefined) {
                          h = Math.floor(a.dureeTotale || a.duree || 0);
                          m = Math.round(((a.dureeTotale || a.duree || 0) - h) * 60);
                        }

                        return (
                          <tr key={a.id} className="hover:bg-gray-50">
                            <td className="p-3 font-mono text-xs text-gray-600">{a.start.split('T')[0]}</td>
                            <td className="p-3 font-bold text-gray-800">{ag ? ag.nom : 'Inconnu'}</td>
                            <td className="p-3 flex items-center gap-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${typeAbs === 'absence' ? 'bg-red-100 text-red-800' : 'bg-orange-100 text-orange-800'}`}>
                                {typeAbs.toUpperCase()}
                              </span>
                              {a.deduire && <span className="text-[10px] bg-red-600 text-white px-1 rounded shadow-sm" title="Déduit du bilan">DÉDUIT</span>}
                            </td>
                            <td className="p-3 text-center font-mono font-bold">{h}h{String(m).padStart(2,'0')}</td>
                            <td className="p-3 text-gray-600 italic">{a.motif || ''}</td>
                            <td className="p-3 text-center">
                              {typeAbs === 'retard' && a.deduire ? (
                                <button 
                                  onClick={() => toggleRattrape(a.id)}
                                  className={`px-2 py-1 rounded text-xs font-bold transition shadow-sm ${a.rattrape ? 'bg-green-100 text-green-800 border border-green-300' : 'bg-red-100 text-red-800 border border-red-300 hover:bg-red-200'}`}
                                >
                                  {a.rattrape ? '✅ Rattrapé' : '❌ À rattraper'}
                                </button>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <button onClick={() => supprimerAbsence(a.id)} className="text-gray-400 hover:text-red-600 px-2 py-1 rounded text-xs font-bold transition">✖</button>
                            </td>
                          </tr>
                        );
                      })}
                      {absences.length === 0 && (
                        <tr>
                          <td colSpan="7" className="p-6 text-center text-gray-400 italic">Aucune absence ou retard enregistré pour le moment.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- ONGLET CALENDRIER AGENT --- */}
        {vueActive === 'agent' && agentConsulte && (
          <div className="flex-1 flex flex-col h-full bg-[#0F2942] text-white print:h-auto print:bg-white print:text-black">
            <div className="flex justify-between items-center p-3 bg-[#0a1c2d] border-b border-gray-700 no-print shrink-0">
              <div className="flex gap-4 items-center">
                <select value={agentConsulte} onChange={(e) => setAgentConsulte(Number(e.target.value))} className="bg-white text-blue-900 font-bold p-2 rounded shadow outline-none">
                  {agents.map(a => <option key={a.id} value={a.id}>{a.nom} ({a.quotite}%)</option>)}
                </select>
                <span className="text-sm font-medium text-gray-300">Année Scolaire 2026-2027</span>
              </div>
              <div className="hidden print:block text-xl font-bold">Bilan Annuel : {agents.find(a=>a.id===agentConsulte)?.nom} (2026-2027)</div>
              <div className="flex gap-6 bg-[#173b5c] p-2 rounded border border-gray-600 print:border-none">
                <div className="flex flex-col items-center"><span className="text-xs text-gray-400 print:text-black">H. Contrat</span><span className="font-mono font-bold">{statsAgents.find(a=>a.id===agentConsulte)?.hContrat}</span></div>
                <div className="flex flex-col items-center"><span className="text-xs text-gray-400 print:text-black">H. Consommées</span><span className="font-mono font-bold text-blue-300 print:text-black">{formatHeureTableau(statsAgents.find(a=>a.id===agentConsulte)?.heuresConsommees)}</span></div>
                <div className="flex flex-col items-center">
                  <span className="text-xs text-gray-400 print:text-black">Solde Actuel</span>
                  <span className={`font-mono font-bold px-2 rounded print:border print:border-black ${statsAgents.find(a=>a.id===agentConsulte)?.soldeGlobal >= 0 ? 'bg-green-500 text-white print:text-green-800 print:bg-green-100' : 'bg-red-500 text-white print:text-red-800 print:bg-red-100'}`}>{formatHeureTableau(statsAgents.find(a=>a.id===agentConsulte)?.soldeGlobal)}</span>
                </div>
              </div>
            </div>

            {/* VUE ÉCRAN : 11 COLONNES COMPLÈTES AVEC DÉFILEMENT */}
            <div className="flex-1 overflow-auto p-2 bg-white print:hidden">
              <table className="w-full text-center border-collapse text-xs table-fixed min-w-[1200px] text-black">
                <thead><tr>{anneeScolaire.map((mois, i) => (<th key={i} className="border-2 border-black bg-yellow-400 py-1 uppercase">{mois.nom}</th>))}</tr></thead>
                <tbody>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(jourNum => (
                    <tr key={jourNum}>
                      {anneeScolaire.map((mois, idx) => {
                        const daysInMonth = new Date(mois.y, mois.m + 1, 0).getDate();
                        if (jourNum > daysInMonth) return <td key={idx} className="border border-gray-400 bg-gray-200"></td>;

                        const dateObj = new Date(mois.y, mois.m, jourNum);
                        const dateStr = `${mois.y}-${String(mois.m+1).padStart(2,'0')}-${String(jourNum).padStart(2,'0')}`;
                        const mondayStr = getMondayStr(dateObj);
                        
                        const dayOfWeek = dateObj.getDay();
                        const nomJour = nomsJours[dayOfWeek];
                        const estWeekEnd = dayOfWeek === 0 || dayOfWeek === 6;
                        const infoFerie = getInfoJourFerie(dateObj);

                        let hDefaut = 0;
                        if (!estWeekEnd && !infoFerie) {
                          const applicableTemplate = [...templateVersions].sort((a,b)=>b.dateDebut.localeCompare(a.dateDebut)).find(t => t.dateDebut <= dateStr) || templateVersions[0];
                          if (customWeeks[mondayStr]) hDefaut = customWeeks[mondayStr].filter(e => e.extendedProps?.agentId === agentConsulte && e.start.startsWith(dateStr) && !e.extendedProps?.isAbsence && !e.extendedProps?.isBesoin).reduce((tot, e) => tot + ((new Date(e.end) - new Date(e.start)) / 3600000), 0);
                          else hDefaut = gabarits[applicableTemplate.id]?.[agentConsulte]?.[dayOfWeek] || 0;
                        }
                        
                        const exc = exceptions[`${agentConsulte}_${dateStr}`];
                        let hFinal = exc ? exc.h : hDefaut;
                        
                        const absDuJour = absences.filter(a => a.agentId === agentConsulte && a.start.startsWith(dateStr));
                        const hDeduct = absDuJour.filter(a => a.deduire).reduce((tot, a) => tot + ((new Date(a.end) - new Date(a.start))/3600000), 0);
                        hFinal = Math.max(0, hFinal - hDeduct);

                        let noteAffichage = infoFerie ? infoFerie : (exc ? exc.note : '');
                        if (absDuJour.length > 0) {
                          const txtAbs = absDuJour.map(a => `${a.type.toUpperCase()}${a.deduire?' (-h)':''}`).join(', ');
                          noteAffichage = noteAffichage ? `${noteAffichage} / ${txtAbs}` : txtAbs;
                        }

                        let bgJour = "bg-[#c6f6d5]"; 
                        if (dayOfWeek === 0) bgJour = "bg-yellow-200"; 
                        if (dayOfWeek === 6) bgJour = "bg-yellow-50";  
                        if (infoFerie) bgJour = "bg-red-500 text-white font-bold";
                        if (absDuJour.length > 0) bgJour = "bg-red-200 text-red-900 font-bold";

                        return (
                          <td key={idx} className="border border-black p-0 hover:outline hover:outline-2 hover:outline-blue-500 cursor-pointer relative" onClick={() => gererClicJourAgent(agentConsulte, dateStr, hFinal, noteAffichage)}>
                            <div className="flex h-6 items-stretch">
                              <div className={`w-8 flex-shrink-0 flex items-center justify-center border-r border-gray-300 text-[10px] ${bgJour}`}><span className="rotate-[-90deg] mr-1 text-[8px] opacity-70">{nomJour[0]}</span>{jourNum}</div>
                              <div className={`w-10 flex-shrink-0 flex items-center justify-center font-bold font-mono border-r border-gray-300 ${exc || absDuJour.length > 0 ? 'bg-orange-100 text-orange-900' : ''}`}>{formatHeureTableau(hFinal)}</div>
                              <div className={`flex-1 flex items-center px-1 truncate text-[10px] ${exc || absDuJour.length > 0 ? 'bg-orange-50 font-bold text-orange-800' : 'text-gray-500'}`}>{noteAffichage}</div>
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
              <PrintAgentYearlyView 
                agent={agents.find(a=>a.id===agentConsulte)} 
                anneeScolaire={anneeScolaire}
                getMondayStr={getMondayStr}
                getInfoJourFerie={getInfoJourFerie}
                customWeeks={customWeeks}
                gabarits={gabarits}
                exceptions={exceptions}
                formatHeureTableau={formatHeureTableau}
                absences={absences}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}