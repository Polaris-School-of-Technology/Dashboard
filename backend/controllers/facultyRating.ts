// controllers/analyticsController.ts

import { Request, Response } from "express";
import { supabase } from "../config/supabase";

// Types
interface AnalyticsQuery {
    start_date?: string;
    end_date?: string;
    faculty_id?: string;
}

interface SessionData {
    session_id: string;
    session_date: string;
    faculty_name: string;
    faculty_id: string;
    course_name: string;
    batch_name: string;
    attendance_rate: number;
    average_rating: number;
    summary: string;
    avg_quiz_score?: number;
    max_quiz_score?: number;
    min_quiz_score?: number;
    stddev_quiz_score?: number;
    above_90_count?: number;
    below_40_count?: number;
}

interface FacultyData {
    faculty_id: string;
    faculty_name: string;
}

interface ProfileData {
    name: string;
}

interface FacultyDetails {
    user_id: string;
    department: string;
    title: string;
    profiles: ProfileData | ProfileData[]; // Handle both single and array
}

interface SessionWithFaculty {
    id: string;
    session_date: string;
    course_name: string;
    batch_name: string;
    attendance_rate: number;
    average_rating: number;
    summary: string;
    avg_quiz_score?: number;
    max_quiz_score?: number;
    min_quiz_score?: number;
    stddev_quiz_score?: number;
    above_90_count?: number;
    below_40_count?: number;
    faculty_details: FacultyDetails;
}

// Helper function to safely get profile name
const getProfileName = (profiles: ProfileData | ProfileData[] | undefined): string => {
    if (!profiles) return 'Unknown';
    if (Array.isArray(profiles)) {
        return profiles[0]?.name || 'Unknown';
    }
    return profiles.name || 'Unknown';
};

// Get analytics data for date range (week-based)
export const getAnalyticsByDateRange = async (req: Request, res: Response): Promise<void> => {
    try {
        const { start_date, end_date, faculty_id } = req.query as {
            start_date?: string;
            end_date?: string;
            faculty_id?: string;
        };

        if (!start_date || !end_date) {
            res.status(400).json({
                error: 'start_date and end_date are required'
            });
            return;
        }

        let query = supabase
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

        const { data: sessions, error } = await query;

        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to fetch analytics data' });
            return;
        }

        // Flatten the nested structure
        const formattedSessions = sessions?.map((session: any) => ({
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
            faculty_id: session.faculty_details?.user_id,
            faculty_name: getProfileName(session.faculty_details?.profiles),
            faculty_department: session.faculty_details?.department,
            faculty_title: session.faculty_details?.title
        })) || [];

        res.json(formattedSessions);

    } catch (error) {
        console.error('Error fetching analytics:', error);
        res.status(500).json({ error: 'Failed to fetch analytics data' });
    }
};

// Get faculty list for dropdown
export const getFacultyList = async (req: Request, res: Response): Promise<void> => {
    try {
        const { data: faculties, error } = await supabase
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

        const formattedFaculties = faculties?.map((faculty: any) => ({
            faculty_id: faculty.user_id,
            faculty_name: getProfileName(faculty.profiles),
            department: faculty.department,
            title: faculty.title
        })) || [];

        res.json(formattedFaculties);

    } catch (error) {
        console.error('Error fetching faculty list:', error);
        res.status(500).json({ error: 'Failed to fetch faculty list' });
    }
};

// Get weekly summary stats
export const getWeeklySummary = async (req: Request, res: Response): Promise<void> => {
    try {
        const { start_date, end_date, faculty_id } = req.query as {
            start_date?: string;
            end_date?: string;
            faculty_id?: string;
        };

        if (!start_date || !end_date) {
            res.status(400).json({
                error: 'start_date and end_date are required'
            });
            return;
        }

        let query = supabase
            .from('class_sessions')
            .select('average_rating, attendance_rate')
            .gte('session_date', start_date)
            .lte('session_date', end_date);

        if (faculty_id && faculty_id !== 'all') {
            query = query.eq('faculty_id', faculty_id);
        }

        const { data: sessions, error } = await query;

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
        const ratings = sessionData.map((s: any) => parseFloat(s.average_rating?.toString() || '0'));
        const attendances = sessionData.map((s: any) => parseFloat(s.attendance_rate?.toString() || '0'));

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

    } catch (error) {
        console.error('Error fetching weekly summary:', error);
        res.status(500).json({ error: 'Failed to fetch weekly summary' });
    }
};

// Get daily aggregated data for charts
export const getDailyAggregates = async (req: Request, res: Response): Promise<void> => {
    try {
        const { start_date, end_date, faculty_id } = req.query as {
            start_date?: string;
            end_date?: string;
            faculty_id?: string;
        };

        if (!start_date || !end_date) {
            res.status(400).json({
                error: 'start_date and end_date are required'
            });
            return;
        }

        let query = supabase
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

        const { data: sessions, error } = await query;

        if (error) {
            console.error('Supabase error:', error);
            res.status(500).json({ error: 'Failed to fetch daily aggregates' });
            return;
        }

        // Group by date and faculty
        const grouped: { [key: string]: { [faculty: string]: any } } = {};

        sessions?.forEach((session: any) => {
            const date = session.session_date;
            const facultyName = getProfileName(session.faculty_details?.profiles);

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
            stats.totalRating += parseFloat(session.average_rating?.toString() || '0');
            stats.totalAttendance += parseFloat(session.attendance_rate?.toString() || '0');

            if (session.avg_quiz_score) {
                stats.totalQuizScore += parseFloat(session.avg_quiz_score.toString());
                stats.quizSessionCount += 1;
            }
        });

        // Format data for frontend charts
        const formattedData = Object.keys(grouped).map(date => {
            const dayData: any = { date };

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

    } catch (error) {
        console.error('Error fetching daily aggregates:', error);
        res.status(500).json({ error: 'Failed to fetch daily aggregates' });
    }
};

// Get faculty performance comparison
export const getFacultyComparison = async (req: Request, res: Response): Promise<void> => {
    try {
        const { start_date, end_date } = req.query as {
            start_date?: string;
            end_date?: string;
        };

        if (!start_date || !end_date) {
            res.status(400).json({
                error: 'start_date and end_date are required'
            });
            return;
        }

        const { data: sessions, error } = await supabase
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
        const facultyStats: { [key: string]: any } = {};

        sessions?.forEach((session: any) => {
            const facultyId = session.faculty_details?.user_id;
            const facultyName = getProfileName(session.faculty_details?.profiles);

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
            const rating = parseFloat(session.average_rating?.toString() || '0');

            stats.total_sessions += 1;
            stats.total_rating += rating;
            stats.total_attendance += parseFloat(session.attendance_rate?.toString() || '0');

            if (session.avg_quiz_score) {
                stats.total_quiz_score += parseFloat(session.avg_quiz_score.toString());
                stats.quiz_session_count += 1;
            }

            if (rating >= 4.5) stats.excellent_sessions += 1;
            if (rating < 4.0) stats.poor_sessions += 1;
        });

        // Format comparison data
        const formattedComparison = Object.values(facultyStats).map((stats: any) => ({
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

    } catch (error) {
        console.error('Error fetching faculty comparison:', error);
        res.status(500).json({ error: 'Failed to fetch faculty comparison' });
    }
};

export const getFacultyRatings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { faculty_id, start_date, end_date } = req.query as {
            faculty_id?: string;
            start_date?: string;
            end_date?: string;
        };

        // Start building the query
        let query = supabase
            .from("faculty_rating")
            .select(`
                rating,
                session_date,
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
            const facultyIds = faculty_id.split(',');
            if (facultyIds.length > 1) {
                query = query.in("faculty_id", facultyIds);
            } else {
                query = query.eq("faculty_id", faculty_id);
            }
        }
        if (start_date) {
            query = query.gte("session_date", start_date);
        }
        if (end_date) {
            query = query.lte("session_date", end_date);
        }

        // Execute the query
        const { data, error } = await query;

        if (error) {
            console.error("Supabase error:", error);
            res.status(500).json({ error: "Failed to fetch ratings" });
            return;
        }

        res.json(data || []);
    } catch (err) {
        console.error("Error fetching faculty ratings:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getAllFacultyRatings = async (req: Request, res: Response): Promise<void> => {
    try {
        const { start_date, end_date } = req.query as {
            start_date?: string;
            end_date?: string;
        };

        if (!start_date || !end_date) {
            res.status(400).json({ error: "start_date and end_date are required" });
            return;
        }

        // Fetch all ratings with faculty info and session date
        const { data, error } = await supabase
            .from("faculty_rating")
            .select(`
                rating,
                session_date,
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

        // Group by date and faculty, calculate averages
        const grouped: Record<string, Record<string, { total: number; count: number }>> = {};

        (data || []).forEach((r: any) => {
            const date = r.session_date;
            const faculty = getProfileName(r.profiles);

            if (!grouped[date]) grouped[date] = {};
            if (!grouped[date][faculty]) grouped[date][faculty] = { total: 0, count: 0 };

            grouped[date][faculty].total += r.rating ?? 0;
            grouped[date][faculty].count += 1;
        });

        // Format for heatmap: array of { date, Faculty 1: avg, Faculty 2: avg, ... }
        const heatmapData = Object.entries(grouped).map(([date, faculties]) => {
            const row: Record<string, any> = { date };
            Object.entries(faculties).forEach(([faculty, stats]) => {
                row[faculty] = Math.round((stats.total / stats.count) * 100) / 100;
            });
            return row;
        }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        res.json(heatmapData);

    } catch (err) {
        console.error("Error fetching all faculty heatmap data:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};