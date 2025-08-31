import { Router } from 'express';
import { getAllSessions, getSessionsByDate } from '../controllers/weeklySchedule.controller';
import { authenticate, authorizeAdmin } from "../middlewares/admin";
const router = Router();


router.get('/getAllWeeklySessions', authenticate, authorizeAdmin, getAllSessions);
router.get('/facultySessions/:date', authenticate, authorizeAdmin, getSessionsByDate)

export default router;

