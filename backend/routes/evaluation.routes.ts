// routes/marks.ts
import { Router } from 'express';
import {
    getAllSemesters,
    getSubjectsBySemester,
    getComponentsBySubject,
    getMarksByFilters,
} from '../controllers/evalData'

const marksRouter = Router();

marksRouter.get('/semesters', getAllSemesters);
marksRouter.get('/subjects/:semesterId', getSubjectsBySemester);
marksRouter.get('/components/:subjectId', getComponentsBySubject);
marksRouter.get('/marks', getMarksByFilters);

export default marksRouter;

