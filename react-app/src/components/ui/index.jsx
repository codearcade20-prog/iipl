import React from 'react';
import styles from './Components.module.css';

export function Card({ children, className = "", ...props }) {
    return (
        <div className={`${styles.card} ${className}`} {...props}>
            {children}
        </div>
    );
}

export function Input({ label, id, className = "", multiline = false, rows = 3, ...props }) {
    return (
        <div className={styles.inputWrapper}>
            {label && <label htmlFor={id} className={styles.label}>{label}</label>}
            {multiline ? (
                <textarea id={id} className={`${styles.input} ${className}`} rows={rows} {...props} />
            ) : (
                <input id={id} className={`${styles.input} ${className}`} {...props} />
            )}
        </div>
    );
}

export function Select({ label, id, children, className = "", ...props }) {
    return (
        <div className={styles.inputWrapper}>
            {label && <label htmlFor={id} className={styles.label}>{label}</label>}
            <select id={id} className={`${styles.input} ${className}`} {...props}>
                {children}
            </select>
        </div>
    );
}
export { LoadingOverlay, LoadingSpinner } from './Loading';
