import React, { useEffect, useState } from "react";
import axios from "axios";
import Papa from "papaparse";
import "./WeeklySessions.css";

interface Session {
  session_datetime: string;
  duration: number;
  profiles: { name: string } | null;
}

interface UploadedFile {
  id: string;
  original_filename: string;
  signed_url: string;
  week_start_date: string;
}

const WeeklySessions: React.FC = () => {
  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

  const [sessions, setSessions] = useState<Session[]>([]);
  const [weeklyCSV, setWeeklyCSV] = useState<UploadedFile[]>([]);
  const [csvDataMap, setCsvDataMap] = useState<{ [key: string]: any[] }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split("T")[0]);

  // Fetch sessions
  const fetchSessions = async (date: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${API_BASE_URL}/api/weekly/getAllWeeklySessions`, {
        params: { date },
      });
      setSessions(res.data);
    } catch (err: any) {
      setError(err.message || "Error fetching sessions");
    } finally {
      setLoading(false);
    }
  };

  // Fetch CSV files
  const fetchCSVForWeek = async (date: string) => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/weekly/csv/files/week`, {
        params: { date },
      });
      setWeeklyCSV(res.data.files);
      setCsvDataMap({}); // reset previous CSV data
    } catch (err) {
      console.error("Error fetching CSVs:", err);
      setWeeklyCSV([]);
    }
  };

  // View CSV preview
  const handleViewCSV = async (file: UploadedFile) => {
    try {
      const response = await fetch(file.signed_url);
      const text = await response.text();
      const parsed = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      setCsvDataMap((prev) => ({
        ...prev,
        [file.id]: parsed.data,
      }));
    } catch (err) {
      console.error("Error parsing CSV:", err);
      setCsvDataMap((prev) => ({
        ...prev,
        [file.id]: [],
      }));
    }
  };

  // Download CSV directly using signed URL
  const downloadCSV = (file: UploadedFile) => {
    const link = document.createElement("a");
    link.href = file.signed_url;
    link.download = file.original_filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => {
    fetchSessions(selectedDate);
    fetchCSVForWeek(selectedDate);
  }, [selectedDate]);

  return (
    <div className="page-wrapper">
      <div className="table-container">
        <header className="page-header">
          <h1>
            <span className="dashboard-heading-gradient">This</span>{" "}
            <span className="dashboard-heading-white">Week's</span>{" "}
            <span className="dashboard-heading-gradient">Sessions</span>
          </h1>
          <p className="page-subtitle">
            Review scheduled sessions and weekly uploads at a glance.
          </p>
        </header>

        <div className="calendar-container">
          <div className="date-field">
            <label htmlFor="session-date">Select a date</label>
            <input
              id="session-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="datepicker-input"
            />
          </div>
        </div>

        {loading && <p className="loading">Loading sessions...</p>}
        {error && <p className="error">{error}</p>}

        {!loading && !error && (
          <>
            <section className="section">
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Date &amp; Time</th>
                      <th>Duration (mins)</th>
                      <th>Faculty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session, idx) => (
                      <tr key={idx}>
                        <td>
                          {new Date(session.session_datetime).toLocaleString("en-IN", {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td>
                          <span className="duration-pill">{session.duration}</span>
                        </td>
                        <td>{session.profiles?.name || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="section">
              <h2 className="dashboard-heading-white">CSV for this week</h2>

              {weeklyCSV.length === 0 && (
                <div className="empty-state">
                  <div className="empty-state-icon" aria-hidden="true">
                    <svg
                      width="36"
                      height="36"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </div>
                  <h3 className="empty-state-title">No CSV uploaded for this week</h3>
                  <p className="empty-state-text">
                    Once a CSV is uploaded for the selected week, it will appear here ready
                    to view and download.
                  </p>
                  <button
                    type="button"
                    className="btn-view empty-state-action"
                    onClick={() => fetchCSVForWeek(selectedDate)}
                  >
                    Refresh
                  </button>
                </div>
              )}

              {weeklyCSV.map((file) => (
                <div key={file.id} className="csv-card">
                  <p className="csv-card-name">{file.original_filename}</p>
                  <div className="csv-card-actions">
                    <button onClick={() => handleViewCSV(file)} className="btn-view">
                      View CSV
                    </button>
                    <button onClick={() => downloadCSV(file)} className="btn-download">
                      Download CSV
                    </button>
                  </div>
                </div>
              ))}

              {Object.keys(csvDataMap).length > 0 && (
                <div className="csv-preview">
                  <h3>CSV Preview</h3>
                  {Object.entries(csvDataMap).map(([fileId, data]) => {
                    const file = weeklyCSV.find((f) => f.id === fileId);
                    return data.length > 0 ? (
                      <div key={fileId} className="csv-preview-block">
                        <h4>{file?.original_filename}</h4>
                        <div className="table-scroll">
                          <table>
                            <thead>
                              <tr>
                                {Object.keys(data[0]).map((key) => (
                                  <th key={key}>{key}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {data.slice(0, 10).map((row, idx) => (
                                <tr key={idx}>
                                  {Object.values(row).map((val, i) => (
                                    <td key={i}>{val != null ? String(val) : ""}</td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {data.length > 10 && (
                          <p className="csv-preview-note">
                            Showing first 10 rows of {data.length} total rows
                          </p>
                        )}
                      </div>
                    ) : null;
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
};

export default WeeklySessions;
