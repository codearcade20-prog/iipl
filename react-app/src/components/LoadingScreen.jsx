import React from 'react';
import styles from './LoadingScreen.module.css';

const LoadingScreen = ({ message = "Loading data, please wait..." }) => {
    return (
        <div className={styles.overlay}>
            <div className={styles.container}>
                <div className={styles.spinner}>
                    <div className={styles.dot}></div>
                    <div className={styles.dot}></div>
                    <div className={styles.dot}></div>
                    <div className={styles.dot}></div>
                    <div className={styles.dot}></div>
                </div>
                <div className={styles.textContainer}>
                    <h2 className={styles.title}>Innovative Interiors</h2>
                    <p className={styles.message}>{message}</p>
                </div>
            </div>
            <div className={styles.backgroundBlur}></div>
        </div>
    );
};

export default LoadingScreen;
