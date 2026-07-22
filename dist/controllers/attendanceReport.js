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
exports.getBatches = exports.attendanceReport = exports.updateAttendance = exports.attendanceReportold = void 0;
const supabase_1 = require("../config/supabase");
// this is the previous version one without batch filtering 
const attendanceReportold = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.params;
        const { session_id, status } = req.query;
        if (!date)
            return res.status(400).json({ error: 'Pass date (YYYY-MM-DD)' });
        const startOfDay = new Date(`${date}T00:00:00+05:30`);
        const endOfDay = new Date(`${date}T23:59:59+05:30`);
        const { data, error } = yield supabase_1.supabase
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
                        batch: batch_id 
                    )
                ),
                profiles!user_id (name)
            `)
            .gte('class_sessions.session_datetime', startOfDay.toISOString())
            .lte('class_sessions.session_datetime', endOfDay.toISOString())
            .order('session_datetime', { ascending: true, referencedTable: 'class_sessions' });
        if (error)
            return res.status(500).json({ error: error.message });
        let filteredData = data || [];
        if (session_id) {
            filteredData = filteredData.filter((rec) => rec.session_id === Number(session_id));
        }
        if (status === 'present') {
            filteredData = filteredData.filter((rec) => rec.is_present === true);
        }
        else if (status === 'absent') {
            filteredData = filteredData.filter((rec) => rec.is_present === false);
        }
        // --- Step 2: Fetch student_details (registration_ids) ---
        const userIds = filteredData.map((rec) => rec.user_id);
        const { data: studentDetails, error: detailsErr } = yield supabase_1.supabase
            .from("student_details")
            .select("user_id, registration_id")
            .in("user_id", userIds);
        if (detailsErr)
            return res.status(500).json({ error: detailsErr.message });
        const detailsMap = Object.fromEntries(studentDetails.map(d => [d.user_id, d.registration_id]));
        // --- Step 3: Group & merge ---
        const grouped = {};
        filteredData.forEach((rec) => {
            var _a, _b, _c, _d, _e, _f, _g, _h;
            if (!grouped[rec.session_id]) {
                grouped[rec.session_id] = {
                    session_id: rec.session_id,
                    datetime: rec.class_sessions.session_datetime,
                    course_name: (_c = (_b = (_a = rec.class_sessions.course_sections) === null || _a === void 0 ? void 0 : _a.courses) === null || _b === void 0 ? void 0 : _b.course_name) !== null && _c !== void 0 ? _c : 'N/A',
                    faculty_name: (_e = (_d = rec.class_sessions.faculty) === null || _d === void 0 ? void 0 : _d.name) !== null && _e !== void 0 ? _e : 'N/A',
                    students: [],
                };
            }
            grouped[rec.session_id].students.push({
                id: rec.id,
                student_name: (_g = (_f = rec.profiles) === null || _f === void 0 ? void 0 : _f.name) !== null && _g !== void 0 ? _g : 'N/A',
                registration_id: (_h = detailsMap[rec.user_id]) !== null && _h !== void 0 ? _h : null,
                present: rec.is_present,
            });
        });
        res.json(Object.values(grouped));
    }
    catch (e) {
        console.error("Attendance report error:", e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.attendanceReportold = attendanceReportold;
const updateAttendance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const attendanceId = Number(req.params.id);
    const { is_present } = req.body;
    if (!attendanceId || typeof is_present !== "boolean") {
        return res.status(400).json({ error: "Invalid attendance ID or is_present value" });
    }
    try {
        const { data, error } = yield supabase_1.supabase
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
    }
    catch (err) {
        console.error("Unexpected error:", err);
        return res.status(500).json({ error: "Unexpected server error" });
    }
});
exports.updateAttendance = updateAttendance;
const attendanceReport = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.params;
        let { batch_id, status } = req.query;
        if (!date)
            return res.status(400).json({ error: "Pass date (YYYY-MM-DD)" });
        batch_id = batch_id || "1";
        const startOfDay = new Date(`${date}T00:00:00+05:30`);
        const endOfDay = new Date(`${date}T23:59:59+05:30`);
        // --- Step 1: Get section_ids for the batch ---
        const { data: sections, error: sectionErr } = yield supabase_1.supabase
            .from("course_sections")
            .select("id")
            .eq("batch_id", Number(batch_id));
        if (sectionErr)
            return res.status(500).json({ error: sectionErr.message });
        const sectionIds = sections.map((s) => s.id);
        // --- Step 2: Get class_sessions filtered by section_id and date ---
        const { data: sessions, error: sessionErr } = yield supabase_1.supabase
            .from("class_sessions")
            .select(`
                id,
                session_datetime,
                actual_faculty_id,
                section_id,
                faculty:actual_faculty_id(name)
            `)
            .in("section_id", sectionIds)
            .gte("session_datetime", startOfDay.toISOString())
            .lte("session_datetime", endOfDay.toISOString())
            .order("session_datetime", { ascending: true });
        if (sessionErr)
            return res.status(500).json({ error: sessionErr.message });
        const sessionIds = sessions.map((s) => s.id);
        // --- Step 3: Get attendance_records for filtered sessions ---
        const { data: attendanceRecords, error: attendanceErr } = yield supabase_1.supabase
            .from("attendance_records")
            .select(`
                id,
                user_id,
                is_present,
                session_id,
                profiles!user_id(name)
            `)
            .in("session_id", sessionIds);
        if (attendanceErr)
            return res.status(500).json({ error: attendanceErr.message });
        // --- Step 4: Map attendance by session_id ---
        const attendanceMap = new Map();
        attendanceRecords.forEach((record) => {
            if (!attendanceMap.has(record.session_id)) {
                attendanceMap.set(record.session_id, []);
            }
            attendanceMap.get(record.session_id).push(record);
        });
        // --- Step 5: Get registration_ids for all students ---
        const allUserIds = attendanceRecords.map((a) => a.user_id);
        let registrationMap = {};
        let emailMap = {};
        if (allUserIds.length > 0) {
            // registration_ids
            const { data: studentDetails, error: detailsErr } = yield supabase_1.supabase
                .from("student_details")
                .select("user_id, registration_id")
                .in("user_id", allUserIds);
            if (detailsErr)
                return res.status(500).json({ error: detailsErr.message });
            registrationMap = Object.fromEntries(studentDetails.map((d) => [d.user_id, d.registration_id]));
            // emails
            const { data: emailDetails, error: emailErr } = yield supabase_1.supabase
                .from("profiles")
                .select("id, email")
                .in("id", allUserIds);
            if (emailErr)
                return res.status(500).json({ error: emailErr.message });
            emailMap = Object.fromEntries(emailDetails.map((e) => [e.id, e.email]));
        }
        // --- Step 6: Enrich sessions with course/batch info ---
        const { data: sectionDetails, error: sectionDetailsErr } = yield supabase_1.supabase
            .from("course_sections")
            .select(`
                id,
                batch_id,
                batches:batch_id(batch_name),
                courses:course_id(course_name)
            `)
            .in("id", sectionIds);
        if (sectionDetailsErr)
            return res.status(500).json({ error: sectionDetailsErr.message });
        const sectionMap = Object.fromEntries(sectionDetails.map((s) => [s.id, s]));
        // --- Step 7: Final transformation ---
        const result = sessions.map((s) => {
            var _a, _b, _c, _d;
            const section = sectionMap[s.section_id];
            const students = (attendanceMap.get(s.id) || [])
                .filter((a) => status === "present"
                ? a.is_present
                : status === "absent"
                    ? !a.is_present
                    : true)
                .map((a) => {
                var _a, _b, _c, _d;
                return ({
                    id: a.id,
                    student_name: (_b = (_a = a.profiles) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : "N/A",
                    registration_id: (_c = registrationMap[a.user_id]) !== null && _c !== void 0 ? _c : null,
                    email: (_d = emailMap[a.user_id]) !== null && _d !== void 0 ? _d : null, // <-- added email here
                    present: a.is_present,
                });
            });
            return {
                session_id: s.id,
                datetime: s.session_datetime,
                course_name: (_b = (_a = section === null || section === void 0 ? void 0 : section.courses) === null || _a === void 0 ? void 0 : _a.course_name) !== null && _b !== void 0 ? _b : "N/A",
                faculty_name: (_d = (_c = s.faculty) === null || _c === void 0 ? void 0 : _c.name) !== null && _d !== void 0 ? _d : "N/A",
                batch_info: (section === null || section === void 0 ? void 0 : section.batches)
                    ? {
                        batch_id: section.batch_id,
                        batch_name: section.batches.batch_name,
                    }
                    : null,
                students,
            };
        });
        return res.json(result);
    }
    catch (e) {
        console.error("Attendance report error:", e);
        return res.status(500).json({ error: "Internal Server Error" });
    }
});
exports.attendanceReport = attendanceReport;
// Helper function to get all batches for dropdown
const getBatches = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase_1.supabase
            .from('batches')
            .select('id, batch_name')
            .order('batch_name', { ascending: true });
        if (error)
            return res.status(500).json({ error: error.message });
        res.json(data || []);
    }
    catch (e) {
        console.error("Get batches error:", e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
exports.getBatches = getBatches;
