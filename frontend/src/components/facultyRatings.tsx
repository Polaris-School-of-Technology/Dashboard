import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import './facultyRatings.css';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer,
} from 'recharts';

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface FacultyRating {
  rating: number;
  session_date: string;
  faculty_id: string;
  session_id: string;
  student_count?: number;
  profiles: { name: string };
  class_sessions: {
    course_sections: {
      courses: { course_name: string };
      batches: { batch_name: string };
    };
  };
}

interface Faculty {
  faculty_id: string;
  faculty_name: string;
  department: string | null;
  title: string | null;
}

interface ChartDataPoint {
  date: string;
  originalDate: string;
  [key: string]: any;
}

interface HeatmapDataPoint {
  date: string;
  [facultyName: string]: number | string;
}

/* ---------- tiny presentational atoms ---------- */

const Kpi = ({ label, value, sub, accent = false }: { label: string; value: string | number; sub?: string; accent?: boolean }) => (
  <div className={`fr__kpi ${accent ? 'fr__kpi--accent' : ''}`}>
    <span className="fr__kpi-label">{label}</span>
    <span className="fr__kpi-value">{value}</span>
    {sub && <span className="fr__kpi-sub">{sub}</span>}
  </div>
);

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <label className="fr__field">
    <span className="fr__field-label">{label}</span>
    {children}
  </label>
);

const Avatar = ({ name }: { name: string }) => {
  const initials = name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  return <span className="fr__avatar">{initials || '?'}</span>;
};

/* ---------- main ---------- */

const AdminAnalytics = () => {
  const [facultyList, setFacultyList] = useState<Faculty[]>([]);
  const [selectedFaculty, setSelectedFaculty] = useState('all');
  const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [heatmapData, setHeatmapData] = useState<HeatmapDataPoint[]>([]);
  const [tableData, setTableData] = useState<FacultyRating[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chart' | 'table'>('chart');

  useEffect(() => { fetchFacultyList(); }, []);

  const fetchFacultyList = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/faculty-rating/analytics/faculty-list`);
      setFacultyList(res.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch faculty list');
    }
  };

  const transformChartData = (ratings: FacultyRating[]): ChartDataPoint[] => {
    const grouped: Record<string, Record<string, { ratings: number[]; courseName: string; studentCounts: number[] }>> = {};
    ratings.forEach(r => {
      const date = r.session_date;
      const facultyName = r.profiles.name;
      const courseName = r.class_sessions?.course_sections?.courses?.course_name || 'N/A';
      const count = r.student_count || 0;
      grouped[date] ??= {};
      grouped[date][facultyName] ??= { ratings: [], courseName, studentCounts: [] };
      grouped[date][facultyName].ratings.push(r.rating);
      grouped[date][facultyName].studentCounts.push(count);
    });

    return Object.entries(grouped)
      .map(([date, fac]) => {
        const dp: ChartDataPoint = {
          originalDate: date,
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
        Object.entries(fac).forEach(([name, data]) => {
          const avg = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length;
          dp[name] = Math.round(avg * 100) / 100;
          dp[`__${name}_course__`] = data.courseName;
          dp[`__${name}_count__`] = data.studentCounts.reduce((a, b) => a + b, 0);
        });
        return dp;
      })
      .sort((a, b) => new Date(a.originalDate).getTime() - new Date(b.originalDate).getTime());
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);
    try {
      const endpoint = selectedFaculty === 'all'
        ? `${API_BASE_URL}/api/faculty-rating/analytics/allFacultyRatings`
        : `${API_BASE_URL}/api/faculty-rating/analytics/daily-aggregates`;
      const res = await axios.get(endpoint, {
        params: {
          start_date: startDate,
          end_date: endDate,
          faculty_id: selectedFaculty !== 'all' ? selectedFaculty : undefined,
        },
      });

      if (selectedFaculty === 'all') {
        setHeatmapData(res.data);
        setTableData([]);
        setChartData([]);
      } else {
        const arr = Array.isArray(res.data) ? res.data : res.data.ratings || [];
        setTableData(arr);
        setChartData(transformChartData(arr));
        setHeatmapData([]);
      }
    } catch (err: any) {
      console.error(err);
      if (err.response?.status === 401) setError('Session expired. Please login again.');
      else if (err.response?.status === 500) setError('Server error. Please try again later.');
      else setError(err.response?.data?.message || 'Failed to fetch analytics data');
    } finally {
      setLoading(false);
    }
  };

  /* ---------- derived KPIs ---------- */
  const stats = useMemo(() => {
    if (selectedFaculty === 'all') {
      let cells = 0, sum = 0, students = 0, best = { name: '—', val: 0 };
      const perFaculty: Record<string, { sum: number; n: number }> = {};
      heatmapData.forEach(row => {
        Object.keys(row).forEach(k => {
          if (k === 'date' || k.endsWith('_count')) return;
          const v = row[k];
          if (typeof v === 'number') {
            cells++; sum += v;
            perFaculty[k] ??= { sum: 0, n: 0 };
            perFaculty[k].sum += v; perFaculty[k].n += 1;
          }
        });
        Object.keys(row).forEach(k => {
          if (k.endsWith('_count') && typeof row[k] === 'number') students += row[k] as number;
        });
      });
      Object.entries(perFaculty).forEach(([n, v]) => {
        const avg = v.sum / v.n;
        if (avg > best.val) best = { name: n, val: avg };
      });
      return {
        avg: cells ? (sum / cells).toFixed(2) : '—',
        sessions: cells,
        students,
        best: best.name === '—' ? '—' : `${best.name} · ${best.val.toFixed(2)}`,
      };
    }
    const n = tableData.length;
    const sum = tableData.reduce((a, r) => a + r.rating, 0);
    const students = tableData.reduce((a, r) => a + (r.student_count || 0), 0);
    const high = tableData.filter(r => r.rating >= 4.5).length;
    return {
      avg: n ? (sum / n).toFixed(2) : '—',
      sessions: n,
      students,
      best: n ? `${high} sessions ≥ 4.5` : '—',
    };
  }, [heatmapData, tableData, selectedFaculty]);

  const facultyKeys = useMemo(() => {
    if (!chartData.length) return [];
    return Object.keys(chartData[0]).filter(
      k => k !== 'date' && k !== 'originalDate' && !k.startsWith('__') && !k.endsWith('__'),
    );
  }, [chartData]);

  const lineColors = ['#ffcc3f', '#7dd3fc', '#a78bfa', '#34d399', '#f472b6', '#fb923c'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="fr__tooltip">
        {payload.map((entry: any) => {
          const name = entry.dataKey;
          const course = entry.payload[`__${name}_course__`];
          const count = entry.payload[`__${name}_count__`];
          return (
            <div key={name} className="fr__tooltip-row">
              <div className="fr__tooltip-name"><span className="fr__dot" style={{ background: entry.color }} />{name}</div>
              <div className="fr__tooltip-meta">
                <span><b>{entry.value}</b>/5</span>
                <span>{course}</span>
                {count !== undefined && <span>{count} students</span>}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  /* ---------- heatmap ---------- */
  const getHeatTone = (r?: number) => {
    if (r === undefined) return { bg: 'rgba(255,255,255,0.025)', fg: 'rgba(255,255,255,0.35)' };
    if (r >= 4.5) return { bg: 'rgba(52, 211, 153, 0.22)', fg: '#86efac' };
    if (r >= 4)   return { bg: 'rgba(255, 204, 63, 0.22)', fg: '#ffcc3f' };
    if (r >= 3)   return { bg: 'rgba(251, 146, 60, 0.20)', fg: '#fdba74' };
    return            { bg: 'rgba(244, 63, 94, 0.22)',  fg: '#fda4af' };
  };

  const Heatmap = ({ data }: { data: HeatmapDataPoint[] }) => {
    if (!data?.length) return null;
    const faculties = Array.from(new Set(
      data.flatMap(row => Object.keys(row).filter(k => k !== 'date' && !k.endsWith('_count') && typeof row[k] === 'number')),
    ));
    if (!faculties.length) return null;

    return (
      <div className="fr__heatmap-wrap">
        <div className="fr__heatmap-head">
          <div>
            <h3>Performance Heatmap</h3>
            <p>{data.length} days · {faculties.length} faculty · hover cells for student counts</p>
          </div>
          <div className="fr__legend">
            <span><i style={{ background: 'rgba(244,63,94,0.5)' }} /> &lt; 3</span>
            <span><i style={{ background: 'rgba(251,146,60,0.5)' }} /> 3–4</span>
            <span><i style={{ background: 'rgba(255,204,63,0.6)' }} /> 4–4.5</span>
            <span><i style={{ background: 'rgba(52,211,153,0.6)' }} /> ≥ 4.5</span>
          </div>
        </div>
        <div className="fr__heatmap-scroll">
          <table className="fr__heatmap">
            <thead>
              <tr>
                <th className="fr__heatmap-corner">Date</th>
                {faculties.map(f => (
                  <th key={f} title={f}>
                    <div className="fr__heatmap-fac">
                      <Avatar name={f} />
                      <span>{f.length > 16 ? f.slice(0, 16) + '…' : f}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={i}>
                  <td className="fr__heatmap-date">
                    {new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  {faculties.map(f => {
                    const rating = row[f] as number | undefined;
                    const count = (row[`${f}_count`] as number | undefined) ?? 0;
                    const tone = getHeatTone(typeof rating === 'number' ? rating : undefined);
                    return (
                      <td
                        key={f}
                        className="fr__heatmap-cell"
                        style={{ background: tone.bg, color: tone.fg }}
                        title={`${f}: ${rating ?? 'No rating'} · ${count} students`}
                      >
                        {typeof rating === 'number' ? (
                          <>
                            <div className="fr__heatmap-val">{rating}</div>
                            <div className="fr__heatmap-count">{count}</div>
                          </>
                        ) : <span className="fr__heatmap-empty">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const hasAny = heatmapData.length || chartData.length || tableData.length;

  return (
    <div className="fr">
      {/* ---------- header ---------- */}
      <header className="fr__header">
        <nav className="fr__breadcrumb">
          <span>Analytics</span><i>/</i><span className="fr__crumb-active">Faculty Ratings</span>
        </nav>
        <div className="fr__header-row">
          <div>
            <h1 className="fr__title">
              <span className="dashboard-heading-white">Faculty</span>{" "}
              <span className="dashboard-heading-gradient">Ratings</span>
            </h1>
            <p className="fr__subtitle">Track session-level feedback, spot trends, and surface top performers.</p>
          </div>
          <div className="fr__tab-group" role="tablist">
            <button role="tab" aria-selected={activeTab === 'chart'} className={activeTab === 'chart' ? 'is-active' : ''} onClick={() => setActiveTab('chart')}>Chart</button>
            <button role="tab" aria-selected={activeTab === 'table'} className={activeTab === 'table' ? 'is-active' : ''} onClick={() => setActiveTab('table')}>Table</button>
          </div>
        </div>
      </header>

      {/* ---------- KPI strip ---------- */}
      <section className="fr__kpis">
        <Kpi label="Average Rating" value={stats.avg} sub="/ 5.0" accent />
        <Kpi label={selectedFaculty === 'all' ? 'Data Points' : 'Sessions'} value={stats.sessions} sub="in range" />
        <Kpi label="Students Responded" value={stats.students} sub="total responses" />
        <Kpi label={selectedFaculty === 'all' ? 'Top Faculty' : 'Highlights'} value={stats.best} />
      </section>

      {/* ---------- toolbar ---------- */}
      <section className="fr__panel fr__toolbar">
        <Field label="Faculty">
          <select className="fr__select" value={selectedFaculty} onChange={e => setSelectedFaculty(e.target.value)}>
            <option value="all">All Faculties</option>
            {facultyList.map(f => (
              <option key={f.faculty_id} value={f.faculty_id}>
                {f.faculty_name}{f.department ? ` · ${f.department}` : ''}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Start Date">
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            className="fr__input"
          />
        </Field>
        <Field label="End Date">
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            max={new Date().toISOString().split('T')[0]}
            min={startDate}
            className="fr__input"
          />
        </Field>
        <div className="fr__toolbar-actions">
          <button className="fr__btn fr__btn--primary" onClick={fetchAnalytics} disabled={loading}>
            {loading ? 'Loading…' : 'Show Data'}
          </button>
        </div>
      </section>

      {error && (
        <div className="fr__alert" role="alert">
          <span>{error}</span>
          <button onClick={() => setError(null)} aria-label="Dismiss">✕</button>
        </div>
      )}

      {/* ---------- main content ---------- */}
      <section className="fr__panel fr__content">
        {activeTab === 'chart' && selectedFaculty === 'all' && heatmapData.length > 0 && <Heatmap data={heatmapData} />}

        {activeTab === 'chart' && selectedFaculty !== 'all' && chartData.length > 0 && (
          <div className="fr__chart">
            <div className="fr__chart-head">
              <h3>Rating Trend</h3>
              <p>Daily average rating across sessions</p>
            </div>
            <ResponsiveContainer width="100%" height={460}>
              <LineChart data={chartData} margin={{ top: 16, right: 24, left: 4, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 6" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="date" angle={-30} textAnchor="end" height={70} interval={0}
                  tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                <YAxis domain={[0, 5]} tickCount={6}
                  tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,204,63,0.25)', strokeWidth: 1 }} />
                <Legend wrapperStyle={{ paddingTop: 16, color: 'rgba(255,255,255,0.75)', fontSize: 13 }} iconType="circle" />
                {facultyKeys.map((k, i) => {
                  const c = lineColors[i % lineColors.length];
                  return (
                    <Line key={k} type="monotone" dataKey={k} stroke={c} strokeWidth={2.5}
                      dot={{ r: 4, fill: '#0a0a0a', strokeWidth: 2, stroke: c }}
                      activeDot={{ r: 7, fill: c, strokeWidth: 2, stroke: '#0a0a0a' }} name={k} />
                  );
                })}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {activeTab === 'table' && tableData.length > 0 && (
          <div className="fr__table-wrap">
            <table className="fr__table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Faculty</th>
                  <th>Course</th>
                  <th>Batch</th>
                  <th className="fr__num">Rating</th>
                  <th className="fr__num">Students</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map((r, i) => {
                  const tone = r.rating >= 4.5 ? 'good' : r.rating >= 4 ? 'ok' : r.rating >= 3 ? 'warn' : 'bad';
                  return (
                    <tr key={i}>
                      <td className="fr__mono">{new Date(r.session_date).toLocaleDateString()}</td>
                      <td>
                        <div className="fr__cell-user"><Avatar name={r.profiles.name} /><span>{r.profiles.name}</span></div>
                      </td>
                      <td>{r.class_sessions.course_sections.courses.course_name}</td>
                      <td className="fr__muted">{r.class_sessions.course_sections.batches.batch_name}</td>
                      <td className="fr__num"><span className={`fr__badge fr__badge--${tone}`}>{r.rating.toFixed(1)} / 5</span></td>
                      <td className="fr__num fr__mono">{r.student_count || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !hasAny && (
          <div className="fr__empty">
            <div className="fr__empty-icon">📊</div>
            <h3>No data available</h3>
            <p>Pick a faculty and date range, then hit <b>Show Data</b>.</p>
          </div>
        )}
      </section>
    </div>
  );
};

export default AdminAnalytics;