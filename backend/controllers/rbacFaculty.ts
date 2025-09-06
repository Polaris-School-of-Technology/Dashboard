import { Request, Response } from "express";
import { supabase } from "../config/supabase";


// GET /api/faculty/sessions/:date
export const RBACgetFacultySessionsByDate = async (req: Request, res: Response) => {
    try {
        const { date } = req.params;
        const user = (req as any).user;
        const facultyId = user.facultyId;

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
            .eq("actual_faculty_id", facultyId)
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


// POST /api/quiz/create/:session_id
export const RBACcreateQuiz = async (req: Request, res: Response) => {
    const { session_id } = req.params;
    const { newQuestions } = req.body;
    const user = (req as any).user;

    // verify faculty owns the session
    const { data: sessionData, error: fetchError } = await supabase
        .from("class_sessions")
        .select("actual_faculty_id")
        .eq("id", Number(session_id))
        .single();

    if (fetchError || !sessionData) return res.status(404).json({ message: "Session not found" });
    if (sessionData.actual_faculty_id !== user.facultyId)
        return res.status(403).json({ message: "Not authorized" });

    try {
        const sessionQuestions = newQuestions?.map((q: any) => ({
            session_id: Number(session_id),
            is_generic: false,
            feedback_question_id: null,
            question_text: q.question_text,
            question_type: q.type,
            options: JSON.stringify(q.options || []),
            correct_option_value: q.correct_option_value // ✅ Add this line
        })) || [];

        if (sessionQuestions.length > 0) {
            const { error } = await supabase.from("session_questions").insert(sessionQuestions);
            if (error) throw error;
        }

        res.status(201).json({ message: "Quiz created successfully", questionsAdded: sessionQuestions.length });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
};


// GET /api/rbacFaculty/quiz/:session_id
// GET /api/rbacFaculty/quiz/:session_id
// GET /api/rbacFaculty/quiz/:session_id
export const getQuizBySessionRbac = async (req: Request, res: Response) => {
    const { session_id } = req.params;

    try {
        const { data, error } = await supabase
            .from("session_questions")
            .select("*")
            .eq("session_id", Number(session_id));

        if (error) throw error;

        // Parse options safely
        const formatted = data.map((q: any) => ({
            ...q,
            options: Array.isArray(q.options)
                ? q.options
                : q.options
                    ? JSON.parse(q.options)
                    : [],
        }));

        res.json(formatted);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch quiz" });
    }
};


// PUT /api/rbacFaculty/question/:question_id
// PUT /api/rbacFaculty/question/:question_id
export const updateQuestionRbac = async (req: Request, res: Response) => {
    const { question_id } = req.params;
    const { question_text, question_type, options } = req.body;
    const user = (req as any).user;

    try {
        // First verify the question belongs to a session owned by this faculty
        const { data: questionData, error: questionError } = await supabase
            .from("session_questions")
            .select(`
                id,
                session_id
            `)
            .eq("id", Number(question_id))
            .single();

        if (questionError || !questionData) {
            return res.status(404).json({ message: "Question not found" });
        }

        // Now check if the session belongs to this faculty
        const { data: sessionData, error: sessionError } = await supabase
            .from("class_sessions")
            .select("actual_faculty_id")
            .eq("id", questionData.session_id)
            .single();

        if (sessionError || !sessionData) {
            return res.status(404).json({ message: "Session not found" });
        }

        // Check if faculty owns this session
        if (sessionData.actual_faculty_id !== user.facultyId) {
            return res.status(403).json({ message: "Not authorized to edit this question" });
        }

        // Update the question
        const { data, error } = await supabase
            .from("session_questions")
            .update({
                question_text,
                question_type,
                options: JSON.stringify(options || [])
            })
            .eq("id", Number(question_id))
            .select();

        if (error) throw error;

        res.json({
            message: "Question updated successfully",
            question: data[0]
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update question" });
    }
};

// DELETE /api/rbacFaculty/question/:question_id
export const deleteQuestionRbac = async (req: Request, res: Response) => {
    const { question_id } = req.params;
    const user = (req as any).user;

    try {
        // First verify the question belongs to a session owned by this faculty
        const { data: questionData, error: questionError } = await supabase
            .from("session_questions")
            .select(`
                id,
                session_id
            `)
            .eq("id", Number(question_id))
            .single();

        if (questionError || !questionData) {
            return res.status(404).json({ message: "Question not found" });
        }

        // Now check if the session belongs to this faculty
        const { data: sessionData, error: sessionError } = await supabase
            .from("class_sessions")
            .select("actual_faculty_id")
            .eq("id", questionData.session_id)
            .single();

        if (sessionError || !sessionData) {
            return res.status(404).json({ message: "Session not found" });
        }

        // Check if faculty owns this session
        if (sessionData.actual_faculty_id !== user.facultyId) {
            return res.status(403).json({ message: "Not authorized to delete this question" });
        }

        // Delete the question
        const { error } = await supabase
            .from("session_questions")
            .delete()
            .eq("id", Number(question_id));

        if (error) throw error;

        res.json({ message: "Question deleted successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete question" });
    }
};
