import React, { useState, useEffect } from 'react';
import { 
  Calendar, Clock, Sun, Moon, Zap, 
  CheckCircle2, Sparkles, ChevronRight, AlertCircle 
} from 'lucide-react';

const TIME_SLOT_GROUPS = [
  {
    id: 'morning',
    title: 'Morning',
    timeRange: '09:00 AM - 12:00 PM',
    icon: Sun,
    badge: 'Morning Slot',
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    slots: [
      { id: 'm1', label: '09:00 AM - 10:30 AM', value: '09:00 AM - 10:30 AM' },
      { id: 'm2', label: '10:30 AM - 12:00 PM', value: '10:30 AM - 12:00 PM' },
      { id: 'm3', label: '09:00 AM - 12:00 PM', value: '09:00 AM - 12:00 PM' }
    ]
  },
  {
    id: 'afternoon',
    title: 'Afternoon',
    timeRange: '12:00 PM - 04:00 PM',
    icon: Zap,
    badge: 'Most Popular',
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    slots: [
      { id: 'a1', label: '12:00 PM - 02:00 PM', value: '12:00 PM - 02:00 PM' },
      { id: 'a2', label: '02:00 PM - 04:00 PM', value: '02:00 PM - 04:00 PM' },
      { id: 'a3', label: '12:00 PM - 04:00 PM', value: '12:00 PM - 04:00 PM' }
    ]
  },
  {
    id: 'evening',
    title: 'Evening / Urgent',
    timeRange: '04:00 PM - 08:00 PM',
    icon: Moon,
    badge: 'Express Window',
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    slots: [
      { id: 'e1', label: '04:00 PM - 06:00 PM', value: '04:00 PM - 06:00 PM' },
      { id: 'e2', label: '06:00 PM - 08:00 PM', value: '06:00 PM - 08:00 PM' },
      { id: 'e3', label: '04:00 PM - 08:00 PM', value: '04:00 PM - 08:00 PM' }
    ]
  }
];

export default function TimeSlotPicker({
  selectedDate = 'Today',
  onSelectDate,
  selectedSlot = '10:00 AM - 12:00 PM',
  onSelectSlot,
  className = ''
}) {
  const [dateMode, setDateMode] = useState('today'); // 'today' | 'tomorrow' | 'custom'
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
      setDateMode('today');
    } else if (selectedDate === 'Tomorrow') {
      setDateMode('tomorrow');
    } else {
      setDateMode('custom');
      setCustomDateValue(selectedDate);
    }
  }, [selectedDate]);

  const handleDateModeSelect = (mode) => {
    setDateMode(mode);
    if (mode === 'today') {
      onSelectDate && onSelectDate('Today');
    } else if (mode === 'tomorrow') {
      onSelectDate && onSelectDate('Tomorrow');
    } else if (mode === 'custom') {
      const nextDate = customDateValue || minDateStr;
      onSelectDate && onSelectDate(nextDate);
    }
  };

  const handleCustomDateChange = (e) => {
    const val = e.target.value;
    setCustomDateValue(val);
    setDateMode('custom');
    onSelectDate && onSelectDate(val);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header Info */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select Preferred Time Slot</span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Your cafe operator works on your form during this mutual window.
          </p>
        </div>
      </div>

      {/* 1. Date Picker / Chip Carousel */}
      <div className="space-y-2">
        <label className="text-[11px] font-semibold text-slate-300 flex items-center gap-1">
          <Calendar className="w-3 h-3 text-indigo-400" />
          <span>Fulfillment Date</span>
        </label>

        <div className="grid grid-cols-3 gap-2">
          {/* Today Chip */}
          <button
            type="button"
            onClick={() => handleDateModeSelect('today')}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-center transition-all duration-200 active:scale-95 ${
              dateMode === 'today'
                ? 'bg-gradient-to-br from-indigo-600 to-cyan-600 text-white border-cyan-400/80 shadow-lg shadow-cyan-500/20 font-bold'
                : 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 border-slate-700/70 font-medium'
            }`}
          >
            <span className="text-xs font-bold">Today</span>
            <span className={`text-[10px] mt-0.5 ${dateMode === 'today' ? 'text-cyan-100' : 'text-slate-400'}`}>
              {todayDisplay}
            </span>
          </button>

          {/* Tomorrow Chip */}
          <button
            type="button"
            onClick={() => handleDateModeSelect('tomorrow')}
            className={`flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-center transition-all duration-200 active:scale-95 ${
              dateMode === 'tomorrow'
                ? 'bg-gradient-to-br from-indigo-600 to-cyan-600 text-white border-cyan-400/80 shadow-lg shadow-cyan-500/20 font-bold'
                : 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 border-slate-700/70 font-medium'
            }`}
          >
            <span className="text-xs font-bold">Tomorrow</span>
            <span className={`text-[10px] mt-0.5 ${dateMode === 'tomorrow' ? 'text-cyan-100' : 'text-slate-400'}`}>
              {tomorrowDisplay}
            </span>
          </button>

          {/* Pick Date Chip */}
          <div className="relative">
            <button
              type="button"
              onClick={() => handleDateModeSelect('custom')}
              className={`w-full h-full flex flex-col items-center justify-center py-2.5 px-2 rounded-xl border text-center transition-all duration-200 active:scale-95 ${
                dateMode === 'custom'
                  ? 'bg-gradient-to-br from-indigo-600 to-cyan-600 text-white border-cyan-400/80 shadow-lg shadow-cyan-500/20 font-bold'
                  : 'bg-slate-800/90 hover:bg-slate-800 text-slate-300 border-slate-700/70 font-medium'
              }`}
            >
              <span className="text-xs font-bold">Pick Date</span>
              <span className={`text-[10px] mt-0.5 truncate max-w-[80px] ${dateMode === 'custom' ? 'text-cyan-100' : 'text-slate-400'}`}>
                {customDateValue || 'Calendar'}
              </span>
            </button>
            <input
              type="date"
              min={minDateStr}
              value={customDateValue}
              onChange={handleCustomDateChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
          </div>
        </div>
      </div>

      {/* 2. Available Time Slots Grid */}
      <div className="space-y-3 pt-1">
        {TIME_SLOT_GROUPS.map((group) => {
          const GroupIcon = group.icon;

          return (
            <div
              key={group.id}
              className="bg-slate-850/80 rounded-2xl p-3.5 border border-slate-700/60 transition-colors"
            >
              {/* Group Header */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300">
                    <GroupIcon className="w-3.5 h-3.5 text-cyan-400" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-200 block leading-tight">
                      {group.title}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {group.timeRange}
                    </span>
                  </div>
                </div>

                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${group.badgeColor}`}>
                  {group.badge}
                </span>
              </div>

              {/* Slot Option Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {group.slots.map((slot) => {
                  const isSelected = selectedSlot === slot.value;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => onSelectSlot && onSelectSlot(slot.value)}
                      className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl border text-xs transition-all duration-200 active:scale-98 ${
                        isSelected
                          ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200 ring-2 ring-cyan-500/30 font-bold shadow-md shadow-cyan-500/10'
                          : 'border-slate-700/60 bg-slate-900/60 text-slate-300 hover:border-slate-600 hover:bg-slate-900/90 font-medium'
                      }`}
                    >
                      <span className="text-[11px] truncate">{slot.label}</span>
                      {isSelected ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1.5" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0 ml-1.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Slot Confirmation Card */}
      {selectedSlot && (
        <div className="p-3 bg-gradient-to-r from-indigo-950/40 to-cyan-950/40 border border-cyan-500/30 rounded-xl flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block">Selected Slot</span>
              <span className="font-bold text-cyan-300 text-xs">
                📅 {selectedDate || 'Today'}, {selectedSlot}
              </span>
            </div>
          </div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
            Available
          </span>
        </div>
      )}
    </div>
  );
}
