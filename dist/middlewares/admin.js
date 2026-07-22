"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorizeBatchManager = exports.authorizeAdmin = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const authenticate = (req, res, next) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader === null || authHeader === void 0 ? void 0 : authHeader.split(" ")[1]; // Bearer <token>
    if (!token) {
        return res.status(401).json({
            message: "No token provided",
            code: "NO_TOKEN",
            redirectToLogin: true
        });
    }
    jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                message: err.name === "TokenExpiredError"
                    ? "Session expired. Please login again."
                    : "Invalid session. Please login again.",
                code: err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
                redirectToLogin: true
            });
        }
        req.user = decoded;
        next();
    });
};
exports.authenticate = authenticate;
const authorizeAdmin = (req, res, next) => {
    const user = req.user;
    if (user.role !== "admin") {
        return res.status(403).json({ message: "Admins only" });
    }
    next();
};
exports.authorizeAdmin = authorizeAdmin;
const authorizeBatchManager = (req, res, next) => {
    const user = req.user;
    if (user.role !== "batchManager") {
        return res.status(403).json({ message: "Batch Managers only" });
    }
    next();
};
exports.authorizeBatchManager = authorizeBatchManager;
