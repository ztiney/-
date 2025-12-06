
import React from 'react';
import { ScheduleItem, DAYS, HOURS_START, HOURS_END, PIXELS_PER_HOUR, TaskTemplate } from '../types';
import { GridItem } from './GridItem';
import { SleepMarker } from './SleepMarker';
import { format, startOfWeek } from 'date-fns';

interface CalendarProps {
  currentDate: Date;
  items: ScheduleItem[];
  onItemUpdate: (id: string, updates: Partial<ScheduleItem>) => void;
  onItemAdd: (item: ScheduleItem) => void;
  onItemDelete: (id: string) => void;
  userId: string;
  isExport?: boolean;
}

export const Calendar: React.FC<CalendarProps> = ({ 
  currentDate, 
  items, 
  onItemUpdate, 
  onItemAdd,
  onItemDelete,
  userId,
  isExport
}) => {
  // Dynamic Height & Start Calculation for Export
  let displayEndHour = HOURS_END;
  let displayStartHour = HOURS_START;
  
  if (isExport) {
      // Find the latest activity to trim the calendar height
      let maxMinute = HOURS_START * 60;
      let minMinute = HOURS_END * 60;
      let hasItems = false;

      items.forEach(item => {
          // If exporting, we might ignore the sleep marker for height/start calculation if we hide it
          if (item.type === 'marker' && item.markerType === 'sleep') return;
          
          hasItems = true;
          const end = item.type === 'block' ? item.startTime + item.duration : item.startTime;
          if (end > maxMinute) maxMinute = end;
          if (item.startTime < minMinute) minMinute = item.startTime;
      });
      
      if (hasItems) {
          const maxHour = Math.ceil(maxMinute / 60);
          // Ensure minimum height (e.g. at least 12 hours showing) or up to max activity + 1 hour padding
          displayEndHour = Math.max(HOURS_START + 12, maxHour + 1);

          const minHour = Math.floor(minMinute / 60);
          // Start 1 hour before earliest item to be compact
          displayStartHour = Math.max(HOURS_START, minHour - 1);
      }
  }

  const hours = Array.from({ length: displayEndHour - displayStartHour }, (_, i) => i + displayStartHour);
  const weekId = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd'); 

  const handleDrop = (e: React.DragEvent, dayIndex: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;

    try {
      const template: TaskTemplate = JSON.parse(data);
      
      const rect = e.currentTarget.getBoundingClientRect();
      const relativeY = e.clientY - rect.top;
      
      const pixelsPerMinute = PIXELS_PER_HOUR / 60;
      const rawMinutes = relativeY / pixelsPerMinute;
      let startMinutes = (displayStartHour * 60) + rawMinutes;
      
      // 1. Grid Snap (15 mins)
      let snappedStart = Math.round(startMinutes / 15) * 15;

      // 2. Magnetic Snap (Only check block items)
      const dayBlockItems = items.filter(i => i.dayIndex === dayIndex && i.type !== 'marker');
      const thresholdMinutes = 15; 
      const proposedEnd = snappedStart + template.defaultDuration;

      for (const sibling of dayBlockItems) {
         const siblingEnd = sibling.startTime + sibling.duration;
         if (Math.abs(snappedStart - siblingEnd) < thresholdMinutes) {
             snappedStart = siblingEnd;
         }
         if (Math.abs(proposedEnd - sibling.startTime) < thresholdMinutes) {
             snappedStart = sibling.startTime - template.defaultDuration;
         }
      }
      
      snappedStart = Math.max(HOURS_START * 60, snappedStart);

      const newItem: ScheduleItem = {
        id: crypto.randomUUID(),
        userId,
        templateId: template.id,
        title: template.name,
        startTime: snappedStart,
        duration: template.defaultDuration,
        dayIndex: dayIndex,
        color: template.color,
        completion: 0,
        weekId: weekId,
        isRecurring: false,
        type: 'block' // Default to block
      };

      onItemAdd(newItem);
    } catch (err) {
      console.error("Failed to parse drop data", err);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const containerClasses = isExport 
    ? "overflow-visible relative bg-white/60 rounded-3xl border border-white/50 w-full" 
    : "flex-1 overflow-y-auto no-scrollbar relative bg-white/60 rounded-3xl backdrop-blur-sm shadow-xl border border-white/50";

  return (
    <div className={containerClasses}>
      <div className={`flex ${isExport ? 'w-full' : 'min-w-[800px]'}`}>
        
        {/* Time Sidebar */}
        <div className={`w-16 flex-shrink-0 border-r border-rose-100 bg-white/40 ${isExport ? '' : 'sticky left-0 z-[60]'}`}>
          <div className="h-10 border-b border-rose-100"></div> {/* Header spacer */}
          {hours.map((hour) => {
            const displayHour = hour >= 24 ? hour - 24 : hour;
            return (
                <div key={hour} className="relative border-b border-transparent" style={{ height: `${PIXELS_PER_HOUR}px` }}>
                <span className="absolute -top-3 right-2 text-xs text-rose-400 font-bold font-mono">
                    {displayHour}:00
                </span>
                </div>
            )
          })}
        </div>

        {/* Days Columns */}
        <div className="flex flex-1">
          {DAYS.map((day, dayIndex) => {
            const dayItems = items.filter(item => item.dayIndex === dayIndex);
            const blockItems = dayItems.filter(i => i.type !== 'marker');
            const markerItems = dayItems.filter(i => i.type === 'marker');
            
            // In Export mode, hide 'sleep' marker
            const visibleMarkers = isExport 
                ? markerItems.filter(i => i.markerType !== 'sleep') 
                : markerItems;
            
            // Find markers for sleep calculation
            const prevDayIndex = dayIndex === 0 ? 6 : dayIndex - 1;
            const prevDaySleepItem = items.find(i => i.dayIndex === prevDayIndex && i.markerType === 'sleep');

            return (
                <div key={day} className="flex-1 min-w-[80px] border-r border-rose-100 last:border-r-0 flex flex-col">
                {/* Day Header - Higher Z-Index for Priority */}
                <div className={`h-10 flex items-center justify-center border-b border-rose-100 bg-rose-50/90 ${isExport ? '' : 'sticky top-0 z-50 backdrop-blur-md'}`}>
                    <span className="text-sm font-bold text-rose-800 uppercase tracking-wide">{day}</span>
                </div>

                {/* Day Grid */}
                <div 
                    className="relative bg-white/30 hover:bg-white/50 transition-colors"
                    style={{ height: `${(displayEndHour - displayStartHour) * PIXELS_PER_HOUR}px` }}
                    onDrop={isExport ? undefined : (e) => handleDrop(e, dayIndex)}
                    onDragOver={isExport ? undefined : handleDragOver}
                >
                    {/* Grid Lines */}
                    {hours.map((hour) => (
                        <div 
                        key={hour} 
                        className="border-b border-rose-100/40 w-full absolute pointer-events-none"
                        style={{ top: `${(hour - displayStartHour) * PIXELS_PER_HOUR}px`, height: '1px' }}
                        />
                    ))}

                    {/* Normal Block Items */}
                    {blockItems.map(item => (
                        <GridItem 
                            key={item.id} 
                            item={item} 
                            onUpdate={onItemUpdate}
                            onDelete={onItemDelete}
                            onCopy={onItemAdd}
                            siblings={blockItems}
                            baseHour={displayStartHour}
                        />
                    ))}

                    {/* Line Markers (Wake/Sleep) */}
                    {visibleMarkers.map(item => (
                        <SleepMarker 
                            key={item.id}
                            item={item}
                            prevDayItem={prevDaySleepItem}
                            onUpdate={onItemUpdate}
                            baseHour={displayStartHour}
                        />
                    ))}

                </div>
                </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
