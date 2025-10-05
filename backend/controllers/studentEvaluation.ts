import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import Papa from "papaparse";

// Get courses by batch_id
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

export const getCoursesByBatch = async (req: Request, res: Response) => {
    try {
        const { batch_id } = req.params;
        if (!batch_id) return res.status(400).json({ message: "batch_id is required" });

        const { data, error } = await supabase
            .from("course_batch_mapping")
            .select(`
        course_id,
        courses!inner(id, course_name)
      `)
            .eq("batch_id", Number(batch_id));

        if (error) throw error;
        if (!Array.isArray(data) || data.length === 0) return res.status(200).json({ courses: [] });

        const uniqueCourses = new Map<number, { id: number; course_name: string }>();

        data.forEach((item: any) => {
            const courseId = item.course_id ?? item.courses?.id;
            const courseName = item.courses?.course_name ?? "";
            if (!courseId) return; // skip invalid rows

            if (!uniqueCourses.has(courseId)) {
                uniqueCourses.set(courseId, { id: courseId, course_name: courseName });
            }
        });

        res.status(200).json({ courses: Array.from(uniqueCourses.values()) });
    } catch (err: any) {
        console.error("getCoursesByBatch error:", err);
        res.status(500).json({ message: err.message || "Failed to fetch courses" });
    }
};


// Upload and process student evaluation CSV
export const uploadStudentEvaluations = async (req: Request, res: Response) => {
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
        const parseResult = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            dynamicTyping: true,
            transformHeader: (header: string) => header.trim() // Remove whitespace from headers
        });

        if (parseResult.errors.length > 0) {
            return res.status(400).json({
                message: "CSV parsing error",
                errors: parseResult.errors
            });
        }

        const csvData = parseResult.data as any[];

        if (csvData.length === 0) {
            return res.status(400).json({ message: "CSV file is empty" });
        }

        // Process each row
        const results = {
            success: [] as any[],
            failed: [] as any[],
            notFound: [] as any[]
        };

        for (const row of csvData) {
            try {
                // Get email from CSV - try common column names
                const email = row['MSU Email'] || row['MSU_Email'] || row['Email'] || row['email'];
                const studentScore = row['User Score'] || row['Student Score'] || row['student_score'];
                const totalScore = row['Total Score'] || row['total_score'] || 200; // Default to 200 if not provided

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
                const { data: userId, error: userError } = await supabase
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
                const { data: insertData, error: insertError } = await supabase
                    .from("student_evaluation_records")
                    .insert({
                        user_id: userId,
                        batch_id: Number(batch_id),
                        course_id: Number(course_id),
                        date: date,
                        student_score: Number(studentScore) || 0,
                        total_score: Number(totalScore) || 200,
                        type: type
                    })
                    .select()
                    .single();

                if (insertError) {
                    results.failed.push({
                        email: cleanEmail,
                        reason: insertError.message
                    });
                } else {
                    results.success.push({
                        email: cleanEmail,
                        user_id: userId,
                        record_id: insertData.id
                    });
                }

            } catch (err: any) {
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

    } catch (err: any) {
        console.error(err);
        return res.status(500).json({
            message: err.message || "Failed to process CSV"
        });
    }
};

// Get all evaluation types (if you have a types table, otherwise return static list)
export const getEvaluationTypes = async (req: Request, res: Response) => {
    try {
        // If you have a types table, fetch from there
        // Otherwise return static list
        const types = [
            { value: "Evaluation", label: "Evaluation" },
            { value: "Viva", label: "Viva" },

        ];

        res.status(200).json({ types });
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch evaluation types" });
    }
};