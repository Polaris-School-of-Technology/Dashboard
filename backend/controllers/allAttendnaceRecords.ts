// controllers/attendanceController.ts
import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { Parser } from "json2csv";

export const downloadSessionsCSV = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required" });
        }

        // Remove .range() and let the database row limit handle it
        const { data, error } = await supabase.rpc("get_all_sessions2", {
            start_date: startDate,
            end_date: endDate,
        });

        if (error) {
            console.error("Supabase RPC error:", error);
            return res.status(500).json({ error: "Database function failed" });
        }

        console.log(`Retrieved ${data?.length || 0} records`); // Add this to monitor

        if (!data || data.length === 0) {
            return res.status(404).json({ error: "No records found" });
        }

        const parser = new Parser();
        const csv = parser.parse(data);

        res.header("Content-Type", "text/csv");
        res.attachment(`attendance_${startDate}_${endDate}.csv`);
        res.send(csv);

    } catch (err) {
        console.error("Error generating CSV:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getAllBatches = async (req: Request, res: Response) => {
    try {
        // Fetch all rows from "batches" table
        const { data, error } = await supabase
            .from("batches")
            .select("*");  // selects all columns

        if (error) throw error;

        // Send only batch data to frontend
        res.status(200).json({ batches: data });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
};

export const getStudentResponses = async(req: Request, res: Response) =>{
    

};


export const getAttendanceBatchWise = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, batchId } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required" });
        }

        // Call the Postgres function with optional batch filter
        const { data, error } = await supabase.rpc("getAttendanceByBatch", {
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
        const parser = new Parser();
        const csv = parser.parse(data);

        // Send CSV as response
        res.header("Content-Type", "text/csv");
        res.attachment(`attendance_${startDate}_${endDate}${batchId ? `_batch${batchId}` : ""}.csv`);
        res.send(csv);

    } catch (err) {
        console.error("Error generating CSV:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};

export const getAttendanceWithFilters = async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, batchId, courseId, facultyId } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: "startDate and endDate are required" });
        }

        // Call Postgres function with optional filters
        const { data, error } = await supabase.rpc("getAttendanceWithFilters", {
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
        const parser = new Parser();
        const csv = parser.parse(data);

        // Send CSV file
        res.header("Content-Type", "text/csv");
        res.attachment(`attendance_${startDate}_${endDate}.csv`);
        res.send(csv);

    } catch (err) {
        console.error("Error generating CSV:", err);
        res.status(500).json({ error: "Internal server error" });
    }
};