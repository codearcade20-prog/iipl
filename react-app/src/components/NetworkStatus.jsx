import React, { useState, useEffect, useRef } from 'react';
import { useMessage } from '../context/MessageContext';
import styles from './NetworkStatus.module.css';

const NetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [connectionType, setConnectionType] = useState(navigator.connection?.effectiveType || 'unknown');
    const { toast } = useMessage();
    const soundPlayedRef = useRef(false);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            toast('Back Online', 'Connection Restored');
        };

        const handleOffline = () => {
            setIsOnline(false);
        };

        const handleConnectionChange = () => {
            if (navigator.connection) {
                setConnectionType(navigator.connection.effectiveType);
            }
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        if (navigator.connection) {
            navigator.connection.addEventListener('change', handleConnectionChange);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (navigator.connection) {
                navigator.connection.removeEventListener('change', handleConnectionChange);
            }
        };
    }, [toast]);

    useEffect(() => {
        const isBadConnection = !isOnline || (connectionType === '2g' || connectionType === 'slow-2g' || connectionType === '3g');
        
        if (isBadConnection) {
            if (!soundPlayedRef.current) {
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Modern Ping Sound
                audio.play().catch(e => console.log('Audio play blocked by browser:', e));
                soundPlayedRef.current = true;
            }
        } else {
            soundPlayedRef.current = false;
        }
    }, [isOnline, connectionType]);

    if (isOnline && (connectionType === '4g' || connectionType === 'unknown')) {
        return null;
    }

    return (
        <div className={styles.overlay}>
            <div className={styles.card}>
                <div className={styles.icon}>
                    {!isOnline ? '🚫' : '📶'}
                </div>
                <div className={styles.content}>
                    <h3>{!isOnline ? 'No Connection' : 'Weak Signal'}</h3>
                    <p>
                        {!isOnline 
                            ? "You're currently offline. Please check your internet settings." 
                            : "Your connection is slow. Some features may take longer to load."}
                    </p>
                </div>
                {!isOnline && (
                    <button className={styles.retryBtn} onClick={() => window.location.reload()}>
                        Retry Connection
                    </button>
                )}
            </div>
        </div>
    );
};

export default NetworkStatus;
