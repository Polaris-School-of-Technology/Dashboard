import { Router } from 'express';
import {
    pieChartForQuestion,
    sessionQuestions,
    ratingsChartForQuestion,
    // this is for the question How well did the mentor address to resolve your questions or concerns during the class?
    pieChartForQuestion7,
    ratingsChartForQuestionId8
} from '../controllers/otherAnalysis'
import { authenticate, authorizeAdmin } from "../middlewares/admin";


const router = Router();

// Generate analytics (existing endpoint)
router.post('/piechart-question5',authenticate,authorizeAdmin, pieChartForQuestion);
router.get('/getAllQuestions',authenticate,authorizeAdmin, sessionQuestions)
router.post('/barChart',authenticate,authorizeAdmin, ratingsChartForQuestion)
router.post('/piechart-question7',authenticate,authorizeAdmin, pieChartForQuestion7)
router.post('/barChartQuestion8', authenticate,authorizeAdmin,ratingsChartForQuestionId8)

export default router;
