import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import weeklyScheduleRouter from "./routes/weeklySchedule.routes";
import attendanceRouter from "./routes/attendance.routes"
import scheduleRouter from "./routes/schedule.route"
import searchRouter from "./routes/search.routes";
import loginRouter from "./routes/login.routes"
import rbacFaculty from "./routes/rbacFaculty"
import getSummary from "./routes/getsummary.routes"
import notifications from "./routes/notification.routes"
import analysisRouter from "./routes/analysisRoutes"
import attendnaceRouter from "./routes/allAttendanceRecords"
import facultyRating from "./routes/facultyRating"
import otherAnalysis from "./routes/otherAnalysis"
import studentResponses from "./routes/studentResponseForASession"


dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
    res.send("Backend is running");
});

app.use("/api/weekly", weeklyScheduleRouter);
app.use("/api/attendance", attendanceRouter)
app.use("/api/schedule", scheduleRouter)
app.use("/api/search", searchRouter)
app.use("/api/login", loginRouter)
app.use("/api/rbacFaculty", rbacFaculty)
app.use("/api/quiz", getSummary)
app.use("/api/notifications", notifications)
app.use("/api/attendance", attendnaceRouter)
app.use("/api/analysis", analysisRouter)
app.use("/api/faculty-rating", facultyRating)
app.use("/api/other-analysis", otherAnalysis)
app.use("/api/studentResponses", studentResponses)


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
