import React, { useState, useEffect } from 'react';
import styles from './MessageOverlay.module.css';

const MessageOverlay = ({ message, type, onResolve, onReject }) => {
    const [inputValue, setInputValue] = useState(message.defaultValue || '');
    const [isClosing, setIsClosing] = useState(false);

    useEffect(() => {
        setIsClosing(false);
        setInputValue(message.defaultValue || '');
    }, [message]);

    const handleClose = (value) => {
        setIsClosing(true);
        setTimeout(() => {
            onResolve(value);
        }, 300);
    };

    const handleCancel = () => {
        setIsClosing(true);
        setTimeout(() => {
            onReject();
        }, 300);
    };

    if (!message) return null;

    return (
        <div
            className={`${type === 'toast' ? styles.toastOverlay : styles.overlay} ${isClosing ? styles.fadeOut : ''}`}
            onClick={type === 'toast' ? () => handleClose() : undefined}
        >
            <div
                className={`${styles.modal} ${styles[type]} ${isClosing ? styles.scaleOut : styles.scaleIn}`}
                onClick={e => e.stopPropagation()}
            >
                <div className={styles.content}>
                    {type === 'toast' && (
                        <div className={styles.iconSuccess}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    )}
                    <div className={styles.textContainer}>
                        {message.title && <h3 className={styles.title}>{message.title}</h3>}
                        <p className={styles.text}>{message.text}</p>
                    </div>

                    {type === 'prompt' && (
                        <input
                            autoFocus
                            type="text"
                            className={styles.input}
                            value={inputValue}
                            onChange={e => setInputValue(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === 'Enter') handleClose(inputValue);
                                if (e.key === 'Escape') handleCancel();
                            }}
                        />
                    )}
                </div>

                <div className={styles.actions}>
                    {type === 'confirm' && (
                        <>
                            <button className={styles.btnSecondary} onClick={handleCancel}>
                                {message.cancelText || 'Cancel'}
                            </button>
                            <button className={styles.btnPrimary} onClick={() => handleClose(true)}>
                                {message.okText || 'OK'}
                            </button>
                        </>
                    )}
                    {type === 'prompt' && (
                        <>
                            <button className={styles.btnSecondary} onClick={handleCancel}>
                                Cancel
                            </button>
                            <button className={styles.btnPrimary} onClick={() => handleClose(inputValue)}>
                                OK
                            </button>
                        </>
                    )}
                    {type === 'alert' && (
                        <button className={styles.btnPrimary} onClick={() => handleClose()}>
                            OK
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageOverlay;
