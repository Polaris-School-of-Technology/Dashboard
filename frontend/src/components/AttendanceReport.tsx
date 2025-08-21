import React, { useState, useEffect } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./AttendanceReport.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface Student {
    id: number; // unique id for each attendance record
    student_name: string;
    registration_id: string | null;
    present: boolean;
}

interface AttendanceGroup {
    session_id: number;
    datetime: string;
    course_name: string;
    faculty_name: string;
    students: Student[];
    open?: boolean;
}

const AttendanceReport: React.FC = () => {
    const [date, setDate] = useState<Date | null>(null);
    const [data, setData] = useState<AttendanceGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent">("all");

    const fetchReport = async (d: Date, status: "all" | "present" | "absent") => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const formatted = `${year}-${month}-${day}`;

        setLoading(true);
        setError(null);

        try {
            let url = `${API_BASE_URL}/api/attendance/attendanceReport/${formatted}`;
            if (status !== "all") {
                url += `?status=${status}`;
            }
            const res = await axios.get(url);
            setData(res.data.map((s: any) => ({ ...s, open: false })));
        } catch (err: any) {
            setError(err.message || "Error fetching report");
        } finally {
            setLoading(false);
        }
    };

    const toggleAttendance = async (attendanceId: number, currentStatus: boolean) => {
        try {
            await axios.patch(`${API_BASE_URL}/api/attendance/${attendanceId}`, {
                is_present: !currentStatus,
            });

            setData(prev =>
                prev.map(session => ({
                    ...session,
                    students: session.students.map(student =>
                        student.id === attendanceId ? { ...student, present: !currentStatus } : student
                    ),
                }))
            );
        } catch (err) {
            console.error("Error updating attendance:", err);
            alert("Failed to update attendance");
        }
    };

    const exportToCSV = (session: AttendanceGroup) => {
        const filteredStudents = session.students.filter((s) => {
            if (statusFilter === "present") return s.present;
            if (statusFilter === "absent") return !s.present;
            return true;
        });

        const getFormattedDate = (dateStr: string) => {
            const da = new Date(dateStr);
            return isNaN(da.getTime()) ? "Invalid Date" : da.toLocaleDateString("en-GB");
        };

        const getSafeFileName = (dateStr: string) => {
            const da = new Date(dateStr);
            return isNaN(da.getTime())
                ? new Date().toISOString().split("T")[0]
                : da.toISOString().split("T")[0];
        };

        const headers = ["Registration ID", "Student Name", "Status", "Course", "Faculty", "Date", "PresentFlag"];
        const csvContent = [
            headers.join(","),
            ...filteredStudents.map(student => [
                `"${student.registration_id || "N/A"}"`,
                `"${student.student_name}"`,
                student.present ? "Present" : "Absent",
                `"${session.course_name}"`,
                `"${session.faculty_name || "N/A"}"`,
                `"${getFormattedDate(session.datetime)}"`,
                student.present ? "1" : "0",
            ].join(",")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        link.setAttribute("href", url);
        link.setAttribute(
            "download",
            `attendance_${session.course_name.replace(/[^a-zA-Z0-9]/g, "_")}_${getSafeFileName(session.datetime)}.csv`
        );
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const exportAllToCSV = () => {
        if (!data.length) return;

        const getFormattedDate = (dateStr: string) => {
            const da = new Date(dateStr);
            return isNaN(da.getTime()) ? "Invalid Date" : da.toLocaleDateString("en-GB");
        };

        const getFormattedTime = (dateStr: string) => {
            const da = new Date(dateStr);
            return isNaN(da.getTime())
                ? "Invalid Time"
                : da.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
        };

        const allStudentsData: any[] = [];

        data.forEach(session => {
            const filteredStudents = session.students.filter((s) => {
                if (statusFilter === "present") return s.present;
                if (statusFilter === "absent") return !s.present;
                return true;
            });

            filteredStudents.forEach(student => {
                allStudentsData.push({
                    registrationId: student.registration_id || "N/A",
                    studentName: student.student_name,
                    status: student.present ? "Present" : "Absent",
                    course: session.course_name,
                    faculty: session.faculty_name || "N/A",
                    date: getFormattedDate(session.datetime),
                    time: getFormattedTime(session.datetime),
                    presentFlag: student.present ? "1" : "0",
                });
            });
        });

        const headers = ["Registration ID", "Student Name", "Status", "Course", "Faculty", "Date", "Time", "PresentFlag"];
        const csvContent = [
            headers.join(","),
            ...allStudentsData.map(r => [
                `"${r.registrationId}"`,
                `"${r.studentName}"`,
                r.status,
                `"${r.course}"`,
                `"${r.faculty}"`,
                `"${r.date}"`,
                `"${r.time}"`,
                r.presentFlag,
            ].join(",")),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);

        const safeDate = date
            ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
            : new Date().toISOString().split("T")[0];
        link.setAttribute("href", url);
        link.setAttribute("download", `all_attendance_${safeDate}.csv`);
        link.style.visibility = "hidden";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    useEffect(() => {
        if (date) fetchReport(date, statusFilter);
    }, [statusFilter]);

    return (
        <div className="attendance-container">
            <h1 className="page-title">Attendance Report</h1>

            <div className="date-picker-container">
                <DatePicker
                    selected={date}
                    onChange={(d: Date | null) => {
                        setDate(d);
                        if (d) fetchReport(d, statusFilter);
                    }}
                    className="date-picker"
                    placeholderText="Select a date"
                    dateFormat="dd-MM-yyyy"
                />
            </div>

            <div className="filter-buttons">
                <button className={statusFilter === "all" ? "active" : ""} onClick={() => setStatusFilter("all")}>
                    All
                </button>
                <button className={statusFilter === "present" ? "active" : ""} onClick={() => setStatusFilter("present")}>
                    Present
                </button>
                <button className={statusFilter === "absent" ? "active" : ""} onClick={() => setStatusFilter("absent")}>
                    Absent
                </button>
            </div>

            {!loading && !error && data.length > 0 && (
                <div className="export-container">
                    <button className="export-all-btn" onClick={exportAllToCSV}>
                        📊 Export All Sessions to CSV
                    </button>
                </div>
            )}

            {loading && <p className="loading-text">Loading...</p>}
            {error && <p className="error-text">{error}</p>}

            {!loading && !error && data.length > 0 && (
                <div className="cards-container">
                    {data.map((session) => {
                        const filteredStudents = session.students.filter((s) => {
                            if (statusFilter === "present") return s.present;
                            if (statusFilter === "absent") return !s.present;
                            return true;
                        });

                        return (
                            <div key={session.session_id} className="session-card">
                                <div
                                    onClick={() =>
                                        setData(prev =>
                                            prev.map(s =>
                                                s.session_id === session.session_id ? { ...s, open: !s.open } : s
                                            )
                                        )
                                    }
                                    className="session-header"
                                >
                                    <div>
                                        <h2 className="session-title">{session.course_name}</h2>
                                        <p className="session-meta">
                                            {new Date(session.datetime).toLocaleString("en-GB", {
                                                day: "2-digit",
                                                month: "short",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}{" "}
                                            • <span className="faculty-tag">Faculty: {session.faculty_name || "N/A"}</span>
                                        </p>
                                    </div>
                                    <div className="header-actions">
                                        <button
                                            className="export-btn"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                exportToCSV(session);
                                            }}
                                        >
                                            📄 CSV
                                        </button>
                                        <span className="toggle-icon">{session.open ? "−" : "+"}</span>
                                    </div>
                                </div>

                                {session.open && (
                                    <div className="student-list">
                                        <p className="student-count">
                                            Showing {filteredStudents.length} students
                                        </p>
                                        <table className="attendance-table">
                                            <thead>
                                                <tr>
                                                    <th>Registration ID</th>
                                                    <th>Student Name</th>
                                                    <th>Status</th>
                                                    <th>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredStudents.map((s, idx) => (
                                                    <tr key={idx}>
                                                        <td>{s.registration_id || "N/A"}</td>
                                                        <td>{s.student_name}</td>
                                                        <td>
                                                            {s.present ? (
                                                                <span className="status-present">Present</span>
                                                            ) : (
                                                                <span className="status-absent">Absent</span>
                                                            )}
                                                        </td>
                                                        <td>
                                                            <button
                                                                onClick={() => toggleAttendance(s.id, s.present)}
                                                                className="edit-btn"
                                                            >
                                                                {s.present ? "Mark Absent" : "Mark Present"}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {!loading && !error && data.length === 0 && date && (
                <p className="empty-text">No attendance data available for this date.</p>
            )}
        </div>
    );
};

export default AttendanceReport;
