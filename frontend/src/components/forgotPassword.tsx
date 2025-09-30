import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    Mail,
    ArrowLeft,
    Send,
    CheckCircle,
    XCircle,
    Loader2,
    Shield,
} from "lucide-react";
import axios from "axios";
import "./forgotPassword.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

const ForgotPasswordPage: React.FC = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const validateEmail = (email: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage("");
        setError("");

        if (!email) {
            setError("Email is required");
            return;
        }

        if (!validateEmail(email)) {
            setError("Please enter a valid email address");
            return;
        }

        setIsLoading(true);

        try {
            const res = await axios.post(
                `${API_BASE_URL}/api/login/forgot-password`,
                { email }
            );

            setIsSuccess(true);
            setMessage(
                res.data.message ||
                "If the email exists, a password reset link has been sent"
            );
        } catch (err: any) {
            setIsSuccess(false);
            setError(
                err.response?.data?.message ||
                "Failed to send reset email. Please try again."
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="forgot-password-wrapper">
            <div className="forgot-password-container">
                <div className="forgot-password-card">
                    {/* Header */}
                    <div className="forgot-password-header">
                        <div className="mail-icon-wrapper">
                            <Mail className="mail-icon" />
                        </div>
                        <h2 className="forgot-password-title">Forgot Password?</h2>
                        <p className="forgot-password-subtitle">
                            {isSuccess
                                ? "Check your email"
                                : "No worries, we'll send you reset instructions"}
                        </p>
                    </div>

                    {/* Body */}
                    <div className="forgot-password-body">
                        {isSuccess ? (
                            <div className="success-container">
                                <CheckCircle className="success-icon" />
                                <h3>Email Sent!</h3>
                                <p className="success-message">{message}</p>
                                <div className="info-box">
                                    <Shield className="info-icon" />
                                    <div className="info-text">
                                        <p className="info-title">Check your inbox</p>
                                        <ul className="info-list">
                                            <li>Click the reset link in the email</li>
                                            <li>The link expires in 1 hour</li>
                                            <li>Check spam folder if you don't see it</li>
                                        </ul>
                                    </div>
                                </div>
                                <button
                                    onClick={() => navigate("/login")}
                                    className="back-btn-success"
                                >
                                    <ArrowLeft className="btn-icon" />
                                    Back to Login
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="forgot-password-form">
                                <div className="form-group">
                                    <label htmlFor="email">Email Address</label>
                                    <div className="input-wrapper">
                                        <Mail className="input-icon" />
                                        <input
                                            id="email"
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Enter your email"
                                            disabled={isLoading}
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Error Message */}
                                {error && (
                                    <div className="error-box">
                                        <XCircle className="error-icon" />
                                        <p>{error}</p>
                                    </div>
                                )}

                                {/* Submit Button */}
                                <button
                                    type="submit"
                                    disabled={isLoading || !email}
                                    className="submit-btn"
                                >
                                    {isLoading ? (
                                        <>
                                            <Loader2 className="spinner" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="btn-icon" />
                                            Send Reset Link
                                        </>
                                    )}
                                </button>

                                {/* Back to Login */}
                                <div className="back-to-login">
                                    <button
                                        type="button"
                                        onClick={() => navigate("/login")}
                                        disabled={isLoading}
                                    >
                                        <ArrowLeft className="btn-icon" />
                                        Back to Login
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* Security Note */}
                {!isSuccess && (
                    <div className="security-note">
                        <Shield className="note-icon" />
                        <p>
                            For security reasons, we'll send a reset link only if the email
                            exists in our system.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ForgotPasswordPage;