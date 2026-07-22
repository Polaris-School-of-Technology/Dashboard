"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const rbacFaculty_1 = require("../controllers/rbacFaculty");
const admin_1 = require("../middlewares/admin");
const router = express_1.default.Router();
// Get faculty sessions for a date
router.get("/rbacfaculty/sessions/:date", admin_1.authenticate, rbacFaculty_1.RBACgetFacultySessionsByDate);
// Create quiz for a session (faculty must own the session)
router.post("/rbacquiz/create/:session_id", admin_1.authenticate, rbacFaculty_1.RBACcreateQuiz);
router.get("/getQuizRbac/:session_id", admin_1.authenticate, rbacFaculty_1.getQuizBySessionRbac);
router.put("/updateRbacQuestion/:question_id", admin_1.authenticate, rbacFaculty_1.updateQuestionRbac);
router.delete("/deleteRbacQuestion/:question_id", admin_1.authenticate, rbacFaculty_1.deleteQuestionRbac);
router.get("/getAttendnaceForFaculty/:date", admin_1.authenticate, rbacFaculty_1.RBACFacultyAttendance);
exports.default = router;
