"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const StudentResponsesForSessions_1 = require("../controllers/StudentResponsesForSessions"); // Adjust path as needed
const router = express_1.default.Router();
const admin_1 = require("../middlewares/admin");
// Route 1: Get sessions by date
// GET /api/sessions/:date?batch_id=1
// GET /api/sessions/today?batch_id=3
// GET /api/sessions/2024-01-15 (uses default batch 3A)
router.get('/studentResponses/sessions/:date', admin_1.authenticate, admin_1.authorizeAdmin, StudentResponsesForSessions_1.getSessionsByDate);
// Route 2: Get student responses for a session
// POST /api/sessions/responses
// Body: { "session_id": 123, "feedback_question_id": 456 }
router.post('/studentResponses/sessions/responses', admin_1.authenticate, admin_1.authorizeAdmin, StudentResponsesForSessions_1.getStudentResponses);
router.get('/studentResponses/questions', admin_1.authenticate, admin_1.authorizeAdmin, StudentResponsesForSessions_1.sessionQuestions);
exports.default = router;
