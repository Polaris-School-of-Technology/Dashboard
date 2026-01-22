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

    const COLORS = ["#10b981", "#ef4444"]; // Green = Yes, Red = No

    // Modern styles object
    const styles = {
        container: {
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            minHeight: "100vh",
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
        },
        header: {
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(20px)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
            position: "relative",
            overflow: "hidden"
        },
        navTabs: {
            display: "flex",
            background: "none",
            border: "none",
            position: "relative"
        },
        navTab: {
            background: "none",
            border: "none",
            color: "rgba(255, 255, 255, 0.8)",
            padding: "18px 32px",
            fontWeight: "600",
            fontSize: "14px",
            textTransform: "uppercase",
            letterSpacing: "1px",
            cursor: "pointer",
            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            position: "relative",
            overflow: "hidden"
        },
        navTabActive: {
            background: "rgba(255, 255, 255, 0.2)",
            color: "white",
            boxShadow: "0 4px 15px rgba(0, 0, 0, 0.1)",
            position: "relative"
        },
        mainContent: {
            padding: "40px",
            maxWidth: "1400px",
            margin: "0 auto"
        },
        pageHeader: {
            textAlign: "center",
            marginBottom: "40px",
            color: "white"
        },
        pageTitle: {
            fontSize: "42px",
            fontWeight: "700",
            marginBottom: "12px",
            background: "linear-gradient(135deg, #ffffff 0%, #e0e7ff 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            textShadow: "0 2px 10px rgba(0, 0, 0, 0.1)"
        },
        pageSubtitle: {
            fontSize: "18px",
            color: "rgba(255, 255, 255, 0.8)",
            fontWeight: "300"
        },
        filterSection: {
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(20px)",
            borderRadius: "20px",
            padding: "30px",
            marginBottom: "30px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)"
        },
        filterTitle: {
            fontSize: "20px",
            fontWeight: "600",
            color: "#4a5568",
            marginBottom: "25px",
            display: "flex",
            alignItems: "center"
        },
        filterGrid: {
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "20px",
            alignItems: "end"
        },
        filterGroup: {
            display: "flex",
            flexDirection: "column"
        },
        filterLabel: {
            fontWeight: "600",
            color: "#4a5568",
            marginBottom: "8px",
            fontSize: "14px",
            textTransform: "uppercase",
            letterSpacing: "0.5px"
        },
        filterSelect: {
            padding: "12px 16px",
            border: "2px solid #e2e8f0",
            borderRadius: "12px",
            fontSize: "14px",
            transition: "all 0.3s ease",
            background: "white"
        },
        analyzeBtn: {
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white",
            border: "none",
            padding: "14px 32px",
            borderRadius: "12px",
            fontWeight: "600",
            fontSize: "14px",
            textTransform: "uppercase",
            letterSpacing: "1px",
            cursor: "pointer",
            transition: "all 0.3s ease",
            boxShadow: "0 8px 25px rgba(102, 126, 234, 0.3)",
            width: "100%"
        },
        resultsSection: {
            background: "linear-gradient(135deg, #d4ffd4 0%, #a8e6a8 100%)",
            borderRadius: "20px",
            padding: "30px",
            marginBottom: "20px",
            boxShadow: "0 20px 40px rgba(0, 0, 0, 0.05)",
            border: "1px solid rgba(168, 230, 168, 0.3)"
        },
        facultyName: {
            textAlign: "center",
            fontSize: "32px",
            fontWeight: "700",
            color: "#2d5a2d",
            marginBottom: "25px",
            textShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
        },
        questionHighlight: {
            background: "rgba(255, 255, 255, 0.9)",
            borderRadius: "15px",
            padding: "20px",
            marginBottom: "20px",
            borderLeft: "5px solid #667eea",
            boxShadow: "0 8px 25px rgba(0, 0, 0, 0.08)"
        },
        questionLabel: {
            fontSize: "14px",
            fontWeight: "600",
            color: "#667eea",
            textTransform: "uppercase",
            letterSpacing: "1px",
            marginBottom: "8px"
        },
        questionText: {
            fontSize: "18px",
            fontWeight: "600",
            color: "#2d3748",
            lineHeight: "1.5",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text"
        },
        modernTable: {
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "0",
            background: "white",
            borderRadius: "12px",
            overflow: "hidden",
            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)"
        },
        tableHeader: {
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            color: "white"
        },
        tableHeaderCell: {
            padding: "16px",
            fontWeight: "600",
            fontSize: "14px",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            textAlign: "left"
        },
        tableCell: {
            padding: "12px 16px",
            borderBottom: "1px solid #f1f5f9",
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
            return { backgroundColor: '#dcfce7', color: '#16a34a', fontWeight: 'bold' };
        } else if (numRating >= 4.0) {
            return { backgroundColor: '#fef3c7', color: '#d97706', fontWeight: 'bold' };
        } else {
            return { backgroundColor: '#fecaca', color: '#dc2626', fontWeight: 'bold' };
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
                <div style={{ background: "white", padding: "12px 16px", borderRadius: "8px", boxShadow: "0 10px 25px rgba(0,0,0,0.15)" }}>
                    <p style={{ margin: "0 0 4px 0", fontWeight: "bold", color: "#374151" }}>{data.name}</p>
                    <p style={{ margin: "2px 0", fontSize: "14px", color: "#6b7280" }}>Count: {data.value}</p>
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
                    <div style={{ background: "rgba(255, 255, 255, 0.95)", borderRadius: "20px", padding: "20px", marginTop: "20px" }}>
                        <StudentFeedback />
                    </div>
                )}

                {/* Session Summary Tab */}
                {tab === "summary" && (
                    <div style={{ background: "white", borderRadius: "12px", overflow: "hidden", boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)" }}>
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
                                            backgroundColor: index % 2 === 0 ? "#f8fafc" : "white"
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e2e8f0"}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? "#f8fafc" : "white"}
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
                    <div style={{ background: "white", borderRadius: "12px", overflow: "hidden", boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)" }}>
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
                                                backgroundColor: index % 2 === 0 ? "#f8fafc" : "white"
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#e2e8f0"}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? "#f8fafc" : "white"}
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
                                            background: loading ? "#9ca3af" : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                                            cursor: loading ? "not-allowed" : "pointer",
                                            transform: "none"
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!loading) {
                                                e.target.style.transform = "translateY(-2px)";
                                                e.target.style.boxShadow = "0 15px 35px rgba(102, 126, 234, 0.4)";
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!loading) {
                                                e.target.style.transform = "translateY(0)";
                                                e.target.style.boxShadow = "0 8px 25px rgba(102, 126, 234, 0.3)";
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

                                <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", color: "#2d5a2d", marginBottom: "20px" }}>
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        <span style={{ marginRight: "0.5rem" }}>Sessions:</span>
                                        <strong style={{ color: "#000000" }}>{faculty.session_count}</strong>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center" }}>
                                        <span style={{ marginRight: "0.5rem" }}>Courses:</span>
                                        <strong style={{ color: "#000000" }}>{faculty.courses.join(", ")}</strong>
                                    </div>
                                </div>

                                {/* Chart Container */}
                                <div style={{
                                    background: "white",
                                    borderRadius: "12px",
                                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                                    border: "1px solid #e5e7eb",
                                    overflow: "hidden"
                                }}>
                                    {(selectedQuestion === 5 || selectedQuestion === 7) && (
                                        <div style={{ padding: "1.5rem" }}>
                                            <h3 style={{
                                                fontSize: "1.25rem",
                                                fontWeight: "600",
                                                color: "#1f2937",
                                                marginBottom: "1rem",
                                                textAlign: "center"
                                            }}>
                                                Feedback Distribution
                                            </h3>
                                            <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "1rem" }}>
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
                                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#fff" strokeWidth={3} />
                                                            ))}
                                                        </Pie>
                                                        <Tooltip content={<CustomTooltip />} />
                                                        <Legend />
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
                                                color: "#1f2937",
                                                marginBottom: "1rem",
                                                textAlign: "center"
                                            }}>
                                                Rating Distribution
                                            </h3>
                                            <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "1rem" }}>
                                                <ResponsiveContainer width="100%" height={350}>
                                                    <BarChart data={processBarData(faculty.feedbacks)} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e4e7" />
                                                        <XAxis dataKey="rating" tick={{ fill: '#6b7280' }} />
                                                        <YAxis tick={{ fill: '#6b7280' }} />
                                                        <Tooltip />
                                                        <Legend />
                                                        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    )}

                                    {/* Sessions Details */}
                                    <div style={{
                                        borderTop: "1px solid #e5e7eb",
                                        padding: "1.5rem",
                                        background: "#f9fafb"
                                    }}>
                                        <h4 style={{
                                            fontSize: "1.125rem",
                                            fontWeight: "600",
                                            color: "#374151",
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
                                                    background: "#dbeafe",
                                                    color: "#1e40af",
                                                    fontSize: "0.875rem",
                                                    fontWeight: "500",
                                                    borderRadius: "9999px",
                                                    border: "1px solid #bfdbfe"
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
                                background: "white",
                                borderRadius: "20px",
                                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.1)",
                                padding: "3rem",
                                textAlign: "center",
                                border: "1px solid #e5e7eb"
                            }}>
                                <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📊</div>
                                <h3 style={{ fontSize: "1.25rem", fontWeight: "500", color: "#1f2937", marginBottom: "0.5rem" }}>
                                    No Data Available
                                </h3>
                                <p style={{ color: "#6b7280" }}>
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
                        background: "rgba(255, 255, 255, 0.9)",
                        borderRadius: "12px",
                        boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)"
                    }}>
                        <h4 style={{ fontWeight: "600", marginBottom: "1rem", color: "#374151" }}>Rating Color Guide:</h4>
                        <div style={{ display: "flex", gap: "1rem", fontSize: "0.875rem", flexWrap: "wrap" }}>
                            <span style={{
                                backgroundColor: '#dcfce7',
                                color: '#16a34a',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                fontWeight: 'bold',
                                border: '2px solid #bbf7d0'
                            }}>
                                4.5+ Excellent
                            </span>
                            <span style={{
                                backgroundColor: '#fef3c7',
                                color: '#d97706',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                fontWeight: 'bold',
                                border: '2px solid #fde68a'
                            }}>
                                4.0-4.49 Good
                            </span>
                            <span style={{
                                backgroundColor: '#fecaca',
                                color: '#dc2626',
                                padding: '8px 16px',
                                borderRadius: '20px',
                                fontWeight: 'bold',
                                border: '2px solid #fca5a5'
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
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    font-size: 14px;
                    transition: all 0.3s ease;
                    background: white;
                }
                .custom-datepicker input:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                    transform: translateY(-2px);
                }
            `}</style>
        </div>
    );
};

export default AnalyticsDashboard;