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
exports.getAttendanceWithFilters = exports.getAttendanceBatchWise = exports.getStudentResponses = exports.getAllBatches = exports.downloadSessionsCSV = void 0;
const supabase_1 = require("../config/supabase");
const json2csv_1 = require("json2csv");
const downloadSessionsCSV = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required" });
        }
        // Remove .range() and let the database row limit handle it
        const { data, error } = yield supabase_1.supabase.rpc("get_all_sessions2", {
            start_date: startDate,
            end_date: endDate,
        });
        if (error) {
            console.error("Supabase RPC error:", error);
            return res.status(500).json({ error: "Database function failed" });
        }
        console.log(`Retrieved ${(data === null || data === void 0 ? void 0 : data.length) || 0} records`); // Add this to monitor
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No records found" });
        }
        const parser = new json2csv_1.Parser();
        const csv = parser.parse(data);
        res.header("Content-Type", "text/csv");
        res.attachment(`attendance_${startDate}_${endDate}.csv`);
        res.send(csv);
    }
    catch (err) {
        console.error("Error generating CSV:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.downloadSessionsCSV = downloadSessionsCSV;
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
const getStudentResponses = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
});
exports.getStudentResponses = getStudentResponses;
const getAttendanceBatchWise = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate, batchId } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required" });
        }
        // Call the Postgres function with optional batch filter
        const { data, error } = yield supabase_1.supabase.rpc("getAttendanceByBatch", {
            start_date: startDate,
            end_date: endDate,
            filter_batch_id: batchId ? Number(batchId) : null
        });
        if (error) {
            console.error("Supabase RPC error:", error);
            return res.status(500).json({ error: "Database function failed" });
        }
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No records found" });
        }
        // Convert data to CSV
        const parser = new json2csv_1.Parser();
        const csv = parser.parse(data);
        // Send CSV as response
        res.header("Content-Type", "text/csv");
        res.attachment(`attendance_${startDate}_${endDate}${batchId ? `_batch${batchId}` : ""}.csv`);
        res.send(csv);
    }
    catch (err) {
        console.error("Error generating CSV:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.getAttendanceBatchWise = getAttendanceBatchWise;
const getAttendanceWithFilters = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate, batchId, courseId, facultyId } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required" });
        }
        // Call Postgres function with optional filters
        const { data, error } = yield supabase_1.supabase.rpc("getAttendanceWithFilters", {
            start_date: startDate,
            end_date: endDate,
            filter_batch_id: batchId ? Number(batchId) : null,
            filter_course_id: courseId ? Number(courseId) : null,
            filter_faculty_id: facultyId ? Number(facultyId) : null
        });
        if (error) {
            console.error("Supabase RPC error:", error);
            return res.status(500).json({ error: "Database function failed" });
        }
        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No records found" });
        }
        // Convert to CSV
        const parser = new json2csv_1.Parser();
        const csv = parser.parse(data);
        // Send CSV file
        res.header("Content-Type", "text/csv");
        res.attachment(`attendance_${startDate}_${endDate}.csv`);
        res.send(csv);
    }
    catch (err) {
        console.error("Error generating CSV:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.getAttendanceWithFilters = getAttendanceWithFilters;
