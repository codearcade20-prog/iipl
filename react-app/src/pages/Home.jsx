import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './Home.module.css';

const Home = () => {
    const { user, logout, hasPermission } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');

    const allModules = [
        { id: 'invoice', path: '/invoice-generator', title: 'Invoice Generator', icon: '📄', text: 'Create and print professional vendor invoices with auto-fill technology.', permission: 'invoice' },
        { id: 'payment', path: '/payment-request', title: 'Payment Request', icon: '💸', text: 'Generate standardized sub-vendor payment request forms with cloud autofill.', permission: 'payment' },
        { id: 'history', path: '/history', title: 'Payment & Invoice History', icon: '📜', text: 'View and track the status of all vendor invoices and payment requests.', permission: 'history' },
        { id: 'workorders', path: '/work-orders', title: 'Work Orders', icon: '📁', text: 'Access and view all project work orders directly via Google Drive repository.', permission: 'workorders' },
        { id: 'admin', path: '/admin', title: 'Admin Control', icon: '⚙️', text: 'Manage cloud records, update bank details, PAN numbers, and vendor profiles.', permission: 'admin' },
        { id: 'overview', path: '/project-overview', title: 'Project Overview', icon: '📋', text: 'View project status, site management, and vendor lists in read-only mode.', permission: 'overview' },
        { id: 'vendor', path: '/vendor-dashboard', title: 'Vendor & Site Dashboard', icon: '📊', text: 'Access the external vendor and site management dashboard.', permission: 'vendor' },
        { id: 'register', path: '/master-register', title: 'Master Registration', icon: '📋', text: 'Manage master data for Sites and Vendors across the entire system.', permission: 'register' },
        { id: 'bill', path: '/bill-generator', title: 'Bill Preparation', icon: '📝', text: 'Prepare Running Account Bills (RAB) and Final Bills with detailed tracking.', permission: ['invoice', 'bill'] },
        { id: 'md', path: '/md', title: 'Managing Director', icon: '👔', text: 'Review and approve petty cash payments with digital signatures and amount adjustment.', permission: ['md', 'admin'] },
        { id: 'gm', path: '/gm', title: 'General Manager', icon: '👔', text: 'Review payment and invoice history with approval workflows and digital signatures.', permission: ['gm', 'admin'] },
        { id: 'approved_payments', path: '/approved-payments', title: 'Approved Payments', icon: '✅', text: 'View and print GM-approved payments and invoices with digital signatures.', permission: ['approved_payments', 'admin'] },
        { id: 'hr', path: '/hr-dashboard', title: 'HR Module', icon: '👥', text: 'Manage employee registrations, details, and payroll information.', permission: ['hr', 'admin'] },
        { id: 'wages', path: '/wages', title: 'Wages', icon: '💰', text: 'Calculate and manage daily/weekly wages for site workers and labor.', permission: ['wages', 'admin'] },
        { id: 'accounts', path: '/accounts', title: 'Accounts', icon: '🏦', text: 'Financial management, generalized ledger, and profit & loss reporting.', permission: ['accounts', 'admin'] },
        { id: 'project_entry', path: '/project-status/entry', title: 'Project Entry', icon: '🏗️', text: 'Create and manage new interior projects, assign coordinators, designers, and site engineers.', permission: 'project_entry' },
        { id: 'project_status', path: '/project-status/update', title: 'Project Status Update', icon: '📊', text: 'Track project progress, completion percentages, and log daily status updates.', permission: 'project_status' },
        { id: 'sub_vendor_checklist', path: '/sub-vendor-checklist', title: 'Sub Vendor Checklist', icon: '📋', text: 'Create and manage detailed sub-vendor agreements and project checklists.', permission: 'sub_vendor_checklist' },
        { id: 'design_team_workflow', path: '/design-team', title: 'Design Team', icon: '🖌️', text: 'Track 11-day design phase workflows, assignments, and approvals.', permission: 'design_team_workflow' }
    ];



    const filteredModules = allModules.filter(mod => {
        const permissions = Array.isArray(mod.permission) ? mod.permission : [mod.permission];
        const hasPerm = permissions.some(p => hasPermission(p));
        if (!hasPerm) return false;
        if (searchQuery && !mod.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.userSection}>
                    <span className={styles.welcomeText}>Welcome, <strong>{user?.username}</strong></span>
                    <button onClick={logout} className={styles.logoutBtn}>Logout 🚪</button>
                </div>
                <h1 className={styles.companyName}>Innovative Interiors</h1>
                <div className={styles.dashboardLabel}>IIPL Team Dashboard</div>
                
                <div className={styles.searchContainer}>
                    <span className={styles.searchIcon}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="Search for a module (e.g. Wages, Admin, Invoice...)" 
                        className={styles.searchInput}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </header>

            <div className={styles.navGrid}>
                {filteredModules.map(mod => (
                    <Link key={mod.path} to={mod.path} className={styles.navCard}>
                        <div className={styles.icon}><span role="img" aria-label={mod.id}>{mod.icon}</span></div>
                        <h3 className={styles.cardTitle}>{mod.title}</h3>
                        <p className={styles.cardText}>{mod.text}</p>
                    </Link>
                ))}
                {filteredModules.length === 0 && (
                    <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '60px', color: '#64748b' }}>
                        <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🔍</div>
                        <h3>No modules found matching "{searchQuery}"</h3>
                        <p>Try searching for something else or browse all modules.</p>
                    </div>
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
