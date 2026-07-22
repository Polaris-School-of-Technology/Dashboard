"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const facultyRating_1 = require("../controllers/facultyRating");
const admin_1 = require("../middlewares/admin");
const router = (0, express_1.Router)();
// Analytics endpoints
router.get("/analytics/by-date-range", admin_1.authenticate, admin_1.authorizeAdmin, facultyRating_1.getAnalyticsByDateRange);
router.get("/analytics/faculty-list", admin_1.authenticate, admin_1.authorizeAdmin, facultyRating_1.getFacultyList);
router.get("/analytics/weekly-summary", admin_1.authenticate, admin_1.authorizeAdmin, facultyRating_1.getWeeklySummary);
router.get("/analytics/daily-aggregates", admin_1.authenticate, admin_1.authorizeAdmin, facultyRating_1.getFacultyRatings);
router.get("/analytics/faculty-comparison", admin_1.authenticate, admin_1.authorizeAdmin, facultyRating_1.getFacultyComparison);
router.get("/analytics/allFacultyRatings", admin_1.authenticate, admin_1.authorizeAdmin, facultyRating_1.getAllFacultyRatings);
exports.default = router;
