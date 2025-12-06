
import React, { useState, useEffect, useRef } from 'react';
import { format, startOfWeek, addWeeks, subWeeks, endOfWeek } from 'date-fns';
import { 
  User, TaskTemplate, ScheduleItem, THEMES, DAYS
} from './types';
import { Calendar } from './components/Calendar';
import { Statistics } from './components/Statistics';
import { 
  Plus, ChevronLeft, ChevronRight, 
  Settings, CalendarDays,
  Edit3, Check, X, Trash2, Clock, Palette, Smile,
  BarChart2, Upload, Share2, Download, ZoomIn, Move,
  Briefcase, Repeat
} from 'lucide-react';
import html2canvas from 'html2canvas';

const INITIAL_USERS: User[] = [
  { id: 'u1', name: '年糕', avatar: '🐱', theme: 'rose' },
  { id: 'u2', name: '团子', avatar: '🐼', theme: 'emerald' },
];

const EMOJIS = [
  '📚', '📱', '💤', '💪', '🍱', '🎮',
  '🐱', '🐶', '🐰', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷',
  '🐸', '🐵', '🐣', '🦄', '🐝', '🦋', '🌸', '🍄', '🍓', '🍑',
  '🥑', '🍪', '🧋', '🍡', '🍦', '🍩', '🎈', '🧸', '🎀', '⭐',
  '💻', '🎨', '🎬', '🎹', '🎸', '⚽', '🏀', '🏊', '🚴', '🚗'
];

const STICKER_COLORS = [
  '#fca5a5', '#fdba74', '#fcd34d', '#86efac', 
  '#6ee7b7', '#5eead4', '#67e8f9', '#93c5fd', 
  '#a5b4fc', '#c4b5fd', '#d8b4fe', '#f0abfc', 
  '#f9a8d4', '#cbd5e1'
];

const INITIAL_TEMPLATES: TaskTemplate[] = [
  { id: 't1', name: '学习', color: '#fca5a5', icon: '📚', defaultDuration: 60 },
  { id: 't2', name: '玩手机', color: '#93c5fd', icon: '📱', defaultDuration: 30 },
  { id: 't3', name: '睡觉', color: '#c4b5fd', icon: '💤', defaultDuration: 480 },
  { id: 't4', name: '健身', color: '#6ee7b7', icon: '💪', defaultDuration: 60 },
  { id: 't5', name: '吃饭', color: '#fcd34d', icon: '🍱', defaultDuration: 45 },
  { id: 't6', name: '游戏', color: '#fdba74', icon: '🎮', defaultDuration: 120 },
];

type ViewType = 'calendar' | 'stats';

// Helper to format duration friendlier (e.g. 75 min -> 1小时15分)
export const formatDurationFriendly = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0) {
      return `${h}小时${m > 0 ? `${m}分` : ''}`;
  }
  return `${m}分`;
};

// Helper to parse time string "HH:MM" to minutes
const parseTimeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
};

export default function App() {
  const [appName, setAppName] = useState('Mochi 日程本');
  const [isEditingAppName, setIsEditingAppName] = useState(false);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [templates, setTemplates] = useState<TaskTemplate[]>(INITIAL_TEMPLATES);
  const [currentView, setCurrentView] = useState<ViewType>('calendar');
  
  // Drag State for Trash Can
  const [isDraggingSticker, setIsDraggingSticker] = useState(false);
  const [isOverTrash, setIsOverTrash] = useState(false);

  // User Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editTheme, setEditTheme] = useState('');

  // Image Cropper State
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropScale, setCropScale] = useState(1);
  const [cropPos, setCropPos] = useState({ x: 0, y: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageRef = useRef<HTMLImageElement>(null);

  // New Sticker Modal State
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
  const [newStickerName, setNewStickerName] = useState('');
  const [newStickerDuration, setNewStickerDuration] = useState(60);
  const [newStickerColor, setNewStickerColor] = useState(STICKER_COLORS[0]);
  const [newStickerIcon, setNewStickerIcon] = useState(EMOJIS[0]);

  // Work/School Modal State
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [workConfig, setWorkConfig] = useState({
      title: '上学',
      startTime: '08:00',
      endTime: '17:00',
      days: [0, 1, 2, 3, 4], // Mon-Fri
  });

  // Share Modal State
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const savedItems = localStorage.getItem('mochi-items');
    const savedUsers = localStorage.getItem('mochi-users');
    const savedTemplates = localStorage.getItem('mochi-templates');
    const savedAppName = localStorage.getItem('mochi-app-name');
    
    if (savedItems) setItems(JSON.parse(savedItems));
    if (savedUsers) {
        const loadedUsers = JSON.parse(savedUsers);
        setUsers(loadedUsers);
        if (!loadedUsers.find((u: User) => u.id === currentUser.id)) {
            setCurrentUser(loadedUsers[0]);
        }
    }
    if (savedTemplates) setTemplates(JSON.parse(savedTemplates));
    if (savedAppName) setAppName(savedAppName);
  }, []);

  useEffect(() => {
    localStorage.setItem('mochi-items', JSON.stringify(items));
    localStorage.setItem('mochi-users', JSON.stringify(users));
    localStorage.setItem('mochi-templates', JSON.stringify(templates));
    localStorage.setItem('mochi-app-name', appName);
  }, [items, users, templates, appName]);

  // Helper to get Week ID (Monday Date)
  const getWeekId = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
  const currentWeekId = getWeekId(currentDate);

  // --- Sleep/Wake Marker Initialization ---
  useEffect(() => {
     // Check if current week has sleep/wake markers for current user
     const userItems = items.filter(i => i.userId === currentUser.id && i.weekId === currentWeekId);
     const hasMarkers = userItems.some(i => i.type === 'marker');
     
     if (!hasMarkers && userItems.length === 0) { 
         // Only initialize if week is empty or no markers found
     }
  }, [currentWeekId, currentUser.id]);

  useEffect(() => {
      // Manual trigger check after load/user change
      const existingMarkers = items.filter(
          i => i.weekId === currentWeekId && i.userId === currentUser.id && i.type === 'marker'
      );

      if (existingMarkers.length === 0) {
          const newMarkers: ScheduleItem[] = [];
          for (let day = 0; day < 7; day++) {
              newMarkers.push({
                  id: crypto.randomUUID(),
                  userId: currentUser.id,
                  templateId: 'sys-wake',
                  title: '起床',
                  startTime: 420, // 7:00 AM
                  duration: 0,
                  dayIndex: day,
                  color: 'orange',
                  completion: 0,
                  weekId: currentWeekId,
                  isRecurring: true,
                  type: 'marker',
                  markerType: 'wake'
              });
              newMarkers.push({
                  id: crypto.randomUUID(),
                  userId: currentUser.id,
                  templateId: 'sys-sleep',
                  title: '睡觉',
                  startTime: 1380, // 11:00 PM
                  duration: 0,
                  dayIndex: day,
                  color: 'indigo',
                  completion: 0,
                  weekId: currentWeekId,
                  isRecurring: true,
                  type: 'marker',
                  markerType: 'sleep'
              });
          }
          setItems(prev => [...prev, ...newMarkers]);
      }
  }, [currentWeekId, currentUser.id]);

  const changeWeek = (direction: 'prev' | 'next') => {
    const oldDate = currentDate;
    const newDate = direction === 'next' ? addWeeks(oldDate, 1) : subWeeks(oldDate, 1);
    
    // Auto-copy recurring tasks to next week logic
    if (direction === 'next') {
        const oldWeekId = getWeekId(oldDate);
        const newWeekId = getWeekId(newDate);
        
        // Check if next week is empty
        const hasItemsInNewWeek = items.some(i => i.weekId === newWeekId && i.userId === currentUser.id);
        
        if (!hasItemsInNewWeek) {
            // Find recurring items from old week
            const recurringItems = items.filter(i => 
                i.weekId === oldWeekId && 
                i.userId === currentUser.id && 
                i.isRecurring
            );
            
            if (recurringItems.length > 0) {
                const newItems = recurringItems.map(item => ({
                    ...item,
                    id: crypto.randomUUID(),
                    weekId: newWeekId,
                    completion: 0 // Reset completion for new week
                }));
                setItems(prev => [...prev, ...newItems]);
            }
        }
    }

    setCurrentDate(newDate);
  };

  const handleUpdateItem = (id: string, updates: Partial<ScheduleItem>) => {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  const handleAddItem = (item: ScheduleItem) => {
    setItems(prev => [...prev, item]);
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };
  
  // --- Work Schedule Logic ---
  const handleGenerateWorkSchedule = () => {
      const { title, startTime, endTime, days } = workConfig;
      
      const startMin = parseTimeToMinutes(startTime);
      const endMin = parseTimeToMinutes(endTime);
      let duration = endMin - startMin;
      
      if (duration <= 0) {
          alert("结束时间必须晚于开始时间");
          return;
      }
      
      // Remove existing Work items for this week/user (identified by 'sys-work' templateId)
      const cleanItems = items.filter(i => 
        !(i.weekId === currentWeekId && i.userId === currentUser.id && i.templateId === 'sys-work')
      );
      
      const newItems: ScheduleItem[] = [];
      days.forEach(dayIndex => {
          newItems.push({
            id: crypto.randomUUID(),
            userId: currentUser.id,
            templateId: 'sys-work',
            title: title || '固定日程',
            startTime: startMin,
            duration: duration,
            dayIndex: dayIndex,
            color: '#e2e8f0', // Neutral Slate
            completion: 0,
            weekId: currentWeekId,
            isRecurring: true,
            type: 'block',
            excludeFromStats: true
          });
      });
      
      setItems([...cleanItems, ...newItems]);
      setIsWorkModalOpen(false);
  };

  const toggleWorkDay = (dayIndex: number) => {
      setWorkConfig(prev => {
          if (prev.days.includes(dayIndex)) {
              return { ...prev, days: prev.days.filter(d => d !== dayIndex) };
          } else {
              return { ...prev, days: [...prev.days, dayIndex].sort() };
          }
      });
  };

  const handleAddUser = () => {
    const names = ['新朋友', '小可爱', '小怪兽'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
    const newUser: User = {
      id: crypto.randomUUID(),
      name: `${randomName}${users.length + 1}`,
      avatar: '🥚',
      theme: randomTheme.class
    };
    const newUsers = [...users, newUser];
    setUsers(newUsers);
    setCurrentUser(newUser);
    openSettings(newUser);
  };

  const openSettings = (user: User = currentUser) => {
    setEditName(user.name);
    setEditAvatar(user.avatar);
    setEditTheme(user.theme);
    setIsSettingsOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
          alert("图片太大了，请选择小于10MB的图片");
          return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setRawImageSrc(reader.result as string);
        setCropScale(1);
        setCropPos({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCropMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDraggingCrop(true);
      setDragStart({ x: e.clientX - cropPos.x, y: e.clientY - cropPos.y });
  };

  const handleCropMouseMove = (e: React.MouseEvent) => {
      if (!isDraggingCrop) return;
      e.preventDefault();
      setCropPos({
          x: e.clientX - dragStart.x,
          y: e.clientY - dragStart.y
      });
  };

  const handleCropMouseUp = () => {
      setIsDraggingCrop(false);
  };

  const handleSaveCroppedImage = () => {
      if (!imageRef.current) return;

      const canvas = document.createElement('canvas');
      const size = 200; 
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, size, size);
      
      const img = imageRef.current;
      
      ctx.translate(size/2, size/2);
      ctx.translate(cropPos.x, cropPos.y);
      ctx.scale(cropScale, cropScale);
      ctx.translate(-img.naturalWidth/2, -img.naturalHeight/2);
      
      ctx.drawImage(img, 0, 0);

      const optimizedImage = canvas.toDataURL('image/jpeg', 0.8);
      setEditAvatar(optimizedImage);
      setRawImageSrc(null); 
  };

  const saveUserSettings = () => {
    if (!editName.trim()) return;
    const updatedUser = {
        ...currentUser,
        name: editName,
        avatar: editAvatar,
        theme: editTheme
    };
    
    try {
        localStorage.setItem('test-quota', JSON.stringify(updatedUser));
        localStorage.removeItem('test-quota');
        
        setUsers(prev => prev.map(u => u.id === currentUser.id ? updatedUser : u));
        setCurrentUser(updatedUser);
        setIsSettingsOpen(false);
    } catch (e) {
        alert("保存失败：数据量过大。请尝试使用更简单的头像或删除一些旧数据。");
    }
  };

  const handleOpenCreateSticker = () => {
    setNewStickerName('');
    setNewStickerDuration(60);
    setNewStickerColor(STICKER_COLORS[0]);
    setNewStickerIcon(EMOJIS[0]);
    setIsStickerModalOpen(true);
  };

  const handleCreateSticker = () => {
    if (!newStickerName.trim()) return;
    const newTemplate: TaskTemplate = {
      id: crypto.randomUUID(),
      name: newStickerName,
      defaultDuration: newStickerDuration,
      color: newStickerColor,
      icon: newStickerIcon
    };
    setTemplates(prev => [...prev, newTemplate]);
    setIsStickerModalOpen(false);
  };

  const handleDragStartSticker = (e: React.DragEvent, template: TaskTemplate) => {
    e.dataTransfer.setData('application/json', JSON.stringify(template));
    setIsDraggingSticker(true);
  };

  const handleDragEndSticker = () => {
    setIsDraggingSticker(false);
    setIsOverTrash(false);
  };

  const handleTrashDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsOverTrash(true);
  };

  const handleTrashDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';
    if (!isOverTrash) setIsOverTrash(true);
  };

  const handleTrashDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const data = e.dataTransfer.getData('application/json');
    if (data) {
       try {
           const template = JSON.parse(data);
           if (template && template.id) {
               setTemplates(prev => prev.filter(t => t.id !== template.id));
           }
       } catch (e) {
           console.error("Invalid drag data", e);
       }
    }
    setIsDraggingSticker(false);
    setIsOverTrash(false);
  };

  // --- Share Logic ---
  const handleExportImage = async () => {
    if (!exportRef.current) return;
    
    setIsGeneratingImage(true);
    
    try {
        await new Promise(resolve => setTimeout(resolve, 500));
        
        const canvas = await html2canvas(exportRef.current, {
            scale: 2, 
            useCORS: true, 
            backgroundColor: null,
            logging: false
        });
        
        const image = canvas.toDataURL("image/png");
        const link = document.createElement('a');
        link.href = image;
        link.download = `${appName}-${currentUser.name}-${format(new Date(), 'yyyyMMdd')}.png`;
        link.click();
    } catch (err) {
        console.error("Export failed", err);
        alert("图片生成失败，请重试");
    } finally {
        setIsGeneratingImage(false);
    }
  };

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const allUserItems = items.filter(i => i.userId === currentUser.id);
  const weekUserItems = allUserItems.filter(i => i.weekId === currentWeekId || !i.weekId); 
  const themeColors = THEMES.find(t => t.class === currentUser.theme) || THEMES[0];
  const dateFormatter = new Intl.DateTimeFormat('zh-CN', { month: 'long', year: 'numeric' });
  const dayFormatter = new Intl.DateTimeFormat('zh-CN', { month: 'short', day: 'numeric' });

  const renderAvatar = (avatarStr: string, sizeClass: string = "text-xl") => {
    const isImage = avatarStr.startsWith('data:image');
    if (isImage) {
      return <img src={avatarStr} alt="avatar" className={`w-full h-full object-cover`} />;
    }
    return <span className={sizeClass}>{avatarStr}</span>;
  };

  return (
    <div className={`flex h-screen w-full ${themeColors.bg} text-slate-700 overflow-hidden transition-colors duration-500`}>
      
      {/* LEFT SIDEBAR */}
      <aside className="w-72 flex flex-col bg-white/80 backdrop-blur-md border-r border-white/50 p-4 shadow-2xl z-50">
        <div className="flex items-center gap-3 mb-6 px-2">
          <div className={`p-2.5 rounded-2xl ${themeColors.bg} shadow-sm transition-colors duration-300`}>
             <CalendarDays className={themeColors.text} size={24} />
          </div>
          <div>
            {isEditingAppName ? (
                <input 
                    type="text" 
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    onBlur={() => setIsEditingAppName(false)}
                    onKeyDown={(e) => e.key === 'Enter' && setIsEditingAppName(false)}
                    autoFocus
                    className="text-xl font-bold text-slate-800 bg-transparent border-b-2 border-slate-300 focus:border-rose-400 outline-none w-40"
                />
            ) : (
                <h1 
                    onClick={() => setIsEditingAppName(true)}
                    className="text-xl font-bold text-slate-800 tracking-tight hover:bg-white/50 cursor-pointer rounded px-1 transition-colors"
                    title="点击修改名称"
                >
                    {appName}
                </h1>
            )}
          </div>
        </div>

        <div className="flex gap-2 mb-6 p-1 bg-slate-100 rounded-xl">
           <button 
             onClick={() => setCurrentView('calendar')}
             className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all
               ${currentView === 'calendar' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}
             `}
           >
             <CalendarDays size={16} /> 日程
           </button>
           <button 
             onClick={() => setCurrentView('stats')}
             className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all
               ${currentView === 'stats' ? 'bg-white shadow-sm text-slate-700' : 'text-slate-400 hover:text-slate-600'}
             `}
           >
             <BarChart2 size={16} /> 统计
           </button>
        </div>

        <div className="mb-6">
          <div className="flex justify-between items-center mb-2 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">成员</h3>
            <button onClick={handleAddUser} className="text-slate-400 hover:text-rose-500 transition-colors" title="添加新用户">
              <Plus size={14} />
            </button>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar px-1 items-center">
            {users.map(user => {
                const uTheme = THEMES.find(t => t.class === user.theme) || THEMES[0];
                return (
                  <button
                    key={user.id}
                    onClick={() => setCurrentUser(user)}
                    className={`flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all border-2 overflow-hidden
                      ${currentUser.id === user.id 
                        ? `${uTheme.border} bg-white translate-y-[-2px] shadow-md ring-2 ring-offset-1 ${uTheme.ring?.replace('ring-', 'ring-offset-')}` 
                        : 'border-transparent bg-white/50 hover:bg-white'}`}
                    title={user.name}
                  >
                    {renderAvatar(user.avatar, "text-2xl")}
                  </button>
                )
            })}
          </div>
          
          <div className="flex items-center justify-between mt-2 bg-white/50 p-2 rounded-xl border border-white/60">
            <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/50 flex-shrink-0 flex items-center justify-center border border-slate-100">
                   {renderAvatar(currentUser.avatar)}
                </div>
                <span className={`text-sm font-bold truncate ${themeColors.text}`}>{currentUser.name}</span>
            </div>
            <button 
                onClick={() => openSettings()}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-white hover:text-slate-600 transition-colors flex-shrink-0"
                title="编辑资料"
            >
                <Settings size={14} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0 border-t border-slate-100 pt-4 relative group/store">
          <div className="flex justify-between items-center mb-3 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">贴纸库</h3>
            <div className="flex gap-1">
                <button 
                    onClick={() => setIsWorkModalOpen(true)}
                    className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-all"
                    title="添加固定日程 (上班/上学)"
                >
                    <Briefcase size={10} strokeWidth={2.5} />
                </button>
                <button 
                onClick={handleOpenCreateSticker}
                className={`w-5 h-5 flex items-center justify-center rounded-full bg-white text-slate-400 hover:${themeColors.text} hover:bg-white shadow-sm transition-all`}
                title="创建新贴纸"
                >
                    <Plus size={12} strokeWidth={3} />
                </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto pr-1 no-scrollbar pb-16">
            {/* COMPACT STICKER GRID (3 Columns) */}
            <div className="grid grid-cols-3 gap-1.5">
              {templates.map(template => (
                <div
                  key={template.id}
                  draggable
                  onDragStart={(e) => handleDragStartSticker(e, template)}
                  onDragEnd={handleDragEndSticker}
                  className="bg-white p-1.5 rounded-lg shadow-sm border border-slate-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group relative flex flex-col items-center gap-1 hover:ring-2 ring-slate-100"
                >
                  <div 
                    className="w-7 h-7 rounded-md flex items-center justify-center text-xs shadow-inner"
                    style={{ backgroundColor: template.color }}
                  >
                    <span className="drop-shadow-sm text-white">{template.icon}</span>
                  </div>
                  
                  <div className="text-center w-full">
                    <p className="font-bold text-slate-700 text-[10px] truncate leading-tight">{template.name}</p>
                    <p className="text-[9px] text-slate-400 scale-90">{formatDurationFriendly(template.defaultDuration)}</p>
                  </div>
                </div>
              ))}
              
              {templates.length === 0 && (
                 <div className="col-span-3 text-center p-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                   点击 + 号<br/>添加贴纸
                 </div>
              )}
            </div>
          </div>

          <div 
            className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-32 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg z-[100] gap-2 border
                ${isDraggingSticker 
                    ? (isOverTrash ? 'bg-red-500 border-red-600 text-white scale-110' : 'bg-white border-slate-200 text-slate-400 translate-y-0') 
                    : 'translate-y-20 opacity-0 pointer-events-none'
                }
            `}
            onDragEnter={handleTrashDragEnter}
            onDragOver={handleTrashDragOver}
            onDrop={handleTrashDrop}
          >
             <Trash2 size={18} />
             <span className="text-xs font-bold">{isOverTrash ? '松手删除' : '拖入删除'}</span>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-col h-full relative overflow-hidden">
        
        {/* Header */}
        <header className="flex-shrink-0 flex items-center justify-between mb-2 p-4 lg:p-8 pb-0">
            {currentView === 'calendar' ? (
                <div className="flex items-center gap-4 bg-white/60 backdrop-blur-md p-2 rounded-2xl shadow-sm border border-white/50">
                <button 
                    onClick={() => changeWeek('prev')} 
                    className="p-2 hover:bg-white rounded-xl transition-colors text-slate-500"
                >
                    <ChevronLeft size={20} />
                </button>
                <div className="text-center w-40">
                    <span className="block text-sm font-bold text-slate-800">
                    {dateFormatter.format(weekStart)}
                    </span>
                    <span className="block text-xs text-slate-500">
                    {dayFormatter.format(weekStart)} 开始的一周
                    </span>
                </div>
                <button 
                    onClick={() => changeWeek('next')}
                    className="p-2 hover:bg-white rounded-xl transition-colors text-slate-500"
                >
                    <ChevronRight size={20} />
                </button>
                </div>
            ) : (
                <div className="h-14"></div> // Spacer
            )}

            <div className="flex items-center gap-2">
              {/* Share Button */}
              <button
                onClick={() => setIsShareModalOpen(true)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm shadow-sm transition-all hover:-translate-y-0.5
                   bg-white text-slate-600 hover:text-rose-500 border border-white/60 backdrop-blur-md
                `}
              >
                 <Share2 size={18} />
                 <span>生成周报</span>
              </button>

              {currentView === 'calendar' && (
                <div className="hidden lg:block px-4 py-3 bg-white/60 rounded-xl text-xs font-bold text-slate-500 backdrop-blur-md border border-white/50">
                    已计划 {weekUserItems.filter(i => i.type !== 'marker').length} 项
                </div>
              )}
            </div>
        </header>

        {/* View Content */}
        {currentView === 'calendar' ? (
           <div className="flex-1 p-4 lg:p-8 pt-4 overflow-hidden flex flex-col">
             <Calendar 
               currentDate={currentDate} 
               items={weekUserItems}
               onItemUpdate={handleUpdateItem}
               onItemAdd={handleAddItem}
               onItemDelete={handleDeleteItem}
               userId={currentUser.id}
             />
           </div>
        ) : (
           <Statistics 
             items={allUserItems} 
             currentUser={currentUser} 
             themeColor={themeColors.text}
             currentDate={currentDate}
           />
        )}

        {/* --- MODALS --- */}

        {/* Work/School Schedule Modal */}
        {isWorkModalOpen && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <Briefcase size={20} className={themeColors.text} />
                          固定日程 (上班/上学)
                        </h3>
                        <button 
                          onClick={() => setIsWorkModalOpen(false)}
                          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200"
                        >
                          <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-5">
                        {/* Title Input */}
                        <div>
                           <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                             名称
                           </label>
                           <input 
                              type="text" 
                              value={workConfig.title}
                              onChange={(e) => setWorkConfig({...workConfig, title: e.target.value})}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-slate-200"
                           />
                        </div>

                        {/* Time Inputs */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                               <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                 开始时间
                               </label>
                               <input 
                                  type="time" 
                                  value={workConfig.startTime}
                                  onChange={(e) => setWorkConfig({...workConfig, startTime: e.target.value})}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-slate-700 font-bold text-center focus:outline-none focus:ring-2 focus:ring-slate-200"
                               />
                            </div>
                            <div>
                               <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                 结束时间
                               </label>
                               <input 
                                  type="time" 
                                  value={workConfig.endTime}
                                  onChange={(e) => setWorkConfig({...workConfig, endTime: e.target.value})}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-slate-700 font-bold text-center focus:outline-none focus:ring-2 focus:ring-slate-200"
                               />
                            </div>
                        </div>

                        {/* Days Selection */}
                        <div>
                           <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                             重复周期
                           </label>
                           <div className="flex justify-between bg-slate-50 p-2 rounded-xl border border-slate-100">
                               {DAYS.map((dayName, index) => {
                                   const isSelected = workConfig.days.includes(index);
                                   return (
                                       <button
                                           key={index}
                                           onClick={() => toggleWorkDay(index)}
                                           className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition-all
                                              ${isSelected 
                                                ? 'bg-slate-700 text-white shadow-md scale-105' 
                                                : 'text-slate-400 hover:bg-slate-200'}
                                           `}
                                       >
                                           {dayName.replace('周', '')}
                                       </button>
                                   );
                               })}
                           </div>
                        </div>
                    </div>

                    <div className="mt-6 flex items-start gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="mt-0.5 text-slate-400">
                             <BarChart2 size={14} />
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">
                            此日程将以灰色区块显示，且<span className="font-bold text-slate-700">不会</span>计入右侧的习惯统计数据中。
                        </p>
                    </div>

                    <button 
                        onClick={handleGenerateWorkSchedule}
                        className={`w-full mt-6 py-3 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 
                            bg-slate-700 hover:bg-slate-800
                        `}
                    >
                        生成日程
                    </button>
                </div>
            </div>
        )}

        {/* CROPPER MODAL (Only shows when rawImageSrc is set) */}
        {rawImageSrc && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-md z-[200] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                    <h3 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Move size={20} /> 调整图片
                    </h3>
                    
                    {/* Viewport Area */}
                    <div className="relative w-full aspect-square bg-slate-100 rounded-2xl overflow-hidden mb-4 border-2 border-dashed border-slate-300 cursor-move touch-none"
                         onMouseDown={handleCropMouseDown}
                         onMouseMove={handleCropMouseMove}
                         onMouseUp={handleCropMouseUp}
                         onMouseLeave={handleCropMouseUp}
                    >
                        {/* The Image */}
                        <img 
                            ref={imageRef}
                            src={rawImageSrc} 
                            alt="Crop target"
                            className="absolute max-w-none origin-center pointer-events-none select-none"
                            style={{
                                left: '50%',
                                top: '50%',
                                transform: `translate(-50%, -50%) translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropScale})`,
                            }}
                            draggable={false}
                        />
                        
                        {/* The Overlay (Hole) */}
                        <div className="absolute inset-0 pointer-events-none shadow-[0_0_0_999px_rgba(255,255,255,0.7)] rounded-full m-8 border-2 border-white/50 z-10"></div>
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30 text-slate-800 z-0">
                             <Move size={48} />
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-3 mb-6">
                        <ZoomIn size={18} className="text-slate-400" />
                        <input 
                            type="range" 
                            min="0.5" 
                            max="3" 
                            step="0.1" 
                            value={cropScale}
                            onChange={(e) => setCropScale(parseFloat(e.target.value))}
                            className="flex-1 accent-rose-500 h-1 bg-slate-200 rounded-full appearance-none"
                        />
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setRawImageSrc(null)}
                            className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            onClick={handleSaveCroppedImage}
                            className="flex-1 py-3 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-lg transition-transform hover:scale-[1.02] active:scale-95"
                        >
                            完成
                        </button>
                    </div>
                </div>
            </div>
        )}
        
        {/* Share Modal & Hidden Export View */}
        {isShareModalOpen && (
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md z-[150] flex flex-col items-center justify-center p-4">
                
                {/* Controls */}
                <div className="absolute top-4 right-4 flex gap-3">
                   <button 
                     onClick={() => setIsShareModalOpen(false)}
                     className="w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center backdrop-blur-sm"
                   >
                     <X size={20} />
                   </button>
                </div>

                <div className="mb-4 text-center text-white">
                   <h3 className="text-2xl font-bold mb-1">{appName} 周报</h3>
                   <p className="text-white/70 text-sm">点击下载保存这周的满满回忆~</p>
                </div>

                {/* Preview / Export Container */}
                {/* We render this directly. In a real app, we might scale it down for preview using transform: scale() */}
                <div className="h-[80vh] overflow-y-auto no-scrollbar rounded-3xl shadow-2xl bg-slate-50 relative group">
                    <div ref={exportRef} className={`w-[800px] min-h-[1000px] ${themeColors.bg} p-10 text-slate-700 relative overflow-hidden`}>
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
                        
                        {/* Header */}
                        <div className="flex items-center gap-6 mb-10 relative z-10">
                            <div className="w-24 h-24 rounded-3xl bg-white shadow-md flex items-center justify-center text-5xl border-4 border-white overflow-hidden">
                                {renderAvatar(currentUser.avatar, 'text-5xl')}
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-slate-800 mb-1">{currentUser.name} 的 {appName}</h1>
                                <p className={`text-lg font-bold opacity-80 ${themeColors.text}`}>
                                   {format(startOfWeek(currentDate, {weekStartsOn: 1}), 'yyyy年MM月dd日')} - {format(endOfWeek(currentDate, {weekStartsOn: 1}), 'MM月dd日')}
                                </p>
                            </div>
                            <div className="ml-auto opacity-50">
                                <CalendarDays size={48} className={themeColors.text} />
                            </div>
                        </div>

                        {/* Stats Summary Section */}
                        <div className="mb-8 relative z-10">
                            <div className="bg-white/60 backdrop-blur-md rounded-3xl p-6 border border-white/50 shadow-sm">
                                <Statistics 
                                    items={allUserItems} 
                                    currentUser={currentUser} 
                                    themeColor={themeColors.text} 
                                    currentDate={currentDate}
                                    hideControls={true} // New prop to hide headers/toggles
                                />
                            </div>
                        </div>

                        {/* Schedule Snapshot Section */}
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-4">
                                <Clock className={themeColors.text} size={20} />
                                <h3 className="font-bold text-xl text-slate-700">本周时间轴</h3>
                            </div>
                            <div className="bg-white/80 rounded-3xl p-4 shadow-sm border border-white/50">
                                <Calendar 
                                    currentDate={currentDate}
                                    items={weekUserItems}
                                    onItemUpdate={() => {}} // Read-only
                                    onItemAdd={() => {}} 
                                    onItemDelete={() => {}} 
                                    userId={currentUser.id}
                                    isExport={true} // Force full height
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="mt-12 text-center opacity-60 font-bold text-sm">
                             ✨ Created with {appName} ✨
                        </div>
                    </div>
                </div>

                <div className="mt-8">
                    <button 
                        onClick={handleExportImage}
                        disabled={isGeneratingImage}
                        className={`px-8 py-3 rounded-xl font-bold text-white shadow-xl flex items-center gap-3 transition-transform active:scale-95 hover:scale-105
                            ${themeColors.bg.replace('100', '500')}
                        `}
                    >
                        {isGeneratingImage ? (
                            <span>生成中...</span>
                        ) : (
                            <>
                              <Download size={20} />
                              保存图片
                            </>
                        )}
                    </button>
                </div>
            </div>
        )}

        {/* User Settings Modal */}
        {isSettingsOpen && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 w-full max-w-lg shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto no-scrollbar">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Edit3 size={20} className={themeColors.text} />
                        编辑资料
                        </h3>
                        <button 
                        onClick={() => setIsSettingsOpen(false)}
                        className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200"
                        >
                        <X size={16} />
                        </button>
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">昵称</label>
                        <input 
                            type="text" 
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-slate-200"
                        />
                    </div>

                    <div className="mb-6">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">主题配色</label>
                        <div className="grid grid-cols-5 gap-3">
                            {THEMES.map(theme => (
                                <button
                                    key={theme.class}
                                    onClick={() => setEditTheme(theme.class)}
                                    className={`h-12 rounded-xl flex items-center justify-center transition-all ${theme.bg} ${theme.text}
                                        ${editTheme === theme.class ? 'ring-2 ring-slate-400 scale-95 shadow-inner' : 'hover:scale-105 shadow-sm'}
                                    `}
                                    title={theme.name}
                                >
                                    {editTheme === theme.class && <Check size={16} strokeWidth={3} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-8">
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">头像设置</label>
                        <div className="mb-4">
                           <label className="flex items-center gap-2 w-full p-3 border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-rose-300 hover:bg-rose-50 transition-colors text-slate-500 font-bold text-sm justify-center">
                              <Upload size={16} />
                              <span>上传本地图片</span>
                              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                           </label>
                        </div>
                        <div className="flex justify-center mb-4">
                           <div className="w-20 h-20 rounded-2xl bg-slate-100 flex items-center justify-center overflow-hidden border-2 border-slate-200">
                              {renderAvatar(editAvatar, "text-4xl")}
                           </div>
                        </div>

                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">或选择 Emoji</label>
                        <div className="grid grid-cols-6 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100 max-h-40 overflow-y-auto no-scrollbar">
                            {EMOJIS.slice(0, 30).map(avatar => (
                                <button
                                    key={avatar}
                                    onClick={() => setEditAvatar(avatar)}
                                    className={`aspect-square rounded-xl text-xl flex items-center justify-center transition-all
                                        ${editAvatar === avatar ? 'bg-white shadow-md ring-2 ring-rose-200 scale-110' : 'hover:bg-white/60 hover:scale-105'}
                                    `}
                                >
                                    {avatar}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setIsSettingsOpen(false)}
                            className="flex-1 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            onClick={saveUserSettings}
                            className={`flex-1 py-3 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95
                                ${THEMES.find(t => t.class === editTheme)?.bg.replace('100', '500') || 'bg-rose-500'}
                            `}
                        >
                            保存修改
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Create Sticker Modal */}
        {isStickerModalOpen && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                          <Plus size={20} className={themeColors.text} />
                          创建新贴纸
                        </h3>
                        <button 
                          onClick={() => setIsStickerModalOpen(false)}
                          className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200"
                        >
                          <X size={16} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        <div>
                           <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                             <Edit3 size={12} /> 名称
                           </label>
                           <input 
                              type="text" 
                              value={newStickerName}
                              onChange={(e) => setNewStickerName(e.target.value)}
                              placeholder="例如: 练钢琴"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-slate-200"
                           />
                        </div>
                        <div>
                           <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                             <Clock size={12} /> 默认时长 (分钟)
                           </label>
                           <input 
                              type="number" 
                              value={newStickerDuration}
                              onChange={(e) => setNewStickerDuration(Number(e.target.value))}
                              step={15}
                              min={15}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-700 font-bold focus:outline-none focus:ring-2 focus:ring-slate-200"
                           />
                        </div>
                        <div>
                           <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                             <Palette size={12} /> 颜色
                           </label>
                           <div className="flex flex-wrap gap-2">
                              {STICKER_COLORS.map(color => (
                                <button
                                  key={color}
                                  onClick={() => setNewStickerColor(color)}
                                  className={`w-8 h-8 rounded-full transition-transform ${newStickerColor === color ? 'scale-110 ring-2 ring-slate-400 shadow-sm' : 'hover:scale-105'}`}
                                  style={{ backgroundColor: color }}
                                />
                              ))}
                           </div>
                        </div>
                        <div>
                           <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                             <Smile size={12} /> 图标
                           </label>
                           <div className="grid grid-cols-8 gap-1 h-32 overflow-y-auto no-scrollbar bg-slate-50 p-2 rounded-xl border border-slate-100">
                              {EMOJIS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => setNewStickerIcon(emoji)}
                                  className={`aspect-square flex items-center justify-center rounded-lg text-lg transition-colors ${newStickerIcon === emoji ? 'bg-white shadow-sm ring-1 ring-slate-200' : 'hover:bg-white/50'}`}
                                >
                                  {emoji}
                                </button>
                              ))}
                           </div>
                        </div>
                    </div>

                    <button 
                        onClick={handleCreateSticker}
                        disabled={!newStickerName.trim()}
                        className={`w-full mt-6 py-3 rounded-xl font-bold text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
                            ${themeColors.bg.replace('100', '500')}
                        `}
                    >
                        创建
                    </button>
                </div>
            </div>
        )}

      </main>
    </div>
  );
}
