"use strict";
// controllers/analyticsController.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllFacultyRatings = exports.getFacultyRatings = exports.getFacultyComparison = exports.getDailyAggregates = exports.getWeeklySummary = exports.getFacultyList = exports.getAnalyticsByDateRange = void 0;
const supabase_1 = require("../config/supabase");
// Helper function to safely get profile name
const getProfileName = (profiles) => {
    var _a;
    if (!profiles)
        return 'Unknown';
    if (Array.isArray(profiles)) {
        return ((_a = profiles[0]) === null || _a === void 0 ? void 0 : _a.name) || 'Unknown';
    }
    return profiles.name || 'Unknown';
};
// Get analytics data for date range (week-based)
const getAnalyticsByDateRange = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { start_date, end_date, faculty_id } = req.query;
        if (!start_date || !end_date) {
            res.status(400).json({
                error: 'start_date and end_date are required'
            });
            return;
        }
        let query = supabase_1.supabase
            .from('class_sessions')
            .select(`
                id,
                session_date,
                course_name,
                batch_name,
                attendance_rate,
                average_rating,
                summary,
                avg_quiz_score,
                max_quiz_score,
                min_quiz_score,
                stddev_quiz_score,
                above_90_count,
                below_40_count,
                faculty_id,
                faculty_details!inner(
                    user_id,
                    department,
                    title,
                    profiles!inner(
                        name
                    )
                )
            `)
            .gte('session_date', start_date)
            .lte('session_date', end_date);
        // Add faculty filter if specified
        if (faculty_id && faculty_id !== 'all') {
            query = query.eq('faculty_id', faculty_id);
        }
        query = query.order('session_date', { ascending: true });
        const { data: sessions, error } = yield query;
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to fetch analytics data' });
            return;
        }
        // Flatten the nested structure
        const formattedSessions = (sessions === null || sessions === void 0 ? void 0 : sessions.map((session) => {
            var _a, _b, _c, _d;
            return ({
                session_id: session.id,
                session_date: session.session_date,
                course_name: session.course_name,
                batch_name: session.batch_name,
                attendance_rate: session.attendance_rate,
                average_rating: session.average_rating,
                summary: session.summary,
                avg_quiz_score: session.avg_quiz_score,
                max_quiz_score: session.max_quiz_score,
                min_quiz_score: session.min_quiz_score,
                stddev_quiz_score: session.stddev_quiz_score,
                above_90_count: session.above_90_count,
                below_40_count: session.below_40_count,
                faculty_id: (_a = session.faculty_details) === null || _a === void 0 ? void 0 : _a.user_id,
                faculty_name: getProfileName((_b = session.faculty_details) === null || _b === void 0 ? void 0 : _b.profiles),
                faculty_department: (_c = session.faculty_details) === null || _c === void 0 ? void 0 : _c.department,
                faculty_title: (_d = session.faculty_details) === null || _d === void 0 ? void 0 : _d.title
            });
        })) || [];
        res.json(formattedSessions);
    }
    catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
});
exports.getAnalyticsByDateRange = getAnalyticsByDateRange;
// Get faculty list for dropdown
const getFacultyList = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data: faculties, error } = yield supabase_1.supabase
            .from('faculty_details')
            .select(`
                user_id,
                department,
                title,
                profiles!inner(
                    name
                )
            `)
            .order('profiles(name)', { ascending: true });
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to fetch faculty list' });
            return;
        }
        const formattedFaculties = (faculties === null || faculties === void 0 ? void 0 : faculties.map((faculty) => ({
            faculty_id: faculty.user_id,
            faculty_name: getProfileName(faculty.profiles),
            department: faculty.department,
            title: faculty.title
        }))) || [];
        res.json(formattedFaculties);
    }
    catch (error) {
        console.error('Error fetching faculty list:', error);
        res.status(500).json({ error: 'Failed to fetch faculty list' });
    }
});
exports.getFacultyList = getFacultyList;
// Get weekly summary stats
const getWeeklySummary = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { start_date, end_date, faculty_id } = req.query;
        if (!start_date || !end_date) {
            res.status(400).json({
                error: 'start_date and end_date are required'
            });
            return;
        }
        let query = supabase_1.supabase
            .from('class_sessions')
            .select('average_rating, attendance_rate')
            .gte('session_date', start_date)
            .lte('session_date', end_date);
        if (faculty_id && faculty_id !== 'all') {
            query = query.eq('faculty_id', faculty_id);
        }
        const { data: sessions, error } = yield query;
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to fetch weekly summary' });
            return;
        }
        const sessionData = sessions || [];
        const totalSessions = sessionData.length;
        if (totalSessions === 0) {
            res.json({
                total_sessions: 0,
                avg_rating: '0.00',
                avg_attendance: '0.0',
                min_rating: 0,
                max_rating: 0,
                performance_distribution: {
                    excellent: 0,
                    good: 0,
                    needs_improvement: 0
                }
            });
            return;
        }
        // Calculate statistics
        const ratings = sessionData.map((s) => { var _a; return parseFloat(((_a = s.average_rating) === null || _a === void 0 ? void 0 : _a.toString()) || '0'); });
        const attendances = sessionData.map((s) => { var _a; return parseFloat(((_a = s.attendance_rate) === null || _a === void 0 ? void 0 : _a.toString()) || '0'); });
        const totalRating = ratings.reduce((sum, rating) => sum + rating, 0);
        const totalAttendance = attendances.reduce((sum, attendance) => sum + attendance, 0);
        const avgRating = totalRating / totalSessions;
        const avgAttendance = totalAttendance / totalSessions;
        const minRating = Math.min(...ratings);
        const maxRating = Math.max(...ratings);
        const excellentCount = ratings.filter(r => r >= 4.5).length;
        const goodCount = ratings.filter(r => r >= 4.0 && r < 4.5).length;
        const needsImprovementCount = ratings.filter(r => r < 4.0).length;
        res.json({
            total_sessions: totalSessions,
            avg_rating: avgRating.toFixed(2),
            avg_attendance: avgAttendance.toFixed(1),
            min_rating: minRating,
            max_rating: maxRating,
            performance_distribution: {
                excellent: excellentCount,
                good: goodCount,
                needs_improvement: needsImprovementCount
            }
        });
    }
    catch (error) {
        console.error('Error fetching weekly summary:', error);
        res.status(500).json({ error: 'Failed to fetch weekly summary' });
    }
});
exports.getWeeklySummary = getWeeklySummary;
// Get daily aggregated data for charts
const getDailyAggregates = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { start_date, end_date, faculty_id } = req.query;
        if (!start_date || !end_date) {
            res.status(400).json({
                error: 'start_date and end_date are required'
            });
            return;
        }
        let query = supabase_1.supabase
            .from('class_sessions')
            .select(`
                session_date,
                average_rating,
                attendance_rate,
                avg_quiz_score,
                faculty_details!inner(
                    user_id,
                    profiles!inner(
                        name
                    )
                )
            `)
            .gte('session_date', start_date)
            .lte('session_date', end_date);
        if (faculty_id && faculty_id !== 'all') {
            query = query.eq('faculty_id', faculty_id);
        }
        const { data: sessions, error } = yield query;
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to fetch daily aggregates' });
            return;
        }
        // Group by date and faculty
        const grouped = {};
        sessions === null || sessions === void 0 ? void 0 : sessions.forEach((session) => {
            var _a, _b, _c;
            const date = session.session_date;
            const facultyName = getProfileName((_a = session.faculty_details) === null || _a === void 0 ? void 0 : _a.profiles);
            if (!grouped[date]) {
                grouped[date] = {};
            }
            if (!grouped[date][facultyName]) {
                grouped[date][facultyName] = {
                    sessions: 0,
                    totalRating: 0,
                    totalAttendance: 0,
                    totalQuizScore: 0,
                    quizSessionCount: 0
                };
            }
            const stats = grouped[date][facultyName];
            stats.sessions += 1;
            stats.totalRating += parseFloat(((_b = session.average_rating) === null || _b === void 0 ? void 0 : _b.toString()) || '0');
            stats.totalAttendance += parseFloat(((_c = session.attendance_rate) === null || _c === void 0 ? void 0 : _c.toString()) || '0');
            if (session.avg_quiz_score) {
                stats.totalQuizScore += parseFloat(session.avg_quiz_score.toString());
                stats.quizSessionCount += 1;
            }
        });
        // Format data for frontend charts
        const formattedData = Object.keys(grouped).map(date => {
            const dayData = { date };
            Object.keys(grouped[date]).forEach(faculty => {
                const stats = grouped[date][faculty];
                dayData[`${faculty}_avg_rating`] = (stats.totalRating / stats.sessions).toFixed(2);
                dayData[`${faculty}_avg_attendance`] = (stats.totalAttendance / stats.sessions).toFixed(1);
                dayData[`${faculty}_sessions`] = stats.sessions;
                dayData[`${faculty}_avg_quiz_score`] = stats.quizSessionCount > 0
                    ? (stats.totalQuizScore / stats.quizSessionCount).toFixed(1)
                    : null;
            });
            return dayData;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        res.json(formattedData);
    }
    catch (error) {
        console.error('Error fetching daily aggregates:', error);
        res.status(500).json({ error: 'Failed to fetch daily aggregates' });
    }
});
exports.getDailyAggregates = getDailyAggregates;
// Get faculty performance comparison
const getFacultyComparison = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            res.status(400).json({
                error: 'start_date and end_date are required'
            });
            return;
        }
        const { data: sessions, error } = yield supabase_1.supabase
            .from('class_sessions')
            .select(`
                average_rating,
                attendance_rate,
                avg_quiz_score,
                faculty_details!inner(
                    user_id,
                    profiles!inner(
                        name
                    )
                )
            `)
            .gte('session_date', start_date)
            .lte('session_date', end_date);
        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to fetch faculty comparison' });
            return;
        }
        // Group by faculty
        const facultyStats = {};
        sessions === null || sessions === void 0 ? void 0 : sessions.forEach((session) => {
            var _a, _b, _c, _d;
            const facultyId = (_a = session.faculty_details) === null || _a === void 0 ? void 0 : _a.user_id;
            const facultyName = getProfileName((_b = session.faculty_details) === null || _b === void 0 ? void 0 : _b.profiles);
            if (!facultyStats[facultyId]) {
                facultyStats[facultyId] = {
                    faculty_id: facultyId,
                    faculty_name: facultyName,
                    total_sessions: 0,
                    total_rating: 0,
                    total_attendance: 0,
                    total_quiz_score: 0,
                    quiz_session_count: 0,
                    excellent_sessions: 0,
                    poor_sessions: 0
                };
            }
            const stats = facultyStats[facultyId];
            const rating = parseFloat(((_c = session.average_rating) === null || _c === void 0 ? void 0 : _c.toString()) || '0');
            stats.total_sessions += 1;
            stats.total_rating += rating;
            stats.total_attendance += parseFloat(((_d = session.attendance_rate) === null || _d === void 0 ? void 0 : _d.toString()) || '0');
            if (session.avg_quiz_score) {
                stats.total_quiz_score += parseFloat(session.avg_quiz_score.toString());
                stats.quiz_session_count += 1;
            }
            if (rating >= 4.5)
                stats.excellent_sessions += 1;
            if (rating < 4.0)
                stats.poor_sessions += 1;
        });
        // Format comparison data
        const formattedComparison = Object.values(facultyStats).map((stats) => ({
            faculty_name: stats.faculty_name,
            faculty_id: stats.faculty_id,
            total_sessions: stats.total_sessions,
            avg_rating: (stats.total_rating / stats.total_sessions).toFixed(2),
            avg_attendance: (stats.total_attendance / stats.total_sessions).toFixed(1),
            avg_quiz_score: stats.quiz_session_count > 0
                ? (stats.total_quiz_score / stats.quiz_session_count).toFixed(1)
                : null,
            excellent_sessions: stats.excellent_sessions,
            poor_sessions: stats.poor_sessions,
            performance_ratio: ((stats.excellent_sessions / stats.total_sessions) * 100).toFixed(1)
        })).sort((a, b) => parseFloat(b.avg_rating) - parseFloat(a.avg_rating));
        res.json(formattedComparison);
    }
    catch (error) {
        console.error('Error fetching faculty comparison:', error);
        res.status(500).json({ error: 'Failed to fetch faculty comparison' });
    }
});
exports.getFacultyComparison = getFacultyComparison;
const getFacultyRatings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { faculty_id, start_date, end_date } = req.query;
        // Start building the query
        let query = supabase_1.supabase
            .from("faculty_rating")
            .select(`
                rating,
                session_date,
                session_id,
                faculty_id,
                profiles!inner(name),
                class_sessions!inner(
                    course_sections!inner(
                        courses!inner(course_name),
                        batches!inner(batch_name)
                    )
                )
            `)
            .order("session_date", { ascending: true });
        // Apply filters
        if (faculty_id && faculty_id !== "all") {
            query = query.eq("faculty_id", faculty_id);
        }
        if (start_date) {
            query = query.gte("session_date", start_date);
        }
        if (end_date) {
            query = query.lte("session_date", end_date);
        }
        // Execute the query
        const { data, error } = yield query;
        if (error) {
            console.error("Supabase error:", error);
            res.status(500).json({ error: "Failed to fetch ratings" });
            return;
        }
        // Get unique session IDs
        const sessionIds = [...new Set(data === null || data === void 0 ? void 0 : data.map((r) => r.session_id))];
        // Fetch student response counts for each session
        const { data: responsesData, error: responsesError } = yield supabase_1.supabase
            .from("session_responses_feedback")
            .select(`
                session_id,
                question_id,
                session_questions!inner(
                    feedback_question_id
                )
            `)
            .in("session_id", sessionIds);
        if (responsesError) {
            console.error("Supabase error fetching responses:", responsesError);
        }
        // Count students who responded to feedback_question_id = 3 for each session
        const sessionStudentCounts = {};
        (responsesData || []).forEach((response) => {
            var _a;
            const sessionId = response.session_id;
            const feedbackQuestionId = (_a = response.session_questions) === null || _a === void 0 ? void 0 : _a.feedback_question_id;
            // Only count if feedback_question_id is 3
            if (feedbackQuestionId === 3) {
                if (!sessionStudentCounts[sessionId]) {
                    sessionStudentCounts[sessionId] = 0;
                }
                sessionStudentCounts[sessionId] += 1;
            }
        });
        // Add student counts to the response data
        const dataWithCounts = (data || []).map((rating) => (Object.assign(Object.assign({}, rating), { student_count: sessionStudentCounts[rating.session_id] || 0 })));
        res.json(dataWithCounts);
    }
    catch (err) {
        console.error("Error fetching faculty ratings:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.getFacultyRatings = getFacultyRatings;
const getAllFacultyRatings = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { start_date, end_date } = req.query;
        if (!start_date || !end_date) {
            res.status(400).json({ error: "start_date and end_date are required" });
            return;
        }
        // Fetch all ratings with faculty info and session date
        const { data, error } = yield supabase_1.supabase
            .from("faculty_rating")
            .select(`
                rating,
                session_date,
                session_id,
                profiles!inner(name)
            `)
            .gte("session_date", start_date)
            .lte("session_date", end_date)
            .order("session_date", { ascending: true });
        if (error) {
            console.error("Supabase error:", error);
            res.status(500).json({ error: "Failed to fetch ratings" });
            return;
        }
        // Get unique session IDs
        const sessionIds = [...new Set(data === null || data === void 0 ? void 0 : data.map((r) => r.session_id))];
        // Fetch student response counts for each session
        const { data: responsesData, error: responsesError } = yield supabase_1.supabase
            .from("session_responses_feedback")
            .select(`
                session_id,
                question_id,
                session_questions!inner(
                    feedback_question_id
                )
            `)
            .in("session_id", sessionIds);
        if (responsesError) {
            console.error("Supabase error fetching responses:", responsesError);
        }
        // Count students who responded to feedback_question_id = 3 for each session
        const sessionStudentCounts = {};
        (responsesData || []).forEach((response) => {
            var _a;
            const sessionId = response.session_id;
            const feedbackQuestionId = (_a = response.session_questions) === null || _a === void 0 ? void 0 : _a.feedback_question_id;
            // Only count if feedback_question_id is 3
            if (feedbackQuestionId === 3) {
                if (!sessionStudentCounts[sessionId]) {
                    sessionStudentCounts[sessionId] = 0;
                }
                sessionStudentCounts[sessionId] += 1;
            }
        });
        // Group by date and faculty, calculate averages and student counts
        const grouped = {};
        (data || []).forEach((r) => {
            var _a;
            const date = r.session_date;
            const faculty = getProfileName(r.profiles);
            const sessionId = r.session_id;
            if (!grouped[date])
                grouped[date] = {};
            if (!grouped[date][faculty])
                grouped[date][faculty] = { total: 0, count: 0, studentCount: 0 };
            grouped[date][faculty].total += (_a = r.rating) !== null && _a !== void 0 ? _a : 0;
            grouped[date][faculty].count += 1;
            // Add student count from this session
            if (sessionStudentCounts[sessionId]) {
                grouped[date][faculty].studentCount += sessionStudentCounts[sessionId];
            }
        });
        // Format for heatmap: array of { date, Faculty 1: avg, Faculty 2: avg, Faculty 1_count, Faculty 2_count ... }
        const heatmapData = Object.entries(grouped).map(([date, faculties]) => {
            const row = { date };
            Object.entries(faculties).forEach(([faculty, stats]) => {
                row[faculty] = Math.round((stats.total / stats.count) * 100) / 100;
                row[`${faculty}_count`] = stats.studentCount;
            });
            return row;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        res.json(heatmapData);
    }
    catch (err) {
        console.error("Error fetching all faculty heatmap data:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.getAllFacultyRatings = getAllFacultyRatings;
