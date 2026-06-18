import React, { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown, Search, AlertCircle, Loader2, Award,
  BookOpen, FileText, User, TrendingUp, Target, Sparkles,
} from 'lucide-react';
import './MarksViewer.css';

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface Semester  { id: string; semester_name: string }
interface Subject   { id: string; subject_name: string }
interface Component { id: string; name: string }
interface MarksResult {
  SubjectId: string; ComponentId: string;
  SubjectName: string; ComponentName: string;
  MarksObtained: number; TotalMarks: number;
  StudentName: string; RollNumber: string;
}

export default function MarksViewer() {
  const [semesters, setSemesters]   = useState<Semester[]>([]);
  const [subjects, setSubjects]     = useState<Subject[]>([]);
  const [components, setComponents] = useState<Component[]>([]);
  const [result, setResult]         = useState<MarksResult | null>(null);

  const [semId, setSemId]   = useState('');
  const [subId, setSubId]   = useState('');
  const [compId, setCompId] = useState('');
  const [roll, setRoll]     = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  // --- data fetching (unchanged logic) ---
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/eval/semesters`);
        if (!r.ok) throw new Error();
        setSemesters(await r.json());
      } catch { setError('Failed to load semesters'); }
    })();
  }, []);

  useEffect(() => {
    if (!semId) { setSubjects([]); setSubId(''); setComponents([]); setCompId(''); return; }
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/eval/subjects/${semId}`);
        if (!r.ok) throw new Error();
        setSubjects(await r.json()); setSubId(''); setComponents([]); setCompId('');
      } catch { setError('Failed to load subjects'); }
    })();
  }, [semId]);

  useEffect(() => {
    if (!subId) { setComponents([]); setCompId(''); return; }
    (async () => {
      try {
        const r = await fetch(`${API_BASE_URL}/api/eval/components/${subId}`);
        if (!r.ok) throw new Error();
        setComponents(await r.json()); setCompId('');
      } catch { setError('Failed to load components'); }
    })();
  }, [subId]);

  const canSubmit = semId && subId && compId && roll.trim() && !loading;

  const handleSearch = async () => {
    setError(''); setResult(null);
    if (!canSubmit) { setError('Please fill in all fields'); return; }
    try {
      setLoading(true);
      const params = new URLSearchParams({
        semesterId: semId, subjectId: subId, componentId: compId, rollNumber: roll.trim(),
      });
      const r = await fetch(`${API_BASE_URL}/api/eval/marks?${params}`);
      if (!r.ok) throw new Error((await r.json()).error || 'Failed to fetch marks');
      setResult(await r.json());
    } catch (e: any) { setError(e.message || 'Failed to fetch marks'); }
    finally { setLoading(false); }
  };

  const percent = useMemo(
    () => result ? +(result.MarksObtained / result.TotalMarks * 100).toFixed(1) : 0,
    [result],
  );
  const grade = useMemo(() => getGrade(percent), [percent]);

  return (
    <div className="mv">
      {/* ───── Top bar ───── */}
      <header className="mv__topbar">
        <div className="mv__brand">
          <span className="mv__logo"><Award size={18} /></span>
          <div className="mv__brandText">
            <span className="mv__brandTitle">Marks Viewer</span>
            <span className="mv__brandSub">Academic performance tracker</span>
          </div>
        </div>
        <div className="mv__topMeta">
          <Sparkles size={14} /> Live results
        </div>
      </header>

      {/* ───── Workspace ───── */}
      <main className="mv__grid">
        {/* Search panel */}
        <section className="mv__panel mv__panel--search" aria-label="Search marks">
          <div className="mv__panelHead">
            <h2>Search</h2>
            <p>Select the term, subject, and component.</p>
          </div>

          {error && (
            <div className="mv__alert" role="alert">
              <AlertCircle size={16} /><span>{error}</span>
            </div>
          )}

          <div className="mv__form">
            <Field label="Semester" step="1">
              <Select value={semId} onChange={setSemId}
                placeholder="Select semester"
                options={semesters.map(s => ({ value: s.id, label: s.semester_name }))} />
            </Field>

            <Field label="Subject" step="2">
              <Select value={subId} onChange={setSubId}
                disabled={!semId}
                placeholder={semId ? 'Select subject' : 'Pick a semester first'}
                options={subjects.map(s => ({ value: s.id, label: s.subject_name }))} />
            </Field>

            <Field label="Component" step="3">
              <Select value={compId} onChange={setCompId}
                disabled={!subId}
                placeholder={subId ? 'Select component' : 'Pick a subject first'}
                options={components.map(c => ({ value: c.id, label: c.name }))} />
            </Field>

            <Field label="Roll number" step="4">
              <input
                className="mv__input"
                inputMode="numeric"
                placeholder="e.g., 240410700041"
                value={roll}
                onChange={(e) => setRoll(e.target.value)}
              />
            </Field>

            <button className="mv__cta" onClick={handleSearch} disabled={!canSubmit}>
              {loading
                ? <><Loader2 size={16} className="mv__spin" /> Searching…</>
                : <><Search size={16} /> Search marks</>}
            </button>
          </div>
        </section>

        {/* Results panel */}
        <section className="mv__panel mv__panel--results" aria-live="polite">
          {!result ? (
            <EmptyState />
          ) : (
            <>
              <div className="mv__resultHead">
                <div className="mv__student">
                  <span className="mv__avatar"><User size={18} /></span>
                  <div>
                    <h3>{result.StudentName}</h3>
                    <span className="mv__rollChip">Roll · {result.RollNumber}</span>
                  </div>
                </div>
                <span className={`mv__grade mv__grade--${grade.key}`}>
                  {grade.letter}
                </span>
              </div>

              {/* Score hero */}
              <div className="mv__score">
                <div className="mv__scoreFigures">
                  <span className="mv__scoreObtained">{result.MarksObtained}</span>
                  <span className="mv__scoreSlash">/</span>
                  <span className="mv__scoreTotal">{result.TotalMarks}</span>
                </div>
                <div className="mv__scoreMeta">
                  <span className="mv__percent">{percent}%</span>
                  <span className="mv__scoreLabel">{grade.label}</span>
                </div>
                <div className="mv__bar" role="progressbar"
                  aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}>
                  <span style={{ width: `${Math.min(percent, 100)}%` }} />
                </div>
              </div>

              {/* Breakdown */}
              <dl className="mv__facts">
                <Fact icon={<BookOpen size={14} />} label="Subject"   value={result.SubjectName} />
                <Fact icon={<FileText size={14} />} label="Component" value={result.ComponentName} />
                <Fact icon={<Target size={14} />}   label="Obtained"  value={`${result.MarksObtained} / ${result.TotalMarks}`} />
                <Fact icon={<TrendingUp size={14} />} label="Percentage" value={`${percent}%`} />
              </dl>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

/* ───────── Subcomponents ───────── */

function Field({ label, step, children }: { label: string; step: string; children: React.ReactNode }) {
  return (
    <label className="mv__field">
      <span className="mv__fieldLabel">
        <span className="mv__step">{step}</span>{label}
      </span>
      {children}
    </label>
  );
}

function Select({
  value, onChange, options, placeholder, disabled,
}: {
  value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string; disabled?: boolean;
}) {
  return (
    <div className={`mv__select ${disabled ? 'is-disabled' : ''}`}>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown size={16} />
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="mv__fact">
      <dt>{icon}{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="mv__empty">
      <div className="mv__emptyIcon"><Search size={20} /></div>
      <h3>Nothing to show yet</h3>
      <p>Complete the four fields on the left and your results will appear here.</p>
      <ol className="mv__emptySteps">
        <li><span>1</span> Choose a semester</li>
        <li><span>2</span> Pick a subject &amp; component</li>
        <li><span>3</span> Enter your roll number</li>
      </ol>
    </div>
  );
}

/* ───────── Helpers ───────── */
function getGrade(p: number) {
  if (p >= 90) return { letter: 'A+', key: 'aplus', label: 'Outstanding' };
  if (p >= 80) return { letter: 'A',  key: 'a',     label: 'Excellent' };
  if (p >= 70) return { letter: 'B+', key: 'bplus', label: 'Very good' };
  if (p >= 60) return { letter: 'B',  key: 'b',     label: 'Good' };
  if (p >= 50) return { letter: 'C',  key: 'c',     label: 'Satisfactory' };
  if (p >= 40) return { letter: 'D',  key: 'd',     label: 'Needs work' };
  return            { letter: 'F',  key: 'f',     label: 'Failed' };
}
