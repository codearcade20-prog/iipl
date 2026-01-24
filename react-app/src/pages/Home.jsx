import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Home.module.css';

const Home = () => {
    const { user, logout, hasPermission } = useAuth();

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div style={{ position: 'absolute', top: '20px', right: '20px', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Welcome, <strong>{user?.username}</strong></span>
                    <button onClick={logout} className={styles.logoutBtn}>Logout 🚪</button>
                </div>
                <h1 className={styles.companyName}>Innovative Interiors</h1>
                <p className={styles.tagline}>Vendor Management System</p>
                <div className={styles.dashboardLabel}>Quality Survey Team Dashboard</div>
            </header>

            <div className={styles.navGrid}>
                {hasPermission('invoice') && (
                    <Link to="/invoice-generator" className={styles.navCard}>
                        <div className={styles.icon}>📄</div>
                        <h3 className={styles.cardTitle}>Invoice Generator</h3>
                        <p className={styles.cardText}>Create and print professional vendor invoices with auto-fill technology.</p>
                    </Link>
                )}

                {hasPermission('payment') && (
                    <Link to="/payment-request" className={styles.navCard}>
                        <div className={styles.icon}>💸</div>
                        <h3 className={styles.cardTitle}>Payment Request</h3>
                        <p className={styles.cardText}>Generate standardized sub-vendor payment request forms with cloud autofill.</p>
                    </Link>
                )}

                {hasPermission('history') && (
                    <Link to="/history" className={styles.navCard}>
                        <div className={styles.icon}>📜</div>
                        <h3 className={styles.cardTitle}>Payment & Invoice History</h3>
                        <p className={styles.cardText}>View and track the status of all vendor invoices and payment requests.</p>
                    </Link>
                )}

                {hasPermission('workorders') && (
                    <Link to="/work-orders" className={styles.navCard}>
                        <div className={styles.icon}>📁</div>
                        <h3 className={styles.cardTitle}>Work Orders</h3>
                        <p className={styles.cardText}>Access and view all project work orders directly via Google Drive repository.</p>
                    </Link>
                )}

                {hasPermission('admin') && (
                    <Link to="/admin" className={styles.navCard}>
                        <div className={styles.icon}>⚙️</div>
                        <h3 className={styles.cardTitle}>Admin Control</h3>
                        <p className={styles.cardText}>Manage cloud records, update bank details, PAN numbers, and vendor profiles.</p>
                    </Link>
                )}

                {hasPermission('overview') && (
                    <Link to="/project-overview" className={styles.navCard}>
                        <div className={styles.icon}>📋</div>
                        <h3 className={styles.cardTitle}>Project Overview</h3>
                        <p className={styles.cardText}>View project status, site management, and vendor lists in read-only mode.</p>
                    </Link>
                )}

                {hasPermission('vendor') && (
                    <Link to="/vendor-dashboard" className={styles.navCard}>
                        <div className={styles.icon}>📊</div>
                        <h3 className={styles.cardTitle}>Vendor & Site Dashboard</h3>
                        <p className={styles.cardText}>Access the external vendor and site management dashboard.</p>
                    </Link>
                )}
            </div>

            <footer className={styles.footer}>
                <p className={styles.devTag}>
                    Developed By <a href="https://www.youtube.com/channel/UC6McNBm7VIaLlwAjKOP5_VA" target="_blank" rel="noreferrer">Codearcade</a>
                </p>
            </footer>
        </div>
    );
};

export default Home;
