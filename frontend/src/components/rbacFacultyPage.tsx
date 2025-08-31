import React, { useState } from "react";
import axios from "axios";
import "./rbacFaculty.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface Session {
    id: number;
    session_datetime: string;
    session_type: string;
    duration: number;
    faculty_name: string;
    course_name: string | null;
    section_id: number | null;
}

interface Question {
    id: number;
    question_text: string;
    type: "long_text" | "multiple_choice";
    options: string[];
}


const RbacFacultyPage: React.FC = () => {
    const [date, setDate] = useState<string>("");
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [quizModalOpen, setQuizModalOpen] = useState(false);
    const [currentSession, setCurrentSession] = useState<Session | null>(null);
    const [tempQuestions, setTempQuestions] = useState<Question[]>([]);
    const [tempQuestionText, setTempQuestionText] = useState("");
    const [tempQuestionType, setTempQuestionType] = useState<"long_text" | "multiple_choice">("long_text");
    const [tempOptions, setTempOptions] = useState<string[]>([""]);

    const [viewQuizModalOpen, setViewQuizModalOpen] = useState(false);
    const [viewingQuiz, setViewingQuiz] = useState<Question[]>([]);

    // Fetch sessions
    const fetchSessions = async () => {
        if (!date) return;
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(
                `${API_BASE_URL}/api/rbacFaculty/rbacfaculty/sessions/${date}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );
            setSessions(res.data);
        } catch (err) {
            console.error(err);
            setError("Failed to fetch sessions");
        } finally {
            setLoading(false);
        }
    };

    const openQuizModal = (session: Session) => {
        setCurrentSession(session);
        setQuizModalOpen(true);
        setTempQuestions([]);
        setTempQuestionText("");
        setTempQuestionType("long_text");
        setTempOptions([""]);
    };

    const handleOptionChange = (index: number, value: string) => {
        const updated = [...tempOptions];
        updated[index] = value;
        setTempOptions(updated);
    };

    const addOptionField = () => setTempOptions([...tempOptions, ""]);

    const addTempQuestionToList = () => {
        if (!tempQuestionText.trim()) return alert("Enter question text");

        const optionsArray = tempQuestionType === "multiple_choice"
            ? tempOptions.filter((o) => o.trim() !== "")
            : [];

        setTempQuestions((prev) => [
            ...prev,
            {
                id: Date.now(),
                question_text: tempQuestionText,
                type: tempQuestionType,
                options: optionsArray,
            },
        ]);

        setTempQuestionText("");
        setTempQuestionType("long_text");
        setTempOptions([""]);
    };

    const submitQuiz = async () => {
        if (!currentSession) return;
        if (tempQuestions.length === 0) return alert("Add at least one question");

        try {
            await axios.post(
                `${API_BASE_URL}/api/rbacFaculty/rbacquiz/create/${currentSession.id}`,
                { newQuestions: tempQuestions },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );
            alert("✅ Quiz created successfully");
            setQuizModalOpen(false);
        } catch (err) {
            console.error(err);
            alert("❌ Failed to create quiz");
        }
    };

    const handleViewQuiz = async (sessionId: number) => {
        try {
            const res = await axios.get(
                `${API_BASE_URL}/api/rbacFaculty/getQuizRbac/${sessionId}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );

            const formatted = (res.data || []).map((q: any) => ({
                id: q.id,
                question_text: q.question_text,
                type: q.question_type as "long_text" | "multiple_choice",
                options: Array.isArray(q.options) ? q.options : (q.options ? JSON.parse(q.options) : []),
            }));

            setViewingQuiz(formatted);
            setViewQuizModalOpen(true);
        } catch (err) {
            console.error(err);
            alert("Failed to fetch quiz");
        }
    };


    return (
        <div className="sessions-container">
            <h1>My Sessions</h1>

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
                            <td>{s.course_name || "-"}</td>
                            <td>{s.section_id || "-"}</td>
                            <td>
                                <button onClick={() => openQuizModal(s)}>➕ Add Quiz</button>
                                <button onClick={() => handleViewQuiz(s.id)}>👁 View Quiz</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Add Quiz Modal */}
            {quizModalOpen && currentSession && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>Add Quiz for Session {currentSession.id}</h2>
                        <p>
                            {currentSession.course_name || "-"} | {currentSession.faculty_name} |{" "}
                            {new Date(currentSession.session_datetime).toLocaleString()}
                        </p>

                        {tempQuestions.map((q) => (
                            <div key={q.id} style={{ marginBottom: "10px" }}>
                                <b>{q.question_text}</b> ({q.type})
                                {q.type === "multiple_choice" && q.options.length > 0 && (
                                    <ul>
                                        {q.options.map((opt, oIdx) => (
                                            <li key={oIdx}>{opt}</li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}

                        <div className="question-inputs">
                            <input
                                type="text"
                                placeholder="Question text"
                                value={tempQuestionText}
                                onChange={(e) => setTempQuestionText(e.target.value)}
                            />
                            <select
                                value={tempQuestionType}
                                onChange={(e) =>
                                    setTempQuestionType(e.target.value as "long_text" | "multiple_choice")
                                }
                            >
                                <option value="long_text">Descriptive</option>
                                <option value="multiple_choice">Multiple Choice</option>
                            </select>

                            {tempQuestionType === "multiple_choice" && (
                                <div>
                                    {tempOptions.map((opt, idx) => (
                                        <input
                                            key={idx}
                                            type="text"
                                            placeholder={`Option ${idx + 1}`}
                                            value={opt}
                                            onChange={(e) => handleOptionChange(idx, e.target.value)}
                                        />
                                    ))}
                                    <button onClick={addOptionField}>+ Add Option</button>
                                </div>
                            )}

                            <button onClick={addTempQuestionToList}>Add Question</button>
                        </div>

                        <div className="modal-actions">
                            <button onClick={submitQuiz}>Submit Quiz</button>
                            <button onClick={() => setQuizModalOpen(false)}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Quiz Modal */}

            {viewQuizModalOpen && (
                <div className="modal">
                    <div className="modal-content">
                        <h2>📋 Quiz Questions</h2>

                        {viewingQuiz.length === 0 ? (
                            <div className="empty-quiz-message">
                                <div>No questions have been added to this quiz yet.</div>
                                <small>Create some questions to get started!</small>
                            </div>
                        ) : (
                            <div className="quiz-questions-container">
                                {viewingQuiz.map((question, index) => (
                                    <div key={question.id} className="quiz-question-card">
                                        <div className="question-counter">{index + 1}</div>

                                        <div className={`question-type-badge ${question.type.replace('_', '-')}`}>
                                            {question.type === 'multiple_choice' ? '☑️ Multiple Choice' : '📝 Long Answer'}
                                        </div>

                                        <div className="question-text">
                                            {question.question_text}
                                        </div>

                                        {question.type === "multiple_choice" && question.options.length > 0 ? (
                                            <ul className="quiz-options">
                                                {question.options.map((option, optionIndex) => (
                                                    <li key={optionIndex}>{option}</li>
                                                ))}
                                            </ul>
                                        ) : question.type === "long_text" ? (
                                            <div className="long-text-indicator">
                                                Students will provide a detailed written response
                                            </div>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                        )}

                        <button
                            className="modal-close-btn"
                            onClick={() => setViewQuizModalOpen(false)}
                        >
                            ✕ Close Quiz
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RbacFacultyPage;
