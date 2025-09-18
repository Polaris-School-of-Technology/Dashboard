// routes/attendanceRoutes.ts
import { Router } from "express";
import { downloadSessionsCSV } from "../controllers/allAttendnaceRecords";

const router = Router();

// GET /api/attendance/csv?startDate=2025-09-01&endDate=2025-09-15
router.get("/attendance/csv", downloadSessionsCSV);

export default router;
