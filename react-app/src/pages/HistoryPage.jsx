import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';
import { LoadingOverlay, Pagination } from '../components/ui';
import styles from './HistoryPage.module.css';
import TemplateModal from '../components/TemplateModal';
import { useMessage } from '../context/MessageContext';
import { formatDate } from '../utils';

const HistoryPage = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('All');
    const [openStatusDropdown, setOpenStatusDropdown] = useState(null);
    const [vendorSearch, setVendorSearch] = useState('');
    const [dateSearch, setDateSearch] = useState('');
    const [projectSearch, setProjectSearch] = useState('');
    const [viewItem, setViewItem] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const ROWS_PER_PAGE = 10;
    const { alert, confirm, prompt, toast } = useMessage();
    
    // Modal State for Moving to Advances
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [moveData, setMoveData] = useState({ splits: [], mode: 'M1', item: null });
    const [existingAdvances, setExistingAdvances] = useState([]);
    const [savingMove, setSavingMove] = useState(false);

    useEffect(() => {
        fetchHistory();
    }, []);

    // Reset pagination when any filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [statusFilter, vendorSearch, dateSearch, projectSearch]);

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

    const openMoveModal = async (item) => {
        const workOrderNo = item.wo_no || item.invoice_no;
        if (!workOrderNo) {
            await alert("No Work Order Number associated with this record.");
            return;
        }

        let initialSplits = Array.isArray(item.payment_splits) && item.payment_splits.length > 0 ? [...item.payment_splits] : [];
        if (initialSplits.length === 0) {
            initialSplits = [{ amount: item.amount, date: item.paid_date || item.date || new Date().toISOString().split('T')[0] }];
        }

        setMoveData({
            item: item,
            date: item.paid_date || new Date().toISOString().split('T')[0],
            mode: 'M1',
            splits: initialSplits
        });

        // Fetch existing advances for reference
        try {
            const { data: woData } = await supabase.from('work_orders').select('id').eq('wo_no', workOrderNo).single();
            if (woData) {
                const { data: advData } = await supabase.from('advances').select('*').eq('work_order_id', woData.id).order('date', { ascending: false });
                setExistingAdvances(advData || []);
            } else {
                setExistingAdvances([]);
            }
        } catch (e) {
            console.error("Error fetching existing advances", e);
        }

        setShowMoveModal(true);
    };

    const confirmMoveToAdvances = async () => {
        const { item, mode, splits } = moveData;
        const workOrderNo = item.wo_no || item.invoice_no;

        const totalToMove = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
        if (totalToMove > (parseFloat(item.amount) + 0.01)) {
            if (!await confirm(`Total split amount (₹${totalToMove.toLocaleString('en-IN')}) exceeds record amount (₹${parseFloat(item.amount).toLocaleString('en-IN')}). Proceed?`)) return;
        }

        setSavingMove(true);
        try {
            const { data: woData, error: woError } = await supabase
                .from('work_orders')
                .select('id')
                .eq('wo_no', workOrderNo)
                .single();

            if (woError || !woData) {
                await alert(`Work Order Number "${workOrderNo}" not registered! Cannot move to advances.`);
                setSavingMove(false);
                return;
            }

            const advancesToInsert = splits.map(split => ({
                work_order_id: woData.id,
                amount: parseFloat(split.amount),
                date: split.date,
                payment_mode: mode
            }));

            const { error: advError } = await supabase.from('advances').insert(advancesToInsert);
            if (advError) throw advError;

            const { error: histUpdateErr } = await supabase.from('payment_history').update({ is_moved: true }).eq('id', item.id);
            if (!histUpdateErr) {
                setHistory(history.map(h => h.id === item.id ? { ...h, is_moved: true } : h));
            }
            toast(`Successfully moved ${splits.length} split(s) directly to Advances!`);
            setShowMoveModal(false);
        } catch (e) {
            console.error(e);
            await alert("Error moving to advances: " + e.message);
        } finally {
            setSavingMove(false);
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
                const choice = await confirm(`Remaining balance: ₹${remaining.toLocaleString('en-IN')}.\n\nClick OK for FULL payment (Record remaining ₹${remaining.toLocaleString('en-IN')} and mark as Paid)\nClick CANCEL for PARTIAL payment (Record a custom amount and keep as Partial)`);

                if (choice) {
                    // Full payment
                    const dateStr = await prompt("Enter Final Payment Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
                    if (!dateStr) return; // Cancelled

                    const finalSplit = { amount: remaining, date: dateStr };
                    payload.payment_splits = [...splits, finalSplit];
                    payload.paid_amount = totalAmount;
                    payload.remaining_amount = 0;
                    payload.paid_date = dateStr;
                    payload.status = 'Paid';
                } else {
                    // Another partial payment
                    const amountInput = await prompt(`Current Balance: ₹${remaining.toLocaleString('en-IN')}\nEnter additional amount paid now (must be LESS than ₹${remaining.toLocaleString('en-IN')}):`);
                    if (amountInput === null) return; // Cancelled

                    const additionalPaid = parseFloat(amountInput) || 0;
                    if (additionalPaid <= 0 || additionalPaid >= remaining) {
                        await alert(`Please enter a valid amount strictly less than ₹${remaining.toLocaleString('en-IN')}. For full settlement, use the Full payment option.`);
                        return;
                    }

                    const dateStr = await prompt("Enter Payment Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
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
                await alert("This record is already fully paid. Please change status to 'Paid'.");
                return;
            }

            const amountInput = await prompt(`Total Amount: ₹${totalAmount.toLocaleString('en-IN')}\nRemaining: ₹${remaining.toLocaleString('en-IN')}\nEnter additional amount paid now (less than ₹${remaining.toLocaleString('en-IN')}):`);
            if (amountInput === null) return; // Cancelled

            const additionalPaid = parseFloat(amountInput) || 0;
            if (additionalPaid <= 0 || additionalPaid >= remaining) {
                await alert(`Please enter a valid amount strictly less than the remaining ₹${remaining.toLocaleString('en-IN')}. For full settlement, set status to 'Paid'.`);
                return;
            }

            const dateStr = await prompt("Enter Payment Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
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
            toast('Status Updated Successfully!');
            
            if (payload.status === 'Paid' && !item.is_moved) {
                openMoveModal({ ...item, ...payload });
            }
        } catch (e) { await alert(e.message); }
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

    const totalPages = Math.ceil(filteredHistory.length / ROWS_PER_PAGE);
    const paginatedHistory = filteredHistory.slice(
        (currentPage - 1) * ROWS_PER_PAGE,
        currentPage * ROWS_PER_PAGE
    );

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
                            <option value="Accounts">Accounts</option>
                            <option value="Hold">Hold</option>
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
                                <th>Project</th>
                                <th style={{ textAlign: 'right' }}>Total Amount</th>
                                <th style={{ textAlign: 'right' }}>Paid</th>
                                <th style={{ textAlign: 'right' }}>Remaining</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedHistory.map(item => (
                                <tr key={item.id}>
                                    <td>{formatDate(item.date)}</td>
                                    <td>
                                        <span className={`${styles.badge} ${item.type === 'invoice' ? styles.badgeInvoice : styles.badgePayment}`}>
                                            {item.type === 'invoice' ? 'INVOICE' : 'PAYMENT'}
                                        </span>
                                    </td>
                                    <td style={{ fontWeight: 500 }}>{item.vendor_name}</td>
                                    <td>{item.project}</td>
                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{item.amount?.toLocaleString('en-IN')}</td>
                                    <td style={{ textAlign: 'right', color: 'green', fontWeight: 600 }}>
                                        ₹{(item.status === 'Paid' ? item.amount : (item.paid_amount || 0)).toLocaleString('en-IN')}
                                    </td>
                                    <td style={{ textAlign: 'right', color: (item.remaining_amount > 0 ? 'red' : 'inherit'), fontWeight: 600 }}>
                                        ₹{(item.remaining_amount ?? (item.status === 'Paid' ? 0 : item.amount))?.toLocaleString('en-IN')}
                                    </td>

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
                                                        {['Pending', 'Approved', 'Partial', 'Paid', 'Rejected', 'Accounts', 'Hold'].map(statusOption => (
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
                                        {item.paid_date && <div style={{ fontSize: '0.7rem', color: 'green', marginTop: '2px' }}>Paid: {formatDate(item.paid_date)}</div>}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <Button
                                            variant="secondary"
                                            style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                                            onClick={() => setViewItem(item)}
                                        >
                                            View
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {filteredHistory.length === 0 && (
                                <tr><td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>No records found matching filter.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination 
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                />
            </div>
            {viewItem && (
                <TemplateModal
                    record={viewItem}
                    onClose={() => setViewItem(null)}
                />
            )}

            {/* Move to Advances Modal */}
            {showMoveModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0f172a', marginBottom: '16px' }}>Move to Work Order Advances</h3>
                        
                        <div style={{ padding: '12px', background: '#f8fafc', borderRadius: '8px', marginBottom: '20px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Work Order:</span>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{moveData.item?.wo_no || moveData.item?.invoice_no}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Record Amount:</span>
                                <span style={{ fontWeight: 600, color: '#059669' }}>₹{parseFloat(moveData.item?.amount || 0).toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        {existingAdvances.length > 0 && (
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>Existing History for this WO:</label>
                                <div style={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', maxHeight: '120px', overflowY: 'auto', padding: '8px' }}>
                                    {existingAdvances.map(adv => (
                                        <div key={adv.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9', fontSize: '0.85rem' }}>
                                            <span style={{ color: '#64748b' }}>{formatDate(adv.date)}</span>
                                            <span style={{ fontWeight: 500 }}>₹{parseFloat(adv.amount).toLocaleString('en-IN')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>Payment Mode (Applied to all splits)</label>
                            <select
                                value={moveData.mode}
                                onChange={e => setMoveData({ ...moveData, mode: e.target.value })}
                                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', background: 'white' }}
                            >
                                <option value="M1">M1</option>
                                <option value="M2">M2</option>
                                <option value="M3">M3</option>
                                <option value="M4">M4</option>
                                <option value="M5">M5</option>
                            </select>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, fontSize: '0.9rem', color: '#475569' }}>Payment Splits to Move</label>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {moveData.splits.map((split, index) => (
                                    <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: '#f8fafc', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Amount (₹)</span>
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={split.amount}
                                                onChange={e => {
                                                    const newSplits = [...moveData.splits];
                                                    newSplits[index] = { ...newSplits[index], amount: e.target.value };
                                                    setMoveData({ ...moveData, splits: newSplits });
                                                }}
                                                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
                                            />
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Date</span>
                                            <input
                                                type="date"
                                                value={split.date}
                                                onChange={e => {
                                                    const newSplits = [...moveData.splits];
                                                    newSplits[index] = { ...newSplits[index], date: e.target.value };
                                                    setMoveData({ ...moveData, splits: newSplits });
                                                }}
                                                style={{ width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div style={{ marginTop: '12px', textAlign: 'right', fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                                Total Moving: ₹{moveData.splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0).toLocaleString('en-IN')}
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <Button variant="secondary" onClick={() => setShowMoveModal(false)}>Cancel</Button>
                            <Button variant="primary" onClick={confirmMoveToAdvances} disabled={savingMove}>
                                {savingMove ? 'Moving...' : 'Confirm Move'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HistoryPage;
