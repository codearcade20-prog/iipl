import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { LoadingOverlay } from '../components/ui';
import styles from './HistoryPage.module.css';

const HistoryPage = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('All');
    const [openStatusDropdown, setOpenStatusDropdown] = useState(null);
    const [vendorSearch, setVendorSearch] = useState('');
    const [dateSearch, setDateSearch] = useState('');
    const [projectSearch, setProjectSearch] = useState('');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('payment_history').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setHistory(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id, newStatus) => {
        const item = history.find(h => h.id === id);
        if (!item) return;

        let payload = { status: newStatus };

        if (newStatus === 'Paid') {
            const splits = Array.isArray(item.payment_splits) ? item.payment_splits : [];
            const currentTotalPaid = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
            const totalAmount = parseFloat(item.amount) || 0;
            const remaining = totalAmount - currentTotalPaid;

            if (remaining > 0) {
                const choice = window.confirm(`Remaining balance: ₹${remaining.toLocaleString('en-IN')}.\n\nClick OK for FULL payment (Record remaining ₹${remaining.toLocaleString('en-IN')} and mark as Paid)\nClick CANCEL for PARTIAL payment (Record a custom amount and keep as Partial)`);

                if (choice) {
                    // Full payment
                    const dateStr = prompt("Enter Final Payment Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
                    if (!dateStr) return; // Cancelled

                    const finalSplit = { amount: remaining, date: dateStr };
                    payload.payment_splits = [...splits, finalSplit];
                    payload.paid_amount = totalAmount;
                    payload.remaining_amount = 0;
                    payload.paid_date = dateStr;
                    payload.status = 'Paid';
                } else {
                    // Another partial payment
                    const amountInput = prompt(`Current Balance: ₹${remaining.toLocaleString('en-IN')}\nEnter additional amount paid now (must be LESS than ₹${remaining.toLocaleString('en-IN')}):`);
                    if (amountInput === null) return; // Cancelled

                    const additionalPaid = parseFloat(amountInput) || 0;
                    if (additionalPaid <= 0 || additionalPaid >= remaining) {
                        alert(`Please enter a valid amount strictly less than ₹${remaining.toLocaleString('en-IN')}. For full settlement, use the Full payment option.`);
                        return;
                    }

                    const dateStr = prompt("Enter Payment Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
                    if (!dateStr) return; // Cancelled

                    const newSplit = { amount: additionalPaid, date: dateStr };
                    payload.payment_splits = [...splits, newSplit];
                    payload.paid_amount = currentTotalPaid + additionalPaid;
                    payload.remaining_amount = totalAmount - (currentTotalPaid + additionalPaid);
                    payload.paid_date = dateStr;
                    payload.status = 'Partial'; // Keep as partial
                }
            } else {
                // Already fully paid by splits
                payload.paid_amount = totalAmount;
                payload.remaining_amount = 0;
                payload.paid_date = item.paid_date || new Date().toISOString().split('T')[0];
                payload.status = 'Paid';
            }
        } else if (newStatus === 'Partial') {
            const splits = Array.isArray(item.payment_splits) ? item.payment_splits : [];
            const currentTotalPaid = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
            const totalAmount = parseFloat(item.amount) || 0;
            const remaining = totalAmount - currentTotalPaid;

            if (remaining <= 0) {
                alert("This record is already fully paid. Please change status to 'Paid'.");
                return;
            }

            const amountInput = prompt(`Total Amount: ₹${totalAmount.toLocaleString('en-IN')}\nRemaining: ₹${remaining.toLocaleString('en-IN')}\nEnter additional amount paid now (less than ₹${remaining.toLocaleString('en-IN')}):`);
            if (amountInput === null) return; // Cancelled

            const additionalPaid = parseFloat(amountInput) || 0;
            if (additionalPaid <= 0 || additionalPaid >= remaining) {
                alert(`Please enter a valid amount strictly less than the remaining ₹${remaining.toLocaleString('en-IN')}. For full settlement, set status to 'Paid'.`);
                return;
            }

            const dateStr = prompt("Enter Payment Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
            if (!dateStr) return; // Cancelled

            const newSplit = { amount: additionalPaid, date: dateStr };
            const updatedSplits = [...splits, newSplit];
            const newTotalPaid = currentTotalPaid + additionalPaid;

            payload.payment_splits = updatedSplits;
            payload.paid_amount = newTotalPaid;
            payload.remaining_amount = totalAmount - newTotalPaid;
            payload.paid_date = dateStr;
            // payload.status = 'Partial'; // Already passed as newStatus
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('payment_history').update(payload).eq('id', id);
            if (error) throw error;

            setHistory(history.map(h =>
                h.id === id ? { ...h, ...payload } : h
            ));
        } catch (e) { alert(e.message); }
        finally { setLoading(false); }
    };

    // Filter Logic
    const filteredHistory = history.filter(item => {
        if (statusFilter !== 'All' && item.status !== statusFilter) return false;
        if (vendorSearch && !item.vendor_name?.toLowerCase().includes(vendorSearch.toLowerCase())) return false;
        if (dateSearch && item.date !== dateSearch) return false;
        if (projectSearch && !item.project?.toLowerCase().includes(projectSearch.toLowerCase())) return false;
        return true;
    });

    return (
        <div className={styles.container}>
            {loading && <LoadingOverlay message="Fetching records..." />}
            <div className={styles.topBar}>
                <h2 className={styles.pageTitle}>Payment & Invoice History</h2>
                <Link to="/"><Button variant="secondary">Home</Button></Link>
            </div>

            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>View Records</h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <button
                            onClick={fetchHistory}
                            className={styles.refreshBtn}
                            title="Refresh Data"
                        >
                            🔄
                        </button>
                        <select
                            className={styles.statusSelect}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            style={{
                                padding: '8px 12px',
                                minWidth: '150px',
                                height: '40px',
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                background: 'white',
                                fontWeight: 500
                            }}
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

                <div className={styles.toolBar}>
                    <div className={styles.filterGrid}>
                        <input
                            type="text"
                            placeholder="Search by vendor name..."
                            value={vendorSearch}
                            onChange={(e) => setVendorSearch(e.target.value)}
                            className={styles.filterInput}
                        />
                        <input
                            type="date"
                            placeholder="Filter by date"
                            value={dateSearch}
                            onChange={(e) => setDateSearch(e.target.value)}
                            className={styles.filterInput}
                        />
                        <input
                            type="text"
                            placeholder="Search by project/site..."
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
                                <th>WO / Invoice No</th>
                                <th>Project</th>
                                <th style={{ textAlign: 'right' }}>Total Amount</th>
                                <th style={{ textAlign: 'right' }}>Paid</th>
                                <th style={{ textAlign: 'right' }}>Remaining</th>
                                <th>Bill Status</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredHistory.map(item => (
                                <tr key={item.id}>
                                    <td>{item.date}</td>
                                    <td>
                                        <span className={`${styles.badge} ${item.type === 'invoice' ? styles.badgeInvoice : styles.badgePayment}`}>
                                            {item.type === 'invoice' ? 'INVOICE' : 'PAYMENT'}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{item.vendor_name}</td>
                                    <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{item.invoice_no || '-'}</td>
                                    <td>{item.project}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{item.amount?.toLocaleString('en-IN')}</td>
                                    <td style={{ textAlign: 'right', color: 'green', fontWeight: 600 }}>
                                        ₹{(item.status === 'Paid' ? item.amount : (item.paid_amount || 0)).toLocaleString('en-IN')}
                                    </td>
                                    <td style={{ textAlign: 'right', color: (item.remaining_amount > 0 ? 'red' : 'inherit'), fontWeight: 600 }}>
                                        ₹{(item.remaining_amount ?? (item.status === 'Paid' ? 0 : item.amount))?.toLocaleString('en-IN')}
                                    </td>
                                    <td>{item.bill_status || '-'}</td>
                                    <td>
                                        <div style={{ position: 'relative' }}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenStatusDropdown(openStatusDropdown === item.id ? null : item.id);
                                                }}
                                                className={`${styles.statusSelect} ${styles['status' + (item.status || 'Pending')]}`}
                                                style={{
                                                    width: '100%',
                                                    textAlign: 'left',
                                                    cursor: 'pointer',
                                                    padding: '6px 12px',
                                                    border: '1px solid #e2e8f0',
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    fontSize: '0.9rem'
                                                }}
                                            >
                                                <span>{item.status || 'Pending'}</span>
                                                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>▼</span>
                                            </button>

                                            {openStatusDropdown === item.id && (
                                                <>
                                                    <div
                                                        style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                                                        onClick={() => setOpenStatusDropdown(null)}
                                                    />
                                                    <div style={{
                                                        position: 'absolute',
                                                        top: 'calc(100% + 4px)',
                                                        left: 0,
                                                        zIndex: 50,
                                                        background: 'white',
                                                        border: '1px solid #e2e8f0',
                                                        borderRadius: '8px',
                                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                                        minWidth: '140px',
                                                        overflow: 'hidden',
                                                        padding: '4px'
                                                    }}>
                                                        {['Pending', 'Approved', 'Partial', 'Paid', 'Rejected'].map(statusOption => (
                                                            <button
                                                                key={statusOption}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    updateStatus(item.id, statusOption);
                                                                    setOpenStatusDropdown(null);
                                                                }}
                                                                style={{
                                                                    display: 'block',
                                                                    width: '100%',
                                                                    textAlign: 'left',
                                                                    padding: '8px 12px',
                                                                    background: item.status === statusOption ? '#f1f5f9' : 'transparent',
                                                                    border: 'none',
                                                                    borderRadius: '6px',
                                                                    cursor: 'pointer',
                                                                    fontSize: '0.9rem',
                                                                    color: '#334155',
                                                                    fontWeight: item.status === statusOption ? 600 : 400
                                                                }}
                                                                onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                                onMouseOut={(e) => e.currentTarget.style.background = item.status === statusOption ? '#f1f5f9' : 'transparent'}
                                                            >
                                                                {statusOption}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                        {item.paid_date && <div style={{ fontSize: '0.7rem', color: 'green', marginTop: '2px' }}>Paid: {item.paid_date}</div>}
                                    </td>
                                </tr>
                            ))}
                            {filteredHistory.length === 0 && (
                                <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No records found matching filter.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default HistoryPage;
