import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wallet, TrendingUp, CreditCard, PieChart } from 'lucide-react';
import styles from './AccountsDashboard.module.css';

const AccountsDashboard = () => {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <Link to="/" className={styles.backBtn}>
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className={styles.title}>Accounts Module</h1>
                </div>
            </header>

            <main className={styles.maintenanceContent}>
                <div className={styles.maintenanceIcon}>🛠️</div>
                <h2 className={styles.maintenanceTitle}>Under Maintenance</h2>
                <p className={styles.maintenanceText}>
                    The Accounts module is currently under development. 
                    Full accounting features and financial reporting will be available soon.
                </p>
                <Link to="/" className={styles.homeBtn}>Back to Home</Link>
            </main>
        </div>
    );
};

export default AccountsDashboard;
