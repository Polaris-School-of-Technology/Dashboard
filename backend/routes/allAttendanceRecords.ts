// routes/attendanceRoutes.ts
import { Router } from "express";
import { downloadSessionsCSV, getAllBatches, getAttendanceBatchWise,getAttendanceWithFilters } from "../controllers/allAttendnaceRecords";

const router = Router();
import { authenticate, authorizeAdmin } from "../middlewares/admin";

// GET /api/attendance/csv?startDate=2025-09-01&endDate=2025-09-15
router.get("/attendance/csv", authenticate, authorizeAdmin, downloadSessionsCSV);
// router.get("/attendance/getAllCourses", getSections)
router.get("/attendance/getAllbatches", authenticate, authorizeAdmin, getAllBatches)
// router.get("/attendance/getAllFaculty", getFaculties)
router.get("/attendance/batchwise", authenticate, authorizeAdmin, getAttendanceBatchWise)

router.get("/attendance/csv", authenticate, authorizeAdmin, getAttendanceWithFilters);

export default router;
