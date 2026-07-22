"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const studentEvaluation_1 = require("../controllers/studentEvaluation");
const router = express_1.default.Router();
// Configure multer for CSV file upload (store in memory)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    fileFilter: (req, file, cb) => {
        // Only accept CSV files
        if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only CSV files are allowed'));
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB max file size
    }
});
// GET /api/evaluations/courses/:batch_id - Get courses by batch
router.get("/batches", studentEvaluation_1.getAllBatches);
router.get("/courses/:batch_id", studentEvaluation_1.getCoursesByBatch);
// GET /api/evaluations/types - Get evaluation types
router.get("/types", studentEvaluation_1.getEvaluationTypes);
// POST /api/evaluations/upload - Upload CSV and insert records
router.post("/upload", upload.single('csv_file'), studentEvaluation_1.uploadStudentEvaluations);
exports.default = router;
