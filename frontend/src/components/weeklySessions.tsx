import React, { useEffect, useState } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import Papa from "papaparse";
import "./WeeklySessions.css";

interface Session {
    session_datetime: string;
    duration: number;
    profiles: { name: string } | null;
}

interface UploadedFile {
    id: string;
    original_filename: string;
    signed_url: string;
    week_start_date: string;
}

const WeeklySessions: React.FC = () => {
    const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080";

    const [sessions, setSessions] = useState<Session[]>([]);
    const [weeklyCSV, setWeeklyCSV] = useState<UploadedFile[]>([]);
    const [csvDataMap, setCsvDataMap] = useState<{ [key: string]: any[] }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());

    // Fetch sessions
    const fetchSessions = async (date: Date) => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_BASE_URL}/api/weekly/getAllWeeklySessions`, {
                params: { date: date.toISOString().split("T")[0] },
            });
            setSessions(res.data);
        } catch (err: any) {
            setError(err.message || "Error fetching sessions");
        } finally {
            setLoading(false);
        }
    };

    // Fetch CSV files
    const fetchCSVForWeek = async (date: Date) => {
        try {
            const res = await axios.get(`${API_BASE_URL}/api/weekly/csv/files/week`, {
                params: { date: date.toISOString().split("T")[0] },
            });
            setWeeklyCSV(res.data.files);
            setCsvDataMap({}); // reset previous CSV data
        } catch (err) {
            console.error("Error fetching CSVs:", err);
            setWeeklyCSV([]);
        }
    };

    // View CSV preview
    const handleViewCSV = async (file: UploadedFile) => {
        try {
            const response = await fetch(file.signed_url);
            const text = await response.text();
            const parsed = Papa.parse<Record<string, string>>(text, {
                header: true,
                skipEmptyLines: true,
            });
            setCsvDataMap(prev => ({
                ...prev,
                [file.id]: parsed.data,
            }));
        } catch (err) {
            console.error("Error parsing CSV:", err);
            setCsvDataMap(prev => ({
                ...prev,
                [file.id]: [],
            }));
        }
    };

    // Download CSV directly using signed URL
    const downloadCSV = (file: UploadedFile) => {
        const link = document.createElement("a");
        link.href = file.signed_url;
        link.download = file.original_filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        fetchSessions(selectedDate);
        fetchCSVForWeek(selectedDate);
    }, [selectedDate]);

    return (
        <div className="table-container">
            <h1>This Week's Sessions</h1>

            <div className="calendar-container">
                <label>Select a date:</label>
                <DatePicker
                    selected={selectedDate}
                    onChange={(date: Date | null) => date && setSelectedDate(date)}
                    dateFormat="dd/MM/yyyy"
                    className="datepicker-input"
                />
            </div>

            {loading && <p className="loading">Loading sessions...</p>}
            {error && <p className="error">{error}</p>}

            {!loading && !error && (
                <>
                    <table>
                        <thead>
                            <tr>
                                <th>Date & Time</th>
                                <th>Duration (mins)</th>
                                <th>Faculty</th>
                            </tr>
                        </thead>
                        <tbody>
                            {sessions.map((session, idx) => (
                                <tr key={idx}>
                                    <td>
                                        {new Date(session.session_datetime).toLocaleString("en-IN", {
                                            weekday: "short",
                                            day: "numeric",
                                            month: "short",
                                            hour: "2-digit",
                                            minute: "2-digit",
                                        })}
                                    </td>
                                    <td>{session.duration}</td>
                                    <td>{session.profiles?.name || "N/A"}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <h2>CSV for this week</h2>
                    {weeklyCSV.length === 0 && <p>No CSV uploaded for this week</p>}

                    {weeklyCSV.map((file) => (
                        <div
                            key={file.id}
                            style={{ marginBottom: "15px", padding: "10px", border: "1px solid #eee" }}
                        >
                            <p style={{ margin: "0 0 10px 0", fontWeight: "bold" }}>{file.original_filename}</p>
                            <div>
                                <button
                                    onClick={() => handleViewCSV(file)}
                                    className="btn-view"
                                >
                                    View CSV
                                </button>
                                <button
                                    onClick={() => downloadCSV(file)}
                                    className="btn-download"
                                >
                                    Download CSV
                                </button>
                            </div>
                        </div>
                    ))}

                    {Object.keys(csvDataMap).length > 0 && (
                        <div style={{ marginTop: "20px" }}>
                            <h3>CSV Preview</h3>
                            {Object.entries(csvDataMap).map(([fileId, data]) => {
                                const file = weeklyCSV.find(f => f.id === fileId);
                                return data.length > 0 ? (
                                    <div key={fileId} style={{ marginBottom: "20px" }}>
                                        <h4>{file?.original_filename}</h4>
                                        <table border={1}>
                                            <thead>
                                                <tr>
                                                    {Object.keys(data[0]).map((key) => (
                                                        <th key={key}>{key}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {data.slice(0, 10).map((row, idx) => (
                                                    <tr key={idx}>
                                                        {Object.values(row).map((val, i) => (
                                                            <td key={i}>{val != null ? String(val) : ""}</td>

                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {data.length > 10 && (
                                            <p style={{ fontStyle: "italic", marginTop: "10px" }}>
                                                Showing first 10 rows of {data.length} total rows
                                            </p>
                                        )}
                                    </div>
                                ) : null;
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default WeeklySessions;
