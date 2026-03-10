import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, ArrowLeft, Tag } from 'lucide-react';
import styles from './PettyCashLayout.module.css';

const PettyCashLayout = () => {
    const location = useLocation();

    return (
        <div className={styles.wrapper}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarBrand}>
                    <div className={styles.logo}>🏦</div>
                    <span className={styles.brandText}>Petty Cash</span>
                </div>

                <nav className={styles.nav}>
                    <Link 
                        to="/accounts/petty-cash" 
                        className={`${styles.navLink} ${location.pathname === '/accounts/petty-cash' ? styles.active : ''}`}
                    >
                        <LayoutDashboard size={20} /> Dashboard
                    </Link>
                    <Link 
                        to="/accounts/petty-cash/entry" 
                        className={`${styles.navLink} ${location.pathname === '/accounts/petty-cash/entry' ? styles.active : ''}`}
                    >
                        <FileText size={20} /> Entry Form
                    </Link>
                    <Link 
                        to="/accounts/petty-cash/history" 
                        className={`${styles.navLink} ${location.pathname === '/accounts/petty-cash/history' ? styles.active : ''}`}
                    >
                        <Tag size={20} /> History
                    </Link>
                </nav>

                <div className={styles.sidebarFooter}>
                    <Link to="/accounts" className={styles.backToAccounts}>
                        <ArrowLeft size={16} /> Exit Module
                    </Link>
                </div>
            </aside>

            <main className={styles.content}>
                <Outlet />
            </main>
        </div>
    );
};

export default PettyCashLayout;
