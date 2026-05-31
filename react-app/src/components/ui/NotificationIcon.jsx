
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useMessage } from '../../context/MessageContext';

const ImageWithLoader = ({ src, alt }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            height: '180px',
            borderRadius: '12px',
            overflow: 'hidden',
            backgroundColor: '#f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #e2e8f0',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'
        }}>
            {isLoading && (
                <div 
                    className="shimmer-bg" 
                    style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: '#94a3b8'
                    }}
                >
                    <div style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        border: '2px solid #cbd5e1',
                        borderTopColor: '#3b82f6',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>Loading image...</span>
                </div>
            )}
            <img 
                src={src} 
                alt={alt} 
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    cursor: 'zoom-in',
                    opacity: isLoading ? 0 : 1,
                    transition: 'opacity 0.3s ease-in-out'
                }}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                    setIsLoading(false);
                    setHasError(true);
                }}
            />
            {hasError && (
                <div style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 500 }}>Failed to load attachment</div>
            )}
        </div>
    );
};

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
                        @keyframes shimmer {
                            0% { background-position: -200% 0; }
                            100% { background-position: 200% 0; }
                        }
                        @keyframes spin {
                            to { transform: rotate(360deg); }
                        }
                        .shimmer-bg {
                            background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
                            background-size: 200% 100%;
                            animation: shimmer 1.5s infinite linear;
                        }
                        .modal-container {
                            background-color: white;
                            width: 100%;
                            max-height: calc(100vh - 40px);
                            overflow-y: auto;
                            scrollbar-width: thin;
                            border-radius: 24px;
                            padding: 20px 16px;
                            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
                            animation: fadeIn 0.3s ease-out forwards;
                            box-sizing: border-box;
                            text-align: center;
                        }
                        .modal-layout {
                            display: flex;
                            flex-direction: column;
                            gap: 20px;
                        }
                        @media (min-width: 768px) {
                            .modal-container {
                                max-width: 850px;
                                padding: 32px;
                            }
                            .modal-layout {
                                flex-direction: row;
                                gap: 32px;
                                text-align: left;
                            }
                            .modal-left-col {
                                flex: 1.1;
                                display: flex;
                                flex-direction: column;
                                justify-content: flex-start;
                                border-right: 1px solid #e2e8f0;
                                padding-right: 32px;
                            }
                            .modal-right-col {
                                flex: 0.9;
                                display: flex;
                                flex-direction: column;
                                justify-content: space-between;
                            }
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
            {isModalOpen && createPortal(
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.7)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000000,
                    padding: '20px'
                }}>
                    <div className="modal-container">
                        <div className="modal-layout">
                            {/* Left Column: Admin Response & Details */}
                            <div className="modal-left-col">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                                    <div style={{ fontSize: '2.5rem' }}>✅</div>
                                    <div style={{ textAlign: 'left' }}>
                                        <h2 style={{ 
                                            fontSize: '1.4rem', 
                                            fontWeight: 800, 
                                            color: '#1e293b',
                                            margin: 0
                                        }}>Issue Resolved!</h2>
                                        <p style={{ 
                                            color: '#64748b', 
                                            fontSize: '0.85rem',
                                            margin: '2px 0 0 0'
                                        }}>
                                            Your report has been marked as resolved.
                                        </p>
                                    </div>
                                </div>
                                
                                {activeReport && (activeReport.admin_comment || activeReport.admin_reply_image) && (
                                    <div style={{
                                        backgroundColor: '#f8fafc',
                                        padding: '16px',
                                        borderRadius: '16px',
                                        marginBottom: '16px',
                                        borderLeft: '4px solid #2563eb',
                                        textAlign: 'left',
                                        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                                        border: '1px solid #f1f5f9'
                                    }}>
                                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', marginBottom: '8px' }}>Admin Response</div>
                                        {activeReport.admin_comment && (
                                            <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', color: '#334155', lineHeight: '1.5' }}>
                                                {activeReport.admin_comment}
                                            </p>
                                        )}
                                        {activeReport.admin_reply_image && (
                                            <div>
                                                <a href={activeReport.admin_reply_image} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%' }}>
                                                    <ImageWithLoader 
                                                        src={activeReport.admin_reply_image} 
                                                        alt="Admin attachment" 
                                                    />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {activeReport && (
                                    <div style={{
                                        backgroundColor: '#f1f5f9',
                                        padding: '12px',
                                        borderRadius: '10px',
                                        borderLeft: '3px solid #64748b',
                                        textAlign: 'left'
                                    }}>
                                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Original Issue</div>
                                        <div style={{ fontSize: '0.85rem', color: '#475569', fontStyle: 'italic', marginTop: '2px' }}>
                                            "{activeReport.message.length > 120 ? activeReport.message.substring(0, 120) + '...' : activeReport.message}"
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Right Column: User Rating & Feedback Form */}
                            <div className="modal-right-col">
                                <div style={{ textAlign: 'left', marginBottom: '15px' }}>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>Share Feedback</h3>
                                    <p style={{ fontSize: '0.8rem', color: '#64748b', margin: 0 }}>How would you rate the resolution?</p>
                                </div>

                                {/* Star Rating */}
                                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px', background: '#f8fafc', padding: '8px', borderRadius: '12px', border: '1px solid #f1f5f9' }}>
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setRating(star)}
                                            style={{
                                                fontSize: '2.2rem',
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
                                        minHeight: '100px',
                                        marginBottom: '20px',
                                        fontSize: '0.9rem',
                                        resize: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />

                                <div style={{ display: 'flex', gap: '12px', marginTop: 'auto' }}>
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
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};

export default NotificationIcon;
