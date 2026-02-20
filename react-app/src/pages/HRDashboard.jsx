import React from 'react';
import { Link } from 'react-router-dom';
import {
    Users,
    UserPlus,
    Calculator,
    ClipboardList,
    History,
    ArrowLeft,
    Banknote
} from 'lucide-react';
import styles from './HRDashboard.module.css';

const HRDashboard = () => {
    const navItems = [
        {
            title: "Employee Registration",
            desc: "Register new employees and update their professional and bank details.",
            link: "/employee-registration",
            icon: <UserPlus size={32} />,
            color: styles.blue
        },
        {
            title: "Payroll Management",
            desc: "Calculate salaries, earnings, and deductions for the current pay period.",
            link: "/payroll",
            icon: <Calculator size={32} />,
            color: styles.green
        },
        {
            title: "Employee Records",
            desc: "View and manage the complete list of registered employees with search.",
            link: "/employee-list",
            icon: <Users size={32} />,
            color: styles.purple
        },
        {
            title: "Payroll History",
            desc: "Access historical payroll records and download generated salary slips.",
            link: "/payroll-history",
            icon: <History size={32} />,
            color: styles.orange
        }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <Link to="/" className={styles.homeBtn}>
                    <ArrowLeft size={18} style={{ marginRight: '8px' }} />
                    Back to Home
                </Link>
                <h1 className={styles.title}>HR Management System</h1>
                <p className={styles.subtitle}>
                    Centralized hub for employee administration, payroll processing, and historical data management.
                </p>
            </header>

            <main className={styles.main}>
                <div className={styles.navGrid}>
                    {navItems.map((item, index) => (
                        <Link key={index} to={item.link} className={styles.navCard}>
                            <div className={`${styles.iconContainer} ${item.color}`}>
                                {item.icon}
                            </div>
                            <h3 className={styles.cardTitle}>{item.title}</h3>
                            <p className={styles.cardDesc}>{item.desc}</p>
                        </Link>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default HRDashboard;
