import React, { useState } from 'react';
import { Calendar, Clock, Check, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';

const TIME_SLOT_PRESETS = [
  '10:00 AM - 12:00 PM',
  '12:00 PM - 02:00 PM',
  '02:00 PM - 04:00 PM',
  '04:00 PM - 06:00 PM',
  '06:00 PM - 08:00 PM'
];

export default function AcceptAndScheduleModal({ isOpen, onClose, order, onConfirm, submitting }) {
  const [dateOption, setDateOption] = useState('Tomorrow');
  const [customDate, setCustomDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('10:00 AM - 12:00 PM');
  const [isCustomSlot, setIsCustomSlot] = useState(false);
  const [customStartTime, setCustomStartTime] = useState('');
  const [customEndTime, setCustomEndTime] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const resolvedDate = dateOption === 'Custom' ? (customDate.trim() || 'Tomorrow') : dateOption;
  const resolvedTimeSlot = isCustomSlot 
    ? `${customStartTime.trim()} - ${customEndTime.trim()}`
    : selectedSlot;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (dateOption === 'Custom' && !customDate.trim()) {
      setError('Please provide a date.');
      return;
    }

    if (isCustomSlot && (!customStartTime.trim() || !customEndTime.trim())) {
      setError('Please enter both start and end times for custom slot.');
      return;
    }

    if (!resolvedTimeSlot || resolvedTimeSlot === ' - ') {
      setError('Please select or specify a time window.');
      return;
    }

    onConfirm({
      date: resolvedDate,
      timeSlot: resolvedTimeSlot
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1050,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '480px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        animation: 'fadeIn 0.15s ease-out'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          backgroundColor: '#f8fafc'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={22} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
                Set Initial Customer Call / Review Window
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                {order?.serviceName ? `Order: ${order.serviceName}` : 'Schedule customer review window upon accepting'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              padding: '4px',
              borderRadius: '6px'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          {error && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '10px 14px',
              borderRadius: '8px',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px'
            }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Date Picker */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              1. Review Date
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {['Today', 'Tomorrow', 'Custom'].map(d => (
                <button
                  type="button"
                  key={d}
                  onClick={() => setDateOption(d)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: dateOption === d ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    backgroundColor: dateOption === d ? '#eff6ff' : '#ffffff',
                    color: dateOption === d ? '#1d4ed8' : '#475569',
                    fontWeight: dateOption === d ? 700 : 500,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {d}
                </button>
              ))}
            </div>

            {dateOption === 'Custom' && (
              <div style={{ marginTop: '10px' }}>
                <input
                  type="text"
                  value={customDate}
                  onChange={e => setCustomDate(e.target.value)}
                  placeholder="e.g. 2026-10-08 or Day After Tomorrow"
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    fontSize: '0.85rem'
                  }}
                />
              </div>
            )}
          </div>

          {/* Time Slot Window */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              2. Processing / Call Time Window
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {TIME_SLOT_PRESETS.map(slot => (
                <button
                  type="button"
                  key={slot}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setIsCustomSlot(false);
                  }}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: (!isCustomSlot && selectedSlot === slot) ? '2px solid #2563eb' : '1px solid #e2e8f0',
                    backgroundColor: (!isCustomSlot && selectedSlot === slot) ? '#eff6ff' : '#ffffff',
                    color: (!isCustomSlot && selectedSlot === slot) ? '#1d4ed8' : '#334155',
                    fontWeight: (!isCustomSlot && selectedSlot === slot) ? 700 : 500,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Clock size={15} color={(!isCustomSlot && selectedSlot === slot) ? '#2563eb' : '#94a3b8'} />
                    <span>{slot}</span>
                  </span>
                  {!isCustomSlot && selectedSlot === slot && <Check size={16} color="#2563eb" />}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setIsCustomSlot(!isCustomSlot)}
                style={{
                  padding: '8px 12px',
                  background: 'none',
                  border: 'none',
                  color: isCustomSlot ? '#2563eb' : '#64748b',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                  marginTop: '4px'
                }}
              >
                {isCustomSlot ? '✓ Custom Window Selected' : '+ Enter Custom Time Window'}
              </button>

              {isCustomSlot && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  <input
                    type="text"
                    value={customStartTime}
                    onChange={e => setCustomStartTime(e.target.value)}
                    placeholder="Start (e.g. 11:00 AM)"
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.82rem'
                    }}
                  />
                  <input
                    type="text"
                    value={customEndTime}
                    onChange={e => setCustomEndTime(e.target.value)}
                    placeholder="End (e.g. 01:00 PM)"
                    style={{
                      padding: '8px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: '8px',
                      fontSize: '0.82rem'
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notice */}
          <div style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 14px',
            fontSize: '0.78rem',
            color: '#64748b',
            lineHeight: 1.45,
            marginBottom: '20px'
          }}>
            ⚡ <strong>Live Notification:</strong> Accepting will lock this order to your active workspace and immediately notify the customer that their review window is <strong>{resolvedDate} at {resolvedTimeSlot}</strong>.
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn btn-outline"
              style={{ padding: '10px 18px', fontSize: '0.85rem' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary"
              style={{
                padding: '10px 22px',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#2563eb',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Accepting & Scheduling...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Accept Order & Confirm Slot</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
