"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const otherAnalysis_1 = require("../controllers/otherAnalysis");
const admin_1 = require("../middlewares/admin");
const router = (0, express_1.Router)();
// Generate analytics (existing endpoint)
router.post('/piechart-question5', admin_1.authenticate, admin_1.authorizeAdmin, otherAnalysis_1.pieChartForQuestion);
router.get('/getAllQuestions', admin_1.authenticate, admin_1.authorizeAdmin, otherAnalysis_1.sessionQuestions);
router.post('/barChart', admin_1.authenticate, admin_1.authorizeAdmin, otherAnalysis_1.ratingsChartForQuestion);
router.post('/piechart-question7', admin_1.authenticate, admin_1.authorizeAdmin, otherAnalysis_1.pieChartForQuestion7);
router.post('/barChartQuestion8', admin_1.authenticate, admin_1.authorizeAdmin, otherAnalysis_1.ratingsChartForQuestionId8);
exports.default = router;
