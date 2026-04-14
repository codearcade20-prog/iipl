import React, { useState, useEffect } from 'react';
import styles from './QuoteBot.module.css';

const quotes = [
    { text: "Your work is going to fill a large part of your life, and the only way to be truly satisfied is to do what you believe is great work.", author: "Steve Jobs" },
    { text: "Design is not just what it looks like and feels like. Design is how it works.", author: "Steve Jobs" },
    { text: "Creativity is intelligence having fun.", author: "Albert Einstein" },
    { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
    { text: "The details are not the details. They make the design.", author: "Charles Eames" },
    { text: "Success is not final; failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
    { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" }
];

const QuoteBot = () => {
    const [currentQuote, setCurrentQuote] = useState(quotes[0]);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
    }, []);

    const handleBotClick = () => {
        setIsVisible(false);
        setTimeout(() => {
            const randomIndex = Math.floor(Math.random() * quotes.length);
            setCurrentQuote(quotes[randomIndex]);
            setIsVisible(true);
        }, 500);
    };

    return (
        <div className={styles.botContainer} onClick={handleBotClick} style={{ cursor: 'pointer' }}>
            <div className={`${styles.bubble} ${isVisible ? styles.fadeIn : styles.fadeOut}`}>
                <div className={styles.quoteMark}>“</div>
                <p className={styles.text}>{currentQuote.text}</p>
                <p className={styles.author}>— {currentQuote.author}</p>
            </div>
            <div className={styles.botAvatar}>
                <div className={styles.antenna}></div>
                <div className={styles.head}>
                    <div className={styles.eyeLeft}></div>
                    <div className={styles.eyeRight}></div>
                    <div className={styles.mouth}></div>
                </div>
                <div className={styles.body}></div>
            </div>
        </div>
    );
};

export default QuoteBot;
