// controllers/authController.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_ANON_KEY as string
);

// Configure email transporter with company email
const transporter = nodemailer.createTransport({
  service: "gmail", // Or use your company's SMTP server
  auth: {
    user: process.env.EMAIL_USER, // your-company@domain.com
    pass: process.env.EMAIL_PASSWORD, // App Password
  },
});

// Helper function to send emails
const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Dashboard'}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error("Email sending failed:", error);
    throw new Error("Failed to send email");
  }
};

// ===== EXISTING LOGIN =====
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

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
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user.id, role: user.role, facultyId: user.faculty_id },
      process.env.JWT_SECRET as string,
      { expiresIn: "30d" }
    );

    return res.json({
      message: "Login successful",
      token,
      role: user.role,
      facultyId: user.faculty_id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===== GOOGLE LOGIN =====
export const googleLogin = async (req: Request, res: Response) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Token is required" });
    }

    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload || !payload.email) {
      return res.status(400).json({ message: "Invalid Google token" });
    }

    const { email } = payload;

    // Check if user exists
    const { data: users, error } = await supabase
      .from("dashboard_users")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (error) {
      console.error("Database error:", error);
      return res.status(500).json({ message: "Database error" });
    }

    const user = users?.[0];

    if (!user) {
      return res.status(401).json({ message: "User not registered" });
    }

    // Generate JWT
    const jwtToken = jwt.sign(
      { id: user.id, role: user.role, facultyId: user.faculty_id },
      process.env.JWT_SECRET as string,
      { expiresIn: "30d" }
    );

    return res.json({
      message: "Google login successful",
      token: jwtToken,
      role: user.role,
      facultyId: user.faculty_id,
    });

  } catch (err) {
    console.error("Google login error:", err);
    return res.status(500).json({ message: "Google login failed" });
  }
};

// ===== EXISTING LOGOUT =====
export const logout = async (req: Request, res: Response) => {
  try {
    res.clearCookie("token");
    return res.status(200).json({ message: "Logged out successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===== FORGOT PASSWORD =====
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if user exists
    const { data: users, error } = await supabase
      .from("dashboard_users")
      .select("id, email")
      .eq("email", email)
      .limit(1);

    // In your forgotPassword function, change this part:


    if (error) {
      console.error(error);
      return res.status(500).json({ message: "Database error" });
    }

    const user = users?.[0];

    // Always return success (security best practice)
    if (!user) {
      return res.json({
        message: "If the email exists, a password reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    // Store hashed token in database
    const { error: updateError } = await supabase
      .from("dashboard_users")
      .update({
        reset_token: hashedToken,
        reset_token_expiry: expiresAt,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error(updateError);
      return res.status(500).json({ message: "Failed to generate reset token" });
    }

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // Send email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1F2937;">Password Reset Request</h2>
        
        <p>You requested to reset your password. Click the button below to reset it:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="display: inline-block; padding: 14px 28px; background-color: #4F46E5; 
                    color: white; text-decoration: none; border-radius: 6px; font-weight: 600;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #6B7280; word-break: break-all; background-color: #F3F4F6; padding: 10px; border-radius: 4px;">
          ${resetUrl}
        </p>
        <p style="color: #EF4444; font-weight: 600;">⏱️ This link will expire in 1 hour.</p>
        <p style="color: #6B7280;">If you didn't request a password reset, please ignore this email.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="color: #9CA3AF; font-size: 12px;">
          This is an automated message, please do not reply.
        </p>
      </div>
    `;

    await sendEmail(email, "Password Reset Request", emailHtml);

    return res.json({
      message: "If the email exists, a password reset link has been sent",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===== RESET PASSWORD =====
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        message: "Token and new password are required"
      });
    }

    // Validate password strength
    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long",
      });
    }

    // Hash the token to compare with database
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    // Find user with valid token
    const { data: users, error } = await supabase
      .from("dashboard_users")
      .select("*")
      .eq("reset_token", hashedToken)
      .gt("reset_token_expiry", new Date().toISOString())
      .limit(1);

    if (error) {
      console.error(error);
      return res.status(500).json({ message: "Database error" });
    }

    const user = users?.[0];
    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired reset token",
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password and clear reset token
    const { error: updateError } = await supabase
      .from("dashboard_users")
      .update({
        password_hash: hashedPassword,
        reset_token: null,
        reset_token_expiry: null,
      })
      .eq("id", user.id);

    if (updateError) {
      console.error(updateError);
      return res.status(500).json({ message: "Failed to reset password" });
    }

    // Send confirmation email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">✅ Password Reset Successful</h2>
        <p>Hi ${user.first_name || "there"},</p>
        <p>Your password has been successfully reset.</p>
        <p style="color: #6B7280; background-color: #FEF3C7; padding: 12px; border-left: 4px solid #F59E0B; border-radius: 4px;">
          ⚠️ <strong>Security Notice:</strong> If you did not perform this action, 
          please contact support immediately.
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="color: #9CA3AF; font-size: 12px;">
          This is an automated message, please do not reply.
        </p>
      </div>
    `;

    await sendEmail(user.email, "Password Reset Successful", emailHtml);

    return res.json({ message: "Password reset successful" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// ===== CHANGE PASSWORD (for logged-in users) =====
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "New password must be at least 8 characters long",
      });
    }

    // Get current user
    const { data: users, error } = await supabase
      .from("dashboard_users")
      .select("*")
      .eq("id", userId)
      .limit(1);

    if (error || !users?.[0]) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = users[0];

    // Verify current password
    const validPassword = await bcrypt.compare(
      currentPassword,
      user.password_hash
    );
    if (!validPassword) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    const { error: updateError } = await supabase
      .from("dashboard_users")
      .update({ password_hash: hashedPassword })
      .eq("id", userId);

    if (updateError) {
      console.error(updateError);
      return res.status(500).json({ message: "Failed to change password" });
    }

    // Send notification email
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #059669;">✅ Password Changed</h2>
        <p>Hi ${user.first_name || "there"},</p>
        <p>Your password has been successfully changed.</p>
        <p style="color: #6B7280;">
          <strong>Time:</strong> ${new Date().toLocaleString()}<br>
        </p>
        <p style="color: #6B7280; background-color: #FEF3C7; padding: 12px; border-left: 4px solid #F59E0B; border-radius: 4px;">
          ⚠️ <strong>Security Notice:</strong> If you did not perform this action, 
          please contact support immediately and secure your account.
        </p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="color: #9CA3AF; font-size: 12px;">
          This is an automated message, please do not reply.
        </p>
      </div>
    `;

    await sendEmail(user.email, "Password Changed - Security Alert", emailHtml);

    return res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};