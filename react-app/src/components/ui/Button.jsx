import React, { useState, useEffect } from 'react';
import styles from './Button.module.css';

export function Button({ children, variant = "primary", className = "", loading = false, loadingText, ...props }) {
    const [isStuck, setIsStuck] = useState(false);

    useEffect(() => {
        let timer;
        if (loading) {
            timer = setTimeout(() => {
                setIsStuck(true);
            }, 8000); // 8 seconds threshold for "stuck"
        } else {
            setIsStuck(false);
        }

        return () => clearTimeout(timer);
    }, [loading]);

    return (
        <div className={styles.btnWrapper}>
            <button
                className={`${styles.btn} ${styles[variant]} ${className} ${loading ? styles.loading : ''}`}
                disabled={loading || props.disabled}
                {...props}
            >
                {loading ? (loadingText || children) : children}
                {loading && <span className={styles.spinner}></span>}
            </button>
            {isStuck && (
                <div className={styles.stuckNote}>
                    Taking longer than usual. Check your signal.
                </div>
            )}
        </div>
    );
}
