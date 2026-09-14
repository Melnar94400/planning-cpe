import React from 'react';
import { generateGrid, getContrastYIQ } from './utils';

// --- STYLES D'IMPRESSION GLOBAUX ---
const PrintStyle = () => (
  <style>{`
    @media print {
      * {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      /* FIX FIREFOX : Un conteneur strictly-block avec une hauteur en millimètres */
      .print-wrapper {
        display: block !important;
        width: 100% !important;
        height: 185mm !important; /* Hauteur physique d'une page A4 paysage moins marges */
        max-height: 185mm !important;
        page-break-inside: avoid !important;
        break-inside: avoid !important;
        page-break-after: always !important;
        break-after: page !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      /* La dernière page ne force pas de page blanche supplémentaire */
      .print-wrapper:last-child {
        page-break-after: auto !important;
        break-after: auto !important;
      }
      /* Le calendrier flex s'étire à 100% à l'intérieur du wrapper fixe */
      .print-a4-page {
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        background: white !important;
        box-sizing: border-box !important;
      }
    }
  `}</style>
);

const printExact = { WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' };

// --- HELPERS COMMUNS POUR L'IMPRESSION ---
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

const renderPrintGrid = (gridLines, gridLabelsDaily, gridTicks) => (
  <>
    <div className="flex border-b border-black/20 bg-gray-100 shrink-0 ml-24 relative h-6 items-center" style={printExact}>
      {gridTicks?.map(tick => (
        <div key={tick.m} className="absolute bottom-0 w-[1px] h-1.5 bg-black/20" style={{ left: `${tick.topPercent}%` }}></div>
      ))}
      {gridLabelsDaily.map(lbl => (
        <div key={lbl.timeStr} className="absolute text-[8px] font-black text-black top-1/2 -translate-y-1/2" style={{ left: `${lbl.topPercent}%`, transform: 'translateX(-50%) translateY(-50%)' }}>
          {lbl.timeStr}
        </div>
      ))}
    </div>
    <div className="absolute inset-0 left-24 pointer-events-none z-0 mt-6">
      {gridLines.map(line => (
        <div key={line.timeStr} className="absolute top-0 bottom-0 border-black/20 opacity-50" style={{ left: `${line.topPercent}%`, borderLeft: line.isHeurePleine || line.isSonnerie ? '2px solid currentColor' : '1px dashed currentColor' }}></div>
      ))}
    </div>
  </>
);

const renderPrintEvent = (evt, limitesHeures, isBesoinsMode) => {
  const startD = new Date(evt.start); const endD = new Date(evt.end);
  const startMins = startD.getHours() * 60 + startD.getMinutes();
  const endMins = endD.getHours() * 60 + endD.getMinutes();
  const left = Math.max(0, ((startMins - limitesHeures.baseMins) / limitesHeures.span) * 100);
  const width = Math.min(100 - left, ((endMins - startMins) / limitesHeures.span) * 100);
  const dur = endMins - startMins;

  let bgColor = evt.extendedProps?.posteCouleur || evt.backgroundColor || '#3b82f6';
  let title = evt.extendedProps?.posteNom || 'Poste';
  
  if (isBesoinsMode) {
    const isSous = evt.extendedProps?.isSousEffectif;
    bgColor = isSous ? '#dc2626' : '#16a34a';
    title = `${evt.extendedProps?.minCount} / ${evt.extendedProps?.qte}`;
  } else if (evt.extendedProps?.isAbsence) {
    const typeAbs = evt.extendedProps.typeAbsence;
    bgColor = typeAbs === 'absence' ? '#ef4444' : typeAbs === 'retard' ? '#f59e0b' : '#10b981';
    title = typeAbs === 'absence' ? 'ABS' : typeAbs === 'retard' ? 'RET' : 'SUPP';
  }

  const textColor = getContrastYIQ(bgColor);
  const isMicro = dur <= 25; 
  const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
  const timeStr = `${formatTime(startMins)}-${formatTime(endMins)}`;
  
  return (
    <div key={evt.id} className="absolute top-[2px] bottom-[2px] rounded shadow-sm flex flex-col justify-center border border-black/30 overflow-hidden"
         style={{ left: `${left}%`, width: `${width}%`, backgroundColor: bgColor, color: textColor, ...printExact }}>
      {isMicro ? (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden">
          <div className="flex items-center justify-center gap-1 font-bold text-[6px] uppercase leading-none" 
               style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap' }}>
            <span>{title}</span>
            <span className="font-mono font-normal opacity-90 text-[5.5px] lowercase">{timeStr}</span>
          </div>
        </div>
      ) : (
        <>
          <span className="font-bold truncate text-center leading-none text-[8px] w-full px-0.5">{title}</span>
          <span className="opacity-90 font-mono truncate text-center text-[6px] mt-0.5 w-full px-0.5">{timeStr}</span>
        </>
      )}
    </div>
  );
};

// --- VUES D'IMPRESSION EXPORTÉES ---

export const PrintDailyView = ({ agents, jourConsulte, getEventsForWeek, absences, sonneries, limitesHeures, postes, getMondayStr, amplitude }) => {
  const { gridLines, gridLabelsDaily, gridTicks } = generateGrid(limitesHeures, sonneries, amplitude);
  const allEvents = getEventsForWeek(getMondayStr(jourConsulte));

  return (
    <div className="w-full bg-white print:block">
      <PrintStyle />
      <div className="print-wrapper mb-8 print:mb-0">
        <div className="print-a4-page" style={printExact}>
          <div className="text-center font-bold text-xl mb-4 py-2 border-b-2 border-black">Planning Quotidien - {jourConsulte}</div>
          <div className="flex-1 flex flex-col relative border border-black/20">
            {renderPrintGrid(gridLines, gridLabelsDaily, gridTicks)}
            <div className="flex-1 relative z-10 flex flex-col mt-6">
              {agents.map(agent => {
                const eventsDuJour = allEvents.filter(e => e.extendedProps?.agentId === agent.id && e.start.startsWith(jourConsulte));
                const totalMins = eventsDuJour.filter(e => !e.extendedProps?.isAbsence).reduce((acc, evt) => acc + (new Date(evt.end) - new Date(evt.start)) / 60000, 0);
                const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                const heuresJourStr = formatTime(totalMins);
                const amplitudeStr = getAmplitudeStr(eventsDuJour);

                return (
                  <div key={agent.id} className="flex border-b border-black/20 flex-1 relative min-h-[40px] items-center">
                    <div className="w-24 shrink-0 flex flex-col items-end justify-center p-1 border-r border-black/20 z-10 h-full" style={{ backgroundColor: agent.couleurFond, color: getContrastYIQ(agent.couleurFond), ...printExact }}>
                      <span className="text-[10px] font-black text-right leading-tight truncate w-full">{agent.nom}</span>
                      <div className="flex flex-col items-end gap-0.5 mt-0.5">
                        {amplitudeStr && <span className="text-[7px] font-bold opacity-80 leading-none">{amplitudeStr}</span>}
                        <span className="text-[8px] font-mono font-bold bg-black/20 px-1.5 py-0.5 rounded leading-none">{heuresJourStr}</span>
                      </div>
                    </div>
                    <div className="flex-1 relative h-full">
                      {eventsDuJour.map(evt => renderPrintEvent(evt, limitesHeures, false))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const PrintTimeGridView = ({ events, agents, limitesHeures, amplitude, titre, joursAImprimer, format, sonneries }) => {
  const { gridLines, gridLabelsDaily, gridTicks } = generateGrid(limitesHeures, sonneries, amplitude);
  const nomsJours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

  let activeMonday = new Date();
  if (events && events.length > 0) {
    const d = new Date(events[0].start);
    if (!isNaN(d.getTime())) activeMonday = d;
  }
  const day = activeMonday.getDay() || 7;
  activeMonday.setDate(activeMonday.getDate() - (day - 1));

  return (
    <div className="w-full bg-white print:block">
      <PrintStyle />
      {joursAImprimer.map((dayIndex, idx) => {
        const dateDuJour = new Date(activeMonday);
        dateDuJour.setDate(dateDuJour.getDate() + dayIndex - 1);
        const pad = n => String(n).padStart(2, '0');
        const dateLabel = !isNaN(dateDuJour.getTime()) ? `${pad(dateDuJour.getDate())}/${pad(dateDuJour.getMonth()+1)}` : '';
        const targetDayOfWeek = dayIndex === 7 ? 0 : dayIndex; 
        const eventsDuJour = events.filter(e => {
          const d = new Date(e.start);
          return !isNaN(d.getTime()) && d.getDay() === targetDayOfWeek;
        });

        return (
          <div key={dayIndex} className="print-wrapper mb-8 print:mb-0">
            <div className="print-a4-page" style={printExact}>
              <div className="text-center font-bold text-lg mb-2 py-1 border-b-2 border-black flex justify-between items-end">
                <span>{titre}</span>
                <span className="text-xl uppercase">{nomsJours[dayIndex-1]} {dateLabel}</span>
              </div>
              <div className="flex-1 flex flex-col relative border border-black/20">
                {renderPrintGrid(gridLines, gridLabelsDaily, gridTicks)}
                <div className="flex-1 relative z-10 flex flex-col mt-6">
                  {agents.map(agent => {
                    const agentEvents = eventsDuJour.filter(e => e.extendedProps?.agentId === agent.id);
                    const totalMins = agentEvents.filter(e => !e.extendedProps?.isAbsence).reduce((acc, evt) => acc + (new Date(evt.end) - new Date(evt.start)) / 60000, 0);
                    const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                    const heuresJourStr = formatTime(totalMins);
                    const amplitudeStr = getAmplitudeStr(agentEvents);

                    return (
                      <div key={agent.id} className="flex border-b border-black/20 flex-1 relative min-h-[40px] items-center">
                        <div className="w-24 shrink-0 flex flex-col items-end justify-center p-1 border-r border-black/20 z-10 h-full" style={{ backgroundColor: agent.couleurFond, color: getContrastYIQ(agent.couleurFond), ...printExact }}>
                          <span className="text-[10px] font-black text-right leading-tight truncate w-full">{agent.nom}</span>
                          <div className="flex flex-col items-end gap-0.5 mt-0.5">
                            {amplitudeStr && <span className="text-[7px] font-bold opacity-80 leading-none">{amplitudeStr}</span>}
                            <span className="text-[8px] font-mono font-bold bg-black/20 px-1.5 py-0.5 rounded leading-none">{heuresJourStr}</span>
                          </div>
                        </div>
                        <div className="flex-1 relative h-full">
                          {agentEvents.map(evt => renderPrintEvent(evt, limitesHeures, false))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const PrintTemplateView = ({ template, joursAImprimer, format, agents, limitesHeures, sonneries, amplitude, formatHeureTableau }) => {
  const { gridLines, gridLabelsDaily, gridTicks } = generateGrid(limitesHeures, sonneries, amplitude);
  const nomsJours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

  return (
    <div className="w-full bg-white print:block">
      <PrintStyle />
      {joursAImprimer.map((dayIndex, idx) => {
        const templateDateObj = new Date(template.dateDebut);
        templateDateObj.setDate(templateDateObj.getDate() + (dayIndex - 1));
        const pad = n => String(n).padStart(2, '0');
        const dateStr = `${templateDateObj.getFullYear()}-${pad(templateDateObj.getMonth()+1)}-${pad(templateDateObj.getDate())}`;

        const eventsDuJour = (template.events || []).filter(e => e.start.startsWith(dateStr));

        return (
          <div key={dayIndex} className="print-wrapper mb-8 print:mb-0">
            <div className="print-a4-page" style={printExact}>
              <div className="text-center font-bold text-lg mb-2 py-1 border-b-2 border-black flex justify-between items-end">
                <span>Modèle : {template.nom}</span>
                <span className="text-xl uppercase">{nomsJours[dayIndex-1]}</span>
              </div>
              <div className="flex-1 flex flex-col relative border border-black/20">
                {renderPrintGrid(gridLines, gridLabelsDaily, gridTicks)}
                <div className="flex-1 relative z-10 flex flex-col mt-6">
                  {agents.map(agent => {
                    const agentEvents = eventsDuJour.filter(e => e.extendedProps?.agentId === agent.id);
                    const totalMins = agentEvents.filter(e => !e.extendedProps?.isAbsence).reduce((acc, evt) => acc + (new Date(evt.end) - new Date(evt.start)) / 60000, 0);
                    const fmtTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                    const heuresJourStr = fmtTime(totalMins);
                    const amplitudeStr = getAmplitudeStr(agentEvents);

                    return (
                      <div key={agent.id} className="flex border-b border-black/20 flex-1 relative min-h-[40px] items-center">
                        <div className="w-24 shrink-0 flex flex-col items-end justify-center p-1 border-r border-black/20 z-10 h-full" style={{ backgroundColor: agent.couleurFond, color: getContrastYIQ(agent.couleurFond), ...printExact }}>
                          <span className="text-[10px] font-black text-right leading-tight truncate w-full">{agent.nom}</span>
                          <div className="flex flex-col items-end gap-0.5 mt-0.5">
                            {amplitudeStr && <span className="text-[7px] font-bold opacity-80 leading-none">{amplitudeStr}</span>}
                            <span className="text-[8px] font-mono font-bold bg-black/20 px-1.5 py-0.5 rounded leading-none">{heuresJourStr}</span>
                          </div>
                        </div>
                        <div className="flex-1 relative h-full">
                          {agentEvents.map(evt => renderPrintEvent(evt, limitesHeures, false))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const PrintIndividualWeeklyView = ({ events, agents, limitesHeures, amplitude, titre, joursAImprimer, sonneries }) => {
  const { gridLines, gridLabelsDaily, gridTicks } = generateGrid(limitesHeures, sonneries, amplitude);
  const nomsJours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];

  let activeMonday = new Date();
  if (events && events.length > 0) {
    const d = new Date(events[0].start);
    if (!isNaN(d.getTime())) activeMonday = d;
  }
  const day = activeMonday.getDay() || 7;
  activeMonday.setDate(activeMonday.getDate() - (day - 1));

  return (
    <div className="w-full bg-white print:block">
      <PrintStyle />
      {agents.map((agent, agentIdx) => {
        return (
          <div key={agent.id} className="print-wrapper mb-8 print:mb-0">
            <div className="print-a4-page" style={printExact}>
              <div className="text-center font-bold text-lg mb-2 py-1 border-b-2 border-black flex justify-between items-end">
                <span>{titre}</span>
                <span className="text-xl uppercase px-2 py-0.5 rounded shadow-sm" style={{ backgroundColor: agent.couleurFond, color: getContrastYIQ(agent.couleurFond), ...printExact }}>
                  Planning : {agent.nom}
                </span>
              </div>
              <div className="flex-1 flex flex-col relative border border-black/20">
                {renderPrintGrid(gridLines, gridLabelsDaily, gridTicks)}
                <div className="flex-1 relative z-10 flex flex-col mt-6">
                  {joursAImprimer.map(dayIndex => {
                    const dateDuJour = new Date(activeMonday);
                    dateDuJour.setDate(dateDuJour.getDate() + dayIndex - 1);
                    const pad = n => String(n).padStart(2, '0');
                    const dateLabel = !isNaN(dateDuJour.getTime()) ? `${pad(dateDuJour.getDate())}/${pad(dateDuJour.getMonth()+1)}` : '';
                    const targetDayOfWeek = dayIndex === 7 ? 0 : dayIndex; 
                    
                    const agentEventsDuJour = events.filter(e => {
                      const d = new Date(e.start);
                      return !isNaN(d.getTime()) && d.getDay() === targetDayOfWeek && e.extendedProps?.agentId === agent.id;
                    });

                    const totalMins = agentEventsDuJour.filter(e => !e.extendedProps?.isAbsence).reduce((acc, evt) => acc + (new Date(evt.end) - new Date(evt.start)) / 60000, 0);
                    const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
                    const heuresJourStr = formatTime(totalMins);
                    const amplitudeStr = getAmplitudeStr(agentEventsDuJour);

                    return (
                      <div key={dayIndex} className="flex border-b border-black/20 flex-1 relative min-h-[40px] items-center">
                        <div className="w-24 shrink-0 flex flex-col items-end justify-center p-1 border-r border-black/20 z-10 h-full bg-gray-100" style={printExact}>
                          <span className="text-[10px] font-black text-right leading-tight truncate w-full uppercase">{nomsJours[dayIndex-1]}</span>
                          <span className="text-[9px] font-bold text-gray-500">{dateLabel}</span>
                          <div className="flex flex-col items-end gap-0.5 mt-0.5">
                            {amplitudeStr && <span className="text-[7px] font-bold opacity-80 leading-none">{amplitudeStr}</span>}
                            <span className="text-[8px] font-mono font-bold bg-black/20 px-1.5 py-0.5 rounded leading-none">{heuresJourStr}</span>
                          </div>
                        </div>
                        <div className="flex-1 relative h-full">
                          {agentEventsDuJour.map(evt => renderPrintEvent(evt, limitesHeures, false))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const PrintAgentYearlyView = ({ agent, baseYear, anneeScolaire, getMondayStr, getInfosPeriode, exceptions, formatHeureTableau, absences, getHeuresTheoriquesJour, getHeuresAbsence }) => {
  const nomsJours = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  
  return (
    <div className="w-full bg-white text-black p-4" style={printExact}>
      <PrintStyle />
      <table className="w-full text-center border-collapse text-[10px] table-fixed shadow-sm">
        <thead>
          <tr>
            {anneeScolaire.map((mois, i) => {
              const daysInMonth = new Date(mois.y, mois.m + 1, 0).getDate();
              let totalMensuel = 0;
              for (let jourNum = 1; jourNum <= daysInMonth; jourNum++) {
                const dateStr = `${mois.y}-${String(mois.m+1).padStart(2,'0')}-${String(jourNum).padStart(2,'0')}`;
                const exc = exceptions[`${agent.id}_${dateStr}`];
                let hFinal = exc ? exc.h : getHeuresTheoriquesJour(agent.id, dateStr);
                const absDuJour = absences.filter(a => a.agentId === agent.id && a.start.startsWith(dateStr));
                const hDeduct = absDuJour.filter(a => a.deduire).reduce((tot, a) => tot + getHeuresAbsence(a), 0);
                totalMensuel += Math.max(0, hFinal - hDeduct);
              }
              return (
                <th key={i} className="border border-black bg-gray-200 py-1 uppercase tracking-wider" style={printExact}>
                  <div className="flex flex-col items-center justify-center gap-0.5">
                    <span>{mois.nom}</span>
                    <span className="text-[8px] font-mono bg-white px-1.5 py-[1px] rounded border border-black/20 font-bold" style={printExact}>
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
                if (jourNum > daysInMonth) return <td key={idx} className="border border-black bg-gray-100" style={printExact}></td>;

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
                if (hFinal > 0 && infoPeriode && infoPeriode.type === 'vacances') noteAffichage = exc ? exc.note : '';
                if (absDuJour.length > 0) {
                  const txtAbs = absDuJour.map(a => `${a.type.toUpperCase()}${a.deduire?' (-h)':''}`).join(', ');
                  noteAffichage = noteAffichage ? `${noteAffichage} / ${txtAbs}` : txtAbs;
                }

                let isGray = dayOfWeek === 0 || dayOfWeek === 6 || (infoPeriode && infoPeriode.type === 'vacances');
                
                return (
                  <td key={idx} className={`border border-black p-0 ${isGray ? 'bg-gray-100' : 'bg-white'}`} style={isGray ? printExact : {}}>
                    <div className="flex h-5 items-stretch">
                      <div className={`w-5 flex-shrink-0 flex items-center justify-center border-r border-black/20 text-[8px] font-bold ${dayOfWeek === 0 || dayOfWeek === 6 ? 'bg-gray-300' : ''}`} style={dayOfWeek === 0 || dayOfWeek === 6 ? printExact : {}}>
                        {nomJour}{jourNum}
                      </div>
                      <div className="w-7 flex-shrink-0 flex items-center justify-center font-bold font-mono border-r border-black/20">{formatHeureTableau(hFinal)}</div>
                      <div className="flex-1 flex items-center px-1 truncate text-[7px] overflow-hidden whitespace-nowrap text-left" style={{ maxWidth: '65px' }}>{noteAffichage}</div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};