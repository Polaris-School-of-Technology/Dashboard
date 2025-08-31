import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./LoginPage.css";
const API_BASE_URL = process.env.REACT_APP_API_URL;
const LoginPage: React.FC = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [message, setMessage] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_BASE_URL}/api/login/login`, {
                email,
                password,
            });

            localStorage.setItem("token", res.data.token);
            localStorage.setItem("role", res.data.role);

            setMessage("✅ Login successful!");

            // Redirect based on role
            if (res.data.role === "admin") {
                navigate("/weekly-sessions");
            } else if (res.data.role === "faculty") {
                navigate("/rbac-faculty-sessions");
            } else {
                // Fallback for unknown roles
                navigate("/unauthorized");
            }

        } catch (err: any) {
            setMessage("❌ Invalid email or password");
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                <h2 className="login-title">Login</h2>

                <form onSubmit={handleSubmit} className="login-form">
                    <input
                        type="email"
                        placeholder="Email"
                        className="login-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />

                    <input
                        type="password"
                        placeholder="Password"
                        className="login-input"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />

                    <button type="submit" className="login-button">
                        Login
                    </button>
                </form>

                {message && <p className="login-message">{message}</p>}
            </div>
        </div>
    );
};

export default LoginPage;
