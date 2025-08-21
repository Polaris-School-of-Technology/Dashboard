import React, { useEffect, useState } from "react";
import axios from "axios";
import "./WeeklySessions.css";

interface Session {
    session_datetime: string;
    duration: number;
    profiles: { name: string } | null;
    status?: string; // optional
}

const WeeklySessions: React.FC = () => {
    const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8000"; // ✅ fallback to localhost

    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchSessions = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/weekly/getAllWeeklySessions`);
                setSessions(res.data);
            } catch (err: any) {
                setError(err.message || "Error fetching sessions");
            } finally {
                setLoading(false);
            }
        };

        fetchSessions();
    }, [API_BASE_URL]);

    if (loading) return <p className="loading">Loading sessions...</p>;
    if (error) return <p className="error">{error}</p>;

    return (
        <div className="table-container">
            <h1>This Week's Sessions</h1>
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
        </div>
    );
};

export default WeeklySessions;
