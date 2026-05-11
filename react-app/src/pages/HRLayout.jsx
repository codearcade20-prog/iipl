import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Users, UserPlus, LayoutDashboard, ArrowLeft, Briefcase, History, AlertTriangle } from 'lucide-react';
import styles from './HRLayout.module.css';

const HRLayout = () => {
    const location = useLocation();

    const navItems = [
        { to: '/hr', icon: <LayoutDashboard size={20} />, label: 'Overview', exact: true },
        { to: '/hr/directory', icon: <Users size={20} />, label: 'Directory' },
        { to: '/hr/registration', icon: <UserPlus size={20} />, label: 'Onboarding' },
        { to: '/hr/payroll', icon: <Briefcase size={20} />, label: 'Payroll' },
        { to: '/hr/history', icon: <History size={20} />, label: 'Pay History' },
    ];

    return (
        <div className={styles.wrapper}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarBrand}>
                    <div className={styles.logo}>👤</div>
                    <span className={styles.brandText}>Staff Desk</span>
                </div>

                <nav className={styles.nav}>
                    {navItems.map(item => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`${styles.navLink} ${item.exact
                                ? location.pathname === item.to
                                : location.pathname.startsWith(item.to)
                                    ? styles.active : ''
                                }`}
                        >
                            {item.icon} {item.label}
                        </Link>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <Link to="/" className={styles.backToHome}>
                        <ArrowLeft size={16} /> Main Dashboard
                    </Link>
                </div>
            </aside>

            <main className={styles.content}>
                {/* Maintenance Overlay */}
                <div className={styles.maintenanceOverlay}>
                    <div className={styles.maintenanceCard}>
                        <div className={styles.maintenanceIcon}>
                            <AlertTriangle size={48} color="#f59e0b" />
                        </div>
                        <h2 className={styles.maintenanceTitle}>Module Under Maintenance</h2>
                        <p className={styles.maintenanceText}>
                            This module is currently under maintenance<br />
                            Please wait while we improve the experience.
                        </p>
                        <Link to="/" className={styles.maintenanceBtn}>
                            <ArrowLeft size={18} /> Back to Dashboard
                        </Link>
                    </div>
                </div>
                <div className={styles.contentBlur}>
                    <Outlet />
                </div>
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className={styles.mobileNav}>
                {navItems.map(item => (
                    <Link
                        key={item.to}
                        to={item.to}
                        className={`${styles.mobileNavLink} ${item.exact
                            ? location.pathname === item.to
                            : location.pathname.startsWith(item.to)
                                ? styles.active : ''
                            }`}
                    >
                        {React.cloneElement(item.icon, { size: 18 })}
                        <span>{item.label}</span>
                    </Link>
                ))}
                <Link to="/" className={styles.mobileNavLink}>
                    <ArrowLeft size={18} />
                    <span>Home</span>
                </Link>
            </nav>
        </div>
    );
};

export default HRLayout;
