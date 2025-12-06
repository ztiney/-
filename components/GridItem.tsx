
import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ScheduleItem, PIXELS_PER_HOUR, SNAP_MINUTES, HOURS_START } from '../types';
import { Lock, Unlock, Trash2, Clock, Copy } from 'lucide-react';

interface GridItemProps {
  item: ScheduleItem;
  onUpdate: (id: string, updates: Partial<ScheduleItem>) => void;
  onDelete: (id: string) => void;
  onCopy: (item: ScheduleItem) => void;
  siblings: ScheduleItem[];
  baseHour?: number;
}

export const GridItem: React.FC<GridItemProps> = ({ item, onUpdate, onDelete, onCopy, siblings, baseHour = HOURS_START }) => {
  const itemRef = useRef<HTMLDivElement>(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  
  // Drag State
  const [dragState, setDragState] = useState<{
      isDragging: boolean;
      initialLeft: number;
      initialTop: number;
      currentX: number;
      currentY: number;
      width: number;
      height: number;
      clickOffsetX: number;
      clickOffsetY: number;
  } | null>(null);

  const top = ((item.startTime / 60) - baseHour) * PIXELS_PER_HOUR;
  const height = (item.duration / 60) * PIXELS_PER_HOUR;
  const completion = item.completion ?? 0;
  const isShort = height < 50;

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isInteracting) setIsInteracting(false);
    };
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isInteracting]);

  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'resize') => {
    e.stopPropagation();
    e.preventDefault(); 

    const rect = itemRef.current?.getBoundingClientRect();
    if (!rect) return;

    if (type === 'move') {
        setDragState({
            isDragging: true,
            initialLeft: rect.left,
            initialTop: rect.top,
            currentX: rect.left,
            currentY: rect.top,
            width: rect.width,
            height: rect.height,
            clickOffsetX: e.clientX - rect.left,
            clickOffsetY: e.clientY - rect.top,
        });
    }

    const startY = e.clientY;
    const startHeight = height;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();

      if (type === 'move') {
         setDragState(prev => {
             if (!prev) return null;
             return {
                 ...prev,
                 currentX: moveEvent.clientX - prev.clickOffsetX,
                 currentY: moveEvent.clientY - prev.clickOffsetY
             };
         });
      } else if (type === 'resize') {
         const deltaY = moveEvent.clientY - startY;
         let newHeight = startHeight + deltaY;
         const pixelsPerSnap = (PIXELS_PER_HOUR / 60) * SNAP_MINUTES;
         let snappedHeight = Math.max(pixelsPerSnap, Math.round(newHeight / pixelsPerSnap) * pixelsPerSnap);
         let newDuration = (snappedHeight / PIXELS_PER_HOUR) * 60;
         
         const potentialEndTime = item.startTime + newDuration;
         for (const sibling of siblings) {
            if (sibling.id === item.id) continue;
            if (Math.abs(potentialEndTime - sibling.startTime) < 10) {
                newDuration = sibling.startTime - item.startTime;
            }
         }
         
         newDuration = Math.max(15, newDuration);
         if (newDuration !== item.duration) { 
             onUpdate(item.id, { duration: newDuration }); 
         }
      }
    };

    const handleMouseUp = (upEvent: MouseEvent) => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      if (type === 'move') {
          setDragState(prev => {
              if (prev) {
                  const deltaX = prev.currentX - prev.initialLeft;
                  const deltaY = prev.currentY - prev.initialTop;
                  
                  // Calculate Day Change (approximate based on item width)
                  const colWidth = prev.width + 2; // +2 for borders/margins estimate
                  const dayOffset = Math.round(deltaX / colWidth);
                  let newDayIndex = item.dayIndex + dayOffset;
                  newDayIndex = Math.max(0, Math.min(6, newDayIndex));

                  // Calculate Time Change
                  const pixelsPerMinute = PIXELS_PER_HOUR / 60;
                  const timeOffsetMinutes = deltaY / pixelsPerMinute;
                  let newStartTime = item.startTime + timeOffsetMinutes;
                  
                  const snapMinutes = SNAP_MINUTES;
                  newStartTime = Math.round(newStartTime / snapMinutes) * snapMinutes;
                  newStartTime = Math.max(HOURS_START * 60, newStartTime);

                  // Magnetic Snap (Only if same day)
                  if (newDayIndex === item.dayIndex) {
                       const currentEndTime = newStartTime + item.duration;
                       for (const sibling of siblings) {
                          if (sibling.id === item.id) continue;
                          const siblingEnd = sibling.startTime + sibling.duration;
                          if (Math.abs(newStartTime - siblingEnd) < 15) newStartTime = siblingEnd;
                          if (Math.abs(currentEndTime - sibling.startTime) < 15) newStartTime = sibling.startTime - item.duration;
                       }
                  }

                  const isCopy = upEvent.ctrlKey || upEvent.metaKey;
                  
                  if (isCopy) {
                      onCopy({
                          ...item,
                          id: crypto.randomUUID(),
                          startTime: newStartTime,
                          dayIndex: newDayIndex,
                          completion: 0 
                      });
                  } else {
                      if (newStartTime !== item.startTime || newDayIndex !== item.dayIndex) {
                          onUpdate(item.id, { startTime: newStartTime, dayIndex: newDayIndex });
                      }
                  }
              }
              return null;
          });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleCompletionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate(item.id, { completion: Number(e.target.value) });
  };

  const handleSliderInteractionStart = (e: React.MouseEvent | React.TouchEvent) => {
      e.stopPropagation();
      setIsInteracting(true);
  };

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(item.id, { isRecurring: !item.isRecurring });
  };

  const formatTime = (minutes: number) => {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return `${h}:${String(m).padStart(2, '0')}`;
  };

  const handleMouseEnter = () => setIsHovering(true);
  const handleMouseLeave = () => {
      if (!isInteracting) setIsHovering(false);
  };

  const isDragging = dragState?.isDragging;
  
  const zIndexClass = (isHovering || isInteracting) ? 'z-[60]' : 'z-10';
  const baseClasses = `rounded-lg shadow-sm text-xs font-medium text-white group transition-all select-none border border-white/20 hover:shadow-lg hover:ring-2 ring-white/30 ${zIndexClass}`;
  
  // Normal flow style
  const normalStyle: React.CSSProperties = {
    top: `${top}px`,
    height: `${height}px`,
    backgroundColor: item.color,
    overflow: 'visible'
  };

  // Dragging style (Fixed positioning)
  const draggingStyle: React.CSSProperties = isDragging ? {
    position: 'fixed',
    left: dragState.currentX,
    top: dragState.currentY,
    width: dragState.width,
    height: dragState.height,
    backgroundColor: item.color,
    zIndex: 9999, // Super high z-index
    opacity: 0.9,
    boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    pointerEvents: 'none',
    transition: 'none',
    cursor: 'grabbing'
  } : {};

  // The content of the sticker
  const StickerContent = (
    <div
        ref={itemRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={isDragging ? baseClasses : `absolute left-1 right-1 ${baseClasses}`}
        style={isDragging ? draggingStyle : normalStyle}
        onMouseDown={(e) => handleMouseDown(e, 'move')}
    >
        <div 
            className="absolute bottom-0 left-0 right-0 bg-black/10 pointer-events-none transition-all rounded-b-lg" 
            style={{ height: `${completion}%`, opacity: 0.15 }}
        />
        
        {/* Copy Indicator Overlay */}
        {isDragging && (
            <div className="absolute -top-3 -right-3 bg-white text-slate-700 rounded-full p-1 shadow-md border border-slate-100 z-[110]">
                <Copy size={12} />
            </div>
        )}
        
        {/* --- SHORT ITEM CONTENT --- */}
        {isShort && (
            <div className="w-full h-full flex items-center justify-center px-1 relative">
                <span className="truncate font-bold drop-shadow-md text-[10px] leading-tight text-center">
                    {item.title}
                </span>
                
                {/* POPOVER */}
                {(isHovering || isInteracting) && !isDragging && (
                    <div 
                        className="flex flex-col gap-2 p-3 bg-white rounded-xl shadow-2xl border border-slate-200 absolute cursor-auto"
                        style={{
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '12px',
                            width: '200px',
                            zIndex: 100
                        }}
                        onMouseDown={(e) => e.stopPropagation()} 
                        onMouseLeave={handleMouseLeave}
                    >
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-white"></div>
                        <div className="absolute top-full left-0 right-0 h-4 bg-transparent" />

                        <div className="flex justify-between items-start text-slate-700 pb-2 border-b border-slate-100 mb-1">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-800">{formatTime(item.startTime)} - {formatTime(item.startTime + item.duration)}</span>
                                <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                                <Clock size={10} /> {item.duration}分钟
                                </span>
                            </div>
                            <div className="flex gap-1">
                                <button 
                                onClick={toggleLock} 
                                className={`p-1.5 rounded-lg transition-colors ${item.isRecurring ? 'bg-amber-100 text-amber-500' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}
                                title={item.isRecurring ? "解锁" : "锁定每周"}
                                >
                                    {item.isRecurring ? <Lock size={12} fill="currentColor"/> : <Unlock size={12}/>}
                                </button>
                                <button 
                                onClick={() => onDelete(item.id)} 
                                className="p-1.5 rounded-lg bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                title="删除"
                                >
                                    <Trash2 size={12} />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                                <span>完成进度</span>
                                <span>{completion}%</span>
                            </div>
                            <div 
                                className="relative h-5 bg-slate-100 rounded-full w-full overflow-hidden group/slider cursor-pointer"
                                onMouseDown={handleSliderInteractionStart}
                            >
                                <div 
                                    className={`absolute top-0 left-0 bottom-0 bg-emerald-400 rounded-full transition-all duration-75`}
                                    style={{ width: `${completion}%` }}
                                />
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    step="1" 
                                    value={completion}
                                    onChange={handleCompletionChange}
                                    className="w-full h-full opacity-0 absolute inset-0 cursor-pointer z-20"
                                    onMouseDown={(e) => e.stopPropagation()} 
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- NORMAL ITEM CONTENT --- */}
        {!isShort && (
            <div className="relative h-full flex flex-col p-1.5 overflow-hidden">
                <div className="flex justify-between items-start gap-1">
                    <span className="truncate font-bold drop-shadow-md leading-tight">{item.title}</span>
                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                            onClick={toggleLock}
                            onMouseDown={e => e.stopPropagation()}
                            className={`p-0.5 rounded ${item.isRecurring ? 'text-white' : 'text-white/70 hover:text-white hover:bg-white/20'}`}
                        >
                            {item.isRecurring ? <Lock size={10} fill="currentColor"/> : <Unlock size={10}/>}
                        </button>
                        <button 
                            onClick={(e) => { e.stopPropagation(); onDelete(item.id); }}
                            onMouseDown={e => e.stopPropagation()}
                            className="bg-black/20 hover:bg-red-500 hover:text-white rounded-full p-0.5 w-4 h-4 flex items-center justify-center text-[10px]"
                        >✕</button>
                    </div>
                </div>
                
                <div className="flex-1 flex flex-col justify-center my-1 min-h-0">
                    <div 
                        className="relative h-1.5 bg-black/20 rounded-full w-full overflow-hidden cursor-pointer hover:h-2 transition-all"
                        onMouseDown={handleSliderInteractionStart}
                    >
                        <div 
                            className={`absolute top-0 left-0 bottom-0 bg-white/90 rounded-full transition-all duration-75`}
                            style={{ width: `${completion}%` }}
                        />
                        <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={completion}
                                onChange={handleCompletionChange}
                                className="w-full h-full opacity-0 absolute inset-0 cursor-pointer z-20"
                                onMouseDown={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>

                <div className="flex justify-between items-end text-[10px] font-mono opacity-90 leading-none">
                    <div className="flex flex-col">
                        <span>{formatTime(item.startTime)}</span>
                        <span className="opacity-80 scale-90 origin-left font-bold">{item.duration}分</span>
                    </div>
                    <span className="font-bold">{completion}%</span>
                </div>
            </div>
        )}

        {/* Resize Handle (Bottom) */}
        {!isDragging && (
            <div
            className="absolute bottom-0 left-0 right-0 h-3 cursor-s-resize flex justify-center items-end pb-1 hover:bg-white/20 transition-colors z-20 rounded-b-lg"
            onMouseDown={(e) => handleMouseDown(e, 'resize')}
            >
                <div className="w-6 h-1 bg-white/40 rounded-full" />
            </div>
        )}
    </div>
  );

  if (isDragging) {
      return (
        <>
            {/* Placeholder to keep space (ghost) */}
            <div 
                className="absolute left-1 right-1 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/50"
                style={{ top: `${top}px`, height: `${height}px` }}
            />
            {/* The actual dragging item, portaled to body to escape transform/filter contexts */}
            {createPortal(StickerContent, document.body)}
        </>
      );
  }

  return StickerContent;
};
