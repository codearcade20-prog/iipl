import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wallet } from 'lucide-react';
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

            <main className={styles.grid}>
                <div className={styles.card}>
                    <div className={styles.iconWrapper} style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                        <Wallet size={24} />
                    </div>
                    <h3 className={styles.cardTitle}>Petty Cash</h3>
                    <p className={styles.cardDescription}>Manage site expenses, petty cash entries, and view summary dashboards.</p>
                    <Link to="/accounts/petty-cash" className={styles.actionLink}>Open Module</Link>
                </div>
            </main>
        </div>
    );
};

export default AccountsDashboard;
