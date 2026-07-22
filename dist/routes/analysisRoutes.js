"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const sessionAnalysis_1 = require("../controllers/sessionAnalysis");
const admin_1 = require("../middlewares/admin");
const router = (0, express_1.Router)();
// Generate analytics (existing endpoint)
router.post('/feedback/:batch_id', sessionAnalysis_1.getAllFeedbacksForASession);
// Get analytics by date
router.get('/analytics', admin_1.authenticate, admin_1.authorizeAdmin, sessionAnalysis_1.getSessionAnalyticsByDate);
// Get available analysis dates
router.get('/analytics/dates', admin_1.authenticate, admin_1.authorizeAdmin, sessionAnalysis_1.getAvailableAnalysisDates);
router.get('analysis/quiz', admin_1.authenticate, admin_1.authorizeAdmin, sessionAnalysis_1.getQuizAnalyticsByDate);
exports.default = router;
