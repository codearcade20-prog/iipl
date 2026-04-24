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

    const logout = async () => {
        // Remove from database first
        if (sessionId) {
            try {
                await supabase.from('user_sessions').delete().eq('id', sessionId);
            } catch (e) {
                console.error('Failed to delete session on logout:', e);
            }
        }
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

    // 1. Fetch latest user data on mount to sync with Admin changes
    useEffect(() => {
        const syncUser = async () => {
            if (!user?.id) return;
            try {
                const { data, error } = await supabase
                    .from('app_users')
                    .select('*')
                    .eq('id', user.id)
                    .maybeSingle();

                if (error) throw error;
                if (data) {
                    if (!data.is_approved) {
                        logout();
                        window.location.href = '/';
                        return;
                    }
                    setUser(data);
                    localStorage.setItem('app_user', JSON.stringify(data));
                }
            } catch (e) {
                console.error('User sync failed:', e);
            }
        };
        syncUser();
    }, []);

    // 2. Instant Session Revocation & Permission Sync via Supabase Realtime
    useEffect(() => {
        if (!user?.id) return;

        // A. Listen for Session Revocation
        let sessionChannel = null;
        if (sessionId) {
            sessionChannel = supabase
                .channel(`session-${sessionId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'user_sessions',
                        filter: `id=eq.${sessionId}`
                    },
                    (payload) => {
                        if (payload.eventType === 'DELETE' || (payload.eventType === 'UPDATE' && payload.new.is_revoked)) {
                            logout();
                            window.location.href = '/';
                        }
                    }
                )
                .subscribe();
        }

        // B. Listen for User Profile/Permission changes
        const userChannel = supabase
            .channel(`user-sync-${user.id}`)
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'app_users',
                    filter: `id=eq.${user.id}`
                },
                (payload) => {
                    const updated = payload.new;
                    if (updated) {
                        if (!updated.is_approved) {
                            logout();
                            window.location.href = '/';
                            return;
                        }
                        setUser(updated);
                        localStorage.setItem('app_user', JSON.stringify(updated));
                    }
                }
            )
            .subscribe();

        // C. Heartbeat & Fallback Check
        const checkSession = async () => {
            if (!sessionId) return;
            try {
                const { data, error } = await supabase
                    .from('user_sessions')
                    .select('is_revoked')
                    .eq('id', sessionId)
                    .maybeSingle();

                if (data && data.is_revoked) {
                    logout();
                    window.location.href = '/';
                    return;
                }

                // If session is missing (deleted by another login or admin), logout
                if (!data && !error) {
                    logout();
                    window.location.href = '/';
                    return;
                }

                // If there's an error (network), don't logout immediately, just skip one heartbeat
                if (error) {
                    console.warn('Heartbeat check skipped due to error:', error);
                    return;
                }

                await supabase
                    .from('user_sessions')
                    .update({ last_active_at: new Date().toISOString() })
                    .eq('id', sessionId);
            } catch (e) {
                console.error('Heartbeat failed', e);
            }
        };

        const interval = setInterval(checkSession, 60000);
        if (sessionId) checkSession();

        return () => {
            if (sessionChannel) supabase.removeChannel(sessionChannel);
            supabase.removeChannel(userChannel);
            clearInterval(interval);
        };
    }, [sessionId, user?.id]);

    return (
        <AuthContext.Provider value={{ user, sessionId, loading, login, logout, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
