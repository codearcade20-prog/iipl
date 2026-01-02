import React from 'react';
import styles from './Components.module.css';

export function Card({ children, className = "", ...props }) {
    return (
        <div className={`${styles.card} ${className}`} {...props}>
            {children}
        </div>
    );
}

export function Input({ label, id, className = "", ...props }) {
    return (
        <div className={styles.inputWrapper}>
            {label && <label htmlFor={id} className={styles.label}>{label}</label>}
            <input id={id} className={`${styles.input} ${className}`} {...props} />
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
