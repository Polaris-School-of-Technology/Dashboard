import express from "express";
import multer from "multer";
import {
    getCoursesByBatch,
    uploadStudentEvaluations,
    getEvaluationTypes,
    getAllBatches
} from "../controllers/studentEvaluation"

const router = express.Router();

// Configure multer for CSV file upload (store in memory)
const upload = multer({
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        // Only accept CSV files
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        } else {
            cb(new Error('Only CSV files are allowed'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    }
});

// GET /api/evaluations/courses/:batch_id - Get courses by batch

router.get("/batches", getAllBatches)
router.get("/courses/:batch_id", getCoursesByBatch);

// GET /api/evaluations/types - Get evaluation types
router.get("/types", getEvaluationTypes);

// POST /api/evaluations/upload - Upload CSV and insert records
router.post("/upload", upload.single('csv_file'), uploadStudentEvaluations);

export default router;