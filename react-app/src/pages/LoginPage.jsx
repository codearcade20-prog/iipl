import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui';
import styles from './LoginPage.module.css';

const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            // First check if app_users table exists and has the user
            const { data, error: fetchError } = await supabase
                .from('app_users')
                .select('*')
                .eq('username', username)
                .single();

            if (fetchError || !data) {
                // Fallback for first time if table doesn't exist or no data
                // This is a safety measure to allow initial admin setup
                if (username === 'admin' && password === 'boss207') {
                    const fallbackUser = {
                        username: 'admin',
                        is_admin: true,
                        permissions: ['invoice', 'payment', 'history', 'workorders', 'admin', 'vendor']
                    };
                    login(fallbackUser);
                    navigate('/');
                    return;
                }
                throw new Error('Invalid username or password');
            }

            if (data.password !== password) {
                throw new Error('Invalid username or password');
            }

            login(data);
            navigate('/');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.loginCard}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Innovative Interiors</h1>
                    <p className={styles.subtitle}>Vendor Management System Login</p>
                </div>

                <form onSubmit={handleLogin} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <Input
                            label="Username"
                            placeholder="Enter username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <Input
                            label="Password"
                            type="password"
                            placeholder="Enter password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <Button type="submit" disabled={loading} className={styles.loginButton}>
                        {loading ? 'Logging in...' : 'Login'}
                    </Button>
                </form>

                <div className={styles.footer}>
                    <p>© 2026 Innovative Interiors</p>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
