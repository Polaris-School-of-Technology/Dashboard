import React, { useState, useEffect } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./studentResponsesForTextQuestions.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

export default function StudentFeedback() {
  const [date, setDate] = useState(new Date());
  const [batches, setBatches] = useState([]);
  const [batchId, setBatchId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState("");
  const [questions, setQuestions] = useState([]);
  const [selectedQuestion, setSelectedQuestion] = useState("");
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch batches
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/api/schedule/getAllBatches`)
      .then((res) => setBatches(res.data.batches || []))
      .catch(console.error);
  }, []);

  // Fetch sessions when date + batch changes
  useEffect(() => {
    if (!date || !batchId) {
      setSessions([]);
      setSelectedSession("");
      return;
    }

    const fetchSessions = async () => {
      try {
        // Format date in local timezone (IST) without UTC conversion
        const formattedDate = date.toLocaleDateString('en-CA'); // This gives YYYY-MM-DD format in local timezone
        const res = await axios.get(
          `${API_BASE_URL}/api/studentResponses/studentResponses/sessions/${formattedDate}?batch_id=${batchId}`
        );
        setSessions(res.data || []);
        setSelectedSession("");
        setSelectedQuestion("");
        setResponses([]);
      } catch (err) {
        console.error(err);
      }
    };

    fetchSessions();
  }, [date, batchId]);

  // Fetch questions when session changes
  useEffect(() => {
    if (!selectedSession) return setQuestions([]);

    axios
      .get(`${API_BASE_URL}/api/studentResponses/studentResponses/questions`)
      .then((res) => setQuestions(res.data.data || []))
      .catch(console.error);
  }, [selectedSession]);

  // Fetch responses when question changes
  useEffect(() => {
    if (!selectedSession || !selectedQuestion) return;

    setLoading(true);
    setResponses([]);
    axios
      .post(
        `${API_BASE_URL}/api/studentResponses/studentResponses/sessions/responses`,
        {
          session_id: selectedSession,
          feedback_question_id: selectedQuestion,
        }
      )
      .then((res) => setResponses(res.data.data || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedQuestion, selectedSession]);

  return (
    <div className="feedback-container">
      {/* Styles moved to studentResponsesForTextQuestions.css */}

      <header className="feedback-header">
        <h1>Student Feedback Dashboard</h1>
        <p>View and analyze student responses easily</p>
      </header>

      {/* Filters Section */}
      <section className="filters">
        <h2>Filters</h2>
        <div className="filter-grid">
          <div className="filter-item">
            <label>Select Date</label>
            <DatePicker
              selected={date}
              onChange={setDate}
              dateFormat="yyyy-MM-dd"
              className="input"
            />
          </div>

          <div className="filter-item">
            <label>Select Batch</label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="input"
            >
              <option value="">-- Select Batch --</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batch_name}
                </option>
              ))}
            </select>
          </div>

          {sessions.length > 0 && (
            <div className="filter-item">
              <label>Select Session</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="input"
              >
                <option value="">-- Select Session --</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.course_name} — {s.faculty_name} —{" "}
                    {new Date(s.session_datetime).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>
          )}

          {questions.length > 0 && (
            <div className="filter-item">
              <label>Select Question</label>
              <select
                value={selectedQuestion}
                onChange={(e) => setSelectedQuestion(e.target.value)}
                className="input"
              >
                <option value="">-- Select Question --</option>
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.question_text}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Loading */}
      {loading && <p className="loading">Loading responses...</p>}

      {/* Responses Table */}
      {responses.length > 0 && !loading && (
        <section className="responses">
          <h2>Student Responses ({responses.length})</h2>
          <div className="table-wrapper">
            <table className="response-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th className="student-col">Student</th>
                  <th className="response-col">Response</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r, idx) => (
                  <tr key={idx}>
                    <td>{idx + 1}</td>
                    <td className="student-cell">
                      <div className="student-name">{r.student_name}</div>
                      <div className="student-email">{r.student_email}</div>
                    </td>
                    <td className="response-cell">{r.response_text}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* No Responses */}
      {!loading && responses.length === 0 && selectedQuestion && (
        <p className="empty">No responses found.</p>
      )}
    </div>
  );
}