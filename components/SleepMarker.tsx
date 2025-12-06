
import React, { useRef } from 'react';
import { ScheduleItem, PIXELS_PER_HOUR, HOURS_START } from '../types';
import { Sun, Moon, Lock, Unlock } from 'lucide-react';

interface SleepMarkerProps {
  item: ScheduleItem;
  prevDayItem?: ScheduleItem; 
  onUpdate: (id: string, updates: Partial<ScheduleItem>) => void;
  baseHour?: number;
}

export const SleepMarker: React.FC<SleepMarkerProps> = ({ item, prevDayItem, onUpdate, baseHour = HOURS_START }) => {
  const isWake = item.markerType === 'wake';
  
  const lastUpdateValue = useRef(item.startTime);
  
  // Calculate Position
  const normalizedStartTime = item.startTime;
  const top = ((normalizedStartTime / 60) - baseHour) * PIXELS_PER_HOUR;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const startY = e.clientY;
    const startTop = top;
    
    lastUpdateValue.current = item.startTime;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = moveEvent.clientY - startY;
      const newTop = startTop + deltaY;
      
      const rawMinutes = (newTop / PIXELS_PER_HOUR * 60) + (baseHour * 60);
      
      // Standard 15-minute Snap
      let snappedMinutes = Math.round(rawMinutes / 15) * 15;
      snappedMinutes = Math.max(HOURS_START * 60, snappedMinutes);

      if (snappedMinutes !== lastUpdateValue.current) {
        onUpdate(item.id, { startTime: snappedMinutes });
        lastUpdateValue.current = snappedMinutes;
      }
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const toggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdate(item.id, { isRecurring: !item.isRecurring });
  };

  const formatTime = (minutes: number) => {
    let m = minutes;
    if (m >= 1440) m -= 1440; 
    const h = Math.floor(m / 60);
    const min = m % 60;
    return `${h}:${String(min).padStart(2, '0')}`;
  };

  let sleepDurationText = '';
  if (isWake && prevDayItem) {
     const prevSleepStart = prevDayItem.startTime; 
     const durationMin = (1440 - prevSleepStart) + item.startTime; 
     
     const h = Math.floor(durationMin / 60);
     const m = durationMin % 60;
     if (h > 0 && h < 16) { 
         sleepDurationText = `(睡眠: ${h}小时${m > 0 ? `${m}分` : ''})`;
     }
  }

  const colorClass = isWake 
    ? 'text-orange-600 border-orange-200 bg-orange-50 hover:bg-orange-100' 
    : 'text-indigo-600 border-indigo-200 bg-indigo-50 hover:bg-indigo-100';
  const dashedBorderClass = isWake ? 'border-orange-300' : 'border-indigo-300';
  
  // Reverted to Linear Icons
  const Icon = isWake ? Sun : Moon;

  return (
    <div 
        className="absolute left-0 right-0 h-0 flex items-center justify-center z-40 group"
        style={{ top: `${top}px` }}
        onMouseDown={handleMouseDown}
    >
        {/* Dashed Line Background - Fainter now */}
        <div className={`absolute w-full border-t-2 border-dashed opacity-20 pointer-events-none ${dashedBorderClass}`} />

        {/* The Pill Content - Adaptive Width */}
        <div className={`
            relative
            w-[calc(100%-4px)] mx-auto
            -translate-y-1/2 
            px-2 py-1.5
            rounded-xl 
            shadow-sm border
            flex flex-col gap-0.5
            text-[10px] font-bold 
            cursor-row-resize
            transition-all duration-200
            ${colorClass}
        `}>
            {/* Top Row: Icon + Time + Lock */}
            <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-1.5">
                    <Icon size={14} strokeWidth={2.5} />
                    <span className="tabular-nums text-sm font-bold leading-none mt-0.5">{formatTime(item.startTime)}</span>
                </div>
                <button 
                    onMouseDown={(e) => e.stopPropagation()} 
                    onClick={toggleLock}
                    className="p-0.5 hover:bg-black/5 rounded-md transition-colors opacity-60 hover:opacity-100 flex-shrink-0"
                    title={item.isRecurring ? "解锁" : "锁定"}
                >
                    {item.isRecurring ? <Lock size={12} /> : <Unlock size={12} />}
                </button>
            </div>

            {/* Bottom Row: Duration (if exists) */}
            {sleepDurationText && (
                <div className="text-[10px] opacity-90 font-medium truncate pl-0.5">
                    {sleepDurationText}
                </div>
            )}
        </div>
    </div>
  );
};
