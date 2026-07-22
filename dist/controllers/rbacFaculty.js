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
exports.RBACFacultyAttendance = exports.deleteQuestionRbac = exports.updateQuestionRbac = exports.getQuizBySessionRbac = exports.RBACcreateQuiz = exports.RBACgetFacultySessionsByDate = void 0;
const supabase_1 = require("../config/supabase");
// GET /api/faculty/sessions/:date
const RBACgetFacultySessionsByDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.params;
        const user = req.user;
        const facultyId = user.facultyId;
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        const { data, error } = yield supabase_1.supabase
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
        if (error)
            throw error;
        const formattedData = data.map((session) => {
            var _a, _b, _c;
            return ({
                id: session.id,
                session_datetime: session.session_datetime,
                session_type: session.session_type,
                duration: session.duration,
                actual_faculty_id: session.actual_faculty_id,
                faculty_name: session.profiles.name,
                course_name: ((_b = (_a = session.section_id) === null || _a === void 0 ? void 0 : _a.course_id) === null || _b === void 0 ? void 0 : _b.course_name) || null,
                section_id: ((_c = session.section_id) === null || _c === void 0 ? void 0 : _c.id) || null,
                venue: session.venue || null
            });
        });
        res.json(formattedData);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
});
exports.RBACgetFacultySessionsByDate = RBACgetFacultySessionsByDate;
// POST /api/quiz/create/:session_id
const RBACcreateQuiz = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { session_id } = req.params;
    const { newQuestions } = req.body;
    const user = req.user;
    // verify faculty owns the session
    const { data: sessionData, error: fetchError } = yield supabase_1.supabase
        .from("class_sessions")
        .select("actual_faculty_id")
        .eq("id", Number(session_id))
        .single();
    if (fetchError || !sessionData)
        return res.status(404).json({ message: "Session not found" });
    if (sessionData.actual_faculty_id !== user.facultyId)
        return res.status(403).json({ message: "Not authorized" });
    try {
        // Validate each question before processing
        const validationErrors = [];
        newQuestions === null || newQuestions === void 0 ? void 0 : newQuestions.forEach((q, index) => {
            try {
                validateQuestionData(q);
            }
            catch (error) {
                validationErrors.push(`Question ${index + 1}: ${error.message}`);
            }
        });
        if (validationErrors.length > 0) {
            return res.status(400).json({
                message: "Validation errors found",
                errors: validationErrors
            });
        }
        const sessionQuestions = (newQuestions === null || newQuestions === void 0 ? void 0 : newQuestions.map((q) => ({
            session_id: Number(session_id),
            is_generic: false,
            feedback_question_id: null,
            question_text: q.question_text,
            question_type: q.type,
            options: JSON.stringify(q.options || []),
            correct_option_value: q.correct_option_value
        }))) || [];
        if (sessionQuestions.length > 0) {
            const { error } = yield supabase_1.supabase.from("session_questions").insert(sessionQuestions);
            if (error)
                throw error;
        }
        res.status(201).json({
            message: "Quiz created successfully",
            questionsAdded: sessionQuestions.length
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.RBACcreateQuiz = RBACcreateQuiz;
// GET /api/rbacFaculty/quiz/:session_id
// GET /api/rbacFaculty/quiz/:session_id
// GET /api/rbacFaculty/quiz/:session_id
const getQuizBySessionRbac = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { session_id } = req.params;
    try {
        const { data, error } = yield supabase_1.supabase
            .from("session_questions")
            .select("*")
            .eq("session_id", Number(session_id));
        if (error)
            throw error;
        // Parse options safely
        const formatted = data.map((q) => (Object.assign(Object.assign({}, q), { options: Array.isArray(q.options)
                ? q.options
                : q.options
                    ? JSON.parse(q.options)
                    : [] })));
        res.json(formatted);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch quiz" });
    }
});
exports.getQuizBySessionRbac = getQuizBySessionRbac;
// PUT /api/rbacFaculty/question/:question_id
// PUT /api/rbacFaculty/question/:question_id
const updateQuestionRbac = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { question_id } = req.params;
    const { question_text, question_type, options, correct_option_value } = req.body; // ✅ Added correct_option_value
    const user = req.user;
    try {
        // First verify the question belongs to a session owned by this faculty
        const { data: questionData, error: questionError } = yield supabase_1.supabase
            .from("session_questions")
            .select(`
                id,
                session_id,
                is_generic
            `)
            .eq("id", Number(question_id))
            .single();
        if (questionError || !questionData) {
            return res.status(404).json({ message: "Question not found" });
        }
        // Now check if the session belongs to this faculty
        const { data: sessionData, error: sessionError } = yield supabase_1.supabase
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
        // Check if question is generic - if so, prevent editing
        if (questionData.is_generic) {
            return res.status(403).json({ message: "Generic questions cannot be modified" });
        }
        // Prepare update object
        const updateData = {
            question_text,
            question_type,
            options: options || []
        };
        // Only add correct_option_value if it's provided (for correct_answer_type questions)
        if (correct_option_value !== undefined) {
            updateData.correct_option_value = correct_option_value;
        }
        // Update the question
        const { data, error } = yield supabase_1.supabase
            .from("session_questions")
            .update(updateData) // ✅ Now includes correct_option_value
            .eq("id", Number(question_id))
            .select();
        if (error)
            throw error;
        res.json({
            message: "Question updated successfully",
            question: data[0]
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update question" });
    }
});
exports.updateQuestionRbac = updateQuestionRbac;
// DELETE /api/rbacFaculty/question/:question_id
const deleteQuestionRbac = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { question_id } = req.params;
    const user = req.user;
    try {
        // First verify the question belongs to a session owned by this faculty
        const { data: questionData, error: questionError } = yield supabase_1.supabase
            .from("session_questions")
            .select(`
                id,
                session_id,
                is_generic
            `)
            .eq("id", Number(question_id))
            .single();
        if (questionError || !questionData) {
            return res.status(404).json({ message: "Question not found" });
        }
        // Now check if the session belongs to this faculty
        const { data: sessionData, error: sessionError } = yield supabase_1.supabase
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
        // Check if question is generic - if so, prevent deletion
        if (questionData.is_generic) {
            return res.status(403).json({ message: "Generic questions cannot be deleted" });
        }
        // Delete the question
        const { error: deleteError } = yield supabase_1.supabase
            .from("session_questions")
            .delete()
            .eq("id", Number(question_id));
        if (deleteError)
            throw deleteError;
        res.json({
            message: "Question deleted successfully"
        });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to delete question" });
    }
});
exports.deleteQuestionRbac = deleteQuestionRbac;
// Add this validation function to your backend file
const validateQuestionData = (question) => {
    const validTypes = ["long_text", "multiple_choice", "correct_answer_type"];
    if (!question.question_text || question.question_text.trim() === "") {
        throw new Error("Question text is required");
    }
    if (!question.type || !validTypes.includes(question.type)) {
        throw new Error(`Invalid question type. Must be one of: ${validTypes.join(", ")}`);
    }
    // Validate options for multiple choice and correct answer types
    if (question.type === "multiple_choice" || question.type === "correct_answer_type") {
        if (!question.options || !Array.isArray(question.options) || question.options.length === 0) {
            throw new Error("Multiple choice and correct answer questions must have options");
        }
    }
    // Validate correct answer for correct_answer_type
    if (question.type === "correct_answer_type") {
        if (!question.correct_option_value) {
            throw new Error("Correct answer questions must specify the correct option");
        }
        if (!question.options.includes(question.correct_option_value)) {
            throw new Error("Correct option value must be one of the provided options");
        }
    }
    return true;
};
// Update your RBACcreateQuiz function to include validation:
const RBACFacultyAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.params;
        const user = req.user;
        const facultyId = user.facultyId;
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        // 1️⃣ Get class sessions for faculty on given date
        const { data: sessions, error: sessionError } = yield supabase_1.supabase
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
        if (sessionError)
            throw sessionError;
        if (!sessions || sessions.length === 0) {
            return res.json([]); // no sessions found
        }
        // 2️⃣ Extract session IDs
        const sessionIds = sessions.map((s) => s.id);
        // 3️⃣ Get attendance records for these session IDs
        const { data: attendanceRecords, error: attendanceError } = yield supabase_1.supabase
            .from("attendance_records")
            .select(`
                id,
                user_id,
                is_present,
                session_id,
                profiles!inner(name)
            `)
            .in("session_id", sessionIds);
        if (attendanceError)
            throw attendanceError;
        // 4️⃣ Map attendance by session
        const attendanceMap = new Map();
        attendanceRecords === null || attendanceRecords === void 0 ? void 0 : attendanceRecords.forEach((record) => {
            var _a, _b, _c;
            if (!attendanceMap.has(record.session_id))
                attendanceMap.set(record.session_id, []);
            attendanceMap.get(record.session_id).push({
                attendance_id: record.id,
                student_name: Array.isArray(record.profiles) ? (_a = record.profiles[0]) === null || _a === void 0 ? void 0 : _a.name : (_c = (_b = record.profiles) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : "N/A",
                present: record.is_present
            });
        });
        // 5️⃣ Combine sessions with their attendance
        const result = sessions.map((session) => {
            var _a, _b, _c, _d, _e, _f;
            return ({
                session_id: session.id,
                session_datetime: session.session_datetime,
                session_type: session.session_type,
                duration: session.duration,
                faculty_name: Array.isArray(session.profiles) ? (_a = session.profiles[0]) === null || _a === void 0 ? void 0 : _a.name : (_c = (_b = session.profiles) === null || _b === void 0 ? void 0 : _b.name) !== null && _c !== void 0 ? _c : "N/A",
                course_name: (_f = (_e = (_d = session.section_id) === null || _d === void 0 ? void 0 : _d.course_id) === null || _e === void 0 ? void 0 : _e.course_name) !== null && _f !== void 0 ? _f : null,
                students: attendanceMap.get(session.id) || []
            });
        });
        res.json(result);
    }
    catch (err) {
        console.error("Faculty attendance fetch error:", err);
        res.status(500).json({ error: "Failed to fetch sessions & attendance" });
    }
});
exports.RBACFacultyAttendance = RBACFacultyAttendance;
