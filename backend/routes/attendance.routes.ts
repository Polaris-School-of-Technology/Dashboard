import { Router } from 'express';
import { attendanceReport,updateAttendance } from '../controllers/attendanceReport'
const router = Router();


router.get('/attendanceReport/:date', attendanceReport)
router.patch('/:id', updateAttendance);

export default router;

