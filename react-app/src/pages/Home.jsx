import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import styles from './Home.module.css';

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

const Home = () => {
    const { user, logout, hasPermission } = useAuth();
    const [searchQuery, setSearchQuery] = useState('');
    const [theme, setTheme] = useState(null); 
    const [themeLoading, setThemeLoading] = useState(true);

    React.useEffect(() => {
        const fetchTheme = async () => {
            try {
                const { data } = await supabase
                    .from('app_settings')
                    .select('setting_value')
                    .eq('setting_key', 'home_theme')
                    .single();
                if (data) setTheme(data.setting_value);
                else setTheme('classic'); 
            } catch (err) {
                console.error("Error fetching theme:", err);
                setTheme('classic');
            } finally {
                setThemeLoading(false);
            }
        };
        fetchTheme();
    }, []);

    if (themeLoading) {
        return (
            <div className={styles.loadingOverlay}>
                <div className={styles.loaderBox}>
                    <div className={styles.loader}></div>
                    <p>Preparing Dashboard...</p>
                </div>
            </div>
        );
    }
    const filteredModules = allModules.filter(mod => {
        const permissions = Array.isArray(mod.permission) ? mod.permission : [mod.permission];
        const hasPerm = permissions.some(p => hasPermission(p));
        if (!hasPerm) return false;
        if (searchQuery && !mod.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    return (
        <div className={`${styles.container} ${theme === 'classic' ? styles.classicContainer : ''}`}>
            {theme === 'modern' ? (
                <header className={styles.topBar}>
                    <div className={styles.topBarLeft}>
                        <div className={styles.logoBox}>
                            <img src="/LOGO.png" alt="IIPL Logo" className={styles.logo} />
                        </div>
                        <div className={styles.brandGroup}>
                            <h1 className={styles.brandTitle}>Innovative Interiors</h1>
                            <div className={styles.badge}>IIPL Team Dashboard</div>
                        </div>
                    </div>

                    <div className={styles.searchSection}>
                        <div className={styles.searchWrapper}>
                            <span className={styles.searchIcon}>🔍</span>
                            <input 
                                type="text" 
                                placeholder="Find a module..." 
                                className={styles.topSearchInput}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className={styles.userControls}>
                        <div className={styles.welcomeInfo}>
                            Hello, <strong>{user?.username}</strong>
                        </div>
                        <button className={styles.topLogoutBtn} onClick={logout}>
                            Logout
                        </button>
                    </div>
                </header>
            ) : (
                <div className={styles.classicHeader}>
                    <div className={styles.classicTopRow}>
                        <div className={styles.welcomeInfo}>
                            Welcome, <strong>{user?.username}</strong>
                        </div>
                        <button className={styles.classicLogoutBtn} onClick={logout}>
                            Logout <span style={{ marginLeft: '4px' }}>🚪</span>
                        </button>
                    </div>

                    <div className={styles.classicBrand}>
                        <h1 className={styles.classicTitle}>INNOVATIVE INTERIORS</h1>
                        <div className={styles.classicBadgeWrapper}>
                            <div className={styles.classicBadge}>
                                <span className={styles.dot}></span> IIPL TEAM DASHBOARD
                            </div>
                        </div>
                    </div>

                    <div className={styles.classicSearchSection}>
                        <div className={styles.classicSearchWrapper}>
                            <input 
                                type="text" 
                                placeholder="Search for a module (e.g. Wages, Admin, Invoice...)" 
                                className={styles.classicSearchInput}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <span className={styles.classicSearchIcon}>🔍</span>
                        </div>
                    </div>
                </div>
            )}

            <main className={`${styles.mainContent} ${theme === 'classic' ? styles.classicMain : ''}`}>
                <div className={styles.navGrid}>
                    {filteredModules.map(mod => (
                        <Link to={mod.path} key={mod.id} className={styles.navCard}>
                            <div className={styles.iconBox}>{mod.icon}</div>
                            <div className={styles.cardContent}>
                                <h3 className={styles.cardTitle}>{mod.title}</h3>
                                <p className={styles.cardText}>{mod.text}</p>
                            </div>
                        </Link>
                    ))}
                    {filteredModules.length === 0 && (
                        <div className={styles.noResults}>
                            <div className={styles.noResultsIcon}>🔍</div>
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
            </main>
        </div>
    );
};

export default Home;
