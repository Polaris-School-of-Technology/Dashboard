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

type QuestionType = "long_text" | "multiple_choice" | "correct_answer_type";

interface Question {
    id: number;
    question_text: string;
    type: QuestionType;
    options: string[];
    correct_option_value?: string;
}

const RbacFacultyPage: React.FC = () => {
    // Session states
    const [date, setDate] = useState<string>("");
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // Quiz states
    const [quizModalOpen, setQuizModalOpen] = useState(false);
    const [viewQuizModalOpen, setViewQuizModalOpen] = useState(false);
    const [currentSession, setCurrentSession] = useState<Session | null>(null);

    // Question handling
    const [tempQuestions, setTempQuestions] = useState<Question[]>([]);
    const [tempQuestionText, setTempQuestionText] = useState("");
    const [tempQuestionType, setTempQuestionType] = useState<QuestionType>("long_text");
    const [tempOptions, setTempOptions] = useState<string[]>([""]);
    const [selectedCorrectOption, setSelectedCorrectOption] = useState<string>("");

    // View/Edit/Delete quiz states
    const [viewingQuiz, setViewingQuiz] = useState<Question[]>([]);
    const [editQuestionId, setEditQuestionId] = useState<number | null>(null);
    const [editingOptions, setEditingOptions] = useState<string[]>([]);
    const [editingCorrectOption, setEditingCorrectOption] = useState<string>("");

    // Fetch sessions
    const fetchSessions = async () => {
        if (!date) return;
        setLoading(true);
        setError("");
        try {
            const res = await axios.get(`${API_BASE_URL}/api/rbacFaculty/rbacfaculty/sessions/${date}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            setSessions(res.data);
        } catch (err) {
            setError("Failed to fetch sessions");
        } finally {
            setLoading(false);
        }
    };

    // Quiz modal open
    const openQuizModal = (session: Session) => {
        setCurrentSession(session);
        setQuizModalOpen(true);
        setTempQuestions([]);
        setTempQuestionText("");
        setTempQuestionType("long_text");
        setTempOptions([""]);
        setSelectedCorrectOption("");
    };

    // Add option field
    const handleOptionChange = (index: number, value: string) => {
        const updated = [...tempOptions];
        updated[index] = value;
        setTempOptions(updated);
    };

    const addOptionField = () => setTempOptions([...tempOptions, ""]);

    // Add temp question to list
    const addTempQuestionToList = () => {
        if (!tempQuestionText.trim()) return alert("Enter question text");

        const filteredOptions = tempOptions.filter((o) => o.trim() !== "");

        if ((tempQuestionType === "multiple_choice" || tempQuestionType === "correct_answer_type") && filteredOptions.length === 0) {
            return alert("Add at least one option");
        }

        if (tempQuestionType === "correct_answer_type" && !selectedCorrectOption) {
            return alert("Select the correct answer");
        }

        const newQuestion: Question = {
            id: Date.now(),
            question_text: tempQuestionText,
            type: tempQuestionType,
            options: filteredOptions,
            correct_option_value: tempQuestionType === "correct_answer_type" ? selectedCorrectOption : undefined,
        };

        setTempQuestions((prev) => [...prev, newQuestion]);
        setTempQuestionText("");
        setTempQuestionType("long_text");
        setTempOptions([""]);
        setSelectedCorrectOption("");
    };

    // Submit quiz to backend
    const submitQuiz = async () => {
        if (!currentSession || tempQuestions.length === 0) return;

        try {
            await axios.post(`${API_BASE_URL}/api/rbacFaculty/rbacquiz/create/${currentSession.id}`, { newQuestions: tempQuestions }, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            alert("✅ Quiz created successfully");
            setQuizModalOpen(false);
        } catch {
            alert("❌ Failed to create quiz");
        }
    };

    // View quiz
    const handleViewQuiz = async (sessionId: number) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/rbacFaculty/getQuizRbac/${sessionId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });

            const formatted = (res.data || []).map((q: any) => ({
                id: q.id,
                question_text: q.question_text,
                type: q.question_type as QuestionType,
                options: Array.isArray(q.options) ? q.options : (q.options ? JSON.parse(q.options) : []),
                correct_option_value: q.correct_option_value,
            }));

            setViewingQuiz(formatted);
            setViewQuizModalOpen(true);
            setCurrentSession(sessions.find((s) => s.id === sessionId) || null);
        } catch {
            alert("Failed to fetch quiz");
        }
    };

    // Start editing a question
    const startEditingQuestion = (q: Question) => {
        setEditQuestionId(q.id);
        setEditingOptions([...q.options]);
        setEditingCorrectOption(q.correct_option_value || "");
    };

    // Cancel editing
    const cancelEditing = () => {
        setEditQuestionId(null);
        setEditingOptions([]);
        setEditingCorrectOption("");
    };

    // Handle option change during editing
    const handleEditingOptionChange = (index: number, value: string) => {
        const updated = [...editingOptions];
        updated[index] = value;
        setEditingOptions(updated);

        // If this was the correct option, update the correct option value
        if (editingCorrectOption === editingOptions[index]) {
            setEditingCorrectOption(value);
        }
    };

    // Add new option during editing
    const addEditingOption = () => {
        setEditingOptions([...editingOptions, ""]);
    };

    // Remove option during editing
    const removeEditingOption = (index: number) => {
        const removedOption = editingOptions[index];
        const updated = editingOptions.filter((_, i) => i !== index);
        setEditingOptions(updated);

        // If we removed the correct option, reset it
        if (editingCorrectOption === removedOption) {
            setEditingCorrectOption("");
        }
    };

    // Update question
    const updateQuestion = async (questionId: number, q: Question) => {
        try {
            // Filter out empty options
            const filteredOptions = editingOptions.filter(opt => opt.trim() !== "");

            // Validate that we have options for multiple choice/correct answer types
            if ((q.type === "multiple_choice" || q.type === "correct_answer_type") && filteredOptions.length === 0) {
                return alert("Add at least one option");
            }

            // Validate correct answer is selected for correct_answer_type
            if (q.type === "correct_answer_type" && !editingCorrectOption) {
                return alert("Select the correct answer");
            }

            const payload: any = {
                question_text: q.question_text,
                question_type: q.type,
                options: filteredOptions
            };

            // Add correct option value if it's a correct_answer_type question
            if (q.type === "correct_answer_type") {
                payload.correct_option_value = editingCorrectOption;
            }

            await axios.put(`${API_BASE_URL}/api/rbacFaculty/updateRbacQuestion/${questionId}`, payload, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });

            alert("✅ Question updated");
            handleViewQuiz(currentSession?.id || 0);
            cancelEditing();
        } catch (error) {
            console.error("Update error:", error);
            alert("❌ Failed to update question");
        }
    };

    // Delete question
    const deleteQuestion = async (questionId: number) => {
        if (!window.confirm("Are you sure you want to delete this question?")) {
            return;
        }

        try {
            await axios.delete(`${API_BASE_URL}/api/rbacFaculty/deleteRbacQuestion/${questionId}`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });
            alert("✅ Question deleted");
            handleViewQuiz(currentSession?.id || 0);
        } catch {
            alert("❌ Failed to delete question");
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

                        {tempQuestions.map((q) => (
                            <div key={q.id} className="question-preview">
                                <b>{q.question_text}</b> ({q.type})
                                {q.options.length > 0 && (
                                    <ul>{q.options.map((opt, oIdx) => <li key={oIdx}>{opt}{q.correct_option_value === opt && " ✅"}</li>)}</ul>
                                )}
                            </div>
                        ))}

                        <div className="question-form">
                            <input
                                type="text"
                                placeholder="Question text"
                                value={tempQuestionText}
                                onChange={(e) => setTempQuestionText(e.target.value)}
                            />
                            <select value={tempQuestionType} onChange={(e) => setTempQuestionType(e.target.value as QuestionType)}>
                                <option value="long_text">Descriptive</option>
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="correct_answer_type">Correct Answer Type</option>
                            </select>

                            {(tempQuestionType === "multiple_choice" || tempQuestionType === "correct_answer_type") && (
                                <div className="options-section">
                                    {tempOptions.map((opt, idx) => (
                                        <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                                            <input
                                                type="text"
                                                placeholder={`Option ${idx + 1}`}
                                                value={opt}
                                                onChange={(e) => handleOptionChange(idx, e.target.value)}
                                            />
                                            {tempQuestionType === "correct_answer_type" && (
                                                <label>
                                                    <input
                                                        type="radio"
                                                        name="correctOption"
                                                        checked={selectedCorrectOption === opt}
                                                        onChange={() => setSelectedCorrectOption(opt)}
                                                    />
                                                    Correct
                                                </label>
                                            )}
                                        </div>
                                    ))}
                                    <button type="button" onClick={addOptionField}>+ Add Option</button>
                                </div>
                            )}
                        </div>

                        <button onClick={addTempQuestionToList}>Add Question</button>
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
                            <p>No questions yet.</p>
                        ) : (
                            viewingQuiz.map((q) => (
                                <div key={q.id} className="question-item">
                                    {editQuestionId === q.id ? (
                                        <div className="edit-question-form">
                                            <input
                                                type="text"
                                                value={q.question_text}
                                                onChange={(e) => setViewingQuiz((prev) =>
                                                    prev.map((qq) => qq.id === q.id ? { ...qq, question_text: e.target.value } : qq)
                                                )}
                                                placeholder="Question text"
                                            />

                                            {(q.type === "multiple_choice" || q.type === "correct_answer_type") && (
                                                <div className="edit-options-section">
                                                    <h4>Options:</h4>
                                                    {editingOptions.map((opt, idx) => (
                                                        <div key={idx} style={{ display: "flex", gap: "10px", alignItems: "center", marginBottom: "5px" }}>
                                                            <input
                                                                type="text"
                                                                value={opt}
                                                                onChange={(e) => handleEditingOptionChange(idx, e.target.value)}
                                                                placeholder={`Option ${idx + 1}`}
                                                            />
                                                            {q.type === "correct_answer_type" && (
                                                                <label>
                                                                    <input
                                                                        type="radio"
                                                                        name={`correctOption-${q.id}`}
                                                                        checked={editingCorrectOption === opt}
                                                                        onChange={() => setEditingCorrectOption(opt)}
                                                                    />
                                                                    Correct
                                                                </label>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => removeEditingOption(idx)}
                                                                style={{ color: 'red' }}
                                                            >
                                                                ✕
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button type="button" onClick={addEditingOption}>+ Add Option</button>
                                                </div>
                                            )}

                                            <div className="edit-actions">
                                                <button onClick={() => updateQuestion(q.id, q)}>💾 Save</button>
                                                <button onClick={cancelEditing}>Cancel</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="question-display">
                                            <div className="question-header">
                                                <b>{q.question_text}</b>
                                                <span className="question-type">({q.type})</span>
                                                <div className="question-actions">
                                                    <button onClick={() => startEditingQuestion(q)}>✏️ Edit</button>
                                                    <button onClick={() => deleteQuestion(q.id)}>🗑 Delete</button>
                                                </div>
                                            </div>
                                            {q.options.length > 0 && (
                                                <ul className="options-list">
                                                    {q.options.map((opt, idx) => (
                                                        <li key={idx}>
                                                            {opt}
                                                            {q.correct_option_value === opt && <span className="correct-indicator">✅</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                        <button onClick={() => setViewQuizModalOpen(false)}>✕ Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RbacFacultyPage;