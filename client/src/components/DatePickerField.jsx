import { useState, useRef, useEffect } from 'react';
import Calendar from 'react-calendar';

/**
 * DatePickerField — wraps react-calendar in a popover triggered by a button.
 * Props:
 *   value: string  — YYYY-MM-DD
 *   onChange: (dateStr: string) => void
 *   label: string  — optional, shown above the button
 *   required: bool
 */
export default function DatePickerField({ value, onChange, required }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // Convert YYYY-MM-DD to Date for react-calendar (local noon to avoid TZ shift)
  const toDate = (str) => str ? new Date(str + 'T12:00:00') : new Date();

  // Convert Date back to YYYY-MM-DD
  const toStr = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  // Format for display
  const display = value
    ? new Date(value + 'T12:00:00').toLocaleDateString('en-US', {
        weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
      })
    : 'Select date';

  const handleSelect = (date) => {
    onChange(toStr(date));
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="date-picker-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`date-picker-btn ${open ? 'active' : ''}`}
        onClick={() => setOpen(v => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="date-picker-icon">📅</span>
        <span className="date-picker-value">{display}</span>
        <span className="date-picker-chevron">{open ? '▲' : '▼'}</span>
      </button>
      {/* Hidden input keeps native form validation working */}
      {required && <input type="text" value={value || ''} onChange={() => {}} required tabIndex={-1} style={{ position: 'absolute', opacity: 0, height: 0, width: 0 }} />}
      {open && (
        <div className="date-picker-popup" role="dialog" aria-label="Date picker">
          <Calendar
            value={toDate(value)}
            onChange={handleSelect}
            calendarType="gregory"
            maxDate={new Date(new Date().getFullYear() + 1, 11, 31)}
          />
        </div>
      )}
    </div>
  );
}
