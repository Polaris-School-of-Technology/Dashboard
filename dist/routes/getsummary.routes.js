"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const getSummary_1 = require("../controllers/getSummary");
const router = (0, express_1.Router)();
// Route to calculate quiz scores for a given session_id
router.post("/calculate-quiz-scores/:session_id", getSummary_1.calculateQuizScores);
exports.default = router;
