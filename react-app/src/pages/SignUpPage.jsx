import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui';
import QuoteBot from '../components/QuoteBot';
import styles from './SignUpPage.module.css';

const SignUpPage = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        team_role: ''
    });
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        
        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);

        try {
            const { data: existingUser, error: checkError } = await supabase
                .from('app_users')
                .select('id')
                .eq('username', formData.username)
                .maybeSingle();

            if (checkError) throw checkError;
            if (existingUser) {
                setError('Username already taken');
                setLoading(false);
                return;
            }

            const { error: signUpError } = await supabase
                .from('app_users')
                .insert([{
                    username: formData.username,
                    password: formData.password,
                    team_role: formData.team_role,
                    is_admin: false,
                    is_approved: false,
                    is_pending: true,
                    permissions: []
                }]);

            if (signUpError) throw signUpError;

            setSuccess(true);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className={styles.container}>
                <div className={styles.signupCard}>
                    <div className={styles.success}>
                        <h2>Registration Successful!</h2>
                        <p>Your account request has been sent to the administrator for approval.</p>
                        <p>Once approved, you will be able to log in and access your assigned modules.</p>
                    </div>
                    <div className={styles.footer}>
                        <Link to="/login" className={styles.loginLink}>Return to Login</Link>
                    </div>
                </div>
                <QuoteBot />
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.signupCard}>
                <div className={styles.header}>
                    <h1 className={styles.title}>Create Account</h1>
                    <p className={styles.subtitle}>Join IIPL Core Ecosystem</p>
                </div>

                <form onSubmit={handleSignUp} className={styles.form}>
                    <div className={styles.inputGroup}>
                        <Input
                            label="Username"
                            name="username"
                            placeholder="Enter username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <Input
                            label="Department / Role"
                            name="team_role"
                            placeholder="e.g. Accounts, Design, Site Engineer"
                            value={formData.team_role}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <Input
                            label="Password"
                            type="password"
                            name="password"
                            placeholder="Create password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <Input
                            label="Confirm Password"
                            type="password"
                            name="confirmPassword"
                            placeholder="Confirm password"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                        />
                    </div>

                    {error && <div className={styles.error}>{error}</div>}

                    <Button type="submit" disabled={loading} className={styles.signupButton}>
                        {loading ? 'Creating Account...' : 'Sign Up'}
                    </Button>
                </form>

                <div className={styles.footer}>
                    <p>Already have an account? <Link to="/login" className={styles.loginLink}>Login here</Link></p>
                    <p className={styles.copyright}>© 2026 Innovative Interiors</p>
                </div>
            </div>
            <QuoteBot />
        </div>
    );
};

export default SignUpPage;
