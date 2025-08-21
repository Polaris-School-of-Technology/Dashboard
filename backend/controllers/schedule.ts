import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getSessionsByDate = async (req: Request, res: Response) => {
    try {
        const { date } = req.params;

     
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

     
        const { data, error } = await supabase
            .from("class_sessions")
            .select(`
                id,
                session_datetime,
                session_type,
                duration,
                actual_faculty_id,
                profiles!inner(name),
                section_id (
                  id,
                  course_id (
                    course_name
                  )
                )
            `)
            .gte("session_datetime", start.toISOString())
            .lte("session_datetime", end.toISOString())
            .order("session_datetime", { ascending: true });

        if (error) throw error;

        const formattedData = data.map((session: any) => ({
            id: session.id,
            session_datetime: session.session_datetime,
            session_type: session.session_type,
            duration: session.duration,
            actual_faculty_id: session.actual_faculty_id,
            faculty_name: session.profiles.name,
            course_name: session.section_id?.course_id?.course_name || null,
            section_id: session.section_id?.id || null,
            venue: session.venue || null
        }));

        res.json(formattedData);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
};


export const updateSession = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { actual_faculty_id, section_id, session_datetime, duration, session_type, venue } = req.body;

       
        let datetime = session_datetime;
        if (datetime && !datetime.includes("+")) {
            datetime = `${datetime.slice(0, 19)}+05:30`;
        }

        const updateData: any = {
            actual_faculty_id: actual_faculty_id || undefined,
            section_id: section_id || undefined,
            session_datetime: datetime || undefined,
            duration: duration || undefined,
            session_type: session_type || undefined,
            venue: venue !== undefined ? venue : undefined
        };

        // Remove undefined fields
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined) delete updateData[key];
        });

        const { data, error } = await supabase
            .from("class_sessions")
            .update(updateData)
            .eq("id", id)
            .select();

        if (error) throw error;

        res.json({ message: "Session updated", session: data[0] });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: "Failed to update session" });
    }
};

// GET /api/faculties
export const getFaculties = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from("faculty_details")
            .select("user_id, profiles(name)");

        if (error) throw error;

        const formatted = data.map((f: any) => ({
            id: f.user_id,
            name: f.profiles?.name || null
        }));

        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch faculties" });
    }
};

// GET /api/sections
export const getSections = async (_req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from("course_sections")
            .select(`
                id,
                course_id,
                courses(course_name)
            `);

        if (error) throw error;

        const formatted = data.map((s: any) => ({
            id: s.id, // this is section_id
            course_name: s.courses.course_name
        }));

        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch sections" });
    }
};



export const createSingleClassSessionHandler = async (req: Request, res: Response) => {
    try {
        const { section_id, faculty_id, session_type, start_date, class_time, duration, venue } = req.body;

        if (!section_id || !faculty_id || !session_type || !start_date || !class_time || !duration) {
            return res.status(400).json({ message: "Missing required fields" });
        }

        const sessionDate = `${start_date}T${class_time}:00+05:30`;

        const payload: any = {
            actual_faculty_id: faculty_id,
            section_id: section_id,
            session_datetime: sessionDate,
            duration,
            session_type,
            venue: venue || null,
            status: "upcoming"
        };

        const { data, error } = await supabase
            .from("class_sessions")
            .insert([payload])
            .select("*")
            .single();

        if (error) throw error;

        return res.status(201).json({
            message: "Class session created successfully",
            session: data
        });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ message: err.message || "Failed to create session" });
    }
};

export const deleteClassSession = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) return res.status(400).json({ error: "Session ID is required" });

    const { error } = await supabase
      .from("class_sessions") 
      .delete()
      .eq("id", id);

    if (error) throw error;

    return res.json({ message: "Session deleted successfully" });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
};