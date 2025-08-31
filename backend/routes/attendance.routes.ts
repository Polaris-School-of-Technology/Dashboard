import { Router } from "express";
import { attendanceReport, updateAttendance } from "../controllers/attendanceReport";
import { authenticate, authorizeAdmin } from "../middlewares/admin";

const router = Router();

router.get("/attendanceReport/:date", authenticate, authorizeAdmin, attendanceReport);
router.patch("/:id", authenticate, authorizeAdmin, updateAttendance);


export default router;
