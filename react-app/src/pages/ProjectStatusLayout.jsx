import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FilePlus, ClipboardCheck, ArrowLeft, UserCog, Briefcase, HardHat } from 'lucide-react';
import styles from './ProjectStatusLayout.module.css';

const ProjectStatusLayout = () => {
    const location = useLocation();

    // Determine the active module title and icon based on the current path
    const isEntry = location.pathname.includes('/entry') || location.pathname.includes('/personnel');
    const isUpdate = location.pathname.includes('/update');
    
    const moduleInfo = {
        title: isEntry ? 'Project Entry' : (isUpdate ? 'Status Update' : 'Project Tracking'),
        icon: isEntry ? '🏗️' : (isUpdate ? '📊' : '🏗️')
    };

    const entryLinks = [
        { to: '/project-status/entry', icon: <FilePlus size={18} />, label: 'New Project' },
        { to: '/project-status/personnel/coordinator', icon: <UserCog size={18} />, label: 'Coordinators' },
        { to: '/project-status/personnel/designer', icon: <Briefcase size={18} />, label: 'Designers' },
        { to: '/project-status/personnel/site-engineer', icon: <HardHat size={18} />, label: 'Site Engineers' },
    ];

    return (
        <div className={styles.wrapper}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarBrand}>
                    <div className={styles.logo}>{moduleInfo.icon}</div>
                    <span className={styles.brandText}>{moduleInfo.title}</span>
                </div>

                {isEntry ? (
                    <nav className={styles.nav}>
                        {entryLinks.map(item => (
                            <Link
                                key={item.to}
                                to={item.to}
                                className={`${styles.navLink} ${
                                    location.pathname.endsWith(item.to) ? styles.active : ''
                                }`}
                            >
                                {item.icon} {item.label}
                            </Link>
                        ))}
                    </nav>
                ) : (
                    <div style={{ flex: 1 }}></div>
                )}

                <div className={styles.sidebarFooter}>
                    <Link to="/" className={styles.backToHome}>
                        <ArrowLeft size={16} /> Exit Module
                    </Link>
                </div>
            </aside>

            <main className={styles.content}>
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className={styles.mobileNav}>
                <div className={styles.mobileModuleInfo}>
                    <span>{moduleInfo.icon} {moduleInfo.title}</span>
                </div>
                {isEntry && entryLinks.slice(1).map(item => (
                    <Link
                        key={item.to}
                        to={item.to}
                        className={`${styles.mobileNavLink} ${
                            location.pathname.endsWith(item.to) ? styles.active : ''
                        }`}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </Link>
                ))}
                <Link to="/" className={styles.mobileNavLink}>
                    <ArrowLeft size={18} />
                    <span>Exit Module</span>
                </Link>
            </nav>
        </div>
    );
};

export default ProjectStatusLayout;
