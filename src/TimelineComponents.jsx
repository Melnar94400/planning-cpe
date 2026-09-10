import React, { useState, useRef } from 'react';

export const TimelineTrack = ({ limitesHeures, isBesoins, copiedEvent, onAddCopy, onAddLasso, children }) => {
  const [lasso, setLasso] = useState(null);
  const trackRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.closest('.event-item')) return; // Ignore clics sur créneaux
    if (e.button !== 0 || e.ctrlKey || e.metaKey) return;
    e.preventDefault();

    const rect = trackRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startPercent = Math.max(0, Math.min(1, (startX - rect.left) / rect.width));
    
    // Arrondi à 5 minutes sans magnétisme
    let startMins = Math.round((limitesHeures.baseMins + (startPercent * limitesHeures.span)) / 5) * 5;

    if (copiedEvent) {
      onAddCopy(startMins);
      return;
    }

    let hasMoved = false;

    const onMouseMove = (moveEvent) => {
      if (Math.abs(moveEvent.clientX - startX) > 4) hasMoved = true;
      const movePercent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      let currentMins = Math.round((limitesHeures.baseMins + (movePercent * limitesHeures.span)) / 5) * 5;
      
      if (hasMoved) {
        setLasso({
          min: Math.min(startMins, currentMins),
          max: Math.max(startMins, currentMins)
        });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      if (hasMoved) {
        setLasso(currentLasso => {
          if (currentLasso && currentLasso.max - currentLasso.min >= 5) {
            onAddLasso(currentLasso.min, currentLasso.max);
          }
          return null;
        });
      } else {
        // Clic simple = créneau d'1h par défaut
        onAddLasso(startMins, Math.min(startMins + 60, limitesHeures.baseMins + limitesHeures.span));
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  let lassoStyle = {};
  let lassoText = "";
  if (lasso) {
    const l = Math.max(0, ((lasso.min - limitesHeures.baseMins) / limitesHeures.span) * 100);
    const w = Math.min(100 - l, ((lasso.max - lasso.min) / limitesHeures.span) * 100);
    lassoStyle = { left: `${l}%`, width: `${w}%` };
    const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;
    lassoText = `${formatTime(lasso.min)} - ${formatTime(lasso.max)}`;
  }

  return (
    <div ref={trackRef} className="flex-1 h-full relative cursor-crosshair group/timeline select-none" onMouseDown={handleMouseDown}>
      {children}
      {lasso && (
        <div 
          className={`absolute top-0.5 bottom-0.5 rounded border-2 border-dashed z-[999] pointer-events-none flex items-center justify-center text-[9px] font-bold shadow-md ${isBesoins ? 'bg-red-500/40 border-red-600 text-red-950 dark:text-red-100' : 'bg-blue-500/40 border-blue-600 text-blue-950 dark:text-blue-100'}`}
          style={lassoStyle}
        >
          {lassoText}
        </div>
      )}
    </div>
  );
};

export const TimelineEvent = ({
  startMins, endMins, limitesHeures, isLocked, bgColor, borderColor, textColor,
  title, subtitle, extInfo, conflit, onUpdate, onClick, onCopy
}) => {
  const [dragState, setDragState] = useState(null); 

  const activeStart = dragState ? dragState.min : startMins;
  const activeEnd = dragState ? dragState.max : endMins;

  const durationMins = activeEnd - activeStart;
  const isTiny = durationMins <= 15; // Retrait des paddings pour les tout petits blocs (ex: 5min)
  const isVeryShort = durationMins <= 45; // Rotation du texte
  const isLong = durationMins >= 120;

  const left = Math.max(0, ((activeStart - limitesHeures.baseMins) / limitesHeures.span) * 100);
  const width = Math.min(100 - left, ((activeEnd - activeStart) / limitesHeures.span) * 100);

  const handleMouseDown = (e, actionType) => {
    if (e.button !== 0 || isLocked) return;
    e.stopPropagation();
    e.preventDefault();

    if (actionType === 'move' && (e.ctrlKey || e.metaKey)) {
      onCopy(durationMins);
      return;
    }

    const eventEl = e.currentTarget.closest('.event-item');
    const track = eventEl.parentElement;
    const rect = track.getBoundingClientRect();
    const startX = e.clientX;
    let isDragging = false;

    // Position de départ exacte en minutes
    const initialPointerPercent = Math.max(0, Math.min(1, (startX - rect.left) / rect.width));
    const initialPointerMins = Math.round((limitesHeures.baseMins + (initialPointerPercent * limitesHeures.span)) / 5) * 5;

    const onMouseMove = (moveEvent) => {
      if (!isDragging && Math.abs(moveEvent.clientX - startX) > 3) isDragging = true;
      if (!isDragging) return;

      // Position actuelle absolue convertie en minutes
      const currentPointerPercent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const currentPointerMins = Math.round((limitesHeures.baseMins + (currentPointerPercent * limitesHeures.span)) / 5) * 5;

      if (actionType === 'resizeStart') {
        let newStart = currentPointerMins;
        newStart = Math.max(limitesHeures.baseMins, Math.min(newStart, endMins - 5));
        setDragState({ type: actionType, min: newStart, max: endMins });
      } 
      else if (actionType === 'resizeEnd') {
        let newEnd = currentPointerMins;
        newEnd = Math.max(startMins + 5, Math.min(newEnd, limitesHeures.baseMins + limitesHeures.span));
        setDragState({ type: actionType, min: startMins, max: newEnd });
      } 
      else if (actionType === 'move') {
        const deltaMins = currentPointerMins - initialPointerMins;
        let newStart = startMins + deltaMins;
        let newEnd = endMins + deltaMins;

        if (newStart < limitesHeures.baseMins) {
          newStart = limitesHeures.baseMins;
          newEnd = newStart + durationMins;
        } else if (newEnd > limitesHeures.baseMins + limitesHeures.span) {
          newEnd = limitesHeures.baseMins + limitesHeures.span;
          newStart = newEnd - durationMins;
        }

        setDragState({ type: actionType, min: newStart, max: newEnd });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      setDragState(currentDrag => {
        if (currentDrag) {
          if (currentDrag.min !== startMins || currentDrag.max !== endMins) {
            onUpdate(currentDrag.min, currentDrag.max);
          }
        } else if (actionType === 'move') {
          onClick();
        }
        return null;
      });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const formatTime = (m) => `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;

  return (
    <div 
      className={`event-item absolute top-0.5 bottom-0.5 rounded shadow-sm text-[10px] flex flex-col justify-center ${isTiny ? 'px-0' : 'px-1'} border transition-all group/item ${dragState ? 'z-[99999] opacity-90 scale-[1.02]' : 'z-10 hover:z-50 hover:ring-2'} ${conflit ? 'ring-2 ring-red-500 animate-pulse' : ''}`}
      style={{ left: `${left}%`, width: `${width}%`, backgroundColor: bgColor, borderColor: borderColor, color: textColor, cursor: dragState ? 'grabbing' : 'pointer' }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
    >
      <div className={`w-full h-full flex pointer-events-none ${isVeryShort ? 'items-center justify-center overflow-visible' : 'flex-col justify-center overflow-hidden'}`}>
        {isVeryShort ? (
          <span className="font-bold uppercase text-center z-10 whitespace-nowrap drop-shadow-md" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: '8.5px', letterSpacing: '-0.5px' }}>
            {title}
          </span>
        ) : (
          <>
            <span className={`font-bold truncate leading-none ${isLong ? 'text-sm' : 'text-[10px]'}`}>{title}</span>
            <span className={`opacity-85 font-mono truncate mt-0.5 ${isLong ? 'text-xs' : 'text-[8px]'}`}>{formatTime(activeStart)} - {formatTime(activeEnd)}</span>
            {extInfo && <span className="text-[8px] italic mt-0.5 truncate bg-black/10 rounded px-1">{extInfo}</span>}
          </>
        )}
      </div>

      {!isLocked && <div className="absolute left-0 inset-y-0 w-2 cursor-w-resize hover:bg-black/30 z-20 opacity-0 group-hover/item:opacity-100 transition-opacity" onMouseDown={(e) => handleMouseDown(e, 'resizeStart')}></div>}
      {!isLocked && <div className="absolute right-0 inset-y-0 w-2 cursor-e-resize hover:bg-black/30 z-20 opacity-0 group-hover/item:opacity-100 transition-opacity" onMouseDown={(e) => handleMouseDown(e, 'resizeEnd')}></div>}
      
      {!dragState && (
        <div className="absolute hidden group-hover/item:flex flex-col opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 bg-gray-900 text-white p-2.5 rounded-lg shadow-xl z-[99999] pointer-events-none top-full left-1/2 -translate-x-1/2 mt-1.5 w-max min-w-[130px] text-center border border-gray-700">
          <span className="font-black text-sm text-blue-300 leading-tight mb-1">{title}</span>
          {subtitle && <span className="font-semibold text-xs leading-none">{subtitle}</span>}
          <span className="text-gray-400 font-mono text-[10px] mt-1">{formatTime(activeStart)} - {formatTime(activeEnd)}</span>
          {extInfo && <span className="text-gray-300 text-[10px] italic mt-1">{extInfo}</span>}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
        </div>
      )}
    </div>
  );
};