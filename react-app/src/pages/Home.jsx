import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Home.module.css';

const Home = () => {
    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.companyName}>Innovative Interiors</h1>
                <p className={styles.tagline}>Vendor Management System</p>
                <div className={styles.dashboardLabel}>Quality Survey Team Dashboard</div>
            </header>

            <div className={styles.navGrid}>
                <Link to="/invoice-generator" className={styles.navCard}>
                    <div className={styles.icon}>📄</div>
                    <h3 className={styles.cardTitle}>Invoice Generator</h3>
                    <p className={styles.cardText}>Create and print professional vendor invoices with auto-fill technology.</p>
                </Link>

                <Link to="/payment-request" className={styles.navCard}>
                    <div className={styles.icon}>💸</div>
                    <h3 className={styles.cardTitle}>Payment Request</h3>
                    <p className={styles.cardText}>Generate standardized sub-vendor payment request forms with cloud autofill.</p>
                </Link>

                <Link to="/work-orders" className={styles.navCard}>
                    <div className={styles.icon}>📁</div>
                    <h3 className={styles.cardTitle}>Work Orders</h3>
                    <p className={styles.cardText}>Access and view all project work orders directly via Google Drive repository.</p>
                </Link>

                <Link to="/admin" className={styles.navCard}>
                    <div className={styles.icon}>⚙️</div>
                    <h3 className={styles.cardTitle}>Admin Control</h3>
                    <p className={styles.cardText}>Manage cloud records, update bank details, PAN numbers, and vendor profiles.</p>
                </Link>

                <Link to="/vendor-dashboard" className={styles.navCard}>
                    <div className={styles.icon}>📊</div>
                    <h3 className={styles.cardTitle}>Vendor & Site Dashboard</h3>
                    <p className={styles.cardText}>Access the external vendor and site management dashboard.</p>
                </Link>
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
