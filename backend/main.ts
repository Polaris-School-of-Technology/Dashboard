import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import weeklyScheduleRouter from "./routes/weeklySchedule.routes";
import attendanceRouter from "./routes/attendance.routes"
import scheduleRouter from "./routes/schedule.route"

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


const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
