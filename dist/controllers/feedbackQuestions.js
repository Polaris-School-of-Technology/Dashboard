"use strict";
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
exports.submitSessionFeedback = exports.getSessionQuestionsBySessionId = exports.createQuiz = exports.getAllFeedbackQuestions = void 0;
const supabase_1 = require("../config/supabase");
const getAllFeedbackQuestions = (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data: questions, error: qError } = yield supabase_1.supabase
            .from("feedback_questions")
            .select("id, question_text, question_type");
        if (qError) {
            return res.status(500).json({ message: "Error fetching questions", error: qError });
        }
        const { data: options, error: oError } = yield supabase_1.supabase
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
    }
    catch (err) {
        console.error("Error fetching feedback questions:", err);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllFeedbackQuestions = getAllFeedbackQuestions;
const createQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { session_id } = req.params;
    const { newQuestions } = req.body;
    if (!session_id)
        return res.status(400).json({ message: "session_id required" });
    try {
        const sessionQuestions = [];
        if (newQuestions === null || newQuestions === void 0 ? void 0 : newQuestions.length) {
            for (const q of newQuestions) {
                const { question_text, type, options, correct_option_value } = q;
                sessionQuestions.push({
                    session_id: Number(session_id),
                    is_generic: false,
                    feedback_question_id: null,
                    question_text,
                    question_type: type,
                    options: JSON.stringify(options || []),
                    correct_option_value: type === "correct_answer_type" ? correct_option_value : null // Save correct answer here
                });
            }
        }
        if (sessionQuestions.length > 0) {
            const { error } = yield supabase_1.supabase
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
    }
    catch (err) {
        console.error("Error creating quiz:", err);
        res.status(500).json({
            message: "Internal server error",
        });
    }
});
exports.createQuiz = createQuiz;
const getSessionQuestionsBySessionId = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { session_id } = req.params;
        const { data, error } = yield supabase_1.supabase
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
        const normalized = data === null || data === void 0 ? void 0 : data.map((q) => {
            var _a;
            return ({
                id: q.id,
                session_id: q.session_id,
                is_general: q.is_general,
                feedback_question_id: q.feedback_question_id,
                options: q.options,
                created_at: q.created_at,
                question_type: q.question_type,
                final_question_text: ((_a = q.feedback_questions) === null || _a === void 0 ? void 0 : _a.question_text) || q.question_text || null
            });
        });
        return res.status(200).json({ session_questions: normalized });
    }
    catch (err) {
        console.error("Error fetching session questions:", err);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.getSessionQuestionsBySessionId = getSessionQuestionsBySessionId;
const submitSessionFeedback = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { sessionId, studentId, facultyId, responses } = req.body;
        if (!sessionId || !studentId || !facultyId || !Array.isArray(responses)) {
            return res.status(400).json({ error: "Invalid request body" });
        }
        const rows = yield Promise.all(responses.map((r) => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            const { data: questionData, error: qError } = yield supabase_1.supabase
                .from("session_questions")
                .select("correct_option_value, question_type")
                .eq("id", r.questionId)
                .single();
            if (qError || !questionData) {
                return {
                    session_id: sessionId,
                    student_id: studentId,
                    faculty_id: facultyId,
                    question_id: r.questionId,
                    response_text: r.responseText || null,
                    is_correct: null
                };
            }
            let isCorrect = null;
            if (questionData.question_type === "correct_answer_type" && questionData.correct_option_value) {
                isCorrect = ((_a = r.responseText) === null || _a === void 0 ? void 0 : _a.trim()) === questionData.correct_option_value.trim();
            }
            return {
                session_id: sessionId,
                student_id: studentId,
                faculty_id: facultyId,
                question_id: r.questionId,
                response_text: r.responseText || null,
                is_correct: isCorrect
            };
        })));
        const { data, error } = yield supabase_1.supabase
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
    }
    catch (err) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.submitSessionFeedback = submitSessionFeedback;
