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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEvaluationTypes = exports.uploadStudentEvaluations = exports.getCoursesByBatch = exports.getAllBatches = void 0;
const supabase_1 = require("../config/supabase");
const papaparse_1 = __importDefault(require("papaparse"));
// Get courses by batch_id
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
const getCoursesByBatch = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { batch_id } = req.params;
        if (!batch_id)
            return res.status(400).json({ message: "batch_id is required" });
        const { data, error } = yield supabase_1.supabase
            .from("course_batch_mapping")
            .select(`
        course_id,
        courses!inner(id, course_name)
      `)
            .eq("batch_id", Number(batch_id));
        if (error)
            throw error;
        if (!Array.isArray(data) || data.length === 0)
            return res.status(200).json({ courses: [] });
        const uniqueCourses = new Map();
        data.forEach((item) => {
            var _a, _b, _c, _d;
            const courseId = (_a = item.course_id) !== null && _a !== void 0 ? _a : (_b = item.courses) === null || _b === void 0 ? void 0 : _b.id;
            const courseName = (_d = (_c = item.courses) === null || _c === void 0 ? void 0 : _c.course_name) !== null && _d !== void 0 ? _d : "";
            if (!courseId)
                return; // skip invalid rows
            if (!uniqueCourses.has(courseId)) {
                uniqueCourses.set(courseId, { id: courseId, course_name: courseName });
            }
        });
        res.status(200).json({ courses: Array.from(uniqueCourses.values()) });
    }
    catch (err) {
        console.error("getCoursesByBatch error:", err);
        res.status(500).json({ message: err.message || "Failed to fetch courses" });
    }
});
exports.getCoursesByBatch = getCoursesByBatch;
// Upload and process student evaluation CSV
const uploadStudentEvaluations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { batch_id, course_id, date, type } = req.body;
        const file = req.file; // Using multer middleware
        // Validate required fields
        if (!batch_id || !course_id || !date || !type) {
            return res.status(400).json({
                message: "Missing required fields: batch_id, course_id, date, type"
            });
        }
        if (!file) {
            return res.status(400).json({ message: "No CSV file uploaded" });
        }
        // Parse CSV
        const csvText = file.buffer.toString('utf-8');
        const parseResult = papaparse_1.default.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            transformHeader: (header) => header.trim() // Remove whitespace from headers
        });
        if (parseResult.errors.length > 0) {
            return res.status(400).json({
                message: "CSV parsing error",
                errors: parseResult.errors
            });
        }
        const csvData = parseResult.data;
        if (csvData.length === 0) {
            return res.status(400).json({ message: "CSV file is empty" });
        }
        // Process each row
        const results = {
            success: [],
            failed: [],
            notFound: []
        };
        for (const row of csvData) {
            try {
                // Get email from CSV - try common column names
                const email = row['MSU Email'] || row['MSU_Email'] || row['Email'] || row['email'];
                const student_marks_in_percentage = row['Student Marks in %'];
                const last_weeks_attendance_percentage = row["Last Week's Attendance %"];
                const attendance_criteria = row['Attendance Criteria'];
                const final_marks_in_percentage = row['Final Marks in %'];
                if (!email) {
                    results.failed.push({
                        row,
                        reason: "No email found in CSV row"
                    });
                    continue;
                }
                // Clean email (remove extra spaces, convert to lowercase)
                const cleanEmail = email.toString().trim().toLowerCase();
                // Find user_id from auth table by email using RPC
                const { data: userId, error: userError } = yield supabase_1.supabase
                    .rpc('match_email_from_csv', {
                    user_email: cleanEmail
                });
                if (userError || !userId) {
                    results.notFound.push({
                        email: cleanEmail,
                        reason: "User not found in auth table"
                    });
                    continue;
                }
                // Insert into student_evaluation_records
                const { data: insertData, error: insertError } = yield supabase_1.supabase
                    .from("student_evaluation_records")
                    .insert({
                    user_id: userId,
                    batch_id: Number(batch_id),
                    course_id: Number(course_id),
                    date: date,
                    student_marks_in_percentage: student_marks_in_percentage,
                    final_marks_in_percentage: final_marks_in_percentage,
                    last_weeks_attendance_percentage: last_weeks_attendance_percentage,
                    attendance_criteria: attendance_criteria,
                    type: type
                })
                    .select()
                    .single();
                if (insertError) {
                    results.failed.push({
                        email: cleanEmail,
                        reason: insertError.message
                    });
                }
                else {
                    results.success.push({
                        email: cleanEmail,
                        user_id: userId,
                        record_id: insertData.id
                    });
                }
            }
            catch (err) {
                results.failed.push({
                    row,
                    reason: err.message
                });
            }
        }
        // Return summary
        return res.status(200).json({
            message: "CSV processing complete",
            summary: {
                total: csvData.length,
                success: results.success.length,
                failed: results.failed.length,
                notFound: results.notFound.length
            },
            details: results
        });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({
            message: err.message || "Failed to process CSV"
        });
    }
});
exports.uploadStudentEvaluations = uploadStudentEvaluations;
// Get all evaluation types (if you have a types table, otherwise return static list)
const getEvaluationTypes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // If you have a types table, fetch from there
        // Otherwise return static list
        const types = [
            { value: "Evaluation", label: "Evaluation" },
            { value: "Viva", label: "Viva" },
        ];
        res.status(200).json({ types });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch evaluation types" });
    }
});
exports.getEvaluationTypes = getEvaluationTypes;
