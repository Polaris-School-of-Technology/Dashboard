import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    Shield,
    XCircle,
    CheckCircle,
    Lock,
    Eye,
    EyeOff,
    Loader2,
    ArrowLeft,
} from "lucide-react";
import axios from "axios";

import "./reset.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

const ResetPassword: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [message, setMessage] = useState("");
    const [passwordStrength, setPasswordStrength] = useState({
        score: 0,
        text: "",
        color: "",
    });

    useEffect(() => {
        if (!token) {
            setMessage("Invalid or expired reset token");
        }
    }, [token]);

    const calculatePasswordStrength = (password: string) => {
        let score = 0;
        if (password.length >= 8) score++;
        if (password.length >= 12) score++;
        if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
        if (/\d/.test(password)) score++;
        if (/[^a-zA-Z0-9]/.test(password)) score++;

        const strengthMap = [
            { text: "Very Weak", color: "red" },
            { text: "Weak", color: "orange" },
            { text: "Fair", color: "yellow" },
            { text: "Good", color: "blue" },
            { text: "Strong", color: "green" },
        ];

        setPasswordStrength({ score, ...strengthMap[Math.min(score, 4)] });
    };

    const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const pwd = e.target.value;
        setNewPassword(pwd);
        calculatePasswordStrength(pwd);
    };

    const validatePasswords = () => {
        if (newPassword.length < 8) {
            setMessage("Password must be at least 8 characters long");
            return false;
        }
        if (newPassword !== confirmPassword) {
            setMessage("Passwords do not match");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");

        if (!validatePasswords()) return;

        setIsLoading(true);

        try {
            const res = await axios.post(`${API_BASE_URL}/api/login/reset-password`, {
                token,
                newPassword,
            });

            setIsSuccess(true);
            setMessage(res.data.message || "Password reset successful!");
            setTimeout(() => navigate("/login"), 3000);
        } catch (error: any) {
            setIsSuccess(false);
            setMessage(
                error.response?.data?.message ||
                "Failed to reset password. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="reset-password-wrapper">
            <div className="reset-password-container">
                <div className="reset-password-card">
                    {/* Header */}
                    <div className="reset-password-header">
                        <div className="shield-icon-wrapper">
                            <Shield className="shield-icon" />
                        </div>
                        <h2 className="reset-password-title">Reset Password</h2>
                        <p className="reset-password-subtitle">
                            Create a new secure password
                        </p>
                    </div>

                    {/* Body */}
                    <div className="reset-password-body">
                        {!token ? (
                            <div className="error-message">
                                <XCircle className="icon" />
                                <p>Invalid or expired reset token</p>
                                <button onClick={() => navigate("/login")}>
                                    Return to Login
                                </button>
                            </div>
                        ) : isSuccess ? (
                            <div className="success-message">
                                <CheckCircle className="icon success" />
                                <h3>Success!</h3>
                                <p>{message}</p>
                                <p className="small">Redirecting to login...</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="reset-password-form">
                                {/* New Password */}
                                <div className="form-group">
                                    <label>New Password</label>
                                    <div className="input-wrapper">
                                        <Lock className="input-icon" />
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            value={newPassword}
                                            onChange={handlePasswordChange}
                                            placeholder="Enter new password"
                                            required
                                            minLength={8}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="toggle-btn"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="icon" />
                                            ) : (
                                                <Eye className="icon" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Password Strength */}
                                    {newPassword && (
                                        <div className="password-strength">
                                            <div className="strength-bars">
                                                {[...Array(5)].map((_, i) => (
                                                    <div
                                                        key={i}
                                                        className={`bar ${i < passwordStrength.score
                                                                ? passwordStrength.color
                                                                : "gray"
                                                            }`}
                                                    />
                                                ))}
                                            </div>
                                            <p>
                                                Strength:{" "}
                                                <span>{passwordStrength.text}</span>
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Confirm Password */}
                                <div className="form-group">
                                    <label>Confirm Password</label>
                                    <div className="input-wrapper">
                                        <Lock className="input-icon" />
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm new password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowConfirmPassword(!showConfirmPassword)
                                            }
                                            className="toggle-btn"
                                        >
                                            {showConfirmPassword ? (
                                                <EyeOff className="icon" />
                                            ) : (
                                                <Eye className="icon" />
                                            )}
                                        </button>
                                    </div>

                                    {confirmPassword &&
                                        newPassword !== confirmPassword && (
                                            <p className="error-text">
                                                <XCircle className="small-icon" />
                                                Passwords do not match
                                            </p>
                                        )}
                                    {confirmPassword &&
                                        newPassword === confirmPassword && (
                                            <p className="success-text">
                                                <CheckCircle className="small-icon" />
                                                Passwords match
                                            </p>
                                        )}
                                </div>

                                {/* Error */}
                                {message && !isSuccess && (
                                    <div className="error-box">
                                        <XCircle className="small-icon" />
                                        <p>{message}</p>
                                    </div>
                                )}

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={
                                        isLoading ||
                                        !newPassword ||
                                        !confirmPassword ||
                                        newPassword !== confirmPassword
                                    }
                                    className="submit-btn"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="spinner" />
                                            Resetting Password...
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="icon" />
                                            Reset Password
                                        </>
                                    )}
                                </button>

                                {/* Back */}
                                <div className="back-to-login">
                                    <button
                                        type="button"
                                        onClick={() => navigate("/login")}
                                    >
                                        <ArrowLeft className="small-icon" />
                                        Back to Login
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Tips */}
                <div className="security-tips">
                    <p className="tips-title">
                        <Shield className="tips-icon" />
                        Password Requirements
                    </p>
                    <ul className="tips-list">
                        <li>At least 8 characters long</li>
                        <li>Mix of uppercase and lowercase letters</li>
                        <li>Include numbers and special characters</li>
                        <li>Avoid common words or patterns</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
