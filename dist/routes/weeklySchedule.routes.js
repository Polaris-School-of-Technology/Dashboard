"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const weeklySchedule_controller_1 = require("../controllers/weeklySchedule.controller");
const multer_1 = __importDefault(require("multer"));
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() }); // make sure this matches your controller setup
// Weekly sessions
router.get('/getAllWeeklySessions', weeklySchedule_controller_1.getAllSessions);
router.get('/facultySessions/:date', weeklySchedule_controller_1.getSessionsByDate);
// CSV routes
router.post('/csv/upload', upload.single('file'), weeklySchedule_controller_1.uploadCSV);
router.get('/csv/files', weeklySchedule_controller_1.getUploadedFiles);
router.get('/csv/download/:fileId', weeklySchedule_controller_1.downloadCSV);
router.delete('/csv/delete/:fileId', weeklySchedule_controller_1.deleteCSV);
router.get('/csv/files/week', weeklySchedule_controller_1.getCSVFilesByWeek);
exports.default = router;
