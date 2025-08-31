import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./facultySessions.css";



interface Session {
  datetime: string;
  duration?: number;
  faculty: string;
}

const FacultySessions: React.FC = () => {
  const API_BASE_URL = process.env.REACT_APP_API_URL; // ✅ Use env variable

  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedFaculty, setExpandedFaculty] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedDate) return;

    const fetchSessions = async () => {
      setLoading(true);
      const dateStr = selectedDate.toISOString().split("T")[0];
      try {
        const res = await fetch(`${API_BASE_URL}/api/weekly/facultySessions/${dateStr}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        const data = await res.json();
        setSessions(data);
        setExpandedFaculty(null);
      } catch (err) {
        console.error("Error fetching sessions:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [selectedDate, API_BASE_URL]);

  const sessionsByFaculty = sessions.reduce((acc: any, session) => {
    if (!acc[session.faculty]) acc[session.faculty] = [];
    acc[session.faculty].push(session);
    return acc;
  }, {});

  return (
    <div className="table-container">
      <h1>Faculty Sessions</h1>

      <div className="datepicker-wrapper">
        <DatePicker
          selected={selectedDate}
          onChange={(date) => setSelectedDate(date)}
          dateFormat="yyyy-MM-dd"
          className="datepicker"
        />
      </div>

      {loading && <p className="loading">Loading sessions...</p>}

      {!loading && sessions.length === 0 && <p className="loading">No sessions found.</p>}

      {!loading &&
        Object.keys(sessionsByFaculty).map((faculty) => (
          <div key={faculty} className="faculty-card">
            <button
              className="faculty-button"
              onClick={() =>
                setExpandedFaculty(expandedFaculty === faculty ? null : faculty)
              }
            >
              {faculty}
              <span className="toggle">{expandedFaculty === faculty ? "−" : "+"}</span>
            </button>

            {expandedFaculty === faculty && (
              <table>
                <thead>
                  <tr>
                    <th>Session Time</th>
                    <th>Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionsByFaculty[faculty].map((session: Session, idx: number) => (
                    <tr key={idx}>
                      <td>{session.datetime}</td>
                      <td>{session.duration ? `${session.duration} mins` : "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
    </div>
  );
};

export default FacultySessions;
