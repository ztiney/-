
export interface User {
  id: string;
  name: string;
  avatar: string; // Emoji or Base64 Image URL
  theme: string; // Tailwind color class prefix, e.g., 'rose', 'sky', 'violet'
}

export interface TaskTemplate {
  id: string;
  name: string;
  color: string; // Hex or Tailwind class
  icon: string; // Emoji or icon name
  defaultDuration: number; // in minutes
}

export interface ScheduleItem {
  id: string;
  userId: string;
  templateId: string;
  title: string;
  startTime: number; // Minutes from midnight (0-1439)
  duration: number; // Minutes
  dayIndex: number; // 0 (Monday) - 6 (Sunday)
  color: string;
  completion: number; // 0 - 100
  weekId: string; // ISO Date string of the Monday of the week
  isRecurring: boolean; // If true, copies to next week automatically
  type?: 'block' | 'marker'; // 'block' is standard box, 'marker' is the new line type
  markerType?: 'wake' | 'sleep'; // Subtype for markers
  excludeFromStats?: boolean; // New: exclude from statistics (e.g. work/school)
}

export const THEMES = [
  { name: '樱花粉', class: 'rose', bg: 'bg-rose-100', text: 'text-rose-600', border: 'border-rose-200', ring: 'ring-rose-400' },
  { name: '天空蓝', class: 'sky', bg: 'bg-sky-100', text: 'text-sky-600', border: 'border-sky-200', ring: 'ring-sky-400' },
  { name: '香芋紫', class: 'violet', bg: 'bg-violet-100', text: 'text-violet-600', border: 'border-violet-200', ring: 'ring-violet-400' },
  { name: '薄荷绿', class: 'emerald', bg: 'bg-emerald-100', text: 'text-emerald-600', border: 'border-emerald-200', ring: 'ring-emerald-400' },
  { name: '蜂蜜黄', class: 'amber', bg: 'bg-amber-100', text: 'text-amber-600', border: 'border-amber-200', ring: 'ring-amber-400' },
  { name: '珊瑚橘', class: 'orange', bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200', ring: 'ring-orange-400' },
  { name: '青柠色', class: 'lime', bg: 'bg-lime-100', text: 'text-lime-600', border: 'border-lime-200', ring: 'ring-lime-400' },
  { name: '海盐青', class: 'teal', bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200', ring: 'ring-teal-400' },
  { name: '靛青蓝', class: 'indigo', bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200', ring: 'ring-indigo-400' },
  { name: '火龙果', class: 'fuchsia', bg: 'bg-fuchsia-100', text: 'text-fuchsia-600', border: 'border-fuchsia-200', ring: 'ring-fuchsia-400' },
];

export const DAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
export const HOURS_START = 5; // Changed to 5 AM to accommodate early wake up lines
export const HOURS_END = 29; // Extended to 5 AM next day (24+5) for late sleepers
export const PIXELS_PER_HOUR = 60;
export const SNAP_MINUTES = 15;
