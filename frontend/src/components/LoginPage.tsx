import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Lock, Mail, Sparkles } from "lucide-react";
import "./LoginPage.css";

const API_BASE_URL = process.env.REACT_APP_API_URL;

const LoginPage: React.FC = () => {
    const [email, setEmail] = useState("bhaswati.kalita@polariscampus.com");
    const [password, setPassword] = useState("#1polaris");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setMessage(""); // Clear previous messages
        try {
            const res = await axios.post(`${API_BASE_URL}/api/login/login`, {
                email,
                password,
            });

            localStorage.setItem("token", res.data.token);
            localStorage.setItem("role", res.data.role);

            setMessage("✅ Login successful!");

            // Navigate after a short delay to show success message
            setTimeout(() => {
                if (res.data.role === "admin") {
                    navigate("/weekly-sessions");
                } else if (res.data.role === "faculty") {
                    navigate("/rbac-faculty-sessions");
                }
                else if (res.data.role === "batchManager") {
                    navigate("/evaluation-data"); // new page
                }
                else {
                    navigate("/unauthorized");
                }
            }, 500);
        } catch (err: any) {
            setMessage("❌ Invalid email or password");
        }
    };

    useEffect(() => {
        const originalOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = originalOverflow;
        };
    }, []);

    return (
        <div className="login-page">
            <aside className="login-brand-panel">

                <div className="login-logo">
                    <img
                        src="https://storage.googleapis.com/cp-prod-whitelabel-assets-as-sth1-gcs-dgte34/Polaris/Polaris_logo.png"
                        alt="Polaris logo"
                        className="login-logo-image"
                    />
                </div>

                <div className="login-hero-copy">
                    <h1>
                        <span className="login-gold-text login-display">Sign in </span>
                        <span>to your</span>
                        <br />
                        <span>academic </span>
                        <span className="login-gold-text login-display">command</span>
                        <br />
                        <span>center.</span>
                    </h1>
                    <p className="login-subcopy">
                        Sessions, attendance, recruitment, and faculty insights - all
                        orchestrated from a single, beautifully restrained workspace.
                    </p>
                </div>
            </aside>

            <section className="login-form-panel">
                <div className="login-form-glow" />
                <form onSubmit={handleSubmit} className="login-card">
                    <p className="login-kicker login-auth-kicker">Authentication</p>
                    <h2 className="login-title">
                        <span className="login-gold-text login-display">Log </span>
                        <span>in</span>
                    </h2>

                    <div className="login-form-fields">
                        <label className="login-field">
                            <span>Email</span>
                            <div className="login-input-wrap">
                                <input
                                    type="email"
                                    placeholder="you@polaris.io"
                                    className="login-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </label>

                        <label className="login-field">
                            <span>Password</span>
                            <div className="login-input-wrap">
                                <input
                                    type="password"
                                    placeholder="••••••"
                                    className="login-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </label>
                    </div>

                    {message && <p className="login-message">{message}</p>}

                    <button type="submit" className="login-button">
                        Enter Portal
                    </button>
                </form>
            </section>
        </div>
    );
};

export default LoginPage;
