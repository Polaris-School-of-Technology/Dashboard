import { Router } from "express";
import { calculateQuizScores } from "../controllers/getSummary"

const router = Router();

// Route to calculate quiz scores for a given session_id
router.post("/calculate-quiz-scores/:session_id", calculateQuizScores);

export default router;
