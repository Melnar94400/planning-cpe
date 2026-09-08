import React from 'react';
import { generateGrid, layoutDayEventsByAgent, getContrastYIQ } from './utils';

export const PrintTimeGridView = ({ events, titre, sonneries = [], limitesHeures = { baseMins: 460, span: 620 }, amplitude = { start: '07:30', end: '18:00' }, agents = [] }) => {
  const planningEvents = events.filter(e => !e.extendedProps?.isBesoin);
  const nomsJours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
  const { gridLines, gridLabelsWeekly } = generateGrid(limitesHeures, sonneries, amplitude);

  return (
    <div className="print-weekly-page flex flex-col bg-white p-2 text-black">
      <div className="text-center mb-1 border-b border-black pb-1 shrink-0">
        <h2 className="text-xl font-black uppercase tracking-wider text-black">{titre}</h2>
        <p className="text-gray-600 font-bold text-xs">Édité le {new Date().toLocaleDateString('fr-FR')}</p>
      </div>

      <div className="flex flex-col flex-1 border-2 border-black relative overflow-hidden bg-white">
        
        <div className="flex border-b-2 border-black bg-gray-200 shrink-0 h-9 items-stretch">
          <div className="w-16 shrink-0 border-r-2 border-black flex items-center justify-center text-[10px] font-black text-gray-800 font-mono">
            {amplitude?.start || ''}
          </div>
          <div className="flex-1 grid grid-cols-5">
            {[1, 2, 3, 4, 5].map(day => {
              const dayEvents = planningEvents.filter(e => new Date(e.start).getDay() === day);
              const { workingAgentIds } = layoutDayEventsByAgent(dayEvents, agents, day);

              return (
                <div key={day} className="border-r border-black last:border-r-0 flex flex-col justify-between">
                  <div className="font-black text-center uppercase text-[11px] text-black py-0.5 border-b border-black/30">
                    {nomsJours[day - 1]}
                  </div>
                  <div className="flex flex-1 items-center bg-gray-100 text-[9px] font-bold divide-x divide-black/20 text-gray-700">
                    {workingAgentIds.length === 0 ? (
                      <span className="w-full text-center text-gray-400 italic text-[8px]">-</span>
                    ) : (
                      workingAgentIds.map(id => (
                        <div key={id} className="flex-1 truncate text-center px-0.5">
                          {agents.find(a => a.id === id)?.nom || 'AED'}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-1 relative overflow-hidden bg-white">
          <div className="w-16 shrink-0 border-r-2 border-black bg-gray-100 relative">
            {gridLabelsWeekly.map(lbl => (
              <div key={lbl.timeStr} className="absolute w-full pr-1.5 text-right pointer-events-none" style={{ top: `${lbl.topPercent}%`, transform: 'translateY(-50%)' }}>
                <span className="text-black font-black bg-white px-1 py-0.5 rounded border border-black text-[9px] shadow-xs">
                  {lbl.timeStr}
                </span>
              </div>
            ))}
          </div>

          <div className="flex-1 grid grid-cols-5 relative bg-white">
            {[1, 2, 3, 4, 5].map(day => {
              const dayEvents = planningEvents.filter(e => new Date(e.start).getDay() === day);
              const { layouted } = layoutDayEventsByAgent(dayEvents, agents, day);

              return (
                <div key={day} className="flex flex-col border-r border-black last:border-r-0 relative h-full">
                  <div className="flex-1 relative bg-white h-full">
                    {gridLines.map(line => (
                      <div key={line.timeStr} className="absolute w-full pointer-events-none z-0" 
                        style={{ 
                          top: `${line.topPercent}%`, 
                          borderBottom: line.isHeurePleine || line.isSonnerie ? '1.5px solid rgba(0,0,0,0.6)' : '1px dashed rgba(0,0,0,0.2)' 
                        }}></div>
                    ))}

                    {layouted.map(item => {
                      const { evt, startMins, endMins, col, totalCols } = item;
                      const startD = new Date(evt.start); const endD = new Date(evt.end);
                      const top = Math.max(0, ((startMins - limitesHeures.baseMins) / limitesHeures.span) * 100);
                      const height = Math.min(100 - top, ((endMins - startMins) / limitesHeures.span) * 100);
                      const isAbs = evt.extendedProps?.isAbsence;
                      const couleur = isAbs ? (evt.extendedProps?.typeAbsence === 'absence' ? '#ef4444' : '#f59e0b') : (evt.borderColor || '#3b82f6');
                      
                      const widthPercent = 100 / totalCols;
                      const leftPercent = col * widthPercent;

                      return (
                        <div key={evt.id} className="absolute rounded p-1 border border-black/40 overflow-hidden shadow-xs bg-gray-50 text-black"
                          style={{ top: `${top}%`, height: `${Math.max(height, 3)}%`, left: `${leftPercent}%`, width: `${widthPercent}%`, borderLeftColor: couleur, borderLeftWidth: '4px', fontSize: '9px', lineHeight: '1.1', zIndex: 10 }}
                        >
                          <div className="font-black truncate text-[9px]" style={{ color: couleur }}>{isAbs ? (evt.extendedProps?.typeAbsence === 'absence' ? 'ABSENCE' : 'RETARD') : evt.extendedProps?.posteNom}</div>
                          <div className="font-bold truncate text-[8px] text-black">{evt.extendedProps?.agentName || evt.extendedProps?.agentNom}</div>
                          <div className="text-[7px] text-gray-700 font-mono">{startD.getHours()}h{String(startD.getMinutes()).padStart(2,'0')}-{endD.getHours()}h{String(endD.getMinutes()).padStart(2,'0')}</div>
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
  );
};

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