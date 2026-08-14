import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import api from '../services/api';

export default function ScheduleInterview() {
  const [schedules, setSchedules] = useState([]);
  const [scheduledAt, setScheduledAt] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);

  const loadSchedules = () => {
    api.get('/schedule')
      .then(({ data }) => setSchedules(data.schedules))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSchedules();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!scheduledAt) return;
    try {
      await api.post('/schedule', { scheduledAt: scheduledAt.toISOString(), notes });
      setScheduledAt(null);
      setNotes('');
      loadSchedules();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/schedule/${id}`);
      loadSchedules();
    } catch (err) {
      console.error(err);
    }
  };

  const now = new Date();
  const upcoming = schedules.filter((s) => new Date(s.scheduled_at) >= now);
  const past = schedules.filter((s) => new Date(s.scheduled_at) < now);

  return (
    <div className="page-container">
      <h2>Schedule Practice Interviews</h2>
      <p style={{ color: '#888', marginBottom: 20 }}>
        Set reminders for future mock interview sessions to build a consistent practice habit.
      </p>

      <form onSubmit={handleCreate} style={{ marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 420 }}>
        <label>
          Date &amp; time
          <div style={{ marginTop: 4 }}>
            <DatePicker
              selected={scheduledAt}
              onChange={(date) => setScheduledAt(date)}
              showTimeSelect
              timeIntervals={15}
              dateFormat="MMMM d, yyyy h:mm aa"
              minDate={new Date()}
              placeholderText="Click to pick a date & time"
              className="datepicker-input"
              required
            />
          </div>
        </label>
        <label>
          Notes (optional)
          <input
            type="text"
            placeholder="e.g. Focus on System Design"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ display: 'block', width: '100%', marginTop: 4, padding: 8, borderRadius: 6, background: '#0f1115', border: '1px solid #2c313d', color: '#e6e6e6' }}
          />
        </label>
        <button type="submit">+ Add Reminder</button>
      </form>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <h3>Upcoming</h3>
          {upcoming.length === 0 ? (
            <p>No upcoming sessions scheduled.</p>
          ) : (
            upcoming.map((s) => (
              <div key={s.id} className="answer-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{new Date(s.scheduled_at).toLocaleString()}</strong>
                  {s.notes && <p style={{ margin: '4px 0 0', color: '#888' }}>{s.notes}</p>}
                </div>
                <button onClick={() => handleDelete(s.id)} style={{ background: '#a33' }}>Remove</button>
              </div>
            ))
          )}

          {past.length > 0 && (
            <>
              <h3 style={{ marginTop: 24 }}>Past</h3>
              {past.map((s) => (
                <div key={s.id} className="answer-card" style={{ opacity: 0.6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong>{new Date(s.scheduled_at).toLocaleString()}</strong>
                    {s.notes && <p style={{ margin: '4px 0 0', color: '#888' }}>{s.notes}</p>}
                  </div>
                  <button onClick={() => handleDelete(s.id)} style={{ background: '#333' }}>Clear</button>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}