import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./classSessions.css";

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
}

interface Faculty {
    id: string;
    name: string;
}

interface Section {
    id: number;
    course_name: string;
}

const ClassSessions: React.FC = () => {
    const navigate = useNavigate();
    const [date, setDate] = useState<string>("");
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>("");

    const [editSession, setEditSession] = useState<Session | null>(null);

    const [faculties, setFaculties] = useState<Faculty[]>([]);
    const [sections, setSections] = useState<Section[]>([]);

    // form states
    const [facultyId, setFacultyId] = useState<string>("");
    const [sectionId, setSectionId] = useState<number | "">("");
    const [dateVal, setDateVal] = useState("");
    const [timeVal, setTimeVal] = useState("");
    const [durationVal, setDurationVal] = useState(60);
    const [typeVal, setTypeVal] = useState("theory");
    const [venueVal, setVenueVal] = useState("");

    useEffect(() => {
        // Fetch faculties & sections once
        axios.get(`${API_BASE_URL}/api/schedule/classSessions/getFaculty`).then(res => setFaculties(res.data));
        axios.get(`${API_BASE_URL}/api/schedule/classCourses`).then(res => setSections(res.data));
    }, []);

    const fetchSessions = async () => {
        if (!date) return;
        try {
            setLoading(true);
            const res = await axios.get<Session[]>(`${API_BASE_URL}/api/schedule/classSessions/getSessions/${date}`);
            setSessions(res.data);
            setError("");
        } catch {
            setError("Failed to load sessions");
        } finally {
            setLoading(false);
        }
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
                venue: venueVal
            });

            alert("✅ Session updated successfully");
            setEditSession(null);
            fetchSessions();
        } catch {
            alert("❌ Failed to update session");
        }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Are you sure you want to delete this session?")) return;

        try {
            await axios.delete(`${API_BASE_URL}/api/schedule/classSessionsdelete/${id}`);
            alert("🗑️ Session deleted successfully");
            fetchSessions();
        } catch (err) {
            console.error("Error deleting session:", err);
            alert("❌ Failed to delete session");
        }
    };

    const openEditModal = (s: Session) => {
        setEditSession(s);
        setFacultyId(s.actual_faculty_id || "");
        setSectionId(s.section_id || "");
        const dt = new Date(s.session_datetime);
        setDateVal(dt.toISOString().slice(0, 10));
        setTimeVal(dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }));
        setDurationVal(s.duration);
        setTypeVal(s.session_type);
        setVenueVal(s.venue || "");
    };

    return (
        <div className="sessions-container">
            <h1>Class Sessions</h1>
            <button onClick={() => navigate("/sessions/add")}>+ Add Session</button>

            <div className="date-picker">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                <button onClick={fetchSessions}>Fetch Sessions</button>
            </div>

            {loading && <p>Loading sessions...</p>}
            {error && <p className="error">{error}</p>}

            <table className="sessions-table">
                <thead>
                    <tr>
                        <th>Date & Time</th>
                        <th>Type</th>
                        <th>Duration</th>
                        <th>Faculty</th>
                        <th>Course</th>
                        <th>Section</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {sessions.map((s) => (
                        <tr key={s.id}>
                            <td>{new Date(s.session_datetime).toLocaleString()}</td>
                            <td>{s.session_type}</td>
                            <td>{s.duration} min</td>
                            <td>{s.faculty_name}</td>
                            <td>{s.course_name || "-"}</td>
                            <td>{s.section_id || "-"}</td>
                            <td>
                                <button onClick={() => openEditModal(s)}>✏️ Edit</button>
                                <button
                                    onClick={() => handleDelete(s.id)}
                                    className="delete-btn"
                                    style={{ marginLeft: "8px", color: "white", background: "red" }}
                                >
                                    🗑️ Delete
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {editSession && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Edit Session #{editSession.id}</h3>

                        <label>Faculty</label>
                        <select value={facultyId} onChange={(e) => setFacultyId(e.target.value)}>
                            <option value="">--Select--</option>
                            {faculties.map((f) => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>

                        <label>Section</label>
                        <select value={sectionId} onChange={(e) => setSectionId(e.target.value ? Number(e.target.value) : "")}>
                            <option value="">--Select--</option>
                            {sections.map((s) => (
                                <option key={s.id} value={s.id}>{s.course_name}</option>
                            ))}
                        </select>

                        <label>Date</label>
                        <input type="date" value={dateVal} onChange={(e) => setDateVal(e.target.value)} />

                        <label>Time</label>
                        <input type="time" value={timeVal} onChange={(e) => setTimeVal(e.target.value)} />

                        <label>Duration (min)</label>
                        <input type="number" value={durationVal} onChange={(e) => setDurationVal(Number(e.target.value))} />

                        <label>Venue</label>
                        <input value={venueVal} onChange={(e) => setVenueVal(e.target.value)} />

                        <label>Type</label>
                        <select value={typeVal} onChange={(e) => setTypeVal(e.target.value)}>
                            <option value="theory">Theory</option>
                            <option value="practical">Practical</option>
                            <option value="tutorial">Tutorial</option>
                            <option value="evaluation">Evaluation</option>
                            <option value="other">Other</option>
                        </select>

                        <div className="modal-actions">
                            <button className="save-btn" onClick={handleUpdate}>Save</button>
                            <button className="cancel-btn" onClick={() => setEditSession(null)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ClassSessions;
