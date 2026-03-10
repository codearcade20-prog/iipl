import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { DollarSign, ArrowUpRight, ArrowDownRight, Clock, Plus, ArrowRight } from 'lucide-react';
import styles from './PettyCashDashboard.module.css';

const PettyCashDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        balance: 0,
        income: 0,
        expenses: 0
    });
    const [recentEntries, setRecentEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            // Fetch total expenses from petty_cash_entries
            const { data: entries, error: entriesError } = await supabase
                .from('petty_cash_entries')
                .select('*')
                .order('date', { ascending: false });

            if (entriesError) throw entriesError;

            const totalExpenses = entries?.reduce((sum, entry) => sum + (parseFloat(entry.total_amount) || 0), 0) || 0;
            
            setStats({
                balance: 0 - totalExpenses, // Simple negative balance if no income is recorded yet
                income: 0,
                expenses: totalExpenses
            });

            setRecentEntries(entries?.slice(0, 5) || []);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1 className={styles.title}>Petty Cash Dashboard</h1>
                    <p className={styles.subtitle}>Overview of site-level cash flow and expenses</p>
                </div>
                <button className={styles.newEntryBtn} onClick={() => navigate('/accounts/petty-cash/entry')}>
                    <Plus size={18} /> New Entry
                </button>
            </header>

            <section className={styles.statGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}>
                        <DollarSign size={20} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Current Balance</span>
                        <span className={styles.statValue}>₹{stats.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#f0fdf4', color: '#22c55e' }}>
                        <ArrowDownRight size={20} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Total Income</span>
                        <span className={styles.statValue}>₹{stats.income.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#fef2f2', color: '#ef4444' }}>
                        <ArrowUpRight size={20} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Total Expenses</span>
                        <span className={styles.statValue}>₹{stats.expenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                </div>
            </section>

            <section className={styles.recentActivity}>
                <div className={styles.sectionHeader}>
                    <h2 className={styles.sectionTitle}>Recent Entries</h2>
                    <button className={styles.viewAll} onClick={() => navigate('/accounts/petty-cash/history')}>
                        View All <ArrowRight size={14} />
                    </button>
                </div>
                
                {loading ? (
                    <div className={styles.loading}>Loading dashboard...</div>
                ) : recentEntries.length > 0 ? (
                    <div className={styles.activityList}>
                        {recentEntries.map((entry) => (
                            <div key={entry.id} className={styles.activityItem} onClick={() => navigate(`/accounts/petty-cash/view/${entry.id}`)}>
                                <div className={styles.activityInfo}>
                                    <div className={styles.activityTitle}>{entry.site_name}</div>
                                    <div className={styles.activityMeta}>
                                        <span>{new Date(entry.date).toLocaleDateString('en-GB')}</span>
                                        <span className={styles.dot}>•</span>
                                        <span>{entry.request_person}</span>
                                    </div>
                                </div>
                                <div className={styles.activityAmount}>
                                    - ₹{parseFloat(entry.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <Clock size={48} className={styles.emptyIcon} />
                        <p>No recent entries found.</p>
                    </div>
                )}
            </section>
        </div>
    );
};

export default PettyCashDashboard;
