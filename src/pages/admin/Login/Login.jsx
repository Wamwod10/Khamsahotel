import React, { useState } from 'react';
import './login.scss';

import { RxEyeOpen } from 'react-icons/rx';
import { LuEyeClosed } from 'react-icons/lu';
import Admin from '../Admin';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false); // Faqat session uchun ishlatiladi

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!email || !password) {
            setError('Iltimos, barcha maydonlarni to‘ldiring.');
            return;
        }

        if (!email.endsWith('@gmail.com')) {
            setError('Faqat @gmail.com email qabul qilinadi.');
            return;
        }

        if (password.length < 8) {
            setError('Parol kamida 8 ta belgidan iborat bo‘lishi kerak.');
            return;
        }

        if (email === '1234567890@gmail.com' && password === '1234567890') {
            setIsLoggedIn(true); // ✅ Faqat xotirada saqlanadi
        } else {
            setError("Email yoki parol noto‘g‘ri!");
        }
    };

    if (isLoggedIn) {
        return <Admin />;
    }

    return (
        <div className="login">
            <form className="form" onSubmit={handleSubmit}>
                <p className="form-title">Sign in to your account</p>
                {error && <p style={{ color: 'red', textAlign: 'center' }}>{error}</p>}

                <div className="input-container">
                    <input
                        placeholder="Enter email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                            setError('');
                            setEmail(e.target.value);
                        }}
                    />
                </div>

                <div className="input-container">
                    <input
                        placeholder="Enter password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => {
                            setError('');
                            setPassword(e.target.value);
                        }}
                    />
                    <span onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
                        {showPassword ? <LuEyeClosed /> : <RxEyeOpen />}
                    </span>
                </div>

                <button className="submit" type="submit">
                    Sign in
                </button>
            </form>
        </div>
    );
};

export default Login;
