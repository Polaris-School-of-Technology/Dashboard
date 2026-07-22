"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/attendanceRoutes.ts
const express_1 = require("express");
const allAttendnaceRecords_1 = require("../controllers/allAttendnaceRecords");
const router = (0, express_1.Router)();
const admin_1 = require("../middlewares/admin");
// GET /api/attendance/csv?startDate=2025-09-01&endDate=2025-09-15
router.get("/attendance/csv", admin_1.authenticate, admin_1.authorizeAdmin, allAttendnaceRecords_1.downloadSessionsCSV);
// router.get("/attendance/getAllCourses", getSections)
router.get("/attendance/getAllbatches", admin_1.authenticate, admin_1.authorizeAdmin, allAttendnaceRecords_1.getAllBatches);
// router.get("/attendance/getAllFaculty", getFaculties)
router.get("/attendance/batchwise", admin_1.authenticate, admin_1.authorizeAdmin, allAttendnaceRecords_1.getAttendanceBatchWise);
router.get("/attendance/csv", admin_1.authenticate, admin_1.authorizeAdmin, allAttendnaceRecords_1.getAttendanceWithFilters);
exports.default = router;
