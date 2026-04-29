import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Wallet, History, FileText, LayoutDashboard } from 'lucide-react';
import styles from './AccountsDashboard.module.css';

const AccountsDashboard = () => {
    return (
        <div className={styles.wrapper}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarBrand}>
                    <div className={styles.logo}>💼</div>
                    <span className={styles.brandText}>Accounts</span>
                </div>

                <nav className={styles.nav}>
                    <Link to="/accounts" className={`${styles.navLink} ${styles.active}`}>
                        <LayoutDashboard size={20} /> Overview
                    </Link>
                    <Link to="/accounts/petty-cash" className={styles.navLink}>
                        <Wallet size={20} /> Petty Cash
                    </Link>
                </nav>

                <div className={styles.sidebarFooter}>
                    <Link to="/" className={styles.backToAccounts}>
                        <ArrowLeft size={16} /> Exit Module
                    </Link>
                </div>
            </aside>

            <main className={styles.content}>
                <header className={styles.header}>
                    <div className={styles.headerInfo}>
                        <h1 className={styles.title}>Accounts Module</h1>
                        <p className={styles.subtitle}>
                            Select a financial tool to manage site expenses, tracking, and fiscal analytics.
                        </p>
                    </div>
                </header>

                <div className={styles.grid}>
                    <div className={styles.card}>
                        <div className={styles.iconWrapper} style={{ backgroundColor: '#eff6ff', color: '#3b82f6' }}>
                            <Wallet size={28} />
                        </div>
                        <h3 className={styles.cardTitle}>Petty Cash</h3>
                        <p className={styles.cardDescription}>
                            Streamline your site-level transactions. Track daily expenses, manage worker payments, and generate instant summary reports.
                        </p>
                        <Link to="/accounts/petty-cash" className={styles.actionLink}>
                            Open Module
                        </Link>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.iconWrapper} style={{ backgroundColor: '#f0fdf4', color: '#10b981' }}>
                            <History size={28} />
                        </div>
                        <h3 className={styles.cardTitle}>Expense History</h3>
                        <p className={styles.cardDescription}>
                            Access a complete audit trail of all historical site expenses. Filter by date, person, or site to track spending patterns.
                        </p>
                        <Link to="/accounts/petty-cash/history" className={`${styles.actionLink} ${styles.actionLinkGreen}`}>
                            View History
                        </Link>
                    </div>

                    <div className={styles.card}>
                        <div className={styles.iconWrapper} style={{ backgroundColor: '#fff7ed', color: '#f59e0b' }}>
                            <FileText size={28} />
                        </div>
                        <h3 className={styles.cardTitle}>Master Sheet</h3>
                        <p className={styles.cardDescription}>
                            Comprehensive overview of all financial data across all sites. Perfect for reconciliation and budget analysis.
                        </p>
                        <Link to="/accounts/petty-cash/master-sheet" className={`${styles.actionLink} ${styles.actionLinkOrange}`}>
                            Open Master Sheet
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AccountsDashboard;
