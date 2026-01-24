import React from 'react';
import styles from './Loading.module.css';
import { Loader2 } from 'lucide-react';

export const LoadingOverlay = ({ message = 'Loading...' }) => {
    return (
        <div className={styles.overlay}>
            <div className={styles.container}>
                <Loader2 className={styles.spinner} size={40} />
                <p className={styles.message}>{message}</p>
            </div>
        </div>
    );
};

export const LoadingSpinner = ({ size = 24, className = '' }) => {
    return <Loader2 className={`${styles.spinner} ${className}`} size={size} />;
};
