import express from "express";
import { getSessionsByDate, updateSession, getFaculties, getSections, createSingleClassSessionHandler,deleteClassSession } from "../controllers/schedule"

const router = express.Router();

router.get("/classSessions/getSessions/:date", getSessionsByDate);
router.patch("/classSessions/:id", updateSession);
router.get("/classSessions/getFaculty", getFaculties)
router.get("/classCourses", getSections)
router.post("/addSession", createSingleClassSessionHandler)
router.delete("/classSessionsdelete/:id", deleteClassSession);
export default router;
