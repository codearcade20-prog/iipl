/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem('app_user');
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [sessionId, setSessionId] = useState(() => localStorage.getItem('app_session_id'));
    const [loading, setLoading] = useState(false);

    const login = (userData, sid = null) => {
        setUser(userData);
        localStorage.setItem('app_user', JSON.stringify(userData));
        if (sid) {
            setSessionId(sid);
            localStorage.setItem('app_session_id', sid);
        }
    };

    const logout = () => {
        setUser(null);
        setSessionId(null);
        localStorage.removeItem('app_user');
        localStorage.removeItem('app_session_id');
    };

    const hasPermission = (module) => {
        if (!user) return false;
        if (user.is_admin) return true;
        return user.permissions && user.permissions.includes(module);
    };

    // Session Revocation Check
    useEffect(() => {
        if (!sessionId || !user) return;

        const checkSession = async () => {
            try {
                const { data, error } = await supabase
                    .from('user_sessions')
                    .select('is_revoked, last_active_at')
                    .eq('id', sessionId)
                    .single();

                if (error) {
                    // If session not found, logout?
                    if (error.code === 'PGRST116') {
                        logout();
                    }
                    return;
                }

                if (data.is_revoked) {
                    logout();
                    window.location.reload(); // Force refresh to clear any state
                } else {
                    // Update heartbeat
                    await supabase
                        .from('user_sessions')
                        .update({ last_active_at: new Date().toISOString() })
                        .eq('id', sessionId);
                }
            } catch (e) {
                console.error('Session check failed', e);
            }
        };

        const interval = setInterval(checkSession, 60000); // Check every minute
        checkSession(); // Check on mount

        return () => clearInterval(interval);
    }, [sessionId, user]);

    return (
        <AuthContext.Provider value={{ user, sessionId, loading, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
