import React from 'react';
import { generateGrid, getContrastYIQ } from './utils.js';

export const PrintTimeGridView = ({ events, titre, sonneries = [], limitesHeures = { baseMins: 460, span: 620 }, amplitude = { start: '07:30', end: '18:00' }, agents = [], joursAImprimer = [1, 2, 3, 4, 5], format = 'A4' }) => {
  const { gridLines, gridLabelsDaily } = generateGrid(limitesHeures, sonneries, amplitude);
  const nomsJours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  return (
    <div className="w-full bg-white text-black print:bg-white print:text-black">
      <style>{`
        @media print {
          @page { size: ${format} landscape; margin: 4mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      
      {joursAImprimer.map((jourIndex, idx) => {
        const isLast = idx === joursAImprimer.length - 1;
        const dayEvents = events.filter(e => new Date(e.start).getDay() === jourIndex);
        const dateExample = dayEvents.length > 0 ? new Date(dayEvents[0].start) : null;
        const dateStr = dateExample ? dateExample.toLocaleDateString('fr-FR') : '';

        return (
          <div 
            key={jourIndex} 
            className="w-full relative bg-white box-border flex flex-col"
            style={{ 
              height: format === 'A3' ? '287mm' : '202mm', 
              maxHeight: format === 'A3' ? '287mm' : '202mm',
              pageBreakAfter: isLast ? 'auto' : 'always', 
              breakAfter: isLast ? 'auto' : 'page',
              overflow: 'hidden'
            }}
          >
            <div className="flex justify-between items-center mb-1.5 pb-1 border-b-2 border-black shrink-0 px-2">
              <h2 className="text-base font-black uppercase">
                {nomsJours[jourIndex]} {dateStr}
              </h2>
              <div className="text-[11px] font-bold opacity-70">{titre} - Imprimé le {new Date().toLocaleDateString('fr-FR')}</div>
            </div>

            <div className="flex-1 flex flex-col relative border-2 border-black rounded-lg overflow-hidden bg-white">
              <div className="flex border-b-2 border-black bg-gray-100 shrink-0 ml-28 relative h-7 items-center">
                {gridLabelsDaily.map(lbl => (
                  <div key={lbl.timeStr} className="absolute text-[10px] font-black text-black" style={{ left: `${lbl.topPercent}%`, transform: 'translateX(-50%)' }}>
                    {lbl.timeStr}
                  </div>
                ))}
              </div>
              
              <div className="flex-1 relative z-10 flex flex-col bg-white overflow-hidden">
                <div className="absolute inset-0 left-28 pointer-events-none z-0">
                  {gridLines.map(line => (
                    <div key={line.timeStr} className="absolute top-0 bottom-0 border-black opacity-20" style={{ left: `${line.topPercent}%`, borderLeft: line.isHeurePleine || line.isSonnerie ? '2px solid black' : '1px dashed black' }}></div>
                  ))}
                </div>

                {agents.map(agent => {
                  const agentEvents = dayEvents.filter(e => e.extendedProps?.agentId === agent.id);
                  
                  return (
                    <div key={agent.id} className="flex border-b border-black/20 flex-1 relative min-h-0">
                      <div className="w-28 shrink-0 flex items-center justify-end p-1.5 border-r-2 border-black z-10 bg-gray-50 overflow-hidden">
                        <span className="text-xs font-black text-right leading-tight text-black truncate w-full">{agent.nom}</span>
                      </div>
                      
                      <div className="flex-1 relative">
                        {agentEvents.map(evt => {
                          const startD = new Date(evt.start); 
                          const endD = new Date(evt.end);
                          const startMins = startD.getHours() * 60 + startD.getMinutes(); 
                          const endMins = endD.getHours() * 60 + endD.getMinutes();
                          const durationMins = endMins - startMins;
                          
                          const left = Math.max(0, ((startMins - limitesHeures.baseMins) / limitesHeures.span) * 100);
                          const width = Math.min(100 - left, (durationMins / limitesHeures.span) * 100);
                          
                          const isMicro = durationMins <= 15;
                          const isShort = durationMins > 15 && durationMins <= 45;
                          const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                          
                          const isAbs = evt.extendedProps?.isAbsence;
                          const couleurFond = isAbs ? (evt.extendedProps?.typeAbsence === 'absence' ? '#ef4444' : '#f59e0b') : (evt.extendedProps?.posteCouleur || evt.backgroundColor || '#3b82f6');
                          const couleurTexte = getContrastYIQ(couleurFond);
                          const texte = isAbs ? (evt.extendedProps?.typeAbsence === 'absence' ? 'ABS' : 'RETARD') : evt.extendedProps?.posteNom;

                          return (
                            <div 
                              key={evt.id}
                              className="absolute top-0.5 bottom-0.5 rounded shadow-xs text-[9px] flex flex-col justify-center px-0.5 border border-black/40 overflow-hidden"
                              style={{ 
                                left: `${left}%`, 
                                width: `${width}%`, 
                                backgroundColor: couleurFond, 
                                color: couleurTexte,
                                WebkitPrintColorAdjust: 'exact', 
                                printColorAdjust: 'exact' 
                              }}
                            >
                              <div className={`w-full h-full flex overflow-hidden ${isMicro || isShort ? 'items-center justify-center' : 'flex-col items-center justify-center'}`}>
                                {isMicro || isShort ? (
                                  <span className="font-bold uppercase text-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: isMicro ? '7px' : '8px', whiteSpace: 'nowrap' }}>
                                    {texte}
                                  </span>
                                ) : (
                                  <>
                                    <span className="font-bold truncate leading-none text-[9px] w-full text-center">{texte}</span>
                                    {/* Masque les heures si le bloc est trop étroit pour éviter les superpositions en A4 */}
                                    {durationMins >= 60 && (
                                      <span className="opacity-90 font-mono truncate mt-0.5 text-[7px] w-full text-center">{formatTime(startMins)}-{formatTime(endMins)}</span>
                                    )}
                                  </>
                                )}
                              </div>
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
      })}
    </div>
  );
};

export const PrintTemplateView = ({ template, joursAImprimer = [1, 2, 3, 4, 5], agents, limitesHeures, sonneries, amplitude, formatHeureTableau, format = 'A4' }) => {
  const { gridLines, gridLabelsDaily } = generateGrid(limitesHeures, sonneries, amplitude);
  const nomsJours = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

  return (
    <div className="w-full bg-white print:bg-white text-black print:text-black">
      <style>{`
        @media print {
          @page { size: ${format} landscape; margin: 4mm; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {joursAImprimer.map((jourIndex, idx) => {
        const isLast = idx === joursAImprimer.length - 1;
        const d = new Date(template.dateDebut || '2024-09-01');
        d.setDate(d.getDate() + (jourIndex - 1));
        const pad = n => String(n).padStart(2, '0');
        const dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

        return (
          <div 
            key={jourIndex} 
            className="w-full relative bg-white box-border flex flex-col"
            style={{ 
              height: format === 'A3' ? '287mm' : '202mm', 
              maxHeight: format === 'A3' ? '287mm' : '202mm',
              pageBreakAfter: isLast ? 'auto' : 'always', 
              breakAfter: isLast ? 'auto' : 'page',
              overflow: 'hidden'
            }}
          >
            <div className="flex justify-between items-center mb-1.5 pb-1 border-b-2 border-black shrink-0 px-2">
              <h2 className="text-base font-black uppercase">
                Modèle : {template.nom} - {nomsJours[jourIndex]}
              </h2>
              <div className="text-[11px] font-bold opacity-70">Imprimé le {new Date().toLocaleDateString('fr-FR')}</div>
            </div>

            <div className="flex-1 flex flex-col relative border-2 border-black rounded-lg overflow-hidden bg-white">
              <div className="flex border-b-2 border-black bg-gray-100 shrink-0 ml-32 relative h-7 items-center">
                {gridLabelsDaily.map(lbl => (
                  <div key={lbl.timeStr} className="absolute text-[10px] font-black text-black" style={{ left: `${lbl.topPercent}%`, transform: 'translateX(-50%)' }}>
                    {lbl.timeStr}
                  </div>
                ))}
              </div>
              
              <div className="flex-1 relative z-10 flex flex-col bg-white overflow-hidden">
                <div className="absolute inset-0 left-32 pointer-events-none z-0">
                  {gridLines.map(line => (
                    <div key={line.timeStr} className="absolute top-0 bottom-0 border-black opacity-20" style={{ left: `${line.topPercent}%`, borderLeft: line.isHeurePleine || line.isSonnerie || line.isStartDay ? '2px solid black' : '1px dashed black' }}></div>
                  ))}
                </div>

                {agents.map(agent => {
                  const eventsDuJour = (template.events || []).filter(e => e.start.startsWith(dateStr) && e.extendedProps?.agentId === agent.id);
                  const totalMinsJour = eventsDuJour.filter(e => !e.extendedProps?.isAbsence).reduce((acc, evt) => acc + (new Date(evt.end) - new Date(evt.start)) / 60000, 0);
                  const heuresJourStr = formatHeureTableau(totalMinsJour / 60, true);

                  return (
                    <div key={agent.id} className="flex border-b border-black/20 flex-1 relative min-h-0">
                      <div className="w-32 shrink-0 flex flex-col items-end justify-center p-1.5 border-r-2 border-black z-10 bg-gray-50 overflow-hidden">
                        <span className="text-xs font-black text-right leading-tight text-black">{agent.nom}</span>
                        <span className="text-[9px] font-mono font-bold opacity-80 text-black">{heuresJourStr}</span>
                      </div>
                      
                      <div className="flex-1 relative">
                        {eventsDuJour.map(evt => {
                          const startD = new Date(evt.start); 
                          const endD = new Date(evt.end);
                          const startMins = startD.getHours() * 60 + startD.getMinutes(); 
                          const endMins = endD.getHours() * 60 + endD.getMinutes();
                          const durationMins = endMins - startMins;
                          
                          const left = Math.max(0, ((startMins - limitesHeures.baseMins) / limitesHeures.span) * 100);
                          const width = Math.min(100 - left, ((endMins - startMins) / limitesHeures.span) * 100);
                          
                          const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                          const isMicro = durationMins <= 15;
                          const isShort = durationMins > 15 && durationMins <= 45;
                          
                          const couleurFond = evt.extendedProps?.posteCouleur || evt.backgroundColor || '#3b82f6';
                          const couleurTexte = getContrastYIQ(couleurFond);

                          return (
                            <div 
                              key={evt.id}
                              className="absolute top-0.5 bottom-0.5 rounded shadow-xs text-[9px] flex flex-col justify-center px-0.5 border border-black/40 overflow-hidden"
                              style={{ 
                                left: `${left}%`, 
                                width: `${width}%`, 
                                backgroundColor: couleurFond, 
                                color: couleurTexte,
                                WebkitPrintColorAdjust: 'exact', 
                                printColorAdjust: 'exact' 
                              }}
                            >
                              <div className={`w-full h-full flex overflow-hidden ${isMicro || isShort ? 'items-center justify-center' : 'flex-col items-center justify-center'}`}>
                                {isMicro || isShort ? (
                                  <span className="font-bold uppercase text-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: isMicro ? '7px' : '8px', whiteSpace: 'nowrap' }}>
                                    {evt.extendedProps?.posteNom}
                                  </span>
                                ) : (
                                  <>
                                    <span className="font-bold truncate leading-none text-[9px] w-full text-center">{evt.extendedProps?.posteNom}</span>
                                    {durationMins >= 60 && (
                                      <span className="opacity-90 font-mono truncate mt-0.5 text-[7px] w-full text-center">{formatTime(startMins)}-{formatTime(endMins)}</span>
                                    )}
                                  </>
                                )}
                              </div>
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
      })}
    </div>
  );
};

// ------------------------ VUES INCHANGÉES ------------------------
export const PrintDailyView = ({ agents, jourConsulte, getEventsForWeek, absences, sonneries = [], limitesHeures = { baseMins: 460, span: 620 }, postes, getMondayStr, amplitude = { start: '07:30', end: '18:00' } }) => {
  const mondayStr = getMondayStr(jourConsulte);
  const allEvents = getEventsForWeek(mondayStr);
  const extTime = (iso) => { const d = new Date(iso); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
  const { gridLines, gridLabelsDaily } = generateGrid(limitesHeures, sonneries);

  return (
    <div className="print-weekly-page flex flex-col bg-white p-2 h-full">
      <div className="text-center mb-2 border-b border-black pb-1 shrink-0">
        <h2 className="text-lg font-black uppercase tracking-wider text-gray-900">
          Planning Journalier - {new Date(jourConsulte).toLocaleDateString('fr-FR', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}
        </h2>
      </div>

      <div className="flex flex-wrap gap-2 mb-2 justify-center shrink-0">
        <span className="text-[9px] font-bold text-gray-500 self-center uppercase mr-1">Légende :</span>
        {postes.map(p => (<span key={p.id} className="px-1.5 py-0.5 rounded text-[9px] font-bold" style={{ backgroundColor: p.couleur, color: getContrastYIQ(p.couleur), border: '1px solid rgba(0,0,0,0.2)' }}>{p.nom}</span>))}
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-100 text-red-800 border border-red-300">🚫 ABSENCE</span>
        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-orange-100 text-orange-800 border border-orange-300">⏰ RETARD</span>
      </div>

      <div className="flex-1 border border-black relative bg-white flex flex-col overflow-hidden">
        <div className="flex border-b border-black bg-gray-100 shrink-0 h-6 relative ml-28">
           {gridLabelsDaily.map(lbl => (
              <div key={lbl.timeStr} className="absolute text-[10px] font-black text-black top-1" style={{ left: `${lbl.topPercent}%`, transform: 'translateX(-50%)' }}>
                 {lbl.timeStr}
              </div>
           ))}
        </div>

        <div className="flex-1 relative overflow-hidden flex flex-col">
          <div className="absolute inset-0 top-0 bottom-0 left-28 right-0 pointer-events-none z-0">
            {gridLines.map(line => (
               <div key={line.timeStr} className="absolute top-0 bottom-0" style={{ left: `${line.topPercent}%`, borderLeft: line.isHeurePleine || line.isSonnerie ? '2px solid rgba(0,0,0,0.3)' : '1px dashed rgba(0,0,0,0.15)' }}></div>
            ))}
          </div>

          <div className="flex flex-col h-full w-full relative z-10 flex-1">
            {agents.map(agent => {
              const eventsDuJour = allEvents.filter(e => e.extendedProps?.agentId === agent.id && e.start.startsWith(jourConsulte));
              
              return (
                <div key={agent.id} className="flex border-b border-gray-300 flex-1 relative">
                  <div className="w-28 shrink-0 flex items-center justify-end p-2 border-r border-black" style={{ backgroundColor: agent.couleurFond, color: getContrastYIQ(agent.couleurFond) }}>
                    <span className="text-xs font-black text-right">{agent.nom}</span>
                  </div>
                  
                  <div className="flex-1 relative my-1">
                    {eventsDuJour.map(evt => {
                      const startD = new Date(evt.start); const endD = new Date(evt.end);
                      const startMins = startD.getHours() * 60 + startD.getMinutes(); const endMins = endD.getHours() * 60 + endD.getMinutes();
                      const left = Math.max(0, ((startMins - limitesHeures.baseMins) / limitesHeures.span) * 100);
                      const width = Math.min(100 - left, ((endMins - startMins) / limitesHeures.span) * 100);
                      
                      return (
                        <div key={evt.id} className="absolute top-0 bottom-0 rounded shadow-sm flex flex-col justify-center px-1 overflow-hidden border border-black/20"
                          style={{ left: `${left}%`, width: `${width}%`, backgroundColor: evt.extendedProps?.posteCouleur || '#3b82f6', color: getContrastYIQ(evt.extendedProps?.posteCouleur || '#3b82f6') }}>
                          <span className="font-bold text-[8px] truncate leading-tight">{evt.extendedProps?.posteNom}</span>
                          {((endMins - startMins) > 15) && <span className="text-[7px] opacity-90 truncate leading-tight">{extTime(evt.start)}-{extTime(evt.end)}</span>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PrintAgentYearlyView = ({ agent, baseYear, anneeScolaire, getMondayStr, getInfosPeriode, exceptions, formatHeureTableau, absences, getHeuresTheoriquesJour, getHeuresAbsence }) => {
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