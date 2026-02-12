import React, { createContext, useContext, useState, useCallback } from 'react';
import MessageOverlay from '../components/ui/MessageOverlay';

const MessageContext = createContext();

export const useMessage = () => {
    const context = useContext(MessageContext);
    if (!context) {
        throw new Error('useMessage must be used within a MessageProvider');
    }
    return context;
};

export const MessageProvider = ({ children }) => {
    const [message, setMessage] = useState(null);
    const [type, setType] = useState(null); // 'alert', 'confirm', 'prompt', 'toast'
    const [resolveRef, setResolveRef] = useState(null);
    const [rejectRef, setRejectRef] = useState(null);

    const showMessage = useCallback((text, options = {}, messageType) => {
        return new Promise((resolve, reject) => {
            setMessage({ text, ...options });
            setType(messageType);
            setResolveRef(() => resolve);
            setRejectRef(() => reject);
        });
    }, []);

    const alert = (text, title = "Alert") => showMessage(text, { title }, 'alert');

    const confirm = (text, options = {}) => showMessage(text, options, 'confirm');

    const prompt = (text, defaultValue = "", title = "Input Required") =>
        showMessage(text, { defaultValue, title }, 'prompt');

    const [toastTimeout, setToastTimeout] = useState(null);

    const toast = (text, title = "") => {
        if (toastTimeout) clearTimeout(toastTimeout);
        setMessage({ text, title });
        setType('toast');
        const timeout = setTimeout(() => {
            setMessage(null);
            setType(null);
            setToastTimeout(null);
        }, 3000);
        setToastTimeout(timeout);
    };

    const handleResolve = (value) => {
        if (resolveRef) resolveRef(value);
        setMessage(null);
        setType(null);
    };

    const handleReject = () => {
        if (rejectRef) rejectRef(null);
        setMessage(null);
        setType(null);
    };

    return (
        <MessageContext.Provider value={{ alert, confirm, prompt, toast }}>
            {children}
            {message && type !== 'toast' && (
                <MessageOverlay
                    message={message}
                    type={type}
                    onResolve={handleResolve}
                    onReject={handleReject}
                />
            )}
            {message && type === 'toast' && (
                <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 10000 }}>
                    <MessageOverlay
                        message={message}
                        type="toast"
                        onResolve={() => setMessage(null)}
                    />
                </div>
            )}
        </MessageContext.Provider>
    );
};
