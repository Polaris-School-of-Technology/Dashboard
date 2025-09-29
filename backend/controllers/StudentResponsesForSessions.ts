
import { Request, Response } from "express";
import { supabase } from "../config/supabase";

// we will create here outliers + we will create here, the sessions + the text questions that we have 
// pehle date select karo then select the batch and fetch all the sessions , then select the question from the sessionQuestions and then send this data 
// because till here we would have gotten the session id and the feedback question id 
// so calendar se time and batches wagera nikal do, show the sessions uske baad do the sessionQuestions select karo and then show responses 
export const getSessionsByDate = async (req: Request, res: Response) => {
    try {
        let { date } = req.params;
        let { batch_id } = req.query;

        // If date is not provided, default to today's date in YYYY-MM-DD format
        if (!date || date === 'today') {
            const now = new Date();
            date = now.toISOString().split("T")[0]; // Extracts 'YYYY-MM-DD'
        }

        // Default to batch "3A" if not provided, with fallback to batch 1
        let actualBatchId = "1"; // fallback default

        if (!batch_id) {
            // Look for batch "3A" by name
            const { data: batchData, error: batchError } = await supabase
                .from("batches")
                .select("id")
                .eq("batch_name", "3A")
                .single();

            if (batchData && !batchError) {
                actualBatchId = batchData.id.toString();
            }
        } else {
            actualBatchId = batch_id.toString();
        }

        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);

        // --- Step 1: Get section_ids for the batch ---
        const { data: sections, error: sectionErr } = await supabase
            .from("course_sections")
            .select("id")
            .eq("batch_id", Number(actualBatchId));

        if (sectionErr) return res.status(500).json({ error: sectionErr.message });

        if (sections.length === 0) {
            return res.json([]); // Return empty array if no sections found for the batch
        }

        const sectionIds = sections.map((s) => s.id);

        // --- Step 2: Get class_sessions filtered by section_id and date ---
        const { data, error } = await supabase
            .from("class_sessions")
            .select(`
                id,
                session_datetime,
                session_type,
                duration,
                actual_faculty_id,
                venue,
                profiles!inner(name),
                section_id (
                  id,
                  course_id (
                    course_name
                  ),
                  batch_id,
                  batches:batch_id(batch_name)
                )
            `)
            .in("section_id", sectionIds)
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
            venue: session.venue || null,
            batch_info: session.section_id?.batches
                ? {
                    batch_id: session.section_id.batch_id,
                    batch_name: session.section_id.batches.batch_name,
                }
                : null,
        }));

        res.json(formattedData);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
};

export const sessionQuestions = async (req: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from("feedback_questions")
            .select("*")
            .in("id", [4, 9, 10]); // only fetch these question IDs

        if (error) {
            console.error("Supabase Error:", error.message);
            return res.status(400).json({ error: error.message });
        }

        return res.status(200).json({ data });
    } catch (err) {
        console.error("Server Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

export const getStudentResponses = async (req: Request, res: Response) => {
    const { session_id, feedback_question_id } = req.body;

    if (!session_id || !feedback_question_id) {
        return res.status(400).json({ error: "session_id and feedback_question_id are required" });
    }

    try {
        const { data, error } = await supabase.rpc("get_all_student_responses_for_a_session", {
            in_session_id: session_id,
            in_feedback_question_id: feedback_question_id
        });

        if (error) {
            console.error(error);
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ data });
    } catch (err) {
        console.error("Server Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};


