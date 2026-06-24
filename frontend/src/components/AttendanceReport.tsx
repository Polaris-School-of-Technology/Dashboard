import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./AttendanceReport.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface Student {
  id: number;
  student_name: string;
  registration_id: string | null;
  email?: string | null;
  present: boolean;
}
interface AttendanceGroup {
  session_id: number;
  datetime: string;
  course_name: string;
  faculty_name: string;
  students: Student[];
  open?: boolean;
  searchQuery?: string;
}
interface Batch { id: number; batch_name: string; }

/* ---------- search utils (unchanged logic) ---------- */
const searchUtils = {
  normalize: (t: string) => t.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s@.-]/g, " ").replace(/\s+/g, " ").trim(),
  getInitials: (n: string) => n.split(/\s+/).map(p => p.charAt(0)).join("").toLowerCase(),
  getNameVariations: (name: string) => {
    const normalized = searchUtils.normalize(name);
    const parts = normalized.split(/\s+/).filter(Boolean);
    const v = [normalized];
    parts.forEach(p => p.length > 1 && v.push(p));
    v.push(searchUtils.getInitials(name));
    if (parts.length >= 2) {
      v.push(`${parts[0]} ${parts[parts.length - 1]}`);
      v.push(`${parts[parts.length - 1]} ${parts[0]}`);
    }
    return Array.from(new Set(v));
  },
  levenshteinDistance: (s1: string, s2: string) => {
    const m: number[][] = [];
    if (!s1.length) return s2.length;
    if (!s2.length) return s1.length;
    for (let i = 0; i <= s2.length; i++) m[i] = [i];
    for (let j = 0; j <= s1.length; j++) m[0][j] = j;
    for (let i = 1; i <= s2.length; i++)
      for (let j = 1; j <= s1.length; j++)
        m[i][j] = s2[i - 1] === s1[j - 1] ? m[i - 1][j - 1] : Math.min(m[i - 1][j - 1] + 1, m[i][j - 1] + 1, m[i - 1][j] + 1);
    return m[s2.length][s1.length];
  },
  getSimilarityScore: (a: string, b: string) => {
    const max = Math.max(a.length, b.length);
    return max === 0 ? 1 : 1 - searchUtils.levenshteinDistance(a, b) / max;
  },
  fuzzyMatch: (q: string, vars: string[], th = 0.85) => {
    const nq = searchUtils.normalize(q);
    return vars.some(v => v.includes(nq) || nq.includes(v) || (nq.length <= 4 && v.length > 2 && searchUtils.getSimilarityScore(nq, v) >= th));
  },
};

/* ---------- tiny UI atoms ---------- */
const Kpi: React.FC<{ label: string; value: React.ReactNode; sub?: string; accent?: boolean }> = ({ label, value, sub, accent }) => (
  <div className={`ar__kpi ${accent ? "ar__kpi--accent" : ""}`}>
    <div className="ar__kpi-label">{label}</div>
    <div className="ar__kpi-value">{value}</div>
    {sub && <div className="ar__kpi-sub">{sub}</div>}
  </div>
);

const Field: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <label className="ar__field">
    <span className="ar__field-label">{label}{hint && <em>{hint}</em>}</span>
    {children}
  </label>
);

const AttendanceReport: React.FC = () => {
  const [date, setDate] = useState<Date | null>(null);
  const [data, setData] = useState<AttendanceGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent">("all");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<number | "all">("all");

  useEffect(() => {
    axios.get(`${API_BASE_URL}/api/attendance/batches`).then(r => setBatches(r.data || [])).catch(() => {});
  }, []);

  const fetchReport = async (d: Date, status: "all" | "present" | "absent", batchId?: number | "all") => {
    const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    setLoading(true); setError(null);
    try {
      let url = `${API_BASE_URL}/api/attendance/attendanceReport/${formatted}`;
      const params: string[] = [];
      if (status !== "all") params.push(`status=${status}`);
      if (batchId && batchId !== "all") params.push(`batch_id=${batchId}`);
      if (params.length) url += `?${params.join("&")}`;
      const res = await axios.get(url);
      setData(res.data.map((s: any) => ({ ...s, open: false, searchQuery: "" })));
    } catch (e: any) { setError(e.message || "Error fetching report"); }
    finally { setLoading(false); }
  };

  const filterStudents = useMemo(() => (students: Student[], q?: string) => {
    let f = students.filter(s => statusFilter === "present" ? s.present : statusFilter === "absent" ? !s.present : true);
    if (q?.trim()) {
      const query = q.trim();
      f = f.filter(student => {
        const fields = [student.student_name, student.registration_id || "", student.email || ""].filter(Boolean);
        for (const field of fields) {
          const n = searchUtils.normalize(field);
          const nq = searchUtils.normalize(query);
          if (n.includes(nq)) return true;
          if (field === student.student_name && searchUtils.fuzzyMatch(query, searchUtils.getNameVariations(field), 0.7)) return true;
          if ((field === student.registration_id || field === student.email) &&
            searchUtils.normalize(field.replace(/[@._-]/g, "")).includes(searchUtils.normalize(query.replace(/[@._-]/g, "")))) return true;
        }
        return false;
      });
    }
    return f;
  }, [statusFilter]);

  const toggleAttendance = async (id: number, cur: boolean) => {
    try {
      await axios.patch(`${API_BASE_URL}/api/attendance/${id}`, { is_present: !cur }, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setData(prev => prev.map(s => ({ ...s, students: s.students.map(st => st.id === id ? { ...st, present: !cur } : st) })));
    } catch { alert("Failed to update attendance"); }
  };

  const exportToCSV = (session: AttendanceGroup) => {
    const rows = filterStudents(session.students, session.searchQuery);
    const fmtDate = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? "Invalid Date" : d.toLocaleDateString("en-GB"); };
    const safe = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? new Date().toISOString().split("T")[0] : d.toISOString().split("T")[0]; };
    const headers = ["Registration ID", "Student Name", "Email", "Status", "Course", "Faculty", "Date", "PresentFlag"];
    const csv = [headers.join(","), ...rows.map(s => [
      `"${s.registration_id || "N/A"}"`, `"${s.student_name}"`, `"${s.email || "N/A"}"`,
      s.present ? "Present" : "Absent", `"${session.course_name}"`, `"${session.faculty_name || "N/A"}"`,
      `"${fmtDate(session.datetime)}"`, s.present ? "1" : "0",
    ].join(","))].join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    link.download = `attendance_${session.course_name.replace(/[^a-zA-Z0-9]/g, "_")}_${safe(session.datetime)}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const exportAllToCSV = () => {
    if (!data.length) return;
    const fmtDate = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? "Invalid Date" : d.toLocaleDateString("en-GB"); };
    const fmtTime = (s: string) => { const d = new Date(s); return isNaN(d.getTime()) ? "Invalid Time" : d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }); };
    const headers = ["Registration ID", "Student Name", "Email", "Status", "Course", "Faculty", "Date", "Time", "PresentFlag"];
    const lines = [headers.join(",")];
    data.forEach(s => filterStudents(s.students, s.searchQuery).forEach(st => lines.push([
      `"${st.registration_id || "N/A"}"`, `"${st.student_name}"`, `"${st.email || "N/A"}"`,
      st.present ? "Present" : "Absent", `"${s.course_name}"`, `"${s.faculty_name || "N/A"}"`,
      `"${fmtDate(s.datetime)}"`, `"${fmtTime(s.datetime)}"`, st.present ? "1" : "0",
    ].join(","))));
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }));
    const safe = date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` : new Date().toISOString().split("T")[0];
    link.download = `all_attendance_${safe}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  useEffect(() => { if (date) fetchReport(date, statusFilter, selectedBatch); /* eslint-disable-next-line */ }, [statusFilter, selectedBatch]);

  /* ---------- KPIs ---------- */
  const stats = useMemo(() => {
    let total = 0, present = 0;
    data.forEach(s => filterStudents(s.students, s.searchQuery).forEach(st => { total++; if (st.present) present++; }));
    const pct = total ? Math.round((present / total) * 100) : 0;
    return { total, present, absent: total - present, pct, sessions: data.length };
  }, [data, filterStudents]);

  return (
    <div className="ar">
      {/* HEADER */}
      <header className="ar__header">
        <div className="ar__title-row">
          <div>
            <h1 className="ar__title">
              <span className="dashboard-heading-white">Attendance</span>{" "}
              <span className="dashboard-heading-gradient">Report</span>
            </h1>
          </div>
          <button className="ar__btn ar__btn--gold" onClick={exportAllToCSV} disabled={!data.length}>Export all CSV</button>
        </div>
      </header>

      {/* KPI strip */}
      <section className="ar__kpis">
        <Kpi label="Sessions" value={stats.sessions} sub={date ? date.toLocaleDateString("en-GB") : "Pick a date"} />
        <Kpi label="Total Students" value={stats.total} />
        <Kpi label="Present" value={stats.present} sub={`${stats.pct}% attendance`} accent />
        <Kpi label="Absent" value={stats.absent} />
      </section>


      {/* TOOLBAR */}
      <section className="ar__toolbar">
        <Field label="Date" hint="filter">
          <input
            type="date"
            className="datepicker-input ar__input"
            value={date ? date.toISOString().slice(0, 10) : ""}
            onChange={(e) => {
              const v = e.target.value;
              const d = v ? new Date(`${v}T00:00:00`) : null;
              setDate(d);
              if (d) fetchReport(d, statusFilter, selectedBatch);
            }}
            placeholder="Choose date…"
          />
        </Field>
        <Field label="Batch">
          <div className="ar__select-wrap">
            <select className="ar__input" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value === "all" ? "all" : Number(e.target.value))}>
              <option value="all">All Batches</option>
              {batches.map(b => <option key={b.id} value={b.id}>{b.batch_name}</option>)}
            </select>
            <span className="ar__chev">▾</span>
          </div>
        </Field>
        <Field label="Status">
          <div className="ar__seg" role="tablist">
            {(["all", "present", "absent"] as const).map(s => (
              <button key={s} className={`ar__seg-btn ${statusFilter === s ? "is-on" : ""}`} onClick={() => setStatusFilter(s)}>
                {s === "all" ? `All${data.length ? ` · ${stats.total}` : ""}` : s[0].toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </Field>
      </section>

      {/* STATES */}
      {loading && <div className="ar__state">Loading attendance…</div>}
      {error && <div className="ar__state ar__state--err">{error}</div>}
      {!loading && !error && date && data.length === 0 && (
        <div className="ar__empty">
          <div className="ar__empty-icon">∅</div>
          <h3>No data for this date</h3>
          <p>Try a different date or batch — sessions appear here once attendance is recorded.</p>
        </div>
      )}
      {!loading && !error && !date && (
        <div className="ar__empty">
          <div className="ar__empty-icon">📅</div>
          <h3>Pick a date to begin</h3>
          <p>Choose a date above to load all sessions and student attendance.</p>
        </div>
      )}

      {/* SESSIONS */}
      {!loading && !error && data.length > 0 && (
        <section className="ar__sessions">
          {data.map(session => {
            const rows = filterStudents(session.students, session.searchQuery);
            const present = rows.filter(r => r.present).length;
            const pct = rows.length ? Math.round((present / rows.length) * 100) : 0;
            return (
              <article key={session.session_id} className={`ar__card ${session.open ? "is-open" : ""}`}>
                <header
                  className="ar__card-head"
                  onClick={() => setData(prev => prev.map(s => s.session_id === session.session_id ? { ...s, open: !s.open } : s))}
                >
                  <div className="ar__card-left">
                    <div className="ar__avatar">{session.course_name?.charAt(0).toUpperCase()}</div>
                    <div>
                      <h3 className="ar__card-title">{session.course_name}</h3>
                      <p className="ar__card-meta">
                        <span>{new Date(session.datetime).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        <span className="ar__dot">·</span>
                        <span>Faculty: <strong>{session.faculty_name || "N/A"}</strong></span>
                      </p>
                    </div>
                  </div>
                  <div className="ar__card-right">
                    <div className="ar__attend">
                      <span className="ar__attend-num">{present}<em>/{rows.length}</em></span>
                      <span className="ar__attend-pct">{pct}%</span>
                    </div>
                    <button className="ar__btn ar__btn--ghost" onClick={(e) => { e.stopPropagation(); exportToCSV(session); }}>CSV</button>
                    <span className="ar__chev-toggle">{session.open ? "▴" : "▾"}</span>
                  </div>
                </header>

                {session.open && (
                  <div className="ar__card-body">
                    <div className="ar__search-row">
                      <div className="ar__search">
                        <span className="ar__search-icon">⌕</span>
                        <input
                          className="ar__search-input"
                          placeholder="Search by name, registration, email, or initials…"
                          value={session.searchQuery || ""}
                          onChange={e => setData(prev => prev.map(s => s.session_id === session.session_id ? { ...s, searchQuery: e.target.value } : s))}
                        />
                        {session.searchQuery && (
                          <button className="ar__search-clear" onClick={() => setData(prev => prev.map(s => s.session_id === session.session_id ? { ...s, searchQuery: "" } : s))}>×</button>
                        )}
                      </div>
                      {session.searchQuery && (
                        <span className="ar__search-meta">
                          {rows.length} match{rows.length !== 1 ? "es" : ""} for “{session.searchQuery}”
                        </span>
                      )}
                    </div>

                    {rows.length > 0 ? (
                      <div className="ar__table-wrap">
                        <table className="ar__table">
                          <thead>
                            <tr>
                              <th>Reg ID</th>
                              <th>Student</th>
                              <th>Email</th>
                              <th>Status</th>
                              <th className="ar__th-end">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map(s => (
                              <tr key={s.id}>
                                <td className="ar__mono">{s.registration_id || "—"}</td>
                                <td>
                                  <div className="ar__cell-name">
                                    <span className="ar__chip-avatar">{s.student_name.charAt(0).toUpperCase()}</span>
                                    <span>{s.student_name}</span>
                                  </div>
                                </td>
                                <td className="ar__muted">{s.email || "—"}</td>
                                <td>
                                  <span className={`ar__badge ar__badge--${s.present ? "present" : "absent"}`}>
                                    <em /> {s.present ? "Present" : "Absent"}
                                  </span>
                                </td>
                                <td className="ar__th-end">
                                  <button className="ar__btn ar__btn--mini" onClick={() => toggleAttendance(s.id, s.present)}>
                                    Mark {s.present ? "Absent" : "Present"}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="ar__empty ar__empty--inset">
                        <div className="ar__empty-icon">⌕</div>
                        <h3>No matches</h3>
                        <p>{session.searchQuery ? `Nothing for “${session.searchQuery}”. Try initials or partial names.` : "No students to display."}</p>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
};

export default AttendanceReport;