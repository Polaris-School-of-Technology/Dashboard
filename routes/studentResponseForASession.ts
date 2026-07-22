import express from 'express';
import { getSessionsByDate, getStudentResponses, sessionQuestions } from '../controllers/StudentResponsesForSessions'; // Adjust path as needed

const router = express.Router();
import { authenticate, authorizeAdmin } from "../middlewares/admin";

// Route 1: Get sessions by date
// GET /api/sessions/:date?batch_id=1
// GET /api/sessions/today?batch_id=3
// GET /api/sessions/2024-01-15 (uses default batch 3A)
router.get('/studentResponses/sessions/:date', authenticate, authorizeAdmin, getSessionsByDate);

// Route 2: Get student responses for a session
// POST /api/sessions/responses
// Body: { "session_id": 123, "feedback_question_id": 456 }
router.post('/studentResponses/sessions/responses', authenticate, authorizeAdmin, getStudentResponses);
router.get('/studentResponses/questions', authenticate, authorizeAdmin, sessionQuestions)
export default router;  