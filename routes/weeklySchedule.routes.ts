import { Router } from 'express';
import {
    getAllSessions,
    getSessionsByDate,
    uploadCSV,
    getUploadedFiles,
    downloadCSV,
    deleteCSV,
    getCSVFilesByWeek
} from '../controllers/weeklySchedule.controller';

import multer from 'multer';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() }); // make sure this matches your controller setup

// Weekly sessions
router.get('/getAllWeeklySessions', getAllSessions);
router.get('/facultySessions/:date', getSessionsByDate);

// CSV routes
router.post('/csv/upload', upload.single('file'), uploadCSV);
router.get('/csv/files', getUploadedFiles);
router.get('/csv/download/:fileId', downloadCSV);
router.delete('/csv/delete/:fileId', deleteCSV);
router.get('/csv/files/week', getCSVFilesByWeek);

export default router;
