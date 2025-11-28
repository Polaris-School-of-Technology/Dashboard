import { Router } from 'express';
import multer from 'multer';
import {
    createJob,
    getAllJobsAdmin,
    getJobById,
    getJobApplications,
    updateApplicationStatus,
    createCategory,
    viewCategory,
    addCity,
    getCities,
    getAllBatches,
    getJobTypes,
    getWorkModes,
    getJobStatuses,
    getAllDropdownOptions,
    getJobFullDetails,
    updateJob
} from '../controllers/jobs'

const router = Router();

// ============================================
// MULTER CONFIGURATION FOR FILE UPLOADS
// ============================================
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/'); // Make sure this folder exists
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}_${file.originalname}`);
    }
});

const upload = multer({
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
        } else {
            cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
        }
    }
});

// ============================================
// ADMIN ROUTES - JOB MANAGEMENT
// ============================================
router.post('/admin/jobs', upload.array('documents', 5), createJob); // Create job with up to 5 documents
router.get('/admin/jobs', getAllJobsAdmin); // Get all jobs for admin dashboard
router.get('/admin/jobs/:jobId', getJobById); // Get single job details

// ============================================
// ADMIN ROUTES - APPLICATION TRACKING
// ============================================
router.get('/admin/jobs/:jobId/applications', getJobApplications); // View all students who applied to a job
router.patch('/admin/applications/:applicationId/status', updateApplicationStatus); // Update student status

// ============================================
// CATEGORY ROUTES
// ============================================
router.post('/categories', createCategory); // Create new category
router.get('/categories', viewCategory); // Get all categories

// ============================================
// CITY ROUTES
// ============================================
router.post('/cities', addCity); // Add new city
router.get('/cities', getCities); // Get all cities

// ============================================
// BATCH ROUTES
// ============================================
router.get('/batches', getAllBatches); // Get all batches

// ============================================
// DROPDOWN OPTIONS ROUTES
// ============================================
router.get('/job-types', getJobTypes); // Get job types
router.get('/work-modes', getWorkModes); // Get work modes
router.get('/job-statuses', getJobStatuses); // Get job statuses
router.get('/dropdown-options', getAllDropdownOptions); // Get all dropdown options at once
router.get('/admin/jobs/:jobId/full-details', getJobFullDetails);
router.put('/admin/jobs/:jobId', upload.array('documents', 5), updateJob);
export default router;