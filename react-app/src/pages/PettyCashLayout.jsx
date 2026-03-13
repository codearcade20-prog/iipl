import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, ArrowLeft, Tag, User, FileSpreadsheet } from 'lucide-react';
import styles from './PettyCashLayout.module.css';

const PettyCashLayout = () => {
    const location = useLocation();

    const navItems = [
        { to: '/accounts/petty-cash', icon: <LayoutDashboard size={20} />, label: 'Dashboard', exact: true },
        { to: '/accounts/petty-cash/entry', icon: <FileText size={20} />, label: 'Entry' },
        { to: '/accounts/petty-cash/history', icon: <Tag size={20} />, label: 'History' },
        { to: '/accounts/petty-cash/master-sheet', icon: <FileSpreadsheet size={20} />, label: 'Master' },
        { to: '/accounts/petty-cash/persons', icon: <User size={20} />, label: 'Persons' },
    ];

    return (
        <div className={styles.wrapper}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarBrand}>
                    <div className={styles.logo}>🏦</div>
                    <span className={styles.brandText}>Petty Cash</span>
                </div>

                <nav className={styles.nav}>
                    {navItems.map(item => (
                        <Link
                            key={item.to}
                            to={item.to}
                            className={`${styles.navLink} ${
                                item.exact
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
                    <Link to="/accounts" className={styles.backToAccounts}>
                        <ArrowLeft size={16} /> Exit Module
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
                            item.exact
                                ? location.pathname === item.to
                                : location.pathname.startsWith(item.to)
                            ? styles.active : ''
                        }`}
                    >
                        {React.cloneElement(item.icon, { size: 18 })}
                        <span>{item.label}</span>
                    </Link>
                ))}
                <Link to="/accounts" className={styles.mobileNavLink}>
                    <ArrowLeft size={18} />
                    <span>Exit</span>
                </Link>
            </nav>
        </div>
    );
};

export default PettyCashLayout;

