import { Router } from "express";
import {
    getAnalyticsByDateRange,
    getFacultyList,
    getWeeklySummary,
    getFacultyComparison,
    getFacultyRatings,
    getAllFacultyRatings
} from "../controllers/facultyRating"
import { authenticate, authorizeAdmin } from "../middlewares/admin";

const router = Router();

// Analytics endpoints
router.get("/analytics/by-date-range", authenticate, authorizeAdmin, getAnalyticsByDateRange);
router.get("/analytics/faculty-list", authenticate, authorizeAdmin, getFacultyList);
router.get("/analytics/weekly-summary", authenticate, authorizeAdmin, getWeeklySummary);
router.get("/analytics/daily-aggregates", authenticate, authorizeAdmin, getFacultyRatings);
router.get("/analytics/faculty-comparison", authenticate, authorizeAdmin, getFacultyComparison);
router.get("/analytics/allFacultyRatings", authenticate, authorizeAdmin, getAllFacultyRatings)

export default router;
