import React, { useState, useRef } from 'react';

export const TimelineTrack = ({ limitesHeures, isBesoins, copiedEvent, snapPoints, onAddCopy, onAddLasso, children }) => {
  const [lasso, setLasso] = useState(null);
  const trackRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.closest('.event-item')) return;
    if (e.button !== 0 || e.ctrlKey || e.metaKey) return;
    e.preventDefault();

    const rect = trackRef.current.getBoundingClientRect();
    const startX = e.clientX;
    const startPercent = Math.max(0, Math.min(1, (startX - rect.left) / rect.width));
    const startMinsRaw = limitesHeures.baseMins + (startPercent * limitesHeures.span);
    const startMins = Math.round(startMinsRaw / 5) * 5;

    if (copiedEvent) {
      onAddCopy(startMins);
      return;
    }

    let hasMoved = false;

    const onMouseMove = (moveEvent) => {
      if (Math.abs(moveEvent.clientX - startX) > 4) hasMoved = true;
      const movePercent = Math.max(0, Math.min(1, (moveEvent.clientX - rect.left) / rect.width));
      const currentMinsRaw = limitesHeures.baseMins + (movePercent * limitesHeures.span);

      if (hasMoved) {
        setLasso({
          min: Math.min(startMinsRaw, currentMinsRaw),
          max: Math.max(startMinsRaw, currentMinsRaw)
        });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      if (hasMoved) {
        setLasso(currentLasso => {
          if (currentLasso) {
            const finalMin = Math.round(currentLasso.min / 5) * 5;
            const finalMax = Math.round(currentLasso.max / 5) * 5;
            if (finalMax - finalMin >= 5) {
              onAddLasso(finalMin, finalMax);
            }
          }
          return null;
        });
      } else {
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
    
    // Correction : Arrondi strict appliqué au lasso de création
    const formatTime = (m) => {
      const rounded = Math.round(m / 5) * 5;
      const h = Math.floor(rounded / 60);
      const min = Math.floor(rounded % 60);
      return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
    };
    lassoText = `${formatTime(lasso.min)} - ${formatTime(lasso.max)}`;
  }

  return (
    <div ref={trackRef} className="timeline-track flex-1 h-full relative cursor-crosshair group/timeline select-none" onMouseDown={handleMouseDown}>
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
  title, subtitle, extInfo, conflit, snapPoints, onUpdate, onClick, onCopy
}) => {
  const [dragState, setDragState] = useState(null); 

  const activeStart = dragState ? dragState.min : startMins;
  const activeEnd = dragState ? dragState.max : endMins;

  const durationMins = endMins - startMins; 
  const currentDuration = activeEnd - activeStart;
  
  const isMicro = currentDuration <= 15;
  const isShort = currentDuration > 15 && currentDuration <= 45;
  const isLong = currentDuration >= 120;

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

    const track = e.currentTarget.closest('.timeline-track');
    if (!track) return;
    
    const rect = track.getBoundingClientRect();
    const startX = e.clientX;
    let isDragging = false;

    const onMouseMove = (moveEvent) => {
      if (!isDragging && Math.abs(moveEvent.clientX - startX) > 3) isDragging = true;
      if (!isDragging) return;

      const deltaX = moveEvent.clientX - startX;
      const deltaMins = (deltaX / rect.width) * limitesHeures.span;

      if (actionType === 'resizeStart') {
        let newStart = startMins + deltaMins;
        newStart = Math.max(limitesHeures.baseMins, Math.min(newStart, endMins - 5));
        setDragState({ type: actionType, min: newStart, max: endMins });
      } 
      else if (actionType === 'resizeEnd') {
        let newEnd = endMins + deltaMins;
        newEnd = Math.max(startMins + 5, Math.min(newEnd, limitesHeures.baseMins + limitesHeures.span));
        setDragState({ type: actionType, min: startMins, max: newEnd });
      } 
      else if (actionType === 'move') {
        let newStart = startMins + deltaMins;
        const maxStart = limitesHeures.baseMins + limitesHeures.span - durationMins;
        
        newStart = Math.max(limitesHeures.baseMins, Math.min(newStart, maxStart));
        setDragState({ type: actionType, min: newStart, max: newStart + durationMins });
      }
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      setDragState(currentDrag => {
        if (currentDrag) {
          let finalStart = Math.round(currentDrag.min / 5) * 5;
          let finalEnd = Math.round(currentDrag.max / 5) * 5;

          if (finalEnd - finalStart < 5) {
            if (actionType === 'resizeStart') finalStart = finalEnd - 5;
            else finalEnd = finalStart + 5;
          }

          if (finalStart !== startMins || finalEnd !== endMins) {
            onUpdate(finalStart, finalEnd);
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

  // Formatage propre qui masque les décimales générées par le suivi fluide
  const formatTime = (m) => {
    const rounded = Math.round(m / 5) * 5;
    const h = Math.floor(rounded / 60);
    const min = Math.floor(rounded % 60);
    return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
  };

  return (
    <div 
      className={`event-item absolute top-0.5 bottom-0.5 rounded shadow-sm text-[10px] flex flex-col justify-center px-0.5 border group/item ${dragState ? 'transition-none z-[99999] opacity-90 scale-[1.02]' : 'transition-all z-10 hover:z-50 hover:ring-2'} ${conflit ? 'ring-2 ring-red-500 animate-pulse' : ''}`}
      style={{ left: `${left}%`, width: `${width}%`, backgroundColor: bgColor, borderColor: borderColor, color: textColor, cursor: dragState ? 'grabbing' : 'pointer' }}
      onMouseDown={(e) => handleMouseDown(e, 'move')}
    >
      <div className="w-full h-full flex pointer-events-none overflow-hidden flex-col items-center justify-center relative">
        {isMicro || isShort ? (
          <span 
            className="font-bold uppercase text-center absolute" 
            style={{ 
              writingMode: 'vertical-rl', 
              transform: 'rotate(180deg)', 
              fontSize: isMicro ? '8px' : '9px',
              letterSpacing: isMicro ? 'normal' : '0.05em',
              whiteSpace: 'nowrap'
            }}
          >
            {title}
          </span>
        ) : (
          <>
            <span className={`font-bold truncate leading-none w-full text-center ${isLong ? 'text-sm' : 'text-[10px]'}`}>{title}</span>
            <span className={`opacity-85 font-mono truncate mt-0.5 w-full text-center ${isLong ? 'text-xs' : 'text-[8px]'}`}>{formatTime(activeStart)} - {formatTime(activeEnd)}</span>
            {extInfo && <span className="text-[8px] italic mt-0.5 truncate bg-black/10 rounded px-1">{extInfo}</span>}
          </>
        )}
      </div>

      {!isLocked && <div className="absolute left-0 inset-y-0 w-2 cursor-w-resize hover:bg-black/30 z-20 opacity-0 group-hover/item:opacity-100" onMouseDown={(e) => handleMouseDown(e, 'resizeStart')}></div>}
      {!isLocked && <div className="absolute right-0 inset-y-0 w-2 cursor-e-resize hover:bg-black/30 z-20 opacity-0 group-hover/item:opacity-100" onMouseDown={(e) => handleMouseDown(e, 'resizeEnd')}></div>}
      
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