// routes/authRoutes.ts
import { Router } from "express";
import { login, logout, forgotPassword, resetPassword, changePassword } from "../controllers/login.controller"

const router = Router();

router.post("/login", login);
router.post("/logout", logout)
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", changePassword);

export default router;
