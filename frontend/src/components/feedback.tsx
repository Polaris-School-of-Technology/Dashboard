import React, { useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import "./feedback.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

const FeedbackPage: React.FC = () => {
    const { session_id } = useParams<{ session_id: string }>();
    const [showModal, setShowModal] = useState(false);

    // Store multiple new questions
    const [newQuestions, setNewQuestions] = useState<
        { question_text: string; type: string; options: string[] }[]
    >([]);

    // Temporary input for adding a new question
    const [tempQuestion, setTempQuestion] = useState("");
    const [tempQuestionType, setTempQuestionType] = useState("long_text");
    const [tempOptions, setTempOptions] = useState<string[]>([""]);

    const handleOptionChange = (index: number, value: string) => {
        const updated = [...tempOptions];
        updated[index] = value;
        setTempOptions(updated);
    };

    const addOptionField = () => setTempOptions([...tempOptions, ""]);

    // Add current temp question to newQuestions list
    const addNewQuestionToList = () => {
        if (!tempQuestion.trim()) {
            alert("Please enter a question");
            return;
        }

        setNewQuestions((prev) => [
            ...prev,
            {
                question_text: tempQuestion,
                type: tempQuestionType,
                options:
                    tempQuestionType === "multiple_choice"
                        ? tempOptions.filter((opt) => opt.trim() !== "")
                        : [],
            },
        ]);

        // Reset temp inputs
        setTempQuestion("");
        setTempQuestionType("long_text");
        setTempOptions([""]);
        setShowModal(false);
    };

    // Final save to backend
    const handleSaveQuiz = async () => {
        if (!session_id) {
            alert("Invalid session ID.");
            return;
        }

        if (newQuestions.length === 0) {
            alert("Please add at least one question.");
            return;
        }

        try {
            const payload = { newQuestions };

            await axios.post(
                `${API_BASE_URL}/api/schedule/classSessions/${session_id}/quiz`,
                payload
            );

            alert("Quiz created successfully!");
            setNewQuestions([]);
        } catch (err) {
            console.error("Error saving quiz:", err);
            alert("Failed to save quiz.");
        }
    };

    return (
        <div className="quiz-container">
            <h2 className="title">Create Quiz for Session {session_id}</h2>

            {/* Already Added New Questions Preview */}
            {newQuestions.length > 0 && (
                <div className="questions-section">
                    <h3>New Questions to Add</h3>
                    {newQuestions.map((q, idx) => (
                        <div key={idx} className="question-card">
                            {q.question_text} ({q.type})
                        </div>
                    ))}
                </div>
            )}

            {/* Add New Question Button */}
            <button className="create-btn" onClick={() => setShowModal(true)}>
                + Add New Question
            </button>

            {/* Modal */}
            {showModal && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div className="modal-header">Add a New Question</div>

                        <input
                            type="text"
                            placeholder="Enter question"
                            value={tempQuestion}
                            onChange={(e) => setTempQuestion(e.target.value)}
                        />

                        <select
                            value={tempQuestionType}
                            onChange={(e) => setTempQuestionType(e.target.value)}
                        >
                            <option value="long_text">Long Text</option>
                            <option value="multiple_choice">Multiple Choice</option>
                        </select>

                        {tempQuestionType === "multiple_choice" && (
                            <div>
                                <h4>Options:</h4>
                                {tempOptions.map((opt, idx) => (
                                    <input
                                        key={idx}
                                        type="text"
                                        placeholder={`Option ${idx + 1}`}
                                        value={opt}
                                        onChange={(e) =>
                                            handleOptionChange(idx, e.target.value)
                                        }
                                    />
                                ))}
                                <button onClick={addOptionField}>+ Add Option</button>
                            </div>
                        )}

                        <div className="modal-actions">
                            <button
                                className="modal-btn cancel"
                                onClick={() => setShowModal(false)}
                            >
                                Cancel
                            </button>
                            <button className="modal-btn save" onClick={addNewQuestionToList}>
                                Add Question
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <button className="submit-btn" onClick={handleSaveQuiz}>
                Save Quiz
            </button>
        </div>
    );
};

export default FeedbackPage;