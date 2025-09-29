import React, { useState, useEffect } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

interface Faculty {
    faculty_id: string;
    faculty_name: string;
}

interface Question {
    id: number;
    question_text: string;
}

interface FacultyData {
    faculty_name: string;
    total_responses: number;
    session_count: number;
    courses: string[];
    sessions: {
        session_id: number;
        session_datetime: string;
        section_id: number;
        course_name: string;
    }[];
    feedbacks: (string | number | null)[];
}

const COLORS = ["#10b981", "#ef4444"]; // Green = Yes, Red = No

const QuestionAnalysis: React.FC = () => {
    const [facultyList, setFacultyList] = useState<Faculty[]>([]);
    const [questionList, setQuestionList] = useState<Question[]>([]);
    const [selectedFaculty, setSelectedFaculty] = useState("all");
    const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState(new Date());
    const [feedbackData, setFeedbackData] = useState<FacultyData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch faculty list and questions on mount
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [facultyRes, questionRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/faculty-rating/analytics/faculty-list`),
                    axios.get(`${API_BASE_URL}/api/other-analysis/getAllQuestions`),
                ]);

                setFacultyList(facultyRes.data);
                setQuestionList(questionRes.data.data);

                if (questionRes.data.data.length > 0) {
                    setSelectedQuestion(questionRes.data.data[0].id);
                }
            } catch (err) {
                console.error(err);
                setError("Failed to fetch initial data");
            }
        };
        fetchInitialData();
    }, []);

    // Fetch feedback data
    const fetchFeedbackData = async () => {
        if (!selectedQuestion) {
            setError("Please select a question");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let url = "";
            if (selectedQuestion === 5) url = `${API_BASE_URL}/api/other-analysis/piechart-question5`;
            else if (selectedQuestion === 6) url = `${API_BASE_URL}/api/other-analysis/barChart`;
            else if (selectedQuestion === 7) url = `${API_BASE_URL}/api/other-analysis/piechart-question7`;
            else if (selectedQuestion === 8) url = `${API_BASE_URL}/api/other-analysis/barChartQuestion8`;
            else {
                setFeedbackData([]);
                setLoading(false);
                return;
            }

            const res = await axios.post(url, {
                questionId: selectedQuestion,
                facultyId: selectedFaculty !== "all" ? selectedFaculty : undefined,
                start_date: startDate.toISOString().split("T")[0],
                end_date: endDate.toISOString().split("T")[0],
            });

            const validData = res.data.data.filter(
                (faculty: FacultyData) => faculty.feedbacks && faculty.feedbacks.length > 0
            );

            setFeedbackData(validData);
        } catch (err) {
            console.error(err);
            setError("Failed to fetch feedback data");
        } finally {
            setLoading(false);
        }
    };

    // Pie chart helper
    const processPieData = (feedbacks: (string | null)[]) => {
        const validFeedbacks = feedbacks.filter(f => f);
        const yesCount = validFeedbacks.filter(f => f && f.toString().toLowerCase() === "yes").length;
        const noCount = validFeedbacks.filter(f => f && f.toString().toLowerCase() === "no").length;
        return [
            { name: "Yes", value: yesCount },
            { name: "No", value: noCount },
        ];
    };

    // Bar chart helper
    const processBarData = (feedbacks: (number | null)[]) => {
        const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        feedbacks.forEach(f => {
            if (f && f >= 1 && f <= 5) counts[f] += 1;
        });
        return Object.keys(counts).map(key => ({ rating: key, count: counts[Number(key)] }));
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            return (
                <div style={{ background: "white", padding: "12px 16px", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>
                    <p style={{ margin: "0 0 4px 0", fontWeight: "bold", color: "#374151" }}>{data.name}</p>
                    <p style={{ margin: "2px 0", fontSize: "14px", color: "#6b7280" }}>Count: {data.value}</p>
                </div>
            );
        }
        return null;
    };

    const renderLabel = (entry: any) => `${(entry.percent * 100).toFixed(0)}%`;

    return (
        <div style={{ padding: "2rem", background: "#f0f4ff", minHeight: "100vh" }}>
            <h1 style={{ textAlign: "center", marginBottom: "1.5rem", fontSize: "2rem", fontWeight: "bold" }}>
                Question Feedback Analysis
            </h1>

            {/* Controls */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                <div>
                    <label>Question</label>
                    <select
                        value={selectedQuestion ?? ""}
                        onChange={e => setSelectedQuestion(Number(e.target.value))}
                        style={{ width: "100%", padding: "0.5rem" }}
                    >
                        {questionList.map(q => (
                            <option key={q.id} value={q.id}>{q.question_text}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Faculty</label>
                    <select
                        value={selectedFaculty}
                        onChange={e => setSelectedFaculty(e.target.value)}
                        style={{ width: "100%", padding: "0.5rem" }}
                    >
                        <option value="all">All Faculties</option>
                        {facultyList.map(f => (
                            <option key={f.faculty_id} value={f.faculty_name}>{f.faculty_name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label>Start Date</label>
                    <DatePicker
                        selected={startDate}
                        onChange={date => date && setStartDate(date)}
                        dateFormat="yyyy-MM-dd"
                        maxDate={new Date()}
                    />
                </div>

                <div>
                    <label>End Date</label>
                    <DatePicker
                        selected={endDate}
                        onChange={date => date && setEndDate(date)}
                        dateFormat="yyyy-MM-dd"
                        maxDate={new Date()}
                        minDate={startDate}
                    />
                </div>

                <div>
                    <button
                        onClick={fetchFeedbackData}
                        disabled={loading}
                        style={{ marginTop: "1.5rem", padding: "0.7rem 1.2rem", background: "blue", color: "white", border: "none", borderRadius: "5px" }}
                    >
                        {loading ? "Loading..." : "Fetch Feedback"}
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && <div style={{ color: "red", marginBottom: "1rem" }}>{error}</div>}

            {/* Results */}
            {feedbackData.length > 0 && feedbackData.map(faculty => (
                <div key={faculty.faculty_name} style={{ marginBottom: "3rem" }}>
                    <h2 style={{ marginBottom: "1rem", color: "#1e3a8a", fontSize: "1.5rem" }}>{faculty.faculty_name}</h2>

                    <div style={{
                        background: "white",
                        padding: "1rem",
                        borderRadius: "0.5rem",
                        marginBottom: "1rem",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                        gap: "1rem"
                    }}>
                        <div><strong>Total Sessions:</strong> {faculty.session_count}</div>




                        <div><strong>Courses:</strong> {faculty.courses.join(", ")}</div>
                    </div>

                    {selectedQuestion === 5 && (
                        <div style={{
                            background: "white",
                            padding: "1.5rem",
                            borderRadius: "1rem",
                            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                            marginBottom: "2rem"
                        }}>
                            <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem", textAlign: "center" }}>
                                Overall Feedback Distribution
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={processPieData(faculty.feedbacks as (string | null)[])}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={renderLabel}
                                    >
                                        {processPieData(faculty.feedbacks as (string | null)[]).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {selectedQuestion === 6 && (
                        <div style={{
                            background: "white",
                            padding: "1.5rem",
                            borderRadius: "1rem",
                            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                            marginBottom: "2rem"
                        }}>
                            <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem", textAlign: "center" }}>
                                Rating Distribution
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={processBarData(faculty.feedbacks as (number | null)[])}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="rating" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="count" fill="#10b981" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {selectedQuestion === 7 && (
                        <div style={{
                            background: "white",
                            padding: "1.5rem",
                            borderRadius: "1rem",
                            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                            marginBottom: "2rem"
                        }}>
                            <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem", textAlign: "center" }}>
                                Overall Feedback Distribution
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={processPieData(faculty.feedbacks as (string | null)[])}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={100}
                                        label={renderLabel}
                                    >
                                        {processPieData(faculty.feedbacks as (string | null)[]).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={2} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {selectedQuestion === 8 && (
                        <div style={{
                            background: "white",
                            padding: "1.5rem",
                            borderRadius: "1rem",
                            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                            marginBottom: "2rem"
                        }}>
                            <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem", textAlign: "center" }}>
                                Rating Distribution
                            </h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={processBarData(faculty.feedbacks as (number | null)[])}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="rating" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="count" fill="#10b981" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    <div style={{
                        background: "#f8f9fa",
                        padding: "1rem",
                        borderRadius: "0.5rem",
                        marginBottom: "1rem"
                    }}>
                        <h4 style={{ marginBottom: "0.5rem", color: "#6b7280" }}>Sessions Conducted:</h4>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                            {faculty.sessions.map(session => (
                                <span key={session.session_id} style={{
                                    background: "#e5e7eb",
                                    padding: "0.25rem 0.5rem",
                                    borderRadius: "0.25rem",
                                    fontSize: "0.875rem"
                                }}>
                                    {session.course_name} - {new Date(session.session_datetime).toLocaleDateString()}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
            ))}

            {feedbackData.length === 0 && !loading && (
                <p style={{ textAlign: "center", color: "#6b7280" }}>No data found for selected filters.</p>
            )}
        </div>
    );
};

export default QuestionAnalysis;
