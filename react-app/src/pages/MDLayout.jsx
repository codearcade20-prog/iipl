import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { ShieldCheck, FileCheck, LayoutDashboard, ArrowLeft, Home } from 'lucide-react';
import styles from './MDLayout.module.css';

const MDLayout = () => {
    const location = useLocation();

    const navItems = [
        { to: '/md/petty-cash', icon: <FileCheck size={20} />, label: 'Petty Cash Approval' },
        { to: '/md/project-dashboard', icon: <LayoutDashboard size={20} />, label: 'Project Dashboard' },
    ];

    return (
        <div className={styles.wrapper}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarBrand}>
                    <div className={styles.logo}><ShieldCheck size={28} color="#3b82f6" /></div>
                    <span className={styles.brandText}>MD Panel</span>
                </div>

                <nav className={styles.nav}>
                    {navItems.map(item => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`${styles.navLink} ${
                                location.pathname === item.to || (item.to === '/md/petty-cash' && location.pathname === '/md') ? styles.active : ''
                            }`}
                        >
                            {item.icon} {item.label}
                        </Link>
                    ))}
                </nav>

                <div className={styles.sidebarFooter}>
                    <Link to="/" className={styles.backToHome}>
                        <Home size={16} /> Dashboard Home
                    </Link>
                </div>
            </aside>

            <main className={styles.content}>
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className={styles.mobileNav}>
                {navItems.map(item => (
                    <Link
                        key={item.to}
                        to={item.to}
                        className={`${styles.mobileNavLink} ${
                            location.pathname === item.to || (item.to === '/md/petty-cash' && location.pathname === '/md') ? styles.active : ''
                        }`}
                    >
                        {React.cloneElement(item.icon, { size: 18 })}
                        <span>{item.label}</span>
                    </Link>
                ))}
                <Link to="/" className={styles.mobileNavLink}>
                    <Home size={18} />
                    <span>Exit</span>
                </Link>
            </nav>
        </div>
    );
};

export default MDLayout;
