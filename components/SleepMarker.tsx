
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
  
  // Use a ref to track the last value we sent to the parent.
  const lastUpdateValue = useRef(item.startTime);
  
  // Calculate Position
  const normalizedStartTime = item.startTime;
  const top = ((normalizedStartTime / 60) - baseHour) * PIXELS_PER_HOUR;

  // Drag Logic
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
         sleepDurationText = `(睡眠: ${h}小时${m > 0 ? m+'分' : ''})`;
     }
  }

  const colorClass = isWake ? 'text-orange-500 border-orange-400 bg-orange-50' : 'text-indigo-500 border-indigo-400 bg-indigo-50';
  const Icon = isWake ? Sun : Moon;

  return (
    <div 
        className={`absolute left-0 right-0 h-0 border-t-2 border-dashed flex items-center group cursor-row-resize z-40 transition-all hover:border-solid hover:z-50 ${colorClass.split(' ')[1]}`}
        style={{ top: `${top}px` }}
        onMouseDown={handleMouseDown}
    >
        <div className={`absolute left-0 -translate-y-1/2 px-2 py-1.5 rounded-lg shadow-sm flex flex-col items-start border text-[10px] font-bold select-none transition-transform hover:scale-105 ${colorClass}`}>
            <div className="flex items-center gap-1.5">
                <Icon size={12} strokeWidth={2.5} />
                <span>{formatTime(item.startTime)}</span>
                <button 
                    onMouseDown={(e) => e.stopPropagation()} 
                    onClick={toggleLock}
                    className="ml-1 p-0.5 hover:bg-black/5 rounded"
                >
                   {item.isRecurring ? <Lock size={10} /> : <Unlock size={10} />}
                </button>
            </div>
            {sleepDurationText && (
                <span className="text-orange-600/80 font-medium whitespace-nowrap opacity-90 mt-0.5 text-[9px]">
                    {sleepDurationText}
                </span>
            )}
        </div>

        <div className={`w-full ${isWake ? 'bg-orange-200/20' : 'bg-indigo-200/20'} h-4 -translate-y-1/2 absolute left-0 -z-10 opacity-0 group-hover:opacity-100 transition-opacity`} />
    </div>
  );
};
