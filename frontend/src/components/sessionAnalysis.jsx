import React, { useState, useEffect } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

// Import the separate StudentFeedback component
import StudentFeedback from './studentResponsesForTextQuestions'

const API_BASE_URL = process.env.REACT_APP_API_URL;

const AnalyticsDashboard = () => {
    const [selectedDate, setSelectedDate] = useState(null);
    const [analytics, setAnalytics] = useState([]);
    const [tab, setTab] = useState("summary");

    // Analysis tab state
    const [facultyList, setFacultyList] = useState([]);
    const [questionList, setQuestionList] = useState([]);
    const [selectedFaculty, setSelectedFaculty] = useState("all");
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState(new Date());
    const [feedbackData, setFeedbackData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const COLORS = ["#facc15", "#f97316"]; // Yellow and orange highlight colors

    // Modern styles object
    const styles = {
        container: {
            background: "radial-gradient(circle at top, #121212 0%, #060606 100%)",
            minHeight: "100vh",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            color: "#f8f3c8"
        },
        header: {
            background: "rgba(0, 0, 0, 0.5)",
            borderBottom: "1px solid rgba(255, 204, 63, 0.18)",
            position: "relative",
            overflow: "hidden",
            backdropFilter: "blur(10px)",
            padding: "16px 24px"
        },
        navTabs: {
            display: "flex",
            background: "none",
            border: "none",
            position: "relative",
            gap: "12px",
            flexWrap: "wrap",
            alignItems: "center"
        },
        navTab: {
            background: "rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 204, 63, 0.15)",
            color: "#ffffff",
            padding: "14px 24px",
            fontWeight: "700",
            fontSize: "14px",
            textTransform: "uppercase",
            letterSpacing: "1px",
            cursor: "pointer",
            transition: "all 0.25s ease",
            position: "relative",
            overflow: "hidden",
            borderRadius: "12px"
        },
        navTabActive: {
            background: "linear-gradient(135deg, rgba(255, 204, 63, 0.25) 0%, rgba(255, 204, 63, 0.15) 100%)",
            color: "#ffcc3f",
            boxShadow: "0 8px 20px rgba(250, 204, 21, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 204, 63, 0.4)",
            position: "relative"
        },
        mainContent: {
            padding: "36px 24px 60px",
            maxWidth: "1380px",
            margin: "0 auto"
        },
        pageHeader: {
            textAlign: "center",
            marginBottom: "36px",
            color: "#f8f3c8",
            padding: "20px 0"
        },
        pageTitle: {
            fontSize: "44px",
            fontWeight: "800",
            marginBottom: "12px",
            color: "#ffcc3f",
            textShadow: "0 3px 18px rgba(255, 204, 63, 0.2)"
        },
        pageSubtitle: {
            fontSize: "18px",
            color: "rgba(248, 243, 200, 0.85)",
            fontWeight: "400"
        },
        filterSection: {
            background: "rgba(18, 18, 18, 0.88)",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "30px",
            boxShadow: "0 24px 50px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 204, 63, 0.12)",
            backdrop: "blur(10px)"
        },
        filterTitle: {
            fontSize: "20px",
            fontWeight: "700",
            color: "#ffcc3f",
            marginBottom: "25px",
            display: "flex",
            alignItems: "center"
        },
        filterGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "20px",
            alignItems: "end"
        },
        filterGroup: {
            display: "flex",
            flexDirection: "column"
        },
        filterLabel: {
            fontWeight: "700",
            color: "rgba(248, 243, 200, 0.9)",
            marginBottom: "10px",
            fontSize: "13px",
            textTransform: "uppercase",
            letterSpacing: "1px"
        },
        filterSelect: {
            padding: "14px 16px",
            border: "1px solid rgba(255, 204, 63, 0.2)",
            borderRadius: "12px",
            fontSize: "15px",
            transition: "all 0.25s ease",
            background: "rgba(15, 15, 15, 0.8)",
            color: "#f8f3c8",
            boxShadow: "inset 0 1px 3px rgba(0,0,0,0.3), 0 0 0 0 rgba(255, 204, 63, 0)"
        },
        analyzeBtn: {
            background: "linear-gradient(135deg, #ffcc3f 0%, #ffa500 100%)",
            color: "#111",
            border: "none",
            padding: "14px 28px",
            borderRadius: "12px",
            fontWeight: "700",
            fontSize: "14px",
            textTransform: "uppercase",
            letterSpacing: "1px",
            cursor: "pointer",
            transition: "all 0.25s ease",
            boxShadow: "0 14px 30px rgba(255, 204, 63, 0.25)",
            width: "100%"
        },
        resultsSection: {
            background: "rgba(16, 16, 16, 0.88)",
            borderRadius: "16px",
            padding: "30px",
            marginBottom: "20px",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.04)",
            border: "1px solid rgba(255, 204, 63, 0.12)"
        },
        facultyName: {
            textAlign: "center",
            fontSize: "32px",
            fontWeight: "800",
            color: "#ffcc3f",
            marginBottom: "25px",
            textShadow: "0 2px 12px rgba(255, 204, 63, 0.18)"
        },
        questionHighlight: {
            background: "rgba(15, 15, 15, 0.8)",
            borderRadius: "12px",
            padding: "22px",
            marginBottom: "20px",
            borderLeft: "5px solid #ffcc3f",
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.03)"
        },
        questionLabel: {
            fontSize: "14px",
            fontWeight: "700",
            color: "#ffcc3f",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "10px"
        },
        questionText: {
            fontSize: "18px",
            fontWeight: "700",
            color: "#f8f3c8",
            lineHeight: "1.6",
            background: "none"
        },
        modernTable: {
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "0",
            background: "#0a0a0a",
            borderRadius: "14px",
            overflow: "hidden",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.03)"
        },
        tableHeader: {
            background: "rgba(30, 30, 30, 0.95)",
            color: "#ffcc3f",
            borderBottom: "2px solid rgba(255, 204, 63, 0.15)"
        },
        tableHeaderCell: {
            padding: "16px",
            fontWeight: "700",
            fontSize: "14px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            textAlign: "left",
            color: "#ffcc3f"
        },
        tableCell: {
            padding: "12px 16px",
            borderBottom: "1px solid rgba(255, 204, 63, 0.08)",
            color: "#e8e4d0",
            transition: "background-color 0.2s ease"
        },
        tableRow: {
            transition: "all 0.2s ease"
        }
    };

    useEffect(() => {
        if (selectedDate) {
            const dateStr = selectedDate.toISOString().split("T")[0];
            axios.get(`${API_BASE_URL}/api/analysis/analytics?date=${dateStr}`)
                .then(response => {
                    setAnalytics(Array.isArray(response.data) ? response.data : []);
                })
                .catch(err => {
                    console.error(err);
                    setAnalytics([]);
                });
        }
    }, [selectedDate]);

    // Fetch faculty list and questions for analysis tab
    useEffect(() => {
        if (tab === "analysis") {
            const fetchInitialData = async () => {
                try {
                    const [facultyRes, questionRes] = await Promise.all([
                        axios.get(`${API_BASE_URL}/api/faculty-rating/analytics/faculty-list`),
                        axios.get(`${API_BASE_URL}/api/other-analysis/getAllQuestions`),
                    ]);

                    setFacultyList(facultyRes.data);
                    setQuestionList(questionRes.data.data);

                    if (questionRes.data.data.length > 0 && !selectedQuestion) {
                        setSelectedQuestion(questionRes.data.data[0].id);
                    }
                } catch (err) {
                    console.error(err);
                    setError("Failed to fetch initial data");
                }
            };
            fetchInitialData();
        }
    }, [tab]);

    // Fetch feedback data for analysis
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
                (faculty) => faculty.feedbacks && faculty.feedbacks.length > 0
            );

            setFeedbackData(validData);
        } catch (err) {
            console.error(err);
            setError("Failed to fetch feedback data");
        } finally {
            setLoading(false);
        }
    };

    // Helper function to get rating color
    const getRatingStyle = (rating) => {
        const numRating = parseFloat(rating);
        if (numRating >= 4.5) {
            return { backgroundColor: '#facc15', color: '#111827', fontWeight: 'bold' };
        } else if (numRating >= 4.0) {
            return { backgroundColor: 'rgba(250, 204, 21, 0.25)', color: '#facc15', fontWeight: 'bold' };
        } else {
            return { backgroundColor: '#1f2937', color: '#facc15', fontWeight: 'bold' };
        }
    };

    // Pie chart helper
    const processPieData = (feedbacks) => {
        const validFeedbacks = feedbacks.filter(f => f);
        const yesCount = validFeedbacks.filter(f => f && f.toString().toLowerCase() === "yes").length;
        const noCount = validFeedbacks.filter(f => f && f.toString().toLowerCase() === "no").length;
        return [
            { name: "Yes", value: yesCount },
            { name: "No", value: noCount },
        ];
    };

    // Bar chart helper
    const processBarData = (feedbacks) => {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        feedbacks.forEach(f => {
            if (f && f >= 1 && f <= 5) counts[f] += 1;
        });
        return Object.keys(counts).map(key => ({ rating: key, count: counts[Number(key)] }));
    };

    const CustomTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            const data = payload[0];
            return (
                <div style={{ background: "#0f172a", padding: "12px 16px", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.35)", border: "1px solid rgba(250, 204, 21, 0.3)" }}>
                    <p style={{ margin: "0 0 4px 0", fontWeight: "bold", color: "#facc15" }}>{data.name}</p>
                    <p style={{ margin: "2px 0", fontSize: "14px", color: "#f8fafc" }}>Count: {data.value}</p>
                </div>
            );
        }
        return null;
    };

    const renderLabel = (entry) => `${(entry.percent * 100).toFixed(0)}%`;

    return (
        <div style={styles.container}>
            {/* Modern Header */}
            <div style={styles.header}>
                <div style={styles.navTabs}>
                    <button
                        style={{
                            ...styles.navTab,
                            ...(tab === "summary" ? styles.navTabActive : {})
                        }}
                        onClick={() => setTab("summary")}
                    >
                        Session Summary
                    </button>
                    <button
                        style={{
                            ...styles.navTab,
                            ...(tab === "quiz" ? styles.navTabActive : {})
                        }}
                        onClick={() => setTab("quiz")}
                    >
                        Quiz Data
                    </button>
                    <button
                        style={{
                            ...styles.navTab,
                            ...(tab === "analysis" ? styles.navTabActive : {})
                        }}
                        onClick={() => setTab("analysis")}
                    >
                        Analysis
                    </button>
                    <button
                        style={{
                            ...styles.navTab,
                            ...(tab === "student-responses" ? styles.navTabActive : {})
                        }}
                        onClick={() => setTab("student-responses")}
                    >
                        Student Responses
                    </button>
                </div>
            </div>

            <div style={styles.mainContent}>
                {/* Date Picker - Only show for summary and quiz tabs */}
                {(tab === "summary" || tab === "quiz") && (
                    <>
                        <div style={styles.pageHeader}>
                            <h1 style={styles.pageTitle}>
                                {tab === "summary" ? "Session Summary" : "Quiz Data Analysis"}
                            </h1>
                            <p style={styles.pageSubtitle}>
                                {tab === "summary" ? "Comprehensive session analytics and performance metrics" : "Detailed quiz performance analysis"}
                            </p>
                        </div>

                        <div style={styles.filterSection}>
                            <h2 style={styles.filterTitle}>
                                Filter Options
                            </h2>
                            <div style={styles.filterGroup}>
                                <label style={styles.filterLabel}>Select Date:</label>
                                <input
                                    type="date"
                                    value={selectedDate ? selectedDate.toISOString().split("T")[0] : ""}
                                    onChange={(e) => setSelectedDate(e.target.value ? new Date(e.target.value) : null)}
                                    style={styles.filterSelect}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Student Responses Tab */}
                {tab === "student-responses" && (
                    <div style={{ background: "rgba(10, 10, 10, 0.8)", borderRadius: "14px", padding: "20px", marginTop: "20px", boxShadow: "0 10px 25px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 204, 63, 0.12)" }}>
                        <StudentFeedback />
                    </div>
                )}

                {/* Session Summary Tab */}
                {tab === "summary" && (
                    <div style={{ background: "rgba(8, 8, 8, 0.8)", borderRadius: "14px", overflow: "hidden", boxShadow: "0 10px 25px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 204, 63, 0.12)" }}>
                        <table style={styles.modernTable}>
                            <thead style={styles.tableHeader}>
                                <tr>
                                    <th style={styles.tableHeaderCell}>Session ID</th>
                                    <th style={styles.tableHeaderCell}>Faculty</th>
                                    <th style={styles.tableHeaderCell}>Course</th>
                                    <th style={styles.tableHeaderCell}>Batch</th>
                                    <th style={styles.tableHeaderCell}>Attendance Rate</th>
                                    <th style={styles.tableHeaderCell}>Avg Rating</th>
                                    <th style={styles.tableHeaderCell}>Summary</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics.map((a, index) => (
                                    <tr
                                        key={a.session_id}
                                        style={{
                                            ...styles.tableRow,
                                            backgroundColor: index % 2 === 0 ? "rgba(10, 10, 10, 0.6)" : "rgba(5, 5, 5, 0.6)"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(30, 30, 30, 0.8)"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? "rgba(10, 10, 10, 0.6)" : "rgba(5, 5, 5, 0.6)"}
                                    >
                                        <td style={styles.tableCell}>{a.session_id}</td>
                                        <td style={styles.tableCell}>{a.faculty_name}</td>
                                        <td style={styles.tableCell}>{a.course_name}</td>
                                        <td style={styles.tableCell}>{a.batch_name}</td>
                                        <td style={styles.tableCell}>{a.attendance_rate}</td>
                                        <td style={{ ...styles.tableCell, ...getRatingStyle(a.average_rating) }}>
                                            {a.average_rating}
                                        </td>
                                        <td style={styles.tableCell}>{a.summary}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Quiz Tab */}
                {tab === "quiz" && (
                    <div style={{ background: "rgba(8, 8, 8, 0.8)", borderRadius: "14px", overflow: "hidden", boxShadow: "0 10px 25px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.03)", border: "1px solid rgba(255, 204, 63, 0.12)" }}>
                        <table style={styles.modernTable}>
                            <thead style={styles.tableHeader}>
                                <tr>
                                    <th style={styles.tableHeaderCell}>Session ID</th>
                                    <th style={styles.tableHeaderCell}>Faculty</th>
                                    <th style={styles.tableHeaderCell}>Course</th>
                                    <th style={styles.tableHeaderCell}>Avg Quiz Score</th>
                                    <th style={styles.tableHeaderCell}>Max</th>
                                    <th style={styles.tableHeaderCell}>Min</th>
                                    <th style={styles.tableHeaderCell}>Std Dev</th>
                                    <th style={styles.tableHeaderCell}>Above 90%</th>
                                    <th style={styles.tableHeaderCell}>Below 40%</th>
                                </tr>
                            </thead>
                            <tbody>
                                {analytics
                                    .filter((a) => a.avg_quiz_score && a.avg_quiz_score > 0)
                                    .map((a, index) => (
                                        <tr
                                            key={a.session_id}
                                            style={{
                                                ...styles.tableRow,
                                                backgroundColor: index % 2 === 0 ? "rgba(10, 10, 10, 0.6)" : "rgba(5, 5, 5, 0.6)"
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(30, 30, 30, 0.8)"}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? "rgba(10, 10, 10, 0.6)" : "rgba(5, 5, 5, 0.6)"}
                                        >
                                            <td style={styles.tableCell}>{a.session_id}</td>
                                            <td style={styles.tableCell}>{a.faculty_name}</td>
                                            <td style={styles.tableCell}>{a.course_name}</td>
                                            <td style={styles.tableCell}>{a.avg_quiz_score}</td>
                                            <td style={styles.tableCell}>{a.max_quiz_score}</td>
                                            <td style={styles.tableCell}>{a.min_quiz_score}</td>
                                            <td style={styles.tableCell}>{a.stddev_quiz_score}</td>
                                            <td style={styles.tableCell}>{a.above_90_count}</td>
                                            <td style={styles.tableCell}>{a.below_40_count}</td>
                                        </tr>
                                    ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Analysis Tab */}
                {tab === "analysis" && (
                    <>
                        {/* Header */}
                        <div style={styles.pageHeader}>
                            <h1 style={styles.pageTitle}>Question Feedback Analysis</h1>
                            <p style={styles.pageSubtitle}>Comprehensive analysis of student feedback across sessions</p>
                        </div>

                        {/* Controls Card */}
                        <div style={styles.filterSection}>
                            <h2 style={styles.filterTitle}>
                                Filter Options
                            </h2>

                            <div style={styles.filterGrid}>
                                <div style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>Question</label>
                                    <select
                                        value={selectedQuestion ?? ""}
                                        onChange={e => setSelectedQuestion(Number(e.target.value))}
                                        style={styles.filterSelect}
                                    >
                                        {questionList.map(q => (
                                            <option key={q.id} value={q.id}>{q.question_text}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>Faculty</label>
                                    <select
                                        value={selectedFaculty}
                                        onChange={e => setSelectedFaculty(e.target.value)}
                                        style={styles.filterSelect}
                                    >
                                        <option value="all">All Faculties</option>
                                        {facultyList.map(f => (
                                            <option key={f.faculty_id} value={f.faculty_name}>{f.faculty_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>Start Date</label>
                                    <DatePicker
                                        selected={startDate}
                                        onChange={date => date && setStartDate(date)}
                                        dateFormat="yyyy-MM-dd"
                                        style={styles.filterSelect}
                                        className="custom-datepicker"
                                    />
                                </div>

                                <div style={styles.filterGroup}>
                                    <label style={styles.filterLabel}>End Date</label>
                                    <DatePicker
                                        selected={endDate}
                                        onChange={date => date && setEndDate(date)}
                                        dateFormat="yyyy-MM-dd"
                                        minDate={startDate}
                                        style={styles.filterSelect}
                                        className="custom-datepicker"
                                    />
                                </div>

                                <div style={styles.filterGroup}>
                                    <button
                                        onClick={fetchFeedbackData}
                                        disabled={loading}
                                        style={{
                                            ...styles.analyzeBtn,
                                            background: loading ? "#9ca3af" : "linear-gradient(135deg, #f59e0b 0%, #facc15 100%)",
                                            cursor: loading ? "not-allowed" : "pointer",
                                            transform: "none"
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!loading) {
                                                e.target.style.transform = "translateY(-2px)";
                                                e.target.style.boxShadow = "0 15px 35px rgba(250, 204, 21, 0.4)";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!loading) {
                                                e.target.style.transform = "translateY(0)";
                                                e.target.style.boxShadow = "0 8px 25px rgba(250, 204, 21, 0.3)";
                                            }
                                        }}
                                    >
                                        {loading ? "Loading..." : "ANALYZE"}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Error Alert */}
                        {error && (
                            <div style={{
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                borderRadius: "12px",
                                padding: "1rem",
                                marginBottom: "1.5rem",
                                display: "flex",
                                alignItems: "center"
                            }}>
                                <span style={{ marginRight: "0.5rem", color: "#dc2626" }}>Error:</span>
                                <span style={{ color: "#991b1b" }}>{error}</span>
                            </div>
                        )}

                        {/* Results */}
                        {feedbackData.length > 0 && feedbackData.map(faculty => (
                            <div key={faculty.faculty_name} style={styles.resultsSection}>
                                <h2 style={styles.facultyName}>{faculty.faculty_name}</h2>

                                {/* Selected Question Display */}
                                <div style={styles.questionHighlight}>
                                    <div style={styles.questionLabel}>Selected Question:</div>
                                    <div style={styles.questionText}>
                                        {questionList.find(q => q.id === selectedQuestion)?.question_text || "Question not found"}
                                    </div>
                                </div>

                                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", color: "#f8fafc", marginBottom: "20px" }}>
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        <span style={{ marginRight: "0.5rem", color: "#f8fafc" }}>Sessions:</span>
                                        <strong style={{ color: "#facc15" }}>{faculty.session_count}</strong>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        <span style={{ marginRight: "0.5rem", color: "#f8fafc" }}>Courses:</span>
                                        <strong style={{ color: "#facc15" }}>{faculty.courses.join(", ")}</strong>
                                    </div>
                                </div>

                                {/* Chart Container */}
                                <div style={{
                                    background: "rgba(8, 8, 8, 0.8)",
                                    borderRadius: "14px",
                                    boxShadow: "0 10px 25px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
                                    border: "1px solid rgba(255, 204, 63, 0.12)",
                                    overflow: "hidden"
                                }}>
                                    {(selectedQuestion === 5 || selectedQuestion === 7) && (
                                        <div style={{ padding: "1.5rem" }}>
                                            <h3 style={{
                                                fontSize: "1.25rem",
                                                fontWeight: "600",
                                                color: "#facc15",
                                                marginBottom: "1rem",
                                                textAlign: "center"
                                            }}>
                                                Feedback Distribution
                                            </h3>
                                            <div style={{ background: "#0a0a0a", borderRadius: "8px", padding: "1rem", border: "1px solid rgba(255, 204, 63, 0.12)" }}>
                                                <ResponsiveContainer width="100%" height={350}>
                                                    <PieChart>
                                                        <Pie
                                                            data={processPieData(faculty.feedbacks)}
                                                            dataKey="value"
                                                            nameKey="name"
                                                            cx="50%"
                                                            cy="50%"
                                                            outerRadius={120}
                                                            label={renderLabel}
                                                            labelLine={false}
                                                        >
                                                            {processPieData(faculty.feedbacks).map((entry, index) => (
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#111827" strokeWidth={3} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip content={<CustomTooltip />} />
                                                        <Legend wrapperStyle={{ color: '#f8fafc' }} />
                                                    </PieChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {(selectedQuestion === 6 || selectedQuestion === 8) && (
                                        <div style={{ padding: "1.5rem" }}>
                                            <h3 style={{
                                                fontSize: "1.25rem",
                                                fontWeight: "600",
                                                color: "#facc15",
                                                marginBottom: "1rem",
                                                textAlign: "center"
                                            }}>
                                                Rating Distribution
                                            </h3>
                                            <div style={{ background: "#0a0a0a", borderRadius: "8px", padding: "1rem", border: "1px solid rgba(255, 204, 63, 0.12)" }}>
                                                <ResponsiveContainer width="100%" height={350}>
                                                    <BarChart data={processBarData(faculty.feedbacks)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                                                        <XAxis dataKey="rating" tick={{ fill: '#f8fafc' }} />
                                                        <YAxis tick={{ fill: '#f8fafc' }} />
                                                        <Tooltip content={<CustomTooltip />} />
                                                        <Legend wrapperStyle={{ color: '#f8fafc' }} />
                                                        <Bar dataKey="count" fill="#facc15" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {/* Sessions Details */}
                                    <div style={{
                                        borderTop: "1px solid rgba(255, 204, 63, 0.12)",
                                        padding: "1.5rem",
                                        background: "#0a0a0a"
                                    }}>
                                        <h4 style={{
                                            fontSize: "1.125rem",
                                            fontWeight: "600",
                                            color: "#f8fafc",
                                            marginBottom: "0.75rem",
                                            display: "flex",
                                            alignItems: "center"
                                        }}>
                                            Session History
                                        </h4>
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                                            {faculty.sessions.map(session => (
                                                <span key={session.session_id} style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    padding: "0.5rem 0.75rem",
                                                    background: "#1f2937",
                                                    color: "#facc15",
                                                    fontSize: "0.875rem",
                                                    fontWeight: "500",
                                                    borderRadius: "9999px",
                                                    border: "1px solid rgba(250, 204, 21, 0.25)"
                                                }}>
                                                    {session.course_name} - {new Date(session.session_datetime).toLocaleDateString()}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* No Data State */}
                        {feedbackData.length === 0 && !loading && (
                            <div style={{
                                background: "rgba(8, 8, 8, 0.8)",
                                borderRadius: "14px",
                                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
                                padding: "3rem",
                                textAlign: "center",
                                border: "1px solid rgba(255, 204, 63, 0.12)"
                            }}>
                                <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📊</div>
                                <h3 style={{ fontSize: "1.25rem", fontWeight: "500", color: "#facc15", marginBottom: "0.5rem" }}>
                                    No Data Available
                                </h3>
                                <p style={{ color: "#e5e7eb" }}>
                                    No feedback data found for the selected filters. Try adjusting your search criteria.
                                </p>
                            </div>
                        )}
                    </>
                )}

                {/* Color Legend - Only show for summary and quiz tabs */}
                {(tab === "summary" || tab === "quiz") && (
                    <div style={{
                        marginTop: "2rem",
                        padding: "1.5rem",
                        background: "rgba(10, 10, 10, 0.8)",
                        borderRadius: "14px",
                        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.03)",
                        border: "1px solid rgba(255, 204, 63, 0.12)"
                    }}>
                        <h4 style={{ fontWeight: "600", marginBottom: "1rem", color: "#f8fafc" }}>Rating Color Guide:</h4>
                        <div style={{ display: "flex", gap: "1rem", fontSize: "0.875rem", flexWrap: "wrap" }}>
                            <span style={{
                                backgroundColor: '#facc15',
                                color: '#111827',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                fontWeight: 'bold',
                                border: '2px solid rgba(250, 204, 21, 0.5)'
                            }}>
                                4.5+ Excellent
                            </span>
                            <span style={{
                                backgroundColor: '#fde68a',
                                color: '#92400e',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                fontWeight: 'bold',
                                border: '2px solid rgba(250, 204, 21, 0.45)'
                            }}>
                                4.0-4.49 Good
                            </span>
                            <span style={{
                                backgroundColor: '#1f2937',
                                color: '#facc15',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                fontWeight: 'bold',
                                border: '2px solid rgba(250, 204, 21, 0.35)'
                            }}>
                                Below 4.0 Needs Improvement
                            </span>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom CSS for DatePicker */}
            <style jsx>{`
                .custom-datepicker .react-datepicker-wrapper {
                    width: 100%;
                }
                .custom-datepicker input {
                    width: 100%;
                    padding: 12px 16px;
                    border: 2px solid #374151;
                    border-radius: 12px;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    background: #0f172a;
                    color: #f8fafc;
                }
                .custom-datepicker input:focus {
                    outline: none;
                    border-color: #facc15;
                    box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.15);
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
};

export default AnalyticsDashboard;