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
exports.deleteClassSession = exports.createSingleClassSessionHandler = exports.getSections = exports.getFaculties = exports.updateSession = exports.getSessionsByDate = exports.getSessionsByDateOld = exports.getAllBatches = void 0;
const supabase_1 = require("../config/supabase");
const getAllBatches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Fetch all rows from "batches" table
        const { data, error } = yield supabase_1.supabase
            .from("batches")
            .select("*"); // selects all columns
        if (error)
            throw error;
        // Send only batch data to frontend
        res.status(200).json({ batches: data });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});
exports.getAllBatches = getAllBatches;
const getSessionsByDateOld = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.params;
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
exports.getSessionsByDateOld = getSessionsByDateOld;
const getSessionsByDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
            const { data: batchData, error: batchError } = yield supabase_1.supabase
                .from("batches")
                .select("id")
                .eq("batch_name", "3A")
                .single();
            if (batchData && !batchError) {
                actualBatchId = batchData.id.toString();
            }
        }
        else {
            actualBatchId = batch_id.toString();
        }
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        // --- Step 1: Get section_ids for the batch ---
        const { data: sections, error: sectionErr } = yield supabase_1.supabase
            .from("course_sections")
            .select("id")
            .eq("batch_id", Number(actualBatchId));
        if (sectionErr)
            return res.status(500).json({ error: sectionErr.message });
        if (sections.length === 0) {
            return res.json([]); // Return empty array if no sections found for the batch
        }
        const sectionIds = sections.map((s) => s.id);
        // --- Step 2: Get class_sessions filtered by section_id and date ---
        const { data, error } = yield supabase_1.supabase
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
        if (error)
            throw error;
        const formattedData = data.map((session) => {
            var _a, _b, _c, _d;
            return ({
                id: session.id,
                session_datetime: session.session_datetime,
                session_type: session.session_type,
                duration: session.duration,
                actual_faculty_id: session.actual_faculty_id,
                faculty_name: session.profiles.name,
                course_name: ((_b = (_a = session.section_id) === null || _a === void 0 ? void 0 : _a.course_id) === null || _b === void 0 ? void 0 : _b.course_name) || null,
                section_id: ((_c = session.section_id) === null || _c === void 0 ? void 0 : _c.id) || null,
                venue: session.venue || null,
                batch_info: ((_d = session.section_id) === null || _d === void 0 ? void 0 : _d.batches)
                    ? {
                        batch_id: session.section_id.batch_id,
                        batch_name: session.section_id.batches.batch_name,
                    }
                    : null,
            });
        });
        res.json(formattedData);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch sessions" });
    }
});
exports.getSessionsByDate = getSessionsByDate;
const updateSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { actual_faculty_id, section_id, session_datetime, duration, session_type, venue } = req.body;
        let datetime = session_datetime;
        if (datetime && !datetime.includes("+")) {
            datetime = `${datetime.slice(0, 19)}+05:30`;
        }
        const updateData = {
            actual_faculty_id: actual_faculty_id || undefined,
            section_id: section_id || undefined,
            session_datetime: datetime || undefined,
            duration: duration || undefined,
            session_type: session_type || undefined,
            venue: venue !== undefined ? venue : undefined
        };
        // Remove undefined fields
        Object.keys(updateData).forEach(key => {
            if (updateData[key] === undefined)
                delete updateData[key];
        });
        const { data, error } = yield supabase_1.supabase
            .from("class_sessions")
            .update(updateData)
            .eq("id", id)
            .select();
        if (error)
            throw error;
        res.json({ message: "Session updated", session: data[0] });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to update session" });
    }
});
exports.updateSession = updateSession;
// GET /api/faculties
const getFaculties = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { batch_id } = req.query; // Get batch_id from query params
        let query = supabase_1.supabase
            .from("faculty_sections_mapping")
            .select(`
                faculty_id,
                profiles!inner(name),
                course_sections!inner(batch_id)
            `);
        // If batch_id is provided, filter by it
        if (batch_id) {
            query = query.eq("course_sections.batch_id", batch_id);
        }
        const { data, error } = yield query;
        if (error)
            throw error;
        // Remove duplicates and format
        const uniqueFaculties = new Map();
        data.forEach((mapping) => {
            var _a;
            if (!uniqueFaculties.has(mapping.faculty_id)) {
                uniqueFaculties.set(mapping.faculty_id, {
                    id: mapping.faculty_id,
                    name: ((_a = mapping.profiles) === null || _a === void 0 ? void 0 : _a.name) || null
                });
            }
        });
        res.json(Array.from(uniqueFaculties.values()));
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch faculties" });
    }
});
exports.getFaculties = getFaculties;
// GET /api/sections
const getSections = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { batch_id } = req.query; // Get batch_id from query parameters
        let query = supabase_1.supabase
            .from("course_sections")
            .select(`
                id,
                course_id,
                batch_id,
                courses(course_name)
            `);
        // If batch_id is provided, filter by it
        if (batch_id) {
            query = query.eq("batch_id", Number(batch_id));
        }
        const { data, error } = yield query;
        if (error)
            throw error;
        const formatted = data.map((s) => ({
            id: s.id, // this is section_id
            course_name: s.courses.course_name,
            batch_id: s.batch_id // Include batch_id in response for reference
        }));
        res.json(formatted);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch sections" });
    }
});
exports.getSections = getSections;
const createSingleClassSessionHandler = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { section_id, faculty_id, session_type, start_date, class_time, duration, venue } = req.body;
        if (!section_id || !faculty_id || !session_type || !start_date || !class_time || !duration) {
            return res.status(400).json({ message: "Missing required fields" });
        }
        const sessionDate = `${start_date}T${class_time}:00+05:30`;
        const payload = {
            actual_faculty_id: faculty_id,
            section_id: section_id,
            session_datetime: sessionDate,
            duration,
            session_type,
            venue: venue || null,
            status: "upcoming"
        };
        // 1️⃣ Create the session
        const { data: sessionData, error: sessionError } = yield supabase_1.supabase
            .from("class_sessions")
            .insert([payload])
            .select("*")
            .single();
        if (sessionError)
            throw sessionError;
        const session_id = sessionData.id;
        // 2️⃣ Fetch all pre-defined feedback questions
        const { data: questions, error: qError } = yield supabase_1.supabase
            .from("feedback_questions")
            .select("id, question_text, question_type");
        if (qError)
            throw qError;
        const { data: options, error: oError } = yield supabase_1.supabase
            .from("feedback_question_options")
            .select("id, option_text, question_id");
        if (oError)
            throw oError;
        // 3️⃣ Prepare session_questions entries
        const sessionQuestions = questions.map((q) => ({
            session_id,
            is_generic: true,
            feedback_question_id: q.id,
            question_text: q.question_text,
            question_type: q.question_type,
            options: JSON.stringify(options.filter((opt) => opt.question_id === q.id).map((opt) => opt.option_text)),
        }));
        // 4️⃣ Insert into session_questions
        if (sessionQuestions.length > 0) {
            const { error: insertError } = yield supabase_1.supabase
                .from("session_questions")
                .insert(sessionQuestions);
            if (insertError)
                throw insertError;
        }
        return res.status(201).json({
            message: "Class session created successfully",
            session: sessionData,
            questionsAdded: sessionQuestions.length
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ message: err.message || "Failed to create session" });
    }
});
exports.createSingleClassSessionHandler = createSingleClassSessionHandler;
const deleteClassSession = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        if (!id)
            return res.status(400).json({ error: "Session ID is required" });
        const { error } = yield supabase_1.supabase
            .from("class_sessions")
            .delete()
            .eq("id", id);
        if (error)
            throw error;
        return res.json({ message: "Session deleted successfully" });
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
exports.deleteClassSession = deleteClassSession;
