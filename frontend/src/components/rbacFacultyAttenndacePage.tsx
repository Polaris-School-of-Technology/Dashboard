import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./rbacFacultyAttendnaceReport.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface Student {
    id: number;
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
    searchQuery?: string;
}

// Utility for fuzzy search
const searchUtils = {
    normalize: (text: string): string =>
        text
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^\w\s@.-]/g, " ")
            .replace(/\s+/g, " ")
            .trim(),
    getInitials: (name: string): string =>
        name
            .split(/\s+/)
            .map((part) => part.charAt(0))
            .join("")
            .toLowerCase(),
    getNameVariations: (name: string): string[] => {
        const normalized = searchUtils.normalize(name);
        const parts = normalized.split(/\s+/).filter((p) => p.length > 0);
        const variations = [normalized];
        parts.forEach((p) => p.length > 1 && variations.push(p));
        variations.push(searchUtils.getInitials(name));
        if (parts.length >= 2) {
            variations.push(`${parts[0]} ${parts[parts.length - 1]}`);
            variations.push(`${parts[parts.length - 1]} ${parts[0]}`);
        }
        return Array.from(new Set(variations));
    },
    levenshteinDistance: (str1: string, str2: string): number => {
        const matrix: number[][] = [];
        if (!str1.length) return str2.length;
        if (!str2.length) return str1.length;

        for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
        for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2[i - 1] === str1[j - 1]) matrix[i][j] = matrix[i - 1][j - 1];
                else
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
            }
        }
        return matrix[str2.length][str1.length];
    },
    getSimilarityScore: (str1: string, str2: string): number => {
        const maxLength = Math.max(str1.length, str2.length);
        if (!maxLength) return 1;
        return 1 - searchUtils.levenshteinDistance(str1, str2) / maxLength;
    },
    fuzzyMatch: (query: string, variations: string[], threshold = 0.85): boolean => {
        const normalizedQuery = searchUtils.normalize(query);
        for (const variation of variations) {
            if (variation.includes(normalizedQuery) || normalizedQuery.includes(variation))
                return true;
            if (normalizedQuery.length <= 4 && variation.length > 2) {
                if (searchUtils.getSimilarityScore(normalizedQuery, variation) >= threshold)
                    return true;
            }
        }
        return false;
    },
};

const FacultyAttendanceReport: React.FC = () => {
    const [date, setDate] = useState<Date | null>(null);
    const [data, setData] = useState<AttendanceGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent">("all");

    // Fetch faculty-specific attendance
    const fetchFacultyReport = async (d: Date) => {
        if (!d) return;
        setLoading(true);
        setError(null);

        const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
            d.getDate()
        ).padStart(2, "0")}`;

        try {
            const res = await axios.get(`${API_BASE_URL}/api/rbacFaculty/getAttendnaceForFaculty/${formatted}`, {
                params: { date: formatted },
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            });

            const mappedData = res.data.map((s: any) => ({
                session_id: s.session_id,
                datetime: s.session_datetime,
                course_name: s.course_name || "N/A",
                faculty_name: s.faculty_name || "N/A",
                students: s.students.map((st: any) => ({
                    id: st.attendance_id,
                    student_name: st.student_name,
                    registration_id: st.registration_id || "N/A",

                    present: st.present,
                })),
                open: false,
                searchQuery: "",
            }));

            setData(mappedData);
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error fetching faculty attendance");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (date) fetchFacultyReport(date);
    }, [date, statusFilter]);

    // Filter students per session
    const filterStudents = useMemo(() => {
        return (students: Student[], searchQuery?: string) => {
            let filtered = students.filter((s) => {
                if (statusFilter === "present") return s.present;
                if (statusFilter === "absent") return !s.present;
                return true;
            });

            if (searchQuery?.trim()) {
                const query = searchQuery.trim();
                filtered = filtered.filter((student) => {
                    const searchFields = [student.student_name, student.registration_id || ""].filter(
                        (f) => f.length > 0
                    );

                    for (const field of searchFields) {
                        const normalizedField = searchUtils.normalize(field);
                        const normalizedQuery = searchUtils.normalize(query);

                        if (normalizedField.includes(normalizedQuery)) return true;
                        if (field === student.student_name) {
                            if (searchUtils.fuzzyMatch(query, searchUtils.getNameVariations(field), 0.7)) return true;
                        }
                    }
                    return false;
                });
            }

            return filtered;
        };
    }, [statusFilter]);

    const toggleAttendance = async (attendanceId: number, currentStatus: boolean) => {
        try {
            await axios.patch(
                `${API_BASE_URL}/api/attendance/${attendanceId}`,
                { is_present: !currentStatus },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );

            setData((prev) =>
                prev.map((session) => ({
                    ...session,
                    students: session.students.map((student) =>
                        student.id === attendanceId ? { ...student, present: !currentStatus } : student
                    ),
                }))
            );
        } catch (err) {
            console.error(err);
            alert("Failed to update attendance");
        }
    };

    // CSV Export (single session)
    const exportToCSV = (session: AttendanceGroup) => {
        const filteredStudents = filterStudents(session.students, session.searchQuery);
        const headers = ["Registration ID", "Student Name", "Status", "Course", "Faculty", "Date", "PresentFlag"];

        const csvContent = [
            headers.join(","),
            ...filteredStudents.map((s) =>
                [
                    `"${s.registration_id}"`,
                    `"${s.student_name}"`,

                    s.present ? "Present" : "Absent",
                    `"${session.course_name}"`,
                    `"${session.faculty_name}"`,
                    `"${new Date(session.datetime).toLocaleDateString("en-GB")}"`,
                    s.present ? "1" : "0",
                ].join(",")
            ),
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute(
            "download",
            `attendance_${session.course_name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date(session.datetime)
                .toISOString()
                .split("T")[0]}.csv`
        );
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="attendance-container">
            <h1 className="page-title">Faculty Attendance Report</h1>

            <div className="filters-section">
                <div className="filter-group">
                    <label>Select Date</label>
                    <DatePicker selected={date} onChange={(d) => setDate(d)} className="date-picker" placeholderText="Choose date" />
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
            </div>

            {loading && <p>Loading attendance data...</p>}
            {error && <p className="error-text">{error}</p>}

            {!loading &&
                !error &&
                data.map((session) => {
                    const filteredStudents = filterStudents(session.students, session.searchQuery);
                    return (
                        <div key={session.session_id} className="session-card">
                            <div
                                className="session-header"
                                onClick={() =>
                                    setData((prev) =>
                                        prev.map((s) => (s.session_id === session.session_id ? { ...s, open: !s.open } : s))
                                    )
                                }
                            >
                                <h2>{session.course_name}</h2>
                                <p>
                                    {new Date(session.datetime).toLocaleString("en-GB")} • Faculty: {session.faculty_name}
                                </p>
                                <button onClick={(e) => { e.stopPropagation(); exportToCSV(session); }}>📄 CSV</button>
                                <span>{session.open ? "−" : "+"}</span>
                            </div>

                            {session.open && (
                                <div className="student-list">
                                    <div className="search-section">
                                        <input
                                            type="text"
                                            placeholder="Search students..."
                                            value={session.searchQuery || ""}
                                            onChange={(e) =>
                                                setData((prev) =>
                                                    prev.map((s) =>
                                                        s.session_id === session.session_id ? { ...s, searchQuery: e.target.value } : s
                                                    )
                                                )
                                            }
                                        />
                                        {session.searchQuery && <span>{filteredStudents.length} results</span>}
                                    </div>

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
                                            {filteredStudents.map((s) => (
                                                <tr key={s.id}>
                                                    <td>{s.registration_id}</td>
                                                    <td>{s.student_name}</td>

                                                    <td>
                                                        <span className={`status-badge ${s.present ? "status-present" : "status-absent"}`}>
                                                            {s.present ? "Present" : "Absent"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        <button onClick={() => toggleAttendance(s.id, s.present)}>
                                                            {s.present ? "Mark Absent" : "Mark Present"}
                                                        </button>
                                                    </td>

                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {filteredStudents.length === 0 && <p>No students found</p>}
                                </div>
                            )}
                        </div>
                    );
                })}
        </div>
    );
};

export default FacultyAttendanceReport;
