import { Router } from 'express';
import { getAllSessions, getSessionsByDate } from '../controllers/weeklySchedule.controller';
const router = Router();


router.get('/getAllWeeklySessions', getAllSessions);
router.get('/facultySessions/:date', getSessionsByDate)

export default router;

