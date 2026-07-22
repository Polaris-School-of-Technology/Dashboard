"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const jobs_1 = require("../controllers/jobs");
const router = (0, express_1.Router)();
// ============================================
// MULTER CONFIGURATION FOR FILE UPLOADS
// ============================================
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Make sure this folder exists
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        }
        else {
            cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
        }
    }
});
// ============================================
// ADMIN ROUTES - JOB MANAGEMENT
// ============================================
router.post('/admin/jobs', upload.array('documents', 5), jobs_1.createJob); // Create job with up to 5 documents
router.get('/admin/jobs', jobs_1.getAllJobsAdmin); // Get all jobs for admin dashboard
router.get('/admin/jobs/:jobId', jobs_1.getJobById); // Get single job details
// ============================================
// ADMIN ROUTES - APPLICATION TRACKING
// ============================================
router.get('/admin/jobs/:jobId/applications', jobs_1.getJobApplications); // View all students who applied to a job
router.patch('/admin/applications/:applicationId/status', jobs_1.updateApplicationStatus); // Update student status
// ============================================
// CATEGORY ROUTES
// ============================================
router.post('/categories', jobs_1.createCategory); // Create new category
router.get('/categories', jobs_1.viewCategory); // Get all categories
// ============================================
// CITY ROUTES
// ============================================
router.post('/cities', jobs_1.addCity); // Add new city
router.get('/cities', jobs_1.getCities); // Get all cities
// ============================================
// BATCH ROUTES
// ============================================
router.get('/batches', jobs_1.getAllBatches); // Get all batches
// ============================================
// DROPDOWN OPTIONS ROUTES
// ============================================
router.get('/job-types', jobs_1.getJobTypes); // Get job types
router.get('/work-modes', jobs_1.getWorkModes); // Get work modes
router.get('/job-statuses', jobs_1.getJobStatuses); // Get job statuses
router.get('/dropdown-options', jobs_1.getAllDropdownOptions); // Get all dropdown options at once
router.get('/admin/jobs/:jobId/full-details', jobs_1.getJobFullDetails);
router.put('/admin/jobs/:jobId', upload.array('documents', 5), jobs_1.updateJob);
exports.default = router;
