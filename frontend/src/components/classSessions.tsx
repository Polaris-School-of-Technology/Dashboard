import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Plus, Calendar, Filter, RefreshCw, Search, Pencil, Trash2,
  ClipboardList, X, Clock, MapPin, User, BookOpen, Layers,
  AlertCircle, ChevronDown,
} from 'lucide-react';
import './classSessions.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface Session {
  id: number;
  session_datetime: string;
  session_type: string;
  duration: number;
  actual_faculty_id: string | null;
  faculty_name: string;
  course_name: string | null;
  section_id: number | null;
  venue?: string;
  batch_info?: { batch_id: number; batch_name: string } | null;
}
interface Faculty { id: string; name: string }
interface Section { id: number; course_name: string }
interface Batch   { id: number; batch_name: string }

const SESSION_TYPES = ['theory', 'practical', 'tutorial', 'evaluation', 'other'];

const ClassSessions: React.FC = () => {
  const navigate = useNavigate();

  const [date, setDate]       = useState('');
  const [batchId, setBatchId] = useState('1');
  const [query, setQuery]     = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  const [faculties, setFaculties] = useState<Faculty[]>([]);
  const [sections, setSections]   = useState<Section[]>([]);
  const [batches, setBatches]     = useState<Batch[]>([]);

  // Edit drawer
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [facultyId, setFacultyId]     = useState('');
  const [sectionId, setSectionId]     = useState<number | ''>('');
  const [dateVal, setDateVal]         = useState('');
  const [timeVal, setTimeVal]         = useState('');
  const [durationVal, setDurationVal] = useState(60);
  const [typeVal, setTypeVal]         = useState('theory');
  const [venueVal, setVenueVal]       = useState('');

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/schedule/classSessions/getFaculty`)
      .then(r => setFaculties(r.data)).catch(console.error);
    axios.get(`${API_BASE_URL}/api/schedule/classCourses`)
      .then(r => setSections(r.data)).catch(console.error);
    axios.get(`${API_BASE_URL}/api/attendance/batches`)
      .then(r => setBatches(r.data)).catch(console.error);
  }, []);

  const fetchSessions = async () => {
    if (!date) { setError('Pick a date to fetch sessions'); return; }
    try {
      setLoading(true); setError('');
      const res = await axios.get<Session[]>(
        `${API_BASE_URL}/api/schedule/classSessions/getSessions/${date}?batch_id=${batchId}`,
      );
      setSessions(res.data);
    } catch { setError('Failed to load sessions'); }
    finally { setLoading(false); }
  };

  const handleUpdate = async () => {
    if (!editSession) return;
    try {
      const istDateTime = `${dateVal}T${timeVal}:00+05:30`;
      await axios.patch(`${API_BASE_URL}/api/schedule/classSessions/${editSession.id}`, {
        actual_faculty_id: facultyId,
        section_id: sectionId,
        session_datetime: istDateTime,
        duration: durationVal,
        session_type: typeVal,
        venue: venueVal,
      });
      setEditSession(null);
      fetchSessions();
    } catch { alert('Failed to update session'); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this session? This cannot be undone.')) return;
    try {
      await axios.delete(`${API_BASE_URL}/api/schedule/classSessionsdelete/${id}`);
      fetchSessions();
    } catch { alert('Failed to delete session'); }
  };

  const openEditModal = (s: Session) => {
    setEditSession(s);
    setFacultyId(s.actual_faculty_id || '');
    setSectionId(s.section_id || '');
    const dt = new Date(s.session_datetime);
    setDateVal(dt.toISOString().slice(0, 10));
    setTimeVal(dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }));
    setDurationVal(s.duration);
    setTypeVal(s.session_type.toLowerCase());
    setVenueVal(s.venue || '');
  };

  // Derived
  const filtered = useMemo(() => {
    return sessions.filter(s => {
      if (typeFilter !== 'all' && s.session_type.toLowerCase() !== typeFilter) return false;
      if (!query) return true;
      const q = query.toLowerCase();
      return [s.faculty_name, s.course_name, s.batch_info?.batch_name, s.venue]
        .filter(Boolean).some(v => String(v).toLowerCase().includes(q));
    });
  }, [sessions, typeFilter, query]);

  const stats = useMemo(() => {
    const total = sessions.length;
    const byType = SESSION_TYPES.reduce<Record<string, number>>((acc, t) => {
      acc[t] = sessions.filter(s => s.session_type.toLowerCase() === t).length;
      return acc;
    }, {});
    const totalMin = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    return { total, byType, totalMin };
  }, [sessions]);

  const batchName = batches.find(b => String(b.id) === batchId)?.batch_name || '—';

  return (
    <div className="cs">
      {/* ───── Header ───── */}
      <header className="cs__header">
        <div className="cs__breadcrumb">
          <span>Admin</span><span className="sep">/</span>
          <span>Schedule</span><span className="sep">/</span>
          <span>Class Sessions</span>
        </div>
        <div className="cs__headerRow">
          <div>
            <h1 className="cs__title">
              <span className="dashboard-heading-white">Class</span>{" "}
              <span className="dashboard-heading-gradient">Sessions</span>
            </h1>
            <p className="cs__subtitle">
              {sessions.length} session{sessions.length !== 1 ? 's' : ''} · Batch {batchName}
              {date && <> · {new Date(date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</>}
            </p>
          </div>
          <div className="cs__headerActions">
            <button className="cs__btn cs__btn--ghost" onClick={fetchSessions} disabled={loading}>
              <RefreshCw size={16} className={loading ? 'cs__spin' : ''} /> Refresh
            </button>
            <button className="cs__btn cs__btn--primary" onClick={() => navigate('/sessions/add')}>
              <Plus size={16} /> Add Session
            </button>
          </div>
        </div>
      </header>

      {/* ───── KPI strip ───── */}
      <section className="cs__kpis">
        <Kpi label="Total Sessions" value={stats.total} hint={date ? 'On selected date' : 'Pick a date'} />
        <Kpi label="Total Duration" value={`${Math.floor(stats.totalMin / 60)}h ${stats.totalMin % 60}m`} hint="Scheduled time" />
        <Kpi label="Theory" value={stats.byType.theory ?? 0} hint="Lectures" />
        <Kpi label="Practical" value={stats.byType.practical ?? 0} hint="Lab work" />
      </section>

      {/* ───── Toolbar ───── */}
      <section className="cs__toolbar">
        <div className="cs__toolbarLeft">
          <div className="cs__search">
            <Search size={16} />
            <input
              placeholder="Search faculty, course, venue…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <Pill icon={<Layers size={14} />} label="Batch">
            <select value={batchId} onChange={(e) => setBatchId(e.target.value)}>
              {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
            </select>
          </Pill>

          <Pill icon={<Filter size={14} />} label="Type">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
              <option value="all">All</option>
              {SESSION_TYPES.map(t => (
                <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
              ))}
            </select>
          </Pill>
        </div>

        <div className="cs__toolbarRight">
          <div className="cs__dateField">
          
            <input className="datepicker-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <button
            className="cs__btn cs__btn--primary"
            onClick={fetchSessions}
            disabled={loading || !date}
          >
            {loading ? <RefreshCw size={16} className="cs__spin" /> : <Search size={16} />}
            Fetch Sessions
          </button>
        </div>
      </section>

      {error && (
        <div className="cs__alert" role="alert">
          <AlertCircle size={16} /><span>{error}</span>
        </div>
      )}

      {/* ───── Table ───── */}
      <section className="cs__tableWrap">
        <div className="cs__tableHead">
          <h2>All Sessions</h2>
          <span className="cs__meta">
            Showing {filtered.length} of {sessions.length}
          </span>
        </div>

        <div className="cs__tableScroll">
          <table className="cs__table">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>Type</th>
                <th>Duration</th>
                <th>Faculty</th>
                <th>Course</th>
                <th>Section</th>
                <th>Batch</th>
                <th className="cs__th-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => {
                const dt = new Date(s.session_datetime);
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="cs__cellPrimary">
                        {dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                      </div>
                      <div className="cs__cellSecondary">
                        {dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td><TypeBadge type={s.session_type} /></td>
                    <td className="cs__mono">{s.duration} min</td>
                    <td>
                      <div className="cs__person">
                        <span className="cs__avatar">{initials(s.faculty_name)}</span>
                        <span>{s.faculty_name}</span>
                      </div>
                    </td>
                    <td>{s.course_name || <span className="cs__empty">—</span>}</td>
                    <td className="cs__mono">{s.section_id ?? <span className="cs__empty">—</span>}</td>
                    <td>{s.batch_info?.batch_name || <span className="cs__empty">—</span>}</td>
                    <td>
                      <div className="cs__rowActions">
                        <IconBtn label="Edit" onClick={() => openEditModal(s)}><Pencil size={14} /></IconBtn>
                        <IconBtn label="Quiz" onClick={() => navigate(`/quiz/${s.id}`)}><ClipboardList size={14} /></IconBtn>
                        <IconBtn label="Delete" tone="danger" onClick={() => handleDelete(s.id)}><Trash2 size={14} /></IconBtn>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={8}>
                    <div className="cs__emptyState">
                      <div className="cs__emptyIcon"><Calendar size={20} /></div>
                      <h3>{sessions.length === 0 ? 'No sessions loaded' : 'Nothing matches your filters'}</h3>
                      <p>
                        {sessions.length === 0
                          ? 'Pick a batch and date, then click Fetch Sessions.'
                          : 'Try clearing the search or the type filter.'}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ───── Edit drawer ───── */}
      {editSession && (
        <div className="cs__drawer" onClick={() => setEditSession(null)}>
          <aside className="cs__drawerPanel" onClick={(e) => e.stopPropagation()}>
            <header className="cs__drawerHead">
              <div>
                <span className="cs__eyebrow">Edit Session</span>
                <h2>Session #{editSession.id}</h2>
              </div>
              <button className="cs__iconClose" onClick={() => setEditSession(null)} aria-label="Close">
                <X size={18} />
              </button>
            </header>

            <div className="cs__drawerBody">
              <FormRow label="Faculty" icon={<User size={14} />}>
                <SelectShell>
                  <select value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
                    <option value="">Select faculty</option>
                    {faculties.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </SelectShell>
              </FormRow>

              <FormRow label="Course / Section" icon={<BookOpen size={14} />}>
                <SelectShell>
                  <select
                    value={sectionId}
                    onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : '')}
                  >
                    <option value="">Select course</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.course_name}</option>)}
                  </select>
                </SelectShell>
              </FormRow>

              <div className="cs__grid2">
                <FormRow label="Date" icon={<Calendar size={14} />}>
                  <input className="datepicker-input cs__input" type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} />
                </FormRow>
                <FormRow label="Time" icon={<Clock size={14} />}>
                  <input className="cs__input" type="time" value={timeVal} onChange={(e) => setTimeVal(e.target.value)} />
                </FormRow>
              </div>

              <div className="cs__grid2">
                <FormRow label="Duration (min)">
                  <input
                    className="cs__input cs__mono"
                    type="number"
                    value={durationVal}
                    onChange={(e) => setDurationVal(Number(e.target.value))}
                  />
                </FormRow>
                <FormRow label="Type">
                  <SelectShell>
                    <select value={typeVal} onChange={(e) => setTypeVal(e.target.value)}>
                      {SESSION_TYPES.map(t => (
                        <option key={t} value={t}>{t[0].toUpperCase() + t.slice(1)}</option>
                      ))}
                    </select>
                  </SelectShell>
                </FormRow>
              </div>

              <FormRow label="Venue" icon={<MapPin size={14} />}>
                <input
                  className="cs__input"
                  placeholder="e.g., Lab 204, Block C"
                  value={venueVal}
                  onChange={(e) => setVenueVal(e.target.value)}
                />
              </FormRow>
            </div>

            <footer className="cs__drawerFoot">
              <button className="cs__btn cs__btn--ghost" onClick={() => setEditSession(null)}>Cancel</button>
              <button className="cs__btn cs__btn--primary" onClick={handleUpdate}>Save changes</button>
            </footer>
          </aside>
        </div>
      )}
    </div>
  );
};

export default ClassSessions;

/* ───────── Subcomponents ───────── */

function Kpi({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="cs__kpi">
      <span className="cs__kpiLabel">{label}</span>
      <span className="cs__kpiValue">{value}</span>
      {hint && <span className="cs__kpiHint">{hint}</span>}
    </div>
  );
}

function Pill({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="cs__pill">
      <span className="cs__pillIcon">{icon}</span>
      <span className="cs__pillLabel">{label}</span>
      <span className="cs__pillSelect">
        {children}
        <ChevronDown size={14} />
      </span>
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const key = type.toLowerCase();
  return <span className={`cs__badge cs__badge--${key}`}>{key}</span>;
}

function IconBtn({
  children, onClick, label, tone = 'default',
}: {
  children: React.ReactNode; onClick: () => void; label: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <button className={`cs__iconBtn cs__iconBtn--${tone}`} onClick={onClick} aria-label={label} title={label}>
      {children}
    </button>
  );
}

function FormRow({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <label className="cs__row">
      <span className="cs__rowLabel">{icon}{label}</span>
      {children}
    </label>
  );
}

function SelectShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="cs__selectShell">
      {children}
      <ChevronDown size={16} />
    </div>
  );
}

function initials(name?: string) {
  if (!name) return '?';
  return name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase();
}
