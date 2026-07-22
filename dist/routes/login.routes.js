"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// routes/authRoutes.ts
const express_1 = require("express");
const login_controller_1 = require("../controllers/login.controller");
const router = (0, express_1.Router)();
router.post("/login", login_controller_1.login);
router.post("/logout", login_controller_1.logout);
router.post("/forgot-password", login_controller_1.forgotPassword);
router.post("/reset-password", login_controller_1.resetPassword);
router.post("/change-password", login_controller_1.changePassword);
exports.default = router;
