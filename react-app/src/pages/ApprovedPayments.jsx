import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { LoadingOverlay } from '../components/ui';
import styles from './GeneralManager.module.css'; // Reusing GM styles for consistency
import TemplateModal from '../components/TemplateModal';
import { useMessage } from '../context/MessageContext';
import { formatDate } from '../utils';

const ApprovedPayments = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [vendorSearch, setVendorSearch] = useState('');
    const [dateSearch, setDateSearch] = useState('');
    const [projectSearch, setProjectSearch] = useState('');
    const [viewItem, setViewItem] = useState(null);
    const { alert } = useMessage();

    useEffect(() => {
        fetchApprovedHistory();
    }, []);

    const fetchApprovedHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('payment_history')
                .select('*')
                .eq('status', 'Approved')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setHistory(data || []);
        } catch (e) {
            console.error(e);
            alert('Failed to fetch approved history: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = history.filter(item => {
        if (vendorSearch && !item.vendor_name?.toLowerCase().includes(vendorSearch.toLowerCase())) return false;
        if (dateSearch && item.date !== dateSearch) return false;
        if (projectSearch && !item.project?.toLowerCase().includes(projectSearch.toLowerCase())) return false;
        return true;
    });

    return (
        <div className={styles.container}>
            {loading && <LoadingOverlay message="Fetching records..." />}

            <header className={styles.topBar}>
                <div className={styles.pageTitle}>
                    <h2>Payment Approved Module</h2>
                    <span className={styles.gmBadge} style={{ background: '#10b981' }}>Approved Records</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link to="/gm"><Button variant="secondary" style={{ color: 'black', borderColor: 'rgba(0,0,0,0.3)' }}>GM Dashboard</Button></Link>
                    <Link to="/"><Button variant="secondary" style={{ color: 'black', borderColor: 'rgba(0,0,0,0.3)' }}>Home</Button></Link>
                </div>
            </header>

            <main className={styles.mainContent}>
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>Signed & Approved Payments</h3>
                        <button onClick={fetchApprovedHistory} className={styles.refreshBtn}>
                            🔄 Refresh Data
                        </button>
                    </div>

                    <div className={styles.toolBar}>
                        <div className={styles.filterGrid}>
                            <input
                                type="text"
                                placeholder="Search Vendor..."
                                value={vendorSearch}
                                onChange={(e) => setVendorSearch(e.target.value)}
                                className={styles.filterInput}
                            />
                            <input
                                type="date"
                                value={dateSearch}
                                onChange={(e) => setDateSearch(e.target.value)}
                                className={styles.filterInput}
                            />
                            <input
                                type="text"
                                placeholder="Search Project..."
                                value={projectSearch}
                                onChange={(e) => setProjectSearch(e.target.value)}
                                className={styles.filterInput}
                            />
                        </div>
                    </div>

                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Vendor</th>
                                    <th>Project</th>
                                    <th style={{ textAlign: 'right' }}>Total Amount</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'center' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredHistory.map(item => (
                                    <tr key={item.id}>
                                        <td style={{ fontWeight: 600 }}>{formatDate(item.date)}</td>
                                        <td>
                                            <span className={`${styles.badge} ${item.type === 'invoice' ? styles.badgeInvoice : styles.badgePayment}`}>
                                                {item.type === 'invoice' ? 'INVOICE' : 'PAYMENT'}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 700, color: '#0f172a' }}>{item.vendor_name}</td>
                                        <td style={{ color: '#64748b' }}>{item.project}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>₹{item.amount?.toLocaleString('en-IN')}</td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
                                                {item.status}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <Button
                                                variant="secondary"
                                                className={styles.actionBtn}
                                                style={{ margin: '0 auto' }}
                                                onClick={() => setViewItem(item)}
                                            >
                                                🖨️ View & Print
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                                {filteredHistory.length === 0 && (
                                    <tr>
                                        <td colSpan="7" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                                            No approved records found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {viewItem && (
                <TemplateModal
                    record={viewItem}
                    onClose={() => setViewItem(null)}
                />
            )}
        </div>
    );

};

export default ApprovedPayments;
