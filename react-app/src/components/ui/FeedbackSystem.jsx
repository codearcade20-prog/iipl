
import React, { useState, useEffect, useCallback } from 'react';
import html2canvas from 'html2canvas';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useMessage } from '../../context/MessageContext';
import { Button } from './Button';
import { X, Camera, Send, AlertTriangle, Loader2 } from 'lucide-react';
import styles from './FeedbackSystem.module.css';

const FeedbackSystem = () => {
    const { user } = useAuth();
    const { toast } = useMessage();
    const [isOpen, setIsOpen] = useState(false);
    const [screenshot, setScreenshot] = useState(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [message, setMessage] = useState('');
    const [priority, setPriority] = useState('medium');

    const captureScreen = useCallback(async () => {
        if (isOpen) return; // Don't capture the feedback modal itself
        
        setIsCapturing(true);
        try {
            // Give the browser a moment to close any open dropdowns if needed
            await new Promise(r => setTimeout(r, 100));
            
            const canvas = await html2canvas(document.body, {
                useCORS: true,
                scale: 1, // Full resolution
                logging: false,
                ignoreElements: (element) => {
                    // Ignore elements that might cause issues or are sensitive
                    return element.classList.contains('feedback-ignore');
                }
            });
            
            setScreenshot(canvas.toDataURL('image/jpeg', 0.8));
            setIsOpen(true);
        } catch (error) {
            console.error('Screenshot capture failed:', error);
            toast('Failed to capture screen. Please try again.', 'error');
        } finally {
            setIsCapturing(false);
        }
    }, [isOpen, toast]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Check for Ctrl + Q (or Command + Q on Mac)
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'q') {
                e.preventDefault();
                captureScreen();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [captureScreen]);

    const handleSubmit = async () => {
        if (!message.trim()) {
            toast('Please describe the issue.', 'warning');
            return;
        }

        setIsSending(true);
        console.log('Submitting issue report...');
        
        try {
            let screenshotUrl = null;

            // 1. Upload Screenshot to Supabase Storage if it exists
            if (screenshot) {
                try {
                    console.log('Preparing screenshot blob...');
                    const blob = await (await fetch(screenshot)).blob();
                    const fileName = `screenshot_${Date.now()}.jpg`;
                    const filePath = `issue-screenshots/${fileName}`;

                    console.log('Uploading to Supabase storage...');
                    const { data: storageData, error: storageError } = await supabase.storage
                        .from('issue-reports') 
                        .upload(filePath, blob, {
                            contentType: 'image/jpeg',
                            upsert: true
                        });

                    if (storageError) {
                        console.warn('Storage upload failed, proceeding without screenshot:', storageError);
                        // If storage fails (e.g. bucket doesn't exist), we still want to save the message
                    } else {
                        // Get Public URL
                        const { data: publicUrlData } = supabase.storage
                            .from('issue-reports')
                            .getPublicUrl(filePath);
                        
                        screenshotUrl = publicUrlData.publicUrl;
                        console.log('Screenshot uploaded:', screenshotUrl);
                    }
                } catch (screenshotErr) {
                    console.error('Screenshot processing failed:', screenshotErr);
                }
            }

            // 2. Save Report to Database
            console.log('Inserting into database...');
            const { error: dbError } = await supabase
                .from('issue_reports')
                .insert([{
                    user_id: user?.id,
                    user_name: user?.full_name || user?.username || 'Guest',
                    user_email: user?.email || '',
                    message,
                    screenshot_url: screenshotUrl,
                    page_url: window.location.href,
                    priority,
                    status: 'pending'
                }]);

            if (dbError) throw dbError;

            console.log('Report submitted successfully');
            toast('Issue reported successfully!', 'success');
            handleClose();
        } catch (error) {
            console.error('Submission failed:', error);
            toast('Failed to send report: ' + (error.message || 'Unknown error'), 'error');
        } finally {
            setIsSending(false);
        }
    };

    const handleClose = () => {
        setIsOpen(false);
        setScreenshot(null);
        setMessage('');
        setPriority('medium');
    };

    if (!isOpen && !isCapturing) return null;

    return (
        <>
            {isCapturing && (
                <div className={styles.overlay} style={{ background: 'rgba(0,0,0,0.4)' }}>
                    <div style={{ color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                        <Loader2 className="animate-spin" size={48} />
                        <p style={{ fontWeight: 600, fontSize: '1.2rem' }}>Capturing Screen...</p>
                    </div>
                </div>
            )}

            {isOpen && (
                <div className={styles.overlay} onClick={handleClose}>
                    <div className={styles.modal} onClick={e => e.stopPropagation()}>
                        <div className={styles.header}>
                            <h2><AlertTriangle color="#f59e0b" /> Report an Issue</h2>
                            <button className={styles.closeBtn} onClick={handleClose}>
                                <X size={24} />
                            </button>
                        </div>

                        <div className={styles.content}>
                            <div className={styles.screenshotArea}>
                                <div className={styles.field}>
                                    <label>Visual Evidence</label>
                                    <img src={screenshot} alt="Issue Capture" className={styles.screenshotPreview} />
                                    <p style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                        This snapshot of your current screen will be sent to the admin.
                                    </p>
                                </div>
                            </div>

                            <div className={styles.formArea}>
                                <div className={styles.field}>
                                    <label>What's the issue?</label>
                                    <textarea 
                                        className={styles.textarea}
                                        placeholder="Describe what went wrong or what you need to change..."
                                        value={message}
                                        onChange={e => setMessage(e.target.value)}
                                        autoFocus
                                    />
                                </div>

                                <div className={styles.field}>
                                    <label>Priority</label>
                                    <select 
                                        className={styles.select}
                                        value={priority}
                                        onChange={e => setPriority(e.target.value)}
                                    >
                                        <option value="low">Low - General query / Improvement</option>
                                        <option value="medium">Medium - Something is not working right</option>
                                        <option value="high">High - Critical error / Work blocked</option>
                                    </select>
                                </div>
                            </div>

                            {isSending && (
                                <div className={styles.loadingOverlay}>
                                    <Loader2 className="animate-spin" size={40} color="#3b82f6" />
                                    <p style={{ fontWeight: 600 }}>Sending report...</p>
                                </div>
                            )}
                        </div>

                        <div className={styles.footer}>
                            <Button variant="secondary" onClick={handleClose} disabled={isSending}>
                                Cancel
                            </Button>
                            <Button 
                                variant="primary" 
                                onClick={handleSubmit} 
                                loading={isSending} 
                                loadingText="Submitting..."
                            >
                                <Send size={18} style={{ marginRight: '8px' }} />
                                Submit Report
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FeedbackSystem;
