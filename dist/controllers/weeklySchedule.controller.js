"use strict";
// First, install required packages:
// npm install @google-cloud/storage multer
// npm install @types/multer --save-dev
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
exports.getCSVFilesByWeek = exports.getSessionsByDate = exports.getAllSessions = exports.deleteCSV = exports.downloadCSV = exports.getUploadedFiles = exports.uploadCSV = void 0;
const storage_1 = require("@google-cloud/storage");
const multer_1 = __importDefault(require("multer"));
const supabase_1 = require("../config/supabase");
// Google Cloud Storage setup
const storage = new storage_1.Storage({
    keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE, // path to your service account key
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
});
const bucket = storage.bucket(process.env.GOOGLE_CLOUD_BUCKET_NAME || 'session-data');
// Multer setup for handling file uploads
const multerStorage = multer_1.default.memoryStorage();
const upload = (0, multer_1.default)({
    storage: multerStorage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only CSV files are allowed'), false);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
});
// 1. Upload CSV file to Google Cloud Storage
const uploadCSV = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
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
                    uploadedBy: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'anonymous',
                    uploadedAt: new Date().toISOString(),
                    weekStartDate,
                },
            },
        });
        stream.on('error', (err) => {
            console.error('Upload error:', err);
            return res.status(500).json({ error: 'Failed to upload file to GCP' });
        });
        stream.on('finish', () => __awaiter(void 0, void 0, void 0, function* () {
            var _a;
            try {
                // 4️⃣ Generate signed URL
                const [url] = yield fileUpload.getSignedUrl({
                    action: 'read',
                    expires: Date.now() + 1000 * 60 * 60, // 1 hour
                });
                // 5️⃣ Insert metadata into Supabase
                const { data, error } = yield supabase_1.supabase
                    .from('uploaded_files_csv')
                    .insert([{
                        cloud_filename: fileName,
                        original_filename: file.originalname,
                        signed_url: url,
                        week_start_date: weekStartDate,
                        uploaded_at: new Date().toISOString(),
                        uploaded_by: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id) || 'anonymous',
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
            }
            catch (err) {
                console.error('Error during post-upload processing:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
        }));
        // 8️⃣ End the stream
        stream.end(file.buffer);
    }
    catch (error) {
        console.error('Unexpected upload error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.uploadCSV = uploadCSV;
// 2. Get all uploaded CSV files
const getUploadedFiles = (_, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { data, error } = yield supabase_1.supabase
            .from('uploaded_files')
            .select('*')
            .order('uploaded_at', { ascending: false });
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return res.status(200).json(data);
    }
    catch (err) {
        console.error('Error fetching files:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getUploadedFiles = getUploadedFiles;
// 3. Download CSV file from Google Cloud Storage
const downloadCSV = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fileId } = req.params;
        // Get file metadata from Supabase
        const { data: fileData, error } = yield supabase_1.supabase
            .from('uploaded_files')
            .select('*')
            .eq('id', fileId)
            .single();
        if (error || !fileData) {
            return res.status(404).json({ error: 'File not found' });
        }
        // Get file from Google Cloud Storage
        const file = bucket.file(fileData.cloud_filename);
        const [exists] = yield file.exists();
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
    }
    catch (error) {
        console.error('Download error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.downloadCSV = downloadCSV;
// 4. Delete CSV file
const deleteCSV = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { fileId } = req.params;
        // Get file metadata from Supabase
        const { data: fileData, error: fetchError } = yield supabase_1.supabase
            .from('uploaded_files')
            .select('*')
            .eq('id', fileId)
            .single();
        if (fetchError || !fileData) {
            return res.status(404).json({ error: 'File not found' });
        }
        // Delete from Google Cloud Storage
        const file = bucket.file(fileData.cloud_filename);
        yield file.delete();
        // Delete from Supabase
        const { error: deleteError } = yield supabase_1.supabase
            .from('uploaded_files')
            .delete()
            .eq('id', fileId);
        if (deleteError) {
            return res.status(500).json({ error: 'Failed to delete file metadata' });
        }
        return res.status(200).json({ message: 'File deleted successfully' });
    }
    catch (error) {
        console.error('Delete error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.deleteCSV = deleteCSV;
// Your existing function (keep as is)
const getAllSessions = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.query; // get date from query params
        const selectedDate = date ? new Date(date) : new Date();
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
        const { data, error } = yield supabase_1.supabase
            .from('class_sessions')
            .select(`
        session_datetime,
        duration,
        profiles!actual_faculty_id (name)
      `)
            .gte('session_datetime', startOfWeek)
            .lte('session_datetime', endOfWeek)
            .order('session_datetime', { ascending: true });
        if (error)
            return res.status(500).json({ error: error.message });
        return res.status(200).json(data);
    }
    catch (err) {
        console.error('Error fetching sessions:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getAllSessions = getAllSessions;
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
const getSessionsByDate = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        const { data, error } = yield supabase_1.supabase
            .from('class_sessions')
            .select(`
                session_datetime,
                profiles!actual_faculty_id (name)
            `)
            .gte('session_datetime', startOfDay.toISOString()) // compare in UTC
            .lte('session_datetime', endOfDay.toISOString()) // compare in UTC
            .order('session_datetime', { ascending: true });
        if (error) {
            return res.status(500).json({ error: error.message });
        }
        const formattedData = data.map((session) => {
            var _a;
            return ({
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
                faculty: ((_a = session.profiles) === null || _a === void 0 ? void 0 : _a.name) || 'N/A'
            });
        });
        return res.status(200).json(formattedData);
    }
    catch (err) {
        console.error('Error fetching sessions by date:', err);
        return res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getSessionsByDate = getSessionsByDate;
// GET /api/csv-files/week
const getCSVFilesByWeek = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { date } = req.query;
        if (!date)
            return res.status(400).json({ error: "Date is required" });
        const selectedDate = new Date(date);
        // Calculate the start of the week for the selected date
        // Week starts on Monday
        const dayOfWeek = selectedDate.getDay();
        const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Handle Sunday as 6 days from Monday
        const startOfWeek = new Date(selectedDate.getTime() - daysFromMonday * 24 * 60 * 60 * 1000);
        const startOfWeekString = startOfWeek.toISOString().split("T")[0];
        const { data, error } = yield supabase_1.supabase
            .from("uploaded_files_csv")
            .select("*")
            .eq("week_start_date", startOfWeekString)
            .order("uploaded_at", { ascending: true });
        if (error)
            return res.status(500).json({ error: error.message });
        return res.status(200).json({ files: data });
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.getCSVFilesByWeek = getCSVFilesByWeek;
