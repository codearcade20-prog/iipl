import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Home.module.css';

const Home = () => {
    const { user, logout, hasPermission } = useAuth();

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.userSection}>
                    <span className={styles.welcomeText}>Welcome, <strong>{user?.username}</strong></span>
                    <button onClick={logout} className={styles.logoutBtn}>Logout 🚪</button>
                </div>
                <h1 className={styles.companyName}>Innovative Interiors</h1>
                <p className={styles.tagline}>IIPL Core</p>
                <div className={styles.dashboardLabel}>Quantity Survey Team Dashboard</div>
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

                {(hasPermission('invoice') || hasPermission('bill')) && (
                    <Link to="/bill-generator" className={styles.navCard}>
                        <div className={styles.icon}>📝</div>
                        <h3 className={styles.cardTitle}>Bill Preparation</h3>
                        <p className={styles.cardText}>Prepare Running Account Bills (RAB) and Final Bills with detailed tracking.</p>
                    </Link>
                )}

                {(hasPermission('md') || hasPermission('admin')) && (
                    <Link to="/md" className={styles.navCard}>
                        <div className={styles.icon}>👔</div>
                        <h3 className={styles.cardTitle}>Managing Director</h3>
                        <p className={styles.cardText}>Review and approve petty cash payments with digital signatures and amount adjustment.</p>
                    </Link>
                )}

                {(hasPermission('gm') || hasPermission('admin')) && (
                    <Link to="/gm" className={styles.navCard}>
                        <div className={styles.icon}>👔</div>
                        <h3 className={styles.cardTitle}>General Manager</h3>
                        <p className={styles.cardText}>Review payment and invoice history with approval workflows and digital signatures.</p>
                    </Link>
                )}

                {(hasPermission('approved_payments') || hasPermission('admin')) && (
                    <Link to="/approved-payments" className={styles.navCard}>
                        <div className={styles.icon}>✅</div>
                        <h3 className={styles.cardTitle}>Approved Payments</h3>
                        <p className={styles.cardText}>View and print GM-approved payments and invoices with digital signatures.</p>
                    </Link>
                )}

                {(hasPermission('hr') || hasPermission('admin')) && (
                    <Link to="/hr-dashboard" className={styles.navCard}>
                        <div className={styles.icon}>👥</div>
                        <h3 className={styles.cardTitle}>HR Module</h3>
                        <p className={styles.cardText}>Manage employee registrations, details, and payroll information.</p>
                    </Link>
                )}
                {(hasPermission('wages') || hasPermission('admin')) && (
                    <Link to="/wages" className={styles.navCard}>
                        <div className={styles.icon}>💰</div>
                        <h3 className={styles.cardTitle}>Wages</h3>
                        <p className={styles.cardText}>Calculate and manage daily/weekly wages for site workers and labor.</p>
                    </Link>
                )}
                {(hasPermission('accounts') || hasPermission('admin')) && (
                    <Link to="/accounts" className={styles.navCard}>
                        <div className={styles.icon}>🏦</div>
                        <h3 className={styles.cardTitle}>Accounts</h3>
                        <p className={styles.cardText}>Financial management, generalized ledger, and profit & loss reporting.</p>
                    </Link>
                )}
                {hasPermission('project_entry') && (
                    <Link to="/project-status/entry" className={styles.navCard}>
                        <div className={styles.icon}>🏗️</div>
                        <h3 className={styles.cardTitle}>Project Entry</h3>
                        <p className={styles.cardText}>Create and manage new interior projects, assign coordinators, designers, and site engineers.</p>
                    </Link>
                )}
                {hasPermission('project_status') && (
                    <Link to="/project-status/update" className={styles.navCard}>
                        <div className={styles.icon}>📊</div>
                        <h3 className={styles.cardTitle}>Project Status Update</h3>
                        <p className={styles.cardText}>Track project progress, completion percentages, and log daily status updates.</p>
                    </Link>
                )}
                {hasPermission('sub_vendor_checklist') && (
                    <Link to="/sub-vendor-checklist" className={styles.navCard}>
                        <div className={styles.icon}>📋</div>
                        <h3 className={styles.cardTitle}>Sub Vendor Checklist</h3>
                        <p className={styles.cardText}>Create and manage detailed sub-vendor agreements and project checklists.</p>
                    </Link>
                )}
            </div>

            <footer className={styles.footer}>
                <p className={styles.devTag}>
                    Developed By <a href="https://codearcade20.vercel.app" target="_blank" rel="noreferrer">Codearcade</a>
                </p>
            </footer>
        </div>
    );
};

export default Home;
