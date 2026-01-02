import React from 'react';
import styles from './Button.module.css';

export function Button({ children, variant = "primary", className = "", ...props }) {
    return (
        <button
            className={`${styles.btn} ${styles[variant]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
