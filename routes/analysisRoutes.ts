import { Router } from 'express';
import {
    getAllFeedbacksForASession,
    getSessionAnalyticsByDate,
    getAvailableAnalysisDates,
    getQuizAnalyticsByDate
} from '../controllers/sessionAnalysis'
import { authenticate, authorizeAdmin } from "../middlewares/admin";

const router = Router();

// Generate analytics (existing endpoint)
router.post('/feedback/:batch_id', getAllFeedbacksForASession);

// Get analytics by date
router.get('/analytics', authenticate, authorizeAdmin, getSessionAnalyticsByDate);

// Get available analysis dates
router.get('/analytics/dates', authenticate, authorizeAdmin, getAvailableAnalysisDates);

router.get('analysis/quiz', authenticate, authorizeAdmin, getQuizAnalyticsByDate)
export default router;