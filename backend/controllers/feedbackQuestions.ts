import { Request, Response } from "express";
import { supabase } from "../config/supabase";

export const getAllFeedbackQuestions = async (_: Request, res: Response) => {
    try {

        const { data: questions, error: qError } = await supabase
            .from("feedback_questions")
            .select("id, question_text, question_type");

        if (qError) {
            return res.status(500).json({ message: "Error fetching questions", error: qError });
        }


        const { data: options, error: oError } = await supabase
            .from("feedback_question_options")
            .select("id, option_text, question_id");

        if (oError) {
            return res.status(500).json({ message: "Error fetching options", error: oError });
        }

        const result = questions.map((q) => ({
            id: q.id,
            question_text: q.question_text,
            type: q.question_type,
            feedback_question_options: options.filter((opt) => opt.question_id === q.id),
        }));

        res.status(200).json({ questions: result });
    } catch (err) {
        console.error("Error fetching feedback questions:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const createQuiz = async (req: Request, res: Response) => {
    const { session_id } = req.params;
    const { newQuestions } = req.body;

    if (!session_id) return res.status(400).json({ message: "session_id required" });

    try {
        const sessionQuestions: any[] = [];

        // Only handle user-created (custom) questions
        if (newQuestions?.length) {
            for (const q of newQuestions) {
                const { question_text, type, options } = q;

                sessionQuestions.push({
                    session_id: Number(session_id),
                    is_generic: false,
                    feedback_question_id: null,
                    question_text,
                    question_type: type,
                    options: JSON.stringify(options || [])
                });
            }
        }

        // Insert into database
        if (sessionQuestions.length > 0) {
            const { error } = await supabase
                .from("session_questions")
                .insert(sessionQuestions);

            if (error) {
                console.error("Database error:", error);
                throw error;
            }
        }

        return res.status(201).json({
            message: "Quiz created successfully",
            questionsAdded: sessionQuestions.length
        });
    } catch (err) {
        console.error("Error creating quiz:", err);
        res.status(500).json({
            message: "Internal server error",
        });
    }
};


export const getSessionQuestionsBySessionId = async (req: Request, res: Response) => {
    try {
        const { session_id } = req.params;

        const { data, error } = await supabase
            .from("session_questions")
            .select(`
        id,
        session_id,
        is_generic,
        feedback_question_id,
        feedback_questions (
          id,
          question_text
        ),
        question_text,
        options,
        created_at,
        question_type
      `)
            .eq("session_id", session_id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }


        const normalized = data?.map((q: any) => ({
            id: q.id,
            session_id: q.session_id,
            is_general: q.is_general,
            feedback_question_id: q.feedback_question_id,
            options: q.options,
            created_at: q.created_at,
            question_type: q.question_type,
            final_question_text: q.feedback_questions?.question_text || q.question_text || null
        }));

        return res.status(200).json({ session_questions: normalized });
    } catch (err) {
        console.error("Error fetching session questions:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};


export const submitSessionFeedback = async (req: Request, res: Response) => {
    try {
        const { sessionId, studentId, facultyId, responses } = req.body;

        if (!sessionId || !studentId || !facultyId || !Array.isArray(responses)) {
            return res.status(400).json({ error: "Invalid request body" });
        }

        // Transform responses into rows for the DB
        const rows = responses.map((r: any) => ({
            session_id: sessionId,
            student_id: studentId,
            faculty_id: facultyId,
            question_id: r.questionId,
            response_text: r.responseText || null,
        }));

        // Insert into Supabase
        const { data, error } = await supabase
            .from("session_responses_feedback")
            .insert(rows)
            .select();

        if (error) {
            console.error("Supabase insert error:", error);
            return res.status(500).json({ error: "Failed to save responses" });
        }

        return res.status(201).json({
            message: "Feedback submitted successfully",
            responses: data,
        });
    } catch (err) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};
