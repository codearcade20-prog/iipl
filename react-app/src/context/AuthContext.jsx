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

    // Instant Session Revocation via Supabase Realtime
    useEffect(() => {
        if (!sessionId || !user) return;

        // 1. Subscribe to changes for THIS specific session
        const sessionChannel = supabase
            .channel(`session-${sessionId}`)
            .on(
                'postgres_changes',
                {
                    event: '*', // Listen for UPDATE and DELETE
                    schema: 'public',
                    table: 'user_sessions',
                    filter: `id=eq.${sessionId}`
                },
                (payload) => {
                    // console.log('Realtime session event:', payload);
                    
                    // If revoked or deleted, logout immediately
                    if (payload.eventType === 'DELETE' || (payload.eventType === 'UPDATE' && payload.new.is_revoked)) {
                        logout();
                        window.location.href = '/'; // Force immediate redirect to login
                    }
                }
            )
            .subscribe();

        // 2. Heartbeat & Fallback Check
        const checkSession = async () => {
            try {
                const { data, error } = await supabase
                    .from('user_sessions')
                    .select('is_revoked')
                    .eq('id', sessionId)
                    .maybeSingle();

                // If error, no data (deleted), or revoked, logout
                if (error || !data || data.is_revoked) {
                    logout();
                    window.location.href = '/';
                    return;
                }

                // Update last active heartbeat
                await supabase
                    .from('user_sessions')
                    .update({ last_active_at: new Date().toISOString() })
                    .eq('id', sessionId);
            } catch (e) {
                console.error('Heartbeat failed', e);
            }
        };

        const interval = setInterval(checkSession, 60000); // Fallback check every minute
        checkSession(); 

        return () => {
            supabase.removeChannel(sessionChannel);
            clearInterval(interval);
        };
    }, [sessionId, user]);

    return (
        <AuthContext.Provider value={{ user, sessionId, loading, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
