
import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useMessage } from '../../context/MessageContext';

const NotificationIcon = () => {
    const { user } = useAuth();
    const [pendingReports, setPendingReports] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeReport, setActiveReport] = useState(null);
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');

    const fetchPendingNotifications = async () => {
        if (!user?.id) return;
        try {
            const { data, error } = await supabase
                .from('issue_reports')
                .select('*')
                .eq('user_id', user.id)
                .eq('status', 'resolved')
                .eq('user_acknowledged', false);
            
            if (error) throw error;
            setPendingReports(data || []);
        } catch (err) {
            console.error('Error fetching notifications:', err);
        }
    };

    useEffect(() => {
        fetchPendingNotifications();

        const channel = supabase
            .channel('notification-icon-realtime')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'issue_reports',
                filter: `user_id=eq.${user?.id}`
            }, () => {
                fetchPendingNotifications();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user?.id]);

    const handleOpenModal = (report) => {
        setActiveReport(report);
        setRating(5);
        setComment('');
        setIsModalOpen(true);
    };

    const handleConfirmAcknowledge = async () => {
        if (!activeReport) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('issue_reports')
                .update({ 
                    user_acknowledged: true,
                    feedback_rating: rating,
                    feedback_comment: comment
                })
                .eq('id', activeReport.id);
            
            if (error) throw error;
            setPendingReports(prev => prev.filter(r => r.id !== activeReport.id));
            setIsModalOpen(false);
            setActiveReport(null);
        } catch (err) {
            console.error('Failed to acknowledge:', err);
            alert('Error updating acknowledgment. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (pendingReports.length === 0) return null;

    return (
        <>
            {/* --- FLOATING BUTTON --- */}
            <button 
                onClick={() => handleOpenModal(pendingReports[0])}
                type="button"
                style={{ 
                    position: 'fixed', 
                    bottom: '30px',
                    right: '30px',
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer', 
                    padding: '15px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)', 
                    color: 'white',
                    borderRadius: '50%',
                    zIndex: 99999, 
                    boxShadow: '0 10px 25px rgba(37, 99, 235, 0.4)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    animation: 'pulse 2s infinite'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1) translateY(-5px)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
                <style>
                    {`
                        @keyframes pulse {
                            0% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.7); }
                            70% { box-shadow: 0 0 0 15px rgba(37, 99, 235, 0); }
                            100% { box-shadow: 0 0 0 0 rgba(37, 99, 235, 0); }
                        }
                        @keyframes fadeIn {
                            from { opacity: 0; transform: scale(0.95) translateY(10px); }
                            to { opacity: 1; transform: scale(1) translateY(0); }
                        }
                    `}
                </style>
                <span style={{ fontSize: '1.8rem' }}>📩</span>
                <span style={{
                    position: 'absolute',
                    top: '0',
                    right: '0',
                    backgroundColor: '#ef4444',
                    color: 'white',
                    borderRadius: '50%',
                    width: '24px',
                    height: '24px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                    border: '2px solid white'
                }}>
                    {pendingReports.length}
                </span>
            </button>

            {/* --- MODERN MODAL --- */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000000,
                    padding: '20px'
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        maxWidth: '450px',
                        width: '100%',
                        borderRadius: '24px',
                        padding: '32px',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        animation: 'fadeIn 0.3s ease-out forwards',
                        textAlign: 'center'
                    }}>
                        <div style={{
                            fontSize: '3rem',
                            marginBottom: '15px'
                        }}>✅</div>
                        <h2 style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: 800, 
                            color: '#1e293b',
                            marginBottom: '10px'
                        }}>Issue Resolved!</h2>
                        <p style={{ 
                            color: '#64748b', 
                            lineHeight: '1.6',
                            marginBottom: '20px'
                        }}>
                            Great news! The admin has marked your issue as resolved. 
                            Please share your feedback below:
                        </p>
                        
                        {/* Star Rating */}
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '20px' }}>
                            {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                    key={star}
                                    onClick={() => setRating(star)}
                                    style={{
                                        fontSize: '2rem',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: star <= rating ? '#f59e0b' : '#e2e8f0',
                                        transition: 'transform 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.2)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                                >
                                    ★
                                </button>
                            ))}
                        </div>

                        {/* Comment Section */}
                        <textarea
                            placeholder="Any comments or feedback? (Optional)"
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                background: '#f8fafc',
                                minHeight: '80px',
                                marginBottom: '20px',
                                fontSize: '0.9rem',
                                resize: 'none'
                            }}
                        />

                        {activeReport && (
                            <div style={{
                                backgroundColor: '#f1f5f9',
                                padding: '12px',
                                borderRadius: '10px',
                                marginBottom: '20px',
                                borderLeft: '3px solid #2563eb',
                                textAlign: 'left'
                            }}>
                                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Issue: "{activeReport.message.substring(0, 50)}..."</div>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button 
                                onClick={() => setIsModalOpen(false)}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: '1px solid #e2e8f0',
                                    background: 'white',
                                    color: '#64748b',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                }}
                            >Later</button>
                            <button 
                                onClick={handleConfirmAcknowledge}
                                disabled={loading}
                                style={{
                                    flex: 2,
                                    padding: '12px',
                                    borderRadius: '12px',
                                    border: 'none',
                                    background: loading ? '#94a3b8' : '#2563eb',
                                    color: 'white',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.3)'
                                }}
                            >
                                {loading ? 'Processing...' : 'Acknowledge Fix'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default NotificationIcon;
