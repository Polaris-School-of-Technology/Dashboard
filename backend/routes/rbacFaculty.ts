import express from "express";
import { RBACgetFacultySessionsByDate, RBACcreateQuiz, getQuizBySessionRbac, updateQuestionRbac, deleteQuestionRbac } from "../controllers/rbacFaculty"
import { authenticate } from "../middlewares/admin"

const router = express.Router();

// Get faculty sessions for a date
router.get("/rbacfaculty/sessions/:date", authenticate, RBACgetFacultySessionsByDate);

// Create quiz for a session (faculty must own the session)
router.post("/rbacquiz/create/:session_id", authenticate, RBACcreateQuiz);

router.get("/getQuizRbac/:session_id", authenticate, getQuizBySessionRbac)
router.put("/updateRbacQuestion/:question_id", authenticate, updateQuestionRbac)
router.delete("/deleteRbacQuestion/:question_id", authenticate, deleteQuestionRbac)

export default router;
