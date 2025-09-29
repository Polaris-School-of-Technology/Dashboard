import React, { useState, useEffect } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

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
      {/* Inline CSS */}
      <style>{`
        .feedback-container {
          font-family: Arial, sans-serif;
          padding: 20px;
          background: #f9fafb;
        }
        .feedback-header {
          text-align: center;
          margin-bottom: 30px;
        }
        .feedback-header h1 {
          font-size: 28px;
          font-weight: bold;
          color: #333;
        }
        .feedback-header p {
          color: #666;
          margin-top: 5px;
        }
        .filters {
          background: #fff;
          border: 1px solid #ddd;
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 30px;
        }
        .filters h2 {
          font-size: 18px;
          margin-bottom: 15px;
          color: #444;
        }
        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
        .filter-item label {
          display: block;
          font-weight: bold;
          margin-bottom: 8px;
          color: #333;
        }
        .input {
          width: 100%;
          padding: 8px 10px;
          border: 1px solid #ccc;
          border-radius: 6px;
          font-size: 14px;
        }
        .loading {
          text-align: center;
          color: #666;
          margin-top: 20px;
        }
        .responses {
          background: #fffbe6;
          border: 1px solid #ffe58f;
          padding: 20px;
          border-radius: 10px;
        }
        .responses h2 {
          margin-bottom: 15px;
          color: #333;
        }
        .table-wrapper {
          overflow-x: auto;
        }
        .response-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .response-table th,
        .response-table td {
          padding: 12px;
          border: 1px solid #ddd;
          text-align: left;
        }
        .response-table thead {
          background: #eee;
        }
        .student-col {
          background: #dcfce7;
        }
        .response-col {
          background: #fef3c7;
        }
        .student-cell {
          background: #dcfce7;
        }
        .response-cell {
          background: #fef3c7;
        }
        .student-name {
          font-weight: bold;
          color: #222;
        }
        .student-email {
          font-size: 12px;
          color: #666;
        }
        .empty {
          text-align: center;
          margin-top: 20px;
          color: #888;
        }
        /* Zebra striping */
        .response-table tbody tr:nth-child(odd) {
          background: #fafafa;
        }
      `}</style>

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