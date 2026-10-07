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
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    description: 'Operator reviews documents & calls during morning hours'
  },
  {
    id: 'afternoon',
    title: 'Afternoon',
    timeRange: '12:00 PM - 04:00 PM',
    value: 'Afternoon (12:00 PM - 04:00 PM)',
    icon: Zap,
    badge: 'Most Popular',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    description: 'Standard daytime processing & quick clarification call'
  },
  {
    id: 'evening',
    title: 'Evening',
    timeRange: '04:00 PM - 08:00 PM',
    value: 'Evening (04:00 PM - 08:00 PM)',
    icon: Moon,
    badge: 'Express Window',
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
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
        <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
          <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
          <span>Assisted Call Slot Picker</span>
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Choose when our cafe operator should review your files and call for any queries.
        </p>
      </div>

      {/* 1. Date Pills: Today / Tomorrow */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-indigo-400" />
          <span>Callback Date</span>
        </label>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Today Pill */}
          <button
            type="button"
            onClick={() => handleDateSelect('Today')}
            className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl border text-center transition-all duration-200 active:scale-95 ${
              dateMode === 'Today'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white border-cyan-400/80 shadow-lg shadow-cyan-500/20 font-bold ring-2 ring-cyan-500/30'
                : 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 border-slate-700/70 font-medium'
            }`}
          >
            <span className="text-xs font-bold flex items-center gap-1.5">
              <span>Today</span>
              {dateMode === 'Today' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-200" />}
            </span>
            <span className={`text-[10px] mt-0.5 ${dateMode === 'Today' ? 'text-cyan-100' : 'text-slate-400'}`}>
              {todayDisplay}
            </span>
          </button>

          {/* Tomorrow Pill */}
          <button
            type="button"
            onClick={() => handleDateSelect('Tomorrow')}
            className={`flex flex-col items-center justify-center py-2.5 px-3 rounded-2xl border text-center transition-all duration-200 active:scale-95 ${
              dateMode === 'Tomorrow'
                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white border-cyan-400/80 shadow-lg shadow-cyan-500/20 font-bold ring-2 ring-cyan-500/30'
                : 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 border-slate-700/70 font-medium'
            }`}
          >
            <span className="text-xs font-bold flex items-center gap-1.5">
              <span>Tomorrow</span>
              {dateMode === 'Tomorrow' && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-200" />}
            </span>
            <span className={`text-[10px] mt-0.5 ${dateMode === 'Tomorrow' ? 'text-cyan-100' : 'text-slate-400'}`}>
              {tomorrowDisplay}
            </span>
          </button>
        </div>
      </div>

      {/* 2. Assisted Time Slots List */}
      <div className="space-y-2.5 pt-1">
        <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
          <Clock className="w-3 h-3 text-cyan-400" />
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
                className={`w-full text-left p-3.5 rounded-2xl border transition-all duration-200 active:scale-98 flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'bg-slate-800/95 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-500/10'
                    : 'bg-slate-850/80 border-slate-700/70 hover:border-slate-600 hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <SlotIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isSelected ? 'text-cyan-200' : 'text-slate-200'}`}>
                        {slot.title}
                      </span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${slot.badgeColor}`}>
                        {slot.badge}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold text-slate-300 block mt-0.5">
                      {slot.timeRange}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">
                      {slot.description}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 pl-1">
                  {isSelected ? (
                    <div className="w-5 h-5 rounded-full bg-cyan-400 flex items-center justify-center text-slate-950">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-slate-700" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Slot Summary Badge */}
      {selectedSlot && (
        <div className="p-3 bg-gradient-to-r from-indigo-950/40 to-cyan-950/40 border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">Assisted Callback Window</span>
              <span className="font-bold text-cyan-300 text-xs">
                📞 {selectedDate || 'Today'}, {selectedSlot}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
            Operator Ready
          </span>
        </div>
      )}
    </div>
  );
}
