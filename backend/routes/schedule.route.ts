import express from "express";
import { getSessionsByDate, updateSession, getFaculties, getSections, createSingleClassSessionHandler, deleteClassSession, getAllBatches } from "../controllers/schedule"
import { getAllFeedbackQuestions, createQuiz, getSessionQuestionsBySessionId } from "../controllers/feedbackQuestions";
const router = express.Router();

router.get("/classSessions/getSessions/:date", getSessionsByDate);
router.patch("/classSessions/:id", updateSession);
router.get("/classSessions/getFaculty", getFaculties)
router.get("/classCourses", getSections)
router.post("/addSession", createSingleClassSessionHandler)
router.delete("/classSessionsdelete/:id", deleteClassSession);
router.get("/feedbackQuestions", getAllFeedbackQuestions)
router.post("/classSessions/:session_id/quiz", createQuiz)
router.get("/getAllFeedbackQuestions/:session_id", getSessionQuestionsBySessionId)
router.get("/getAllBatches", getAllBatches)
export default router;
