// controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_ANON_KEY as string
);

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. Get user by email
    const { data: users, error } = await supabase
      .from("dashboard_users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (error) {
      console.error(error);
      return res.status(500).json({ message: "Database error" });
    }

    const user = users?.[0];
    if (!user) {
      return res.status(401).json({ message: "No such user" });
    }

    // 2. Compare password
    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // 3. Generate JWT (valid for 30 days)
    const token = jwt.sign(
      { id: user.id, role: user.role, facultyId: user.faculty_id },
      process.env.JWT_SECRET as string,
      { expiresIn: "30d" }
    );

    return res.json({
      message: "Login successful",
      token,
      role: user.role,
      facultyId: user.faculty_id
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Express example
export const logout = async (req: Request, res: Response) => {
  try {
    // If you are using cookies for JWT:
    res.clearCookie("token"); // clear the cookie storing the JWT

    // If you just rely on frontend storage (localStorage), you don't need backend action
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};