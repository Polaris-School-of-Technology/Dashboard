// middleware/authMiddleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"];
    const token = authHeader?.split(" ")[1]; // Bearer <token>

    if (!token) {
        return res.status(401).json({
            message: "No token provided",
            code: "NO_TOKEN",
            redirectToLogin: true
        });
    }

    jwt.verify(token, process.env.JWT_SECRET as string, (err, decoded) => {
        if (err) {
            return res.status(401).json({
                message: err.name === "TokenExpiredError"
                    ? "Session expired. Please login again."
                    : "Invalid session. Please login again.",
                code: err.name === "TokenExpiredError" ? "TOKEN_EXPIRED" : "INVALID_TOKEN",
                redirectToLogin: true
            });
        }

        (req as any).user = decoded;
        next();
    });
};


export const authorizeAdmin = (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (user.role !== "admin") {
        return res.status(403).json({ message: "Admins only" });
    }
    next();
};
