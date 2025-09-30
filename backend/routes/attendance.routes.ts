import { Router } from "express";
import { attendanceReport, updateAttendance, attendanceReportold, getBatches } from "../controllers/attendanceReport";
import { authenticate } from "../middlewares/admin";

const router = Router();

router.get("/attendanceReport/:date", attendanceReport);
router.patch("/:id", authenticate, updateAttendance);
router.get("/attendanceReportBatchWise/:date", attendanceReportold)
router.get('/batches', getBatches);


export default router;
