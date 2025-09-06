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
    const [date, setDate] = useState<string>("");
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [quizModalOpen, setQuizModalOpen] = useState(false);
    const [currentSession, setCurrentSession] = useState<Session | null>(null);
    const [tempQuestions, setTempQuestions] = useState<Question[]>([]);
    const [tempQuestionText, setTempQuestionText] = useState("");
    const [tempQuestionType, setTempQuestionType] = useState<QuestionType>("long_text");
    const [tempOptions, setTempOptions] = useState<string[]>([""]);
    const [selectedCorrectOption, setSelectedCorrectOption] = useState<string>("");

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
        setSelectedCorrectOption("");
    };

    const handleOptionChange = (index: number, value: string) => {
        const updated = [...tempOptions];
        updated[index] = value;
        setTempOptions(updated);
    };

    const addOptionField = () => setTempOptions([...tempOptions, ""]);

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

        // Reset fields
        setTempQuestionText("");
        setTempQuestionType("long_text");
        setTempOptions([""]);
        setSelectedCorrectOption("");
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
                type: q.question_type as QuestionType,
                options: Array.isArray(q.options) ? q.options : (q.options ? JSON.parse(q.options) : []),
                correct_answer: q.correct_option_value,
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
                                {q.options.length > 0 && (
                                    <ul>
                                        {q.options.map((opt, oIdx) => (
                                            <li key={oIdx}>
                                                {opt} {q.correct_option_value === opt && "✅"}
                                            </li>
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
                                    setTempQuestionType(e.target.value as QuestionType)
                                }
                            >
                                <option value="long_text">Descriptive</option>
                                <option value="multiple_choice">Multiple Choice</option>
                                <option value="correct_answer_type">Correct Answer Type</option>
                            </select>

                            {(tempQuestionType === "multiple_choice" || tempQuestionType === "correct_answer_type") && (
                                <div>
                                    {tempOptions.map((opt, idx) => (
                                        <div key={idx} style={{ display: "flex", gap: "10px", marginBottom: "5px" }}>
                                            <input
                                                type="text"
                                                placeholder={`Option ${idx + 1}`}
                                                value={opt}
                                                onChange={(e) => handleOptionChange(idx, e.target.value)}
                                            />
                                            {tempQuestionType === "correct_answer_type" && (
                                                <input
                                                    type="radio"
                                                    name="correctOption"
                                                    checked={selectedCorrectOption === opt}
                                                    onChange={() => setSelectedCorrectOption(opt)}
                                                />
                                            )}
                                            {tempQuestionType === "correct_answer_type" && <span>Correct</span>}
                                        </div>
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
                                            {question.type === 'multiple_choice'
                                                ? '☑️ Multiple Choice'
                                                : question.type === 'correct_answer_type'
                                                    ? '✔️ Correct Answer Type'
                                                    : '📝 Long Answer'}
                                        </div>

                                        <div className="question-text">
                                            {question.question_text}
                                        </div>

                                        {question.options.length > 0 ? (
                                            <ul className="quiz-options">
                                                {question.options.map((opt, optionIndex) => (
                                                    <li key={optionIndex}>
                                                        {opt} {question.correct_option_value === opt && "✅"}
                                                    </li>
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
