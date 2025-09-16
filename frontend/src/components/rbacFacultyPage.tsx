import React, { useState } from "react";
import axios from "axios";
import Papa from "papaparse";
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

    // CSV Import states
    const [showCsvImportModal, setShowCsvImportModal] = useState(false);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [csvImportError, setCsvImportError] = useState("");

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

    // CSV Import Functions
    const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'text/csv') {
            setCsvFile(file);
            setCsvImportError('');
        } else {
            setCsvImportError('Please select a valid CSV file');
        }
    };

    const processCsvFile = () => {
        if (!csvFile) return;

        Papa.parse(csvFile, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            complete: (results) => {
                try {
                    const importedQuestions: Question[] = [];
                    const errors: string[] = [];

                    results.data.forEach((row: any, index: number) => {
                        const rowNum = index + 1;

                        // Validate required fields
                        if (!row.question_text || typeof row.question_text !== 'string' || !row.question_text.trim()) {
                            errors.push(`Row ${rowNum}: Question text is required`);
                            return;
                        }

                        // Validate question type
                        const validTypes = ["long_text", "multiple_choice", "correct_answer_type"];
                        const questionType = row.type || "long_text";
                        if (!validTypes.includes(questionType)) {
                            errors.push(`Row ${rowNum}: Invalid question type. Must be one of: ${validTypes.join(", ")}`);
                            return;
                        }

                        // Parse options
                        let options: string[] = [];
                        if (row.options) {
                            try {
                                if (typeof row.options === 'string') {
                                    // Handle comma-separated options
                                    options = row.options.split(',').map((opt: string) => opt.trim()).filter((opt: string) => opt);
                                } else if (Array.isArray(row.options)) {
                                    options = row.options.filter((opt: any) => opt && typeof opt === 'string');
                                }
                            } catch (e) {
                                errors.push(`Row ${rowNum}: Invalid options format`);
                                return;
                            }
                        }

                        // Validate options for multiple choice and correct answer types
                        if ((questionType === "multiple_choice" || questionType === "correct_answer_type") && options.length === 0) {
                            errors.push(`Row ${rowNum}: Multiple choice and correct answer questions must have options`);
                            return;
                        }

                        // Validate correct answer ONLY for correct_answer_type
                        let correctAnswer = row.correct_option_value;
                        if (questionType === "correct_answer_type") {
                            if (!correctAnswer || correctAnswer.toString().trim() === '') {
                                errors.push(`Row ${rowNum}: Correct answer questions must specify the correct option`);
                                return;
                            }
                            // Convert to string for comparison
                            const correctAnswerStr = correctAnswer.toString().trim();
                            if (!options.includes(correctAnswerStr)) {
                                errors.push(`Row ${rowNum}: Correct option value must be one of the provided options`);
                                return;
                            }
                            correctAnswer = correctAnswerStr;
                        } else {
                            // For other question types, ignore correct_option_value
                            correctAnswer = undefined;
                        }

                        // Create question object
                        const question: Question = {
                            id: Date.now() + index,
                            question_text: row.question_text.trim(),
                            type: questionType as QuestionType,
                            options: options,
                            correct_option_value: correctAnswer
                        };

                        importedQuestions.push(question);
                    });

                    if (errors.length > 0) {
                        setCsvImportError(errors.join('\n'));
                        return;
                    }

                    if (importedQuestions.length > 0) {
                        setTempQuestions(prev => [...prev, ...importedQuestions]);
                        setShowCsvImportModal(false);
                        setCsvFile(null);
                        setCsvImportError('');
                        alert(`✅ Imported ${importedQuestions.length} questions successfully`);
                    } else {
                        setCsvImportError('No valid questions found in CSV file');
                    }
                } catch (error) {
                    setCsvImportError('Error processing CSV file');
                }
            },
            error: (error) => {
                setCsvImportError('Error reading CSV file: ' + error.message);
            }
        });
    };

    const downloadSampleCsv = () => {
        const sampleData = [
            {
                question_text: 'What is the capital of France?',
                type: 'multiple_choice',
                options: 'Paris,London,Berlin,Madrid',
                correct_option_value: ''
            },
            {
                question_text: 'What is 2 + 2?',
                type: 'correct_answer_type',
                options: '3,4,5,6',
                correct_option_value: '4'
            },
            {
                question_text: 'Explain the concept of photosynthesis',
                type: 'long_text',
                options: '',
                correct_option_value: ''
            }
        ];

        const csv = Papa.unparse(sampleData);
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'quiz_questions_sample.csv';
        a.click();
        window.URL.revokeObjectURL(url);
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

    // Remove temp question from list
    const removeTempQuestion = (id: number) => {
        setTempQuestions(prev => prev.filter(q => q.id !== id));
    };

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
        if (!currentSession || tempQuestions.length === 0) {
            alert("Please add at least one question before submitting");
            return;
        }

        try {
            // Transform questions to match backend format
            const questionsForBackend = tempQuestions.map(q => ({
                question_text: q.question_text,
                type: q.type,
                options: q.options,
                correct_option_value: q.correct_option_value
            }));

            await axios.post(`${API_BASE_URL}/api/rbacFaculty/rbacquiz/create/${currentSession.id}`, {
                newQuestions: questionsForBackend
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });

            alert("✅ Quiz created successfully");
            setQuizModalOpen(false);
            setTempQuestions([]);
        } catch (error: any) {
            console.error("Quiz submission error:", error);
            const errorMessage = error.response?.data?.message || error.response?.data?.errors?.join('\n') || "Failed to create quiz";
            alert("❌ " + errorMessage);
        }
    };

    // [Rest of your existing functions remain the same - handleViewQuiz, startEditingQuestion, etc.]

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

        if (editingCorrectOption === removedOption) {
            setEditingCorrectOption("");
        }
    };

    // Update question
    const updateQuestion = async (questionId: number, q: Question) => {
        try {
            const filteredOptions = editingOptions.filter(opt => opt.trim() !== "");

            if ((q.type === "multiple_choice" || q.type === "correct_answer_type") && filteredOptions.length === 0) {
                return alert("Add at least one option");
            }

            if (q.type === "correct_answer_type" && !editingCorrectOption) {
                return alert("Select the correct answer");
            }

            const payload: any = {
                question_text: q.question_text,
                question_type: q.type,
                options: filteredOptions
            };

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

                        {/* CSV Import Button */}
                        <div className="csv-import-section" style={{ marginBottom: "20px" }}>
                            <button
                                onClick={() => setShowCsvImportModal(true)}
                                className="csv-import-btn"
                                style={{ backgroundColor: "#28a745", color: "white", padding: "8px 16px", border: "none", borderRadius: "4px", cursor: "pointer" }}
                            >
                                📄 Import CSV Questions
                            </button>
                            <span style={{ marginLeft: "10px", fontSize: "14px", color: "#666" }}>
                                {tempQuestions.length} question{tempQuestions.length !== 1 ? 's' : ''} added
                            </span>
                        </div>

                        {/* Questions Preview */}
                        {tempQuestions.length > 0 && (
                            <div className="questions-preview" style={{ maxHeight: "200px", overflowY: "auto", marginBottom: "20px", border: "1px solid #ddd", padding: "10px", borderRadius: "4px" }}>
                                <h4>Added Questions:</h4>
                                {tempQuestions.map((q, index) => (
                                    <div key={q.id} className="question-preview" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", padding: "8px", backgroundColor: "#f8f9fa", borderRadius: "4px" }}>
                                        <div style={{ flex: 1 }} className="question-text">
                                            <strong style={{ whiteSpace: "pre-wrap", fontFamily: "monospace" }}>
                                                {index + 1}. {q.question_text}
                                            </strong>
                                            <div style={{ fontSize: "12px", color: "#666" }}>Type: {q.type}</div>
                                            {q.options.length > 0 && (
                                                <ul style={{ fontSize: "12px", margin: "5px 0" }}>
                                                    {q.options.map((opt, oIdx) =>
                                                        <li key={oIdx}>
                                                            {opt}
                                                            {q.correct_option_value === opt && " ✅"}
                                                        </li>
                                                    )}
                                                </ul>
                                            )}
                                        </div>


                                        <button
                                            onClick={() => removeTempQuestion(q.id)}
                                            style={{ color: "red", background: "none", border: "none", cursor: "pointer", fontSize: "16px" }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="question-form">
                            <textarea
                                placeholder="Question text"
                                value={tempQuestionText}
                                onChange={(e) => setTempQuestionText(e.target.value)}
                                rows={3}
                                style={{ width: "100%", whiteSpace: "pre-line" }}
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

            {/* CSV Import Modal */}
            {showCsvImportModal && (
                <div className="modal">
                    <div className="modal-content">
                        <h3>Import Questions from CSV</h3>

                        <div style={{ marginBottom: "15px" }}>
                            <p style={{ fontSize: "14px", color: "#666", marginBottom: "10px" }}>
                                Upload a CSV file with columns: <strong>question_text</strong>, <strong>type</strong>, <strong>options</strong>, and <strong>correct_option_value</strong>
                            </p>
                            <input
                                type="file"
                                accept=".csv"
                                onChange={handleCsvUpload}
                                style={{ width: "100%", padding: "8px", border: "1px solid #ddd", borderRadius: "4px" }}
                            />
                        </div>

                        {csvImportError && (
                            <div style={{ color: "red", fontSize: "12px", marginBottom: "10px", whiteSpace: "pre-line" }}>
                                {csvImportError}
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
                            <button
                                onClick={downloadSampleCsv}
                                style={{ fontSize: "12px", color: "#007bff", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                            >
                                📄 Download Sample CSV
                            </button>
                        </div>

                        <div className="modal-actions">
                            <button
                                onClick={() => {
                                    setShowCsvImportModal(false);
                                    setCsvFile(null);
                                    setCsvImportError('');
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={processCsvFile}
                                disabled={!csvFile}
                                style={{
                                    backgroundColor: csvFile ? "#28a745" : "#ccc",
                                    color: "white",
                                    cursor: csvFile ? "pointer" : "not-allowed"
                                }}
                            >
                                Import Questions
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Quiz Modal - keeping your existing implementation */}
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
                                                <pre className="question-code">
                                                    {q.question_text}
                                                </pre>

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