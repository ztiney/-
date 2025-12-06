
import React, { useMemo, useState } from 'react';
import { ScheduleItem, User } from '../types';
import { PieChart, Clock, CheckCircle2, Trophy, BarChart3, Calendar, List } from 'lucide-react';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { formatDurationFriendly } from '../App';

interface StatisticsProps {
  items: ScheduleItem[];
  currentUser: User;
  themeColor: string;
  currentDate: Date; // To know what "this week" is
  hideControls?: boolean;
}

export const Statistics: React.FC<StatisticsProps> = ({ items, currentUser, themeColor, currentDate, hideControls }) => {
  const [scope, setScope] = useState<'week' | 'all'>('week');
  
  const currentWeekId = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');

  // Filter items based on scope AND exclude markers (type !== 'marker') AND exclude work blocks
  const filteredItems = useMemo(() => {
    let baseItems = items.filter(i => i.type !== 'marker' && !i.excludeFromStats);
    
    // If in export mode (hideControls), enforce 'week' scope usually, or stick to current scope
    if (scope === 'all') return baseItems;
    return baseItems.filter(item => item.weekId === currentWeekId);
  }, [items, scope, currentWeekId]);
  
  const stats = useMemo(() => {
    let totalMinutes = 0;
    let completedMinutes = 0;
    const itemsByTitle: Record<string, { count: number, minutes: number, completedMinutes: number }> = {};

    filteredItems.forEach(item => {
      const completion = (item.completion || 0) / 100;
      totalMinutes += item.duration;
      completedMinutes += item.duration * completion;

      if (!itemsByTitle[item.title]) {
        itemsByTitle[item.title] = { count: 0, minutes: 0, completedMinutes: 0 };
      }
      itemsByTitle[item.title].count += 1;
      itemsByTitle[item.title].minutes += item.duration;
      itemsByTitle[item.title].completedMinutes += item.duration * completion;
    });

    // Sort categories by time spent
    const sortedCategories = Object.entries(itemsByTitle)
        .sort(([, a], [, b]) => b.minutes - a.minutes)
        .slice(0, 6); // Top 6

    const completionRate = totalMinutes > 0 ? Math.round((completedMinutes / totalMinutes) * 100) : 0;

    return {
      totalMinutes,
      completedMinutes,
      completionRate,
      totalCount: filteredItems.length,
      sortedCategories
    };
  }, [filteredItems]);

  return (
    <div className={`flex-1 ${hideControls ? '' : 'overflow-y-auto no-scrollbar p-4 lg:p-8'} animate-in fade-in slide-in-from-bottom-4 duration-500`}>
       <div className={hideControls ? '' : 'max-w-5xl mx-auto'}>
          
          <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
             <div>
                <h2 className={`text-3xl font-bold ${themeColor} mb-2`}>
                    {scope === 'week' ? '本周习惯报告' : '总计习惯报告'}
                </h2>
                <p className="text-slate-500">
                    {scope === 'week' 
                        ? `${format(startOfWeek(currentDate, {weekStartsOn: 1}), 'MM/dd')} - ${format(endOfWeek(currentDate, {weekStartsOn: 1}), 'MM/dd')}` 
                        : '累计所有历史数据'
                    }
                </p>
             </div>
             
             {/* Scope Toggle */}
             {!hideControls && (
                 <div className="bg-slate-100 p-1 rounded-xl flex">
                     <button
                        onClick={() => setScope('week')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${scope === 'week' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                         <Calendar size={14} /> 本周
                     </button>
                     <button
                        onClick={() => setScope('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${scope === 'all' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}`}
                     >
                         <List size={14} /> 总计
                     </button>
                 </div>
             )}
          </header>

          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
             <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className={`p-4 rounded-2xl ${themeColor.replace('text-', 'bg-').replace('600', '100')}`}>
                   <Clock className={themeColor} size={24} />
                </div>
                <div>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                       {scope === 'week' ? '计划时长' : '累计时长'}
                   </p>
                   <p className="text-2xl font-bold text-slate-700">{formatDurationFriendly(stats.totalMinutes)}</p>
                </div>
             </div>

             <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className={`p-4 rounded-2xl ${themeColor.replace('text-', 'bg-').replace('600', '100')}`}>
                   <CheckCircle2 className={themeColor} size={24} />
                </div>
                <div>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                       {scope === 'week' ? '周完成度' : '总完成度'}
                   </p>
                   <p className="text-2xl font-bold text-slate-700">{stats.completionRate}%</p>
                </div>
             </div>

             <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className={`p-4 rounded-2xl ${themeColor.replace('text-', 'bg-').replace('600', '100')}`}>
                   <Trophy className={themeColor} size={24} />
                </div>
                <div>
                   <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">完成项目数</p>
                   <p className="text-2xl font-bold text-slate-700">{stats.totalCount} 个</p>
                </div>
             </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
             
             {/* Time Distribution */}
             <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-white/50 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                   <PieChart size={20} className="text-slate-400" />
                   <h3 className="font-bold text-slate-700">时间去哪了? (Top 6)</h3>
                </div>
                
                <div className="space-y-4">
                   {stats.sortedCategories.length === 0 ? (
                      <div className="text-center py-10 text-slate-400">还没有记录哦，快去添加日程吧！</div>
                   ) : (
                      stats.sortedCategories.map(([title, data], index) => {
                         const percentage = Math.round((data.minutes / stats.totalMinutes) * 100);
                         return (
                            <div key={title} className="group">
                               <div className="flex justify-between text-sm mb-1">
                                  <span className="font-bold text-slate-600 flex items-center gap-2">
                                     <span className="w-2 h-2 rounded-full bg-slate-300 group-hover:bg-rose-400 transition-colors"></span>
                                     {title}
                                  </span>
                                  <span className="text-slate-400">{percentage}% ({formatDurationFriendly(data.minutes)})</span>
                               </div>
                               <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-1000 ease-out ${themeColor.replace('text-', 'bg-').replace('600', '400')}`}
                                    style={{ width: `${percentage}%`, opacity: 1 - (index * 0.1) }}
                                  />
                               </div>
                            </div>
                         )
                      })
                   )}
                </div>
             </div>

             {/* Completion Quality */}
             <div className="bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-white/50 shadow-sm">
                <div className="flex items-center gap-2 mb-6">
                   <BarChart3 size={20} className="text-slate-400" />
                   <h3 className="font-bold text-slate-700">执行质量分析</h3>
                </div>

                <div className="space-y-6">
                    {stats.sortedCategories.length === 0 ? (
                      <div className="text-center py-10 text-slate-400">还没有数据~</div>
                    ) : (
                      stats.sortedCategories.map(([title, data]) => {
                         const itemCompletionRate = Math.round((data.completedMinutes / data.minutes) * 100);
                         let qualityColor = 'bg-emerald-400';
                         if (itemCompletionRate < 50) qualityColor = 'bg-rose-400';
                         else if (itemCompletionRate < 80) qualityColor = 'bg-amber-400';

                         return (
                            <div key={title}>
                               <div className="flex justify-between text-xs mb-1">
                                  <span className="text-slate-500 font-medium">{title}</span>
                                  <span className={`font-bold ${itemCompletionRate < 60 ? 'text-rose-400' : 'text-emerald-500'}`}>
                                     平均完成度 {itemCompletionRate}%
                                  </span>
                               </div>
                               <div className="h-4 w-full bg-slate-100 rounded-lg overflow-hidden flex">
                                  <div 
                                    className={`h-full ${qualityColor} transition-all duration-1000`}
                                    style={{ width: `${itemCompletionRate}%` }}
                                  />
                               </div>
                            </div>
                         )
                      })
                   )}
                </div>
             </div>
          </div>

       </div>
    </div>
  );
};
