import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./AttendanceReport.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

interface Student {
    id: number;
    student_name: string;
    registration_id: string | null;
    email?: string | null;
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

interface Batch {
    id: number;
    batch_name: string;
}

// Enhanced search utility functions
const searchUtils = {
    // Remove diacritics and normalize text
    normalize: (text: string): string => {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
            .replace(/[^\w\s@.-]/g, ' ') // Replace special chars with space except email chars
            .replace(/\s+/g, ' ')
            .trim();
    },

    // Extract initials from name
    getInitials: (name: string): string => {
        return name
            .split(/\s+/)
            .map(part => part.charAt(0))
            .join('')
            .toLowerCase();
    },

    // Get name variations (first name, last name, full name)
    getNameVariations: (name: string): string[] => {
        const normalized = searchUtils.normalize(name);
        const parts = normalized.split(/\s+/).filter(part => part.length > 0);

        const variations = [normalized]; // Full name

        // Add individual parts (first name, middle name, last name)
        parts.forEach(part => {
            if (part.length > 1) variations.push(part);
        });

        // Add initials
        variations.push(searchUtils.getInitials(name));

        // Add partial combinations
        if (parts.length >= 2) {
            variations.push(`${parts[0]} ${parts[parts.length - 1]}`); // First + Last
            variations.push(`${parts[parts.length - 1]} ${parts[0]}`); // Last + First
        }

        // Remove duplicates manually to avoid TypeScript downlevel iteration issues
        const uniqueVariations: string[] = [];
        variations.forEach(variation => {
            if (!uniqueVariations.includes(variation)) {
                uniqueVariations.push(variation);
            }
        });
        return uniqueVariations;
    },

    // Simple fuzzy matching using Levenshtein distance
    levenshteinDistance: (str1: string, str2: string): number => {
        const matrix = [];

        if (str1.length === 0) return str2.length;
        if (str2.length === 0) return str1.length;

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    },

    // Calculate similarity score (0-1, where 1 is perfect match)
    getSimilarityScore: (str1: string, str2: string): number => {
        const maxLength = Math.max(str1.length, str2.length);
        if (maxLength === 0) return 1;

        const distance = searchUtils.levenshteinDistance(str1, str2);
        return 1 - (distance / maxLength);
    },

    // Check if query matches any variation with fuzzy matching
    fuzzyMatch: (query: string, variations: string[], threshold: number = 0.85): boolean => {
        const normalizedQuery = searchUtils.normalize(query);

        for (const variation of variations) {
            // Exact match or substring match
            if (variation.includes(normalizedQuery) || normalizedQuery.includes(variation)) {
                return true;
            }

            // Only allow fuzzy on short queries (avoid false positives on full names)
            if (normalizedQuery.length <= 4 && variation.length > 2) {
                const similarity = searchUtils.getSimilarityScore(normalizedQuery, variation);
                if (similarity >= threshold) {
                    return true;
                }
            }
        }

        return false;
    }

};

const AttendanceReport: React.FC = () => {
    const [date, setDate] = useState<Date | null>(null);
    const [data, setData] = useState<AttendanceGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<"all" | "present" | "absent">("all");
    const [batches, setBatches] = useState<Batch[]>([]);
    const [selectedBatch, setSelectedBatch] = useState<number | "all">("all");

    // Fetch batches on mount
    useEffect(() => {
        const fetchBatches = async () => {
            try {
                const res = await axios.get(`${API_BASE_URL}/api/attendance/batches`);
                setBatches(res.data || []);
            } catch (err) {
                console.error("Error fetching batches:", err);
            }
        };
        fetchBatches();
    }, []);

    // Fetch attendance report
    const fetchReport = async (d: Date, status: "all" | "present" | "absent", batchId?: number | "all") => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const day = String(d.getDate()).padStart(2, "0");
        const formatted = `${year}-${month}-${day}`;

        setLoading(true);
        setError(null);

        try {
            let url = `${API_BASE_URL}/api/attendance/attendanceReport/${formatted}`;
            const params: string[] = [];

            if (status !== "all") params.push(`status=${status}`);
            if (batchId && batchId !== "all") params.push(`batch_id=${batchId}`);

            if (params.length) url += `?${params.join("&")}`;

            const res = await axios.get(url);
            setData(res.data.map((s: any) => ({ ...s, open: false, searchQuery: "" })));
        } catch (err: any) {
            setError(err.message || "Error fetching report");
        } finally {
            setLoading(false);
        }
    };

    // Enhanced filter function with robust search
    const filterStudents = useMemo(() => {
        return (students: Student[], searchQuery?: string) => {
            let filtered = students.filter((s) => {
                if (statusFilter === "present") return s.present;
                if (statusFilter === "absent") return !s.present;
                return true;
            });

            if (searchQuery?.trim()) {
                const query = searchQuery.trim();

                filtered = filtered.filter(student => {
                    // Get all searchable text fields
                    const searchFields = [
                        student.student_name,
                        student.registration_id || "",
                        student.email || ""
                    ].filter(field => field.length > 0);

                    // Check each field
                    for (const field of searchFields) {
                        const normalized = searchUtils.normalize(field);
                        const normalizedQuery = searchUtils.normalize(query);

                        // Direct substring match (fastest)
                        if (normalized.includes(normalizedQuery)) {
                            return true;
                        }

                        // For names, check variations and fuzzy matching
                        if (field === student.student_name) {
                            const nameVariations = searchUtils.getNameVariations(field);
                            if (searchUtils.fuzzyMatch(query, nameVariations, 0.7)) {
                                return true;
                            }
                        }

                        // For registration IDs and emails, more lenient matching
                        if (field === student.registration_id || field === student.email) {
                            // Remove common separators and check
                            const cleanField = field.replace(/[@._-]/g, '');
                            const cleanQuery = query.replace(/[@._-]/g, '');

                            if (searchUtils.normalize(cleanField).includes(searchUtils.normalize(cleanQuery))) {
                                return true;
                            }
                        }
                    }

                    return false;
                });
            }

            return filtered;
        };
    }, [statusFilter]);

    // Toggle attendance
    const toggleAttendance = async (attendanceId: number, currentStatus: boolean) => {
        try {
            await axios.patch(`${API_BASE_URL}/api/attendance/${attendanceId}`, {
                is_present: !currentStatus,
            }, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
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

    // Export single session to CSV
    const exportToCSV = (session: AttendanceGroup) => {
        const filteredStudents = filterStudents(session.students, session.searchQuery);

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

        const headers = ["Registration ID", "Student Name", "Email", "Status", "Course", "Faculty", "Date", "PresentFlag"];
        const csvContent = [
            headers.join(","),
            ...filteredStudents.map(student => [
                `"${student.registration_id || "N/A"}"`,
                `"${student.student_name}"`,
                `"${student.email || "N/A"}"`,
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

    // Export all sessions to CSV
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
            const filteredStudents = filterStudents(session.students, session.searchQuery);

            filteredStudents.forEach(student => {
                allStudentsData.push({
                    registrationId: student.registration_id || "N/A",
                    studentName: student.student_name,
                    email: student.email || "N/A",
                    status: student.present ? "Present" : "Absent",
                    course: session.course_name,
                    faculty: session.faculty_name || "N/A",
                    date: getFormattedDate(session.datetime),
                    time: getFormattedTime(session.datetime),
                    presentFlag: student.present ? "1" : "0",
                });
            });
        });

        const headers = ["Registration ID", "Student Name", "Email", "Status", "Course", "Faculty", "Date", "Time", "PresentFlag"];
        const csvContent = [
            headers.join(","),
            ...allStudentsData.map(r => [
                `"${r.registrationId}"`,
                `"${r.studentName}"`,
                `"${r.email}"`,
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

    // Fetch on filter change
    useEffect(() => {
        if (date) fetchReport(date, statusFilter, selectedBatch);
    }, [statusFilter, selectedBatch]);

    // Get total filtered students count
    const getTotalFilteredStudents = () => {
        return data.reduce((total, session) => total + filterStudents(session.students, session.searchQuery).length, 0);
    };

    return (
        <div className="attendance-container">
            <h1 className="page-title">Attendance Report</h1>

            {/* Filters */}
            <div className="filters-section">
                <div className="primary-filters">
                    <div className="filter-group">
                        <label className="filter-label">Select Date</label>
                        <DatePicker
                            selected={date}
                            onChange={(d: Date | null) => {
                                setDate(d);
                                if (d) fetchReport(d, statusFilter, selectedBatch);
                            }}
                            className="date-picker"
                            placeholderText="Choose date..."
                            dateFormat="dd-MM-yyyy"
                        />
                    </div>

                    <div className="filter-group">
                        <label className="filter-label">Select Batch</label>
                        <select
                            className="batch-dropdown"
                            value={selectedBatch}
                            onChange={(e) => setSelectedBatch(e.target.value === "all" ? "all" : Number(e.target.value))}
                        >
                            <option value="all">All Batches</option>
                            {batches.map(batch => (
                                <option key={batch.id} value={batch.id}>{batch.batch_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Status Filter Buttons */}
                <div className="filter-buttons">
                    <button
                        className={statusFilter === "all" ? "active" : ""}
                        onClick={() => setStatusFilter("all")}
                    >
                        All {data.length > 0 && `(${getTotalFilteredStudents()})`}
                    </button>
                    <button
                        className={statusFilter === "present" ? "active" : ""}
                        onClick={() => setStatusFilter("present")}
                    >
                        Present
                    </button>
                    <button
                        className={statusFilter === "absent" ? "active" : ""}
                        onClick={() => setStatusFilter("absent")}
                    >
                        Absent
                    </button>
                </div>
            </div>

            {/* Export Button */}
            {!loading && !error && data.length > 0 && (
                <div className="export-container">
                    <button className="export-all-btn" onClick={exportAllToCSV}>
                        📊 Export All Sessions to CSV
                    </button>
                </div>
            )}

            {loading && <p className="loading-text">Loading attendance data...</p>}
            {error && <p className="error-text">{error}</p>}

            {!loading && !error && data.length > 0 && (
                <div className="cards-container">
                    {data.map((session) => {
                        const filteredStudents = filterStudents(session.students, session.searchQuery);

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
                                    <div className="session-info">
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
                                        <span className="student-count-badge">
                                            {filteredStudents.length} students
                                        </span>
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
                                        {/* Enhanced Per-session search bar */}
                                        <div className="search-section">
                                            <div className="search-container">
                                                <div className="search-input-wrapper">
                                                    <input
                                                        type="text"
                                                        className="search-input"
                                                        placeholder="Smart search: names, IDs, emails, initials, partial matches..."
                                                        value={session.searchQuery || ""}
                                                        onChange={(e) =>
                                                            setData(prev =>
                                                                prev.map(s =>
                                                                    s.session_id === session.session_id
                                                                        ? { ...s, searchQuery: e.target.value }
                                                                        : s
                                                                )
                                                            )
                                                        }
                                                    />
                                                    <div className="search-icon">🔍</div>
                                                    {session.searchQuery && (
                                                        <button
                                                            className="clear-search-btn"
                                                            onClick={() =>
                                                                setData(prev =>
                                                                    prev.map(s =>
                                                                        s.session_id === session.session_id
                                                                            ? { ...s, searchQuery: "" }
                                                                            : s
                                                                    )
                                                                )
                                                            }
                                                        >
                                                            ×
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Search feedback */}
                                            {session.searchQuery && (
                                                <div className="search-feedback">
                                                    Found {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                                                    matching "{session.searchQuery}"
                                                    {filteredStudents.length === 0 && " - Try partial names, initials, or check for typos"}
                                                </div>
                                            )}
                                        </div>

                                        {filteredStudents.length > 0 ? (
                                            <div className="table-container">
                                                <table className="attendance-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Registration ID</th>
                                                            <th>Student Name</th>
                                                            <th>Email</th>
                                                            <th>Status</th>
                                                            <th>Action</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {filteredStudents.map((s, idx) => (
                                                            <tr key={idx}>
                                                                <td>{s.registration_id || "N/A"}</td>
                                                                <td className="student-name">{s.student_name}</td>
                                                                <td className="student-email">{s.email || "N/A"}</td>
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
                                        ) : (
                                            <div className="no-results">
                                                {session.searchQuery
                                                    ? `No students found matching "${session.searchQuery}". Try different search terms, initials, or partial names.`
                                                    : "No students to display"}
                                            </div>
                                        )}
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