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