// First, install required packages:
// npm install @google-cloud/storage multer
// npm install @types/multer --save-dev

import { Request, Response } from 'express';
import { Storage } from '@google-cloud/storage';
import multer from 'multer';
import { supabase } from "../config/supabase";



declare module 'express-serve-static-core' {
    interface Request {
        user?: {
            id: string;
            email?: string;
            name?: string;
            [key: string]: any;
        };
    }
}


// Google Cloud Storage setup
const storage = new Storage({
    keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE, // path to your service account key
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});

const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME || 'session-data');

// Multer setup for handling file uploads
const multerStorage = multer.memoryStorage();
const upload = multer({
    storage: multerStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed') as any, false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});

// 1. Upload CSV file to Google Cloud Storage



export const uploadCSV = async (req: Request, res: Response) => {
    try {

        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { weekStartDate } = req.body;
        if (!weekStartDate) {
            return res.status(400).json({ error: 'Please provide weekStartDate in YYYY-MM-DD' });
        }

        const file = req.file;
        const fileName = `${Date.now()}-${file.originalname}`;
        const fileUpload = bucket.file(fileName);


        const stream = fileUpload.createWriteStream({
            metadata: {
                contentType: file.mimetype,
                metadata: {
                    uploadedBy: req.user?.id || 'anonymous',
                    uploadedAt: new Date().toISOString(),
                    weekStartDate,
                },
            },
        });

        stream.on('error', (err) => {
            console.error('Upload error:', err);
            return res.status(500).json({ error: 'Failed to upload file to GCP' });
        });

        stream.on('finish', async () => {
            try {
                // 4️⃣ Generate signed URL
                const [url] = await fileUpload.getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 1000 * 60 * 60, // 1 hour
                });

                // 5️⃣ Insert metadata into Supabase
                const { data, error } = await supabase
                    .from('uploaded_files_csv')
                    .insert([{
                        cloud_filename: fileName,
                        original_filename: file.originalname,
                        signed_url: url,
                        week_start_date: weekStartDate,
                        uploaded_at: new Date().toISOString(),
                        uploaded_by: req.user?.id || 'anonymous',
                        mime_type: file.mimetype
                    }]);

                if (error) {
                    console.error('Supabase insert error:', error);
                    return res.status(500).json({ error: error.message });
                }

                // 6️⃣ Safe check for data
                if (!data) {
                    return res.status(500).json({ error: 'Failed to save metadata' });
                }

                // 7️⃣ Return success
                return res.status(200).json({
                    message: 'File uploaded successfully',
                    file: data[0],
                });

            } catch (err) {
                console.error('Error during post-upload processing:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
        });

        // 8️⃣ End the stream
        stream.end(file.buffer);

    } catch (error: any) {
        console.error('Unexpected upload error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// 2. Get all uploaded CSV files
export const getUploadedFiles = async (_: Request, res: Response) => {
    try {
        const { data, error } = await supabase
            .from('uploaded_files')
            .select('*')
            .order('uploaded_at', { ascending: false });

        if (error) {
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json(data);
    } catch (err: any) {
        console.error('Error fetching files:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// 3. Download CSV file from Google Cloud Storage
export const downloadCSV = async (req: Request, res: Response) => {
    try {
        const { fileId } = req.params;

        // Get file metadata from Supabase
        const { data: fileData, error } = await supabase
            .from('uploaded_files')
            .select('*')
            .eq('id', fileId)
            .single();

        if (error || !fileData) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Get file from Google Cloud Storage
        const file = bucket.file(fileData.cloud_filename);
        const [exists] = await file.exists();

        if (!exists) {
            return res.status(404).json({ error: 'File not found in storage' });
        }

        // Set response headers
        res.setHeader('Content-Type', fileData.mime_type);
        res.setHeader('Content-Disposition', `attachment; filename="${fileData.filename}"`);

        // Stream file to response
        const stream = file.createReadStream();
        stream.pipe(res);

        stream.on('error', (error) => {
            console.error('Download error:', error);
            res.status(500).json({ error: 'Failed to download file' });
        });
    } catch (error: any) {
        console.error('Download error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// 4. Delete CSV file
export const deleteCSV = async (req: Request, res: Response) => {
    try {
        const { fileId } = req.params;

        // Get file metadata from Supabase
        const { data: fileData, error: fetchError } = await supabase
            .from('uploaded_files')
            .select('*')
            .eq('id', fileId)
            .single();

        if (fetchError || !fileData) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Delete from Google Cloud Storage
        const file = bucket.file(fileData.cloud_filename);
        await file.delete();

        // Delete from Supabase
        const { error: deleteError } = await supabase
            .from('uploaded_files')
            .delete()
            .eq('id', fileId);

        if (deleteError) {
            return res.status(500).json({ error: 'Failed to delete file metadata' });
        }

        return res.status(200).json({ message: 'File deleted successfully' });
    } catch (error: any) {
        console.error('Delete error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
};

// Your existing function (keep as is)
export const getAllSessions = async (req: Request, res: Response) => {
    try {
        const { date } = req.query; // get date from query params
        const selectedDate = date ? new Date(date as string) : new Date();

        const dayOfWeek = selectedDate.getDay();
        const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        const monday = new Date(selectedDate);
        monday.setDate(selectedDate.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);

        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);

        const startOfWeek = monday.toISOString();
        const endOfWeek = sunday.toISOString();

        const { data, error } = await supabase
            .from('class_sessions')
            .select(`
        session_datetime,
        duration,
        profiles!actual_faculty_id (name)
      `)
            .gte('session_datetime', startOfWeek)
            .lte('session_datetime', endOfWeek)
            .order('session_datetime', { ascending: true });

        if (error) return res.status(500).json({ error: error.message });
        return res.status(200).json(data);

    } catch (err: any) {
        console.error('Error fetching sessions:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};


// ROUTES SETUP (add to your routes file)
/*
import express from 'express';
import { getAllSessions, uploadCSV, getUploadedFiles, downloadCSV, deleteCSV } from './controllers';

const router = express.Router();

// Existing route
router.get('/weekly/getAllWeeklySessions', getAllSessions);

// New CSV routes
router.post('/csv/upload', upload.single('file'), uploadCSV);
router.get('/csv/files', getUploadedFiles);
router.get('/csv/download/:fileId', downloadCSV);
router.delete('/csv/delete/:fileId', deleteCSV);

export default router;
*/


export const getSessionsByDate = async (req: Request, res: Response) => {
    try {

        const { date } = req.params;

        if (!date || typeof date !== 'string') {
            return res.status(400).json({ error: 'Please provide a valid date in YYYY-MM-DD format.' });
        }


        const startOfDay = new Date(date);
        startOfDay.setHours(0, 0, 0, 0);

        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);

        // Fetch sessions with faculty name
        const { data, error } = await supabase
            .from('class_sessions')
            .select(`
                session_datetime,
                profiles!actual_faculty_id (name)
            `)
            .gte('session_datetime', startOfDay.toISOString()) // compare in UTC
            .lte('session_datetime', endOfDay.toISOString())   // compare in UTC
            .order('session_datetime', { ascending: true });

        if (error) {
            return res.status(500).json({ error: error.message });
        }


        const formattedData = data.map((session: any) => ({
            datetime: new Date(session.session_datetime).toLocaleString('en-IN', {
                weekday: 'short',
                day: '2-digit',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata'
            }),
            duration: session.duration,
            faculty: session.profiles?.name || 'N/A'
        }));

        return res.status(200).json(formattedData);
    } catch (err: any) {
        console.error('Error fetching sessions by date:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
};



// GET /api/csv-files/week

export const getCSVFilesByWeek = async (req: Request, res: Response) => {
    try {
        const { date } = req.query;
        if (!date) return res.status(400).json({ error: "Date is required" });

        const selectedDate = new Date(date as string);

        // Calculate the start of the week for the selected date
        // Week starts on Monday
        const dayOfWeek = selectedDate.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Handle Sunday as 6 days from Monday
        const startOfWeek = new Date(selectedDate.getTime() - daysFromMonday * 24 * 60 * 60 * 1000);
        const startOfWeekString = startOfWeek.toISOString().split("T")[0];

        const { data, error } = await supabase
            .from("uploaded_files_csv")
            .select("*")
            .eq("week_start_date", startOfWeekString)
            .order("uploaded_at", { ascending: true });

        if (error) return res.status(500).json({ error: error.message });

        return res.status(200).json({ files: data });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
};