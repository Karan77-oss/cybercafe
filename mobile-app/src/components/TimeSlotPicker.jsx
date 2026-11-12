import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Sun, Moon, Zap, 
  CheckCircle2, Sparkles, PhoneCall
} from 'lucide-react';

const ASSISTED_TIME_SLOTS = [
  {
    id: 'morning',
    title: 'Morning',
    timeRange: '09:00 AM - 12:00 PM',
    value: 'Morning (09:00 AM - 12:00 PM)',
    icon: Sun,
    badge: 'Early Processing',
    badgeColor: 'text-amber-700 bg-amber-50 border-amber-200/70',
    description: 'Operator reviews documents & calls during morning hours'
  },
  {
    id: 'afternoon',
    title: 'Afternoon',
    timeRange: '12:00 PM - 04:00 PM',
    value: 'Afternoon (12:00 PM - 04:00 PM)',
    icon: Zap,
    badge: 'Most Popular',
    badgeColor: 'text-sky-700 bg-sky-50 border-sky-200/70',
    description: 'Standard daytime processing & quick clarification call'
  },
  {
    id: 'evening',
    title: 'Evening',
    timeRange: '04:00 PM - 08:00 PM',
    value: 'Evening (04:00 PM - 08:00 PM)',
    icon: Moon,
    badge: 'Express Window',
    badgeColor: 'text-indigo-700 bg-indigo-50 border-indigo-200/70',
    description: 'Post-work evening callback & expedited submission'
  }
];

export default function TimeSlotPicker({
  selectedDate = 'Today',
  onSelectDate,
  selectedSlot = 'Morning (09:00 AM - 12:00 PM)',
  onSelectSlot,
  className = ''
}) {
  const [dateMode, setDateMode] = useState('Today');
  const [customDateValue, setCustomDateValue] = useState('');

  // Calculate formatted dates
  const todayObj = new Date();
  const tomorrowObj = new Date();
  tomorrowObj.setDate(todayObj.getDate() + 1);

  const formatDateDisplay = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const todayDisplay = formatDateDisplay(todayObj);
  const tomorrowDisplay = formatDateDisplay(tomorrowObj);
  const minDateStr = todayObj.toISOString().split('T')[0];

  useEffect(() => {
    if (!selectedDate || selectedDate === 'Today') {
      setDateMode('Today');
    } else if (selectedDate === 'Tomorrow') {
      setDateMode('Tomorrow');
    } else {
      setDateMode('Custom');
      setCustomDateValue(selectedDate);
    }
  }, [selectedDate]);

  const handleDateSelect = (dateStr) => {
    setDateMode(dateStr);
    if (onSelectDate) onSelectDate(dateStr);
  };

  const handleCustomDateChange = (e) => {
    const val = e.target.value;
    setCustomDateValue(val);
    setDateMode('Custom');
    if (onSelectDate) onSelectDate(val);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Info */}
      <div>
        <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5 text-sky-600" />
          <span>Assisted Call Slot Picker</span>
        </h3>
        <p className="text-[11px] text-slate-500 mt-0.5">
          Choose when our cafe operator should review your files and call for any queries.
        </p>
      </div>

      {/* 1. Date Pills: Today / Tomorrow */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-sky-600" />
          <span>Callback Date</span>
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Today Pill */}
          <button
            type="button"
            onClick={() => handleDateSelect('Today')}
            className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl border text-center transition-all duration-200 active:scale-95 ${
              dateMode === 'Today'
                ? 'bg-sky-50/50 border-sky-500 ring-2 ring-sky-500/20 shadow-neo-sm font-bold text-sky-800'
                : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50 font-medium'
            }`}
          >
            <span className="text-xs font-bold flex items-center gap-1.5">
              <span>Today</span>
              {dateMode === 'Today' && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />}
            </span>
            <span className={`text-[10px] mt-0.5 ${dateMode === 'Today' ? 'text-sky-700' : 'text-slate-500'}`}>
              {todayDisplay}
            </span>
          </button>

          {/* Tomorrow Pill */}
          <button
            type="button"
            onClick={() => handleDateSelect('Tomorrow')}
            className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl border text-center transition-all duration-200 active:scale-95 ${
              dateMode === 'Tomorrow'
                ? 'bg-sky-50/50 border-sky-500 ring-2 ring-sky-500/20 shadow-neo-sm font-bold text-sky-800'
                : 'bg-white border-slate-200/80 text-slate-600 hover:bg-slate-50 font-medium'
            }`}
          >
            <span className="text-xs font-bold flex items-center gap-1.5">
              <span>Tomorrow</span>
              {dateMode === 'Tomorrow' && <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />}
            </span>
            <span className={`text-[10px] mt-0.5 ${dateMode === 'Tomorrow' ? 'text-sky-700' : 'text-slate-500'}`}>
              {tomorrowDisplay}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Assisted Time Slots List */}
      <div className="space-y-2.5 pt-1">
        <label className="text-[11px] font-semibold text-slate-700 flex items-center gap-1">
          <Clock className="w-3 h-3 text-sky-600" />
          <span>Preferred Time Window</span>
        </label>

        <div className="space-y-2">
          {ASSISTED_TIME_SLOTS.map((slot) => {
            const SlotIcon = slot.icon;
            const isSelected = selectedSlot === slot.value || selectedSlot === slot.timeRange;

            return (
              <button
                key={slot.id}
                type="button"
                onClick={() => onSelectSlot && onSelectSlot(slot.value)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 active:scale-[0.98] flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-sky-50/50 border-sky-500 ring-2 ring-sky-500/20 shadow-neo-sm'
                    : 'bg-white border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <SlotIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-xs font-bold ${isSelected ? 'text-sky-800' : 'text-slate-800'}`}>
                        {slot.title}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${slot.badgeColor}`}>
                        {slot.badge}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-600 block mt-0.5">
                      {slot.timeRange}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">
                      {slot.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 pl-1">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-sky-500 flex items-center justify-center text-white">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Slot Summary Badge */}
      {selectedSlot && (
        <div className="p-3 bg-sky-50/70 border border-sky-200/70 rounded-2xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-4 h-4 text-sky-600 shrink-0" />
            <div className="min-w-0">
              <span className="text-[10px] text-slate-500 block">Assisted Callback Window</span>
              <span className="font-bold text-sky-800 text-xs truncate">
                📞 {selectedDate || 'Today'}, {selectedSlot}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-full shrink-0">
            Operator Ready
          </span>
        </div>
      )}
    </div>
  );
}
