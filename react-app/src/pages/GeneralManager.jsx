import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { LoadingOverlay } from '../components/ui';
import styles from './GeneralManager.module.css';
import TemplateModal from '../components/TemplateModal';
import { useMessage } from '../context/MessageContext';
import { formatDate } from '../utils';

const GeneralManager = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('All');
    const [vendorSearch, setVendorSearch] = useState('');
    const [dateSearch, setDateSearch] = useState('');
    const [projectSearch, setProjectSearch] = useState('');
    const [viewItem, setViewItem] = useState(null);
    const [gmSignatureUrl, setGmSignatureUrl] = useState('');
    const [showingSigned, setShowingSigned] = useState(false);
    const { alert, toast } = useMessage();

    useEffect(() => {
        fetchHistory();
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

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('payment_history')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setHistory(data || []);
        } catch (e) {
            console.error(e);
            alert('Failed to fetch history: ' + e.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredHistory = history.filter(item => {
        if (statusFilter !== 'All' && item.status !== statusFilter) return false;
        if (vendorSearch && !item.vendor_name?.toLowerCase().includes(vendorSearch.toLowerCase())) return false;
        if (dateSearch && item.date !== dateSearch) return false;
        if (projectSearch && !item.project?.toLowerCase().includes(projectSearch.toLowerCase())) return false;
        return true;
    });

    const handleDigitalSignature = async (item) => {
        if (!gmSignatureUrl) {
            toast('No GM signature uploaded yet. Please upload it in Admin Settings.');
            return;
        }

        if (item.status !== 'Approved') {
            const confirmed = await confirm(`Approve and Sign this ${item.type === 'invoice' ? 'Invoice' : 'Payment Request'}?`);
            if (!confirmed) return;

            setLoading(true);
            try {
                const { error } = await supabase
                    .from('payment_history')
                    .update({ status: 'Approved' })
                    .eq('id', item.id);

                if (error) throw error;

                // Update local state
                setHistory(prev => prev.map(h => h.id === item.id ? { ...h, status: 'Approved' } : h));
                toast('Approved & Signed Successfully!');
            } catch (e) {
                alert('Approval failed: ' + e.message);
                setLoading(false);
                return;
            } finally {
                setLoading(false);
            }
        }

        setShowingSigned(true);
        setViewItem(item);
    };

    return (
        <div className={styles.container}>
            {loading && <LoadingOverlay message="Fetching records..." />}

            <div className={styles.topBar}>
                <div className={styles.pageTitle}>
                    <h2>General Manager Dashboard</h2>
                    <span className={styles.gmBadge}>GM Access</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link to="/approved-payments"><Button variant="outline">Approved Payments ✅</Button></Link>
                    <Link to="/"><Button variant="secondary">Home</Button></Link>
                </div>
            </div>

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>Payment & Invoice History</h3>
                    <button onClick={fetchHistory} className={styles.refreshBtn}>
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
                        <div className={styles.filterGroup}>
                            <select
                                className={styles.filterInput}
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="All">All Statuses</option>
                                <option value="Pending">Pending</option>
                                <option value="Approved">Approved</option>
                                <option value="Partial">Partial</option>
                                <option value="Paid">Paid</option>
                                <option value="Rejected">Rejected</option>
                            </select>
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
                                        <span className={`${styles.statusBadge} ${styles['status' + (item.status || 'Pending')]}`}>
                                            {item.status || 'Pending'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                            <Button
                                                variant="secondary"
                                                style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                                onClick={() => setViewItem(item)}
                                            >
                                                View
                                            </Button>
                                            <Button
                                                variant="outline"
                                                style={{ padding: '6px 12px', fontSize: '0.85rem', borderColor: '#4f46e5', color: '#4f46e5' }}
                                                onClick={() => handleDigitalSignature(item)}
                                            >
                                                Signature
                                            </Button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredHistory.length === 0 && (
                                <tr>
                                    <td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                                        No history records available.
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
                    onClose={() => {
                        setViewItem(null);
                        setShowingSigned(false);
                    }}
                    gmSignatureUrl={showingSigned ? gmSignatureUrl : null}
                />
            )}
        </div>
    );
};

export default GeneralManager;
