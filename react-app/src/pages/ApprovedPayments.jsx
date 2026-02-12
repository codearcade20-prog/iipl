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
    const [gmSignatureUrl, setGmSignatureUrl] = useState('');
    const { alert } = useMessage();

    useEffect(() => {
        fetchApprovedHistory();
        fetchGmSignature();
    }, []);

    const fetchGmSignature = async () => {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('setting_value')
                .eq('setting_key', 'gm_signature_url')
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            if (data) setGmSignatureUrl(data.setting_value);
        } catch (e) {
            console.error('Error fetching GM signature:', e);
        }
    };

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

            <div className={styles.topBar}>
                <div className={styles.pageTitle}>
                    <h2>Payment Approved Module</h2>
                    <span className={styles.gmBadge} style={{ background: '#10b981' }}>Approved Records</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link to="/gm"><Button variant="outline">GM Dashboard</Button></Link>
                    <Link to="/"><Button variant="secondary">Home</Button></Link>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>Signed & Approved Payments</h3>
                    <button onClick={fetchApprovedHistory} className={styles.refreshBtn}>
                        🔄 Refresh Data
                    </button>
                </div>

                <div className={styles.toolBar}>
                    <div className={styles.filterGrid}>
                        <div className={styles.filterGroup}>
                            <input
                                type="text"
                                placeholder="Search Vendor..."
                                value={vendorSearch}
                                onChange={(e) => setVendorSearch(e.target.value)}
                                className={styles.filterInput}
                            />
                        </div>
                        <div className={styles.filterGroup}>
                            <input
                                type="date"
                                value={dateSearch}
                                onChange={(e) => setDateSearch(e.target.value)}
                                className={styles.filterInput}
                            />
                        </div>
                        <div className={styles.filterGroup}>
                            <input
                                type="text"
                                placeholder="Search Project..."
                                value={projectSearch}
                                onChange={(e) => setProjectSearch(e.target.value)}
                                className={styles.filterInput}
                            />
                        </div>
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
                                    <td>{formatDate(item.date)}</td>
                                    <td>
                                        <span className={`${styles.badge} ${item.type === 'invoice' ? styles.badgeInvoice : styles.badgePayment}`}>
                                            {item.type === 'invoice' ? 'INVOICE' : 'PAYMENT'}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 600 }}>{item.vendor_name}</td>
                                    <td>{item.project}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{item.amount?.toLocaleString('en-IN')}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles.statusApproved}`}>
                                            {item.status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <Button
                                            variant="secondary"
                                            style={{ padding: '6px 16px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', margin: '0 auto' }}
                                            onClick={() => setViewItem(item)}
                                        >
                                            🖨️ View & Print
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {filteredHistory.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                        No approved records found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {viewItem && (
                <TemplateModal
                    record={viewItem}
                    onClose={() => setViewItem(null)}
                    gmSignatureUrl={gmSignatureUrl}
                />
            )}
        </div>
    );
};

export default ApprovedPayments;
