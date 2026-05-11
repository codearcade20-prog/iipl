import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserCheck, UserPlus, Building2, TrendingUp } from 'lucide-react';
import styles from './HRDashboard.module.css';

const HRDashboard = () => {
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        departments: 0,
        loading: true
    });

    useEffect(() => {
        const fetchStats = async () => {
            const { data: employees, error } = await supabase
                .from('employees')
                .select('department, status');

            if (!error && employees) {
                const uniqueDepts = new Set(employees.map(e => e.department).filter(Boolean));
                const activeCount = employees.filter(e => e.status !== 'Inactive').length;

                setStats({
                    total: employees.length,
                    active: activeCount,
                    departments: uniqueDepts.size,
                    loading: false
                });
            }
        };

        fetchStats();
    }, []);

    const statCards = [
        { title: "Total Employees", value: stats.total, icon: <Users size={24} />, color: '#4f46e5' },
        { title: "Active Staff", value: stats.active, icon: <UserCheck size={24} />, color: '#10b981' },
        { title: "Departments", value: stats.departments, icon: <Building2 size={24} />, color: '#f59e0b' },
    ];

    return (
        <div className={styles.overviewContainer}>
            <header className={styles.overviewHeader}>
                <div>
                    <h1 className={styles.overviewTitle}>Employee Management Overview</h1>
                    <p className={styles.overviewSubtitle}>Monitor your organization's growth and workforce health at a glance.</p>
                </div>
                <div className={styles.dateDisplay}>
                    {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
            </header>

            <div className={styles.statsGrid}>
                {statCards.map((stat, idx) => (
                    <div key={idx} className={styles.statCard}>
                        <div className={styles.statIcon} style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                            {stat.icon}
                        </div>
                        <div className={styles.statInfo}>
                            <h3 className={styles.statLabel}>{stat.title}</h3>
                            <div className={styles.statValue}>{stats.loading ? '...' : stat.value}</div>
                        </div>

                    </div>
                ))}
            </div>

            <div className={styles.welcomeSection}>
                <div className={styles.welcomeContent}>
                    <h2>Welcome to the Staff Desk</h2>
                    <p>Manage your workforce effectively. Use the sidebar to navigate between employee directory and onboarding workflows.</p>
                </div>
                <div className={styles.welcomeImage}>
                    <UserPlus size={120} color="#e0e7ff" strokeWidth={1} />
                </div>
            </div>
        </div>
    );
};

export default HRDashboard;
