import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export const attendanceReport = async (req: Request, res: Response) => {
    try {
        const { date } = req.params;
        const { session_id, status } = req.query;

        if (!date) return res.status(400).json({ error: 'Pass date (YYYY-MM-DD)' });

        const startOfDay = new Date(`${date}T00:00:00+05:30`);
        const endOfDay = new Date(`${date}T23:59:59+05:30`);

      
        const { data, error } = await supabase
            .from('attendance_records')
            .select(`
                id,
                is_present,
                session_id,
                user_id,
                class_sessions!inner (
                    session_datetime,
                    section_id,
                    actual_faculty_id,
                    faculty:actual_faculty_id (name),
                    course_sections:section_id (
                        courses:course_id (course_name)
                    )
                ),
                profiles!user_id (name)
            `)
            .gte('class_sessions.session_datetime', startOfDay.toISOString())
            .lte('class_sessions.session_datetime', endOfDay.toISOString())
            .order('session_datetime', { ascending: true, referencedTable: 'class_sessions' });

        if (error) return res.status(500).json({ error: error.message });

        let filteredData = data || [];

        if (session_id) {
            filteredData = filteredData.filter((rec: any) => rec.session_id === Number(session_id));
        }
        if (status === 'present') {
            filteredData = filteredData.filter((rec: any) => rec.is_present === true);
        } else if (status === 'absent') {
            filteredData = filteredData.filter((rec: any) => rec.is_present === false);
        }

        // --- Step 2: Fetch student_details (registration_ids) ---
        const userIds = filteredData.map((rec: any) => rec.user_id);
        const { data: studentDetails, error: detailsErr } = await supabase
            .from("student_details")
            .select("user_id, registration_id")
            .in("user_id", userIds);

        if (detailsErr) return res.status(500).json({ error: detailsErr.message });

        const detailsMap = Object.fromEntries(studentDetails.map(d => [d.user_id, d.registration_id]));

        // --- Step 3: Group & merge ---
        const grouped: {
            [key: number]: {
                session_id: number;
                datetime: string;
                course_name: string;
                faculty_name: string;
                students: {
                    id: number;
                    student_name: string;
                    registration_id: string | null;
                    present: boolean
                }[];
            };
        } = {};

        filteredData.forEach((rec: any) => {
            if (!grouped[rec.session_id]) {
                grouped[rec.session_id] = {
                    session_id: rec.session_id,
                    datetime: rec.class_sessions.session_datetime,
                    course_name: rec.class_sessions.course_sections?.courses?.course_name ?? 'N/A',
                    faculty_name: rec.class_sessions.faculty?.name ?? 'N/A',
                    students: [],
                };
            }

            grouped[rec.session_id].students.push({
                id: rec.id,
                student_name: rec.profiles?.name ?? 'N/A',
                registration_id: detailsMap[rec.user_id] ?? null,  
                present: rec.is_present,
            });
        });

        res.json(Object.values(grouped));
    } catch (e) {
        console.error("Attendance report error:", e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

export const updateAttendance = async (req: Request, res: Response) => {
    const attendanceId = Number(req.params.id);
    const { is_present } = req.body;

    if (!attendanceId || typeof is_present !== "boolean") {
        return res.status(400).json({ error: "Invalid attendance ID or is_present value" });
    }

    try {
        const { data, error } = await supabase
            .from("attendance_records")
            .update({ is_present })
            .eq("id", attendanceId)
            .select();

        if (error) {
            console.error("Supabase error:", error);
            return res.status(500).json({ error: "Database update failed" });
        }

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "Attendance record not found" });
        }

        return res.status(200).json({ message: "Attendance updated successfully", updated: data[0] });
    } catch (err) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ error: "Unexpected server error" });
    }
};
