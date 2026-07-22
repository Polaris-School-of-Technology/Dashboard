"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/marks.ts
const express_1 = require("express");
const evalData_1 = require("../controllers/evalData");
const marksRouter = (0, express_1.Router)();
marksRouter.get('/semesters', evalData_1.getAllSemesters);
marksRouter.get('/subjects/:semesterId', evalData_1.getSubjectsBySemester);
marksRouter.get('/components/:subjectId', evalData_1.getComponentsBySubject);
marksRouter.get('/marks', evalData_1.getMarksByFilters);
exports.default = marksRouter;
