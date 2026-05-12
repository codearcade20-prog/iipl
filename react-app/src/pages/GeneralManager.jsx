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
                    .update({ 
                        status: 'Approved', 
                        gm_signed: true,
                        gm_signature: gmSignatureUrl 
                    })
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

            <header className={styles.topBar}>
                <div className={styles.pageTitle}>
                    <h2>General Manager Dashboard</h2>
                    <span className={styles.gmBadge}>GM Access</span>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <Link to="/approved-payments"><Button variant="secondary" fullWidth={false} style={{ color: 'black', borderColor: 'rgba(0,0,0,0.3)' }}>Approved Payments ✅</Button></Link>
                    <Link to="/"><Button variant="secondary" fullWidth={false} style={{ color: 'black', borderColor: 'rgba(0,0,0,0.3)' }}>Home</Button></Link>
                </div>
            </header>

            <main className={styles.mainContent}>
                <div className={styles.card}>
                    <div className={styles.cardHeader}>
                        <h3 className={styles.cardTitle}>Payment & Invoice History</h3>
                        <button onClick={fetchHistory} className={styles.refreshBtn}>
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
                                <option value="Accounts">Accounts</option>
                                <option value="Hold">Hold</option>
                            </select>
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
                                            <span className={`${styles.statusBadge} ${styles['status' + (item.status || 'Pending')]}`}>
                                                {item.status || 'Pending'}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <Button
                                                    variant="secondary"
                                                    fullWidth={false}
                                                    className={styles.actionBtn}
                                                    onClick={() => setViewItem(item)}
                                                >
                                                    View
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    fullWidth={false}
                                                    className={styles.actionBtn}
                                                    style={{ borderColor: '#6366f1', color: '#6366f1' }}
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
                                        <td colSpan="7" style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
                                            No history records available.
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
