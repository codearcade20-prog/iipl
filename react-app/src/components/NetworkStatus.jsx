import React, { useState, useEffect } from 'react';
import { useMessage } from '../context/MessageContext';
import styles from './NetworkStatus.module.css';

const NetworkStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [connectionType, setConnectionType] = useState(navigator.connection?.effectiveType || 'unknown');
    const { toast } = useMessage();

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
