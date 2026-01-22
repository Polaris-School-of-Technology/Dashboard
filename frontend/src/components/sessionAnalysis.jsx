import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import {
    PieChart, Pie, Cell, Tooltip, Legend,
    ResponsiveContainer, BarChart, Bar,
    XAxis, YAxis, CartesianGrid
} from "recharts";

import StudentFeedback from "./studentResponsesForTextQuestions";

const API_BASE_URL = process.env.REACT_APP_API_URL;

const AnalyticsDashboard = () => {
    const [selectedDate, setSelectedDate] = useState(null);
    const [analytics, setAnalytics] = useState([]);
    const [tab, setTab] = useState("summary");

    const [facultyList, setFacultyList] = useState([]);
    const [questionList, setQuestionList] = useState([]);
    const [selectedFaculty, setSelectedFaculty] = useState("all");
    const [selectedQuestion, setSelectedQuestion] = useState(null);
    const [startDate, setStartDate] = useState(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const [endDate, setEndDate] = useState(new Date());
    const [feedbackData, setFeedbackData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const COLORS = ["#10b981", "#ef4444"];

    /* ---------------- SUMMARY / QUIZ ANALYTICS ---------------- */

    useEffect(() => {
        if (!selectedDate) return;

        const dateStr = selectedDate.toISOString().split("T")[0];

        axios
            .get(`${API_BASE_URL}/api/analysis/analytics?date=${dateStr}`)
            .then(res => {
                setAnalytics(Array.isArray(res.data) ? res.data : []);
            })
            .catch(err => {
                console.error(err);
                setAnalytics([]);
            });
    }, [selectedDate]);

    /* ---------------- INITIAL DATA FOR ANALYSIS TAB ---------------- */

    useEffect(() => {
        if (tab !== "analysis") return;

        const fetchInitialData = async () => {
            try {
                const [facultyRes, questionRes] = await Promise.all([
                    axios.get(`${API_BASE_URL}/api/faculty-rating/analytics/faculty-list`),
                    axios.get(`${API_BASE_URL}/api/other-analysis/getAllQuestions`)
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
    }, [tab, selectedQuestion]);

    /* ---------------- FETCH FEEDBACK DATA ---------------- */

    const fetchFeedbackData = useCallback(async () => {
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
                end_date: endDate.toISOString().split("T")[0]
            });

            const validData = res.data.data.filter(
                f => f.feedbacks && f.feedbacks.length > 0
            );

            setFeedbackData(validData);
        } catch (err) {
            console.error(err);
            setError("Failed to fetch feedback data");
        } finally {
            setLoading(false);
        }
    }, [selectedQuestion, selectedFaculty, startDate, endDate]);

    /* ---------------- HELPERS ---------------- */

    const processPieData = feedbacks => {
        const yes = feedbacks.filter(f => f?.toString().toLowerCase() === "yes").length;
        const no = feedbacks.filter(f => f?.toString().toLowerCase() === "no").length;
        return [{ name: "Yes", value: yes }, { name: "No", value: no }];
    };

    const processBarData = feedbacks => {
        const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        feedbacks.forEach(f => f >= 1 && f <= 5 && counts[f]++);
        return Object.keys(counts).map(k => ({ rating: k, count: counts[k] }));
    };

    const CustomTooltip = ({ active, payload }) => {
        if (!active || !payload?.length) return null;
        const data = payload[0];
        return (
            <div style={{ background: "#fff", padding: 12, borderRadius: 8 }}>
                <strong>{data.name}</strong>
                <div>Count: {data.value}</div>
            </div>
        );
    };

    /* ---------------- RENDER ---------------- */

    return (
        <div>
            {/* Tabs */}
            <button onClick={() => setTab("summary")}>Summary</button>
            <button onClick={() => setTab("quiz")}>Quiz</button>
            <button onClick={() => setTab("analysis")}>Analysis</button>
            <button onClick={() => setTab("student-responses")}>Student Responses</button>

            {tab === "student-responses" && <StudentFeedback />}

            {tab === "analysis" && (
                <>
                    <select
                        value={selectedQuestion ?? ""}
                        onChange={e => setSelectedQuestion(Number(e.target.value))}
                    >
                        {questionList.map(q => (
                            <option key={q.id} value={q.id}>
                                {q.question_text}
                            </option>
                        ))}
                    </select>

                    <button onClick={fetchFeedbackData} disabled={loading}>
                        {loading ? "Loading..." : "Analyze"}
                    </button>

                    {error && <div style={{ color: "red" }}>{error}</div>}

                    {feedbackData.map(faculty => (
                        <div key={faculty.faculty_name}>
                            <h3>{faculty.faculty_name}</h3>

                            {(selectedQuestion === 5 || selectedQuestion === 7) && (
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={processPieData(faculty.feedbacks)}
                                            dataKey="value"
                                            label
                                        >
                                            {processPieData(faculty.feedbacks).map((_, i) => (
                                                <Cell key={i} fill={COLORS[i]} />
                                            ))}
                                        </Pie>
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            )}

                            {(selectedQuestion === 6 || selectedQuestion === 8) && (
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={processBarData(faculty.feedbacks)}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="rating" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="count" fill="#10b981" />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    ))}
                </>
            )}
        </div>
    );
};

export default AnalyticsDashboard;
