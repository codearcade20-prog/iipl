import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { 
    ShieldCheck, 
    FileText, 
    CheckCircle2, 
    XCircle, 
    Eye, 
    Clock, 
    DollarSign, 
    User, 
    MapPin, 
    ArrowLeft,
    Filter,
    Signature,
    History, // Added History icon
    Search // Added Search icon as per snippet
} from 'lucide-react';
import { useMessage } from '../context/MessageContext';
import LoadingScreen from '../components/LoadingScreen';
import styles from './MDDashboard.module.css';

const MDDashboard = () => {
    const navigate = useNavigate();
    const { alert, confirm, prompt, toast } = useMessage();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('Pending');
    const [mdSignatureUrl, setMdSignatureUrl] = useState('');
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [detailItems, setDetailItems] = useState([]);
    const [detailLoading, setDetailLoading] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        fetchData();
        fetchMdSignature();
    }, [statusFilter]);

    const openDetails = async (entry) => {
        setSelectedEntry(entry);
        setIsDetailOpen(true);
        setDetailLoading(true);
        try {
            const { data, error } = await supabase
                .from('petty_cash_items')
                .select('*')
                .eq('entry_id', entry.id);
            if (error) throw error;
            setDetailItems(data || []);
        } catch (error) {
            console.error("Error fetching items:", error);
            toast("Failed to load voucher details", "Error");
        } finally {
            setDetailLoading(false);
        }
    };

    const closeDetails = () => {
        setIsDetailOpen(false);
        setSelectedEntry(null);
        setDetailItems([]);
    };

    const fetchMdSignature = async () => {
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('setting_value')
                .eq('setting_key', 'md_signature_url')
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            if (data) setMdSignatureUrl(data.setting_value);
        } catch (e) {
            console.error('Error fetching MD signature:', e);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('petty_cash_entries')
                .select(`
                    *,
                    petty_cash_persons(*)
                `)
                .order('created_at', { ascending: false });

            if (statusFilter !== 'All') {
                if (statusFilter === 'Approved') {
                    // Include both 'Approved' and 'Paid' in the Approved History filter
                    query = query.in('status', ['Approved', 'Paid']);
                } else {
                    query = query.eq('status', statusFilter);
                }
            }

            const { data, error } = await query;
            if (error) throw error;
            setEntries(data || []);
        } catch (error) {
            console.error("Error fetching requests:", error);
            alert("Failed to load requests.");
        } finally {
            setLoading(false);
        }
    };

    const handleApproval = async (entry, mode) => {
        if (!mdSignatureUrl) {
            alert("No MD signature found in settings. Please upload it in Admin Controls.");
            return;
        }

        let approvedAmount = entry.total_amount;

        if (mode === 'partial') {
            const amountInput = await prompt(
                `Requested Amount: ₹${entry.total_amount.toLocaleString('en-IN')}\nEnter approved amount:`,
                entry.total_amount.toString()
            );
            
            if (amountInput === null) return;
            
            approvedAmount = parseFloat(amountInput);
            if (isNaN(approvedAmount) || approvedAmount < 0) {
                alert("Please enter a valid amount.");
                return;
            }
            if (approvedAmount > entry.total_amount) {
                const proceed = await confirm(`Approved amount (₹${approvedAmount}) is more than requested (₹${entry.total_amount}). Proceed?`);
                if (!proceed) return;
            }
        } else {
            const proceed = await confirm(`Approve full amount of ₹${entry.total_amount.toLocaleString('en-IN')}?`);
            if (!proceed) return;
        }

        const remarksInput = await prompt("Remarks (Optional):", "");
        
        try {
            const { error } = await supabase
                .from('petty_cash_entries')
                .update({
                    status: 'Approved',
                    approved_amount: approvedAmount,
                    md_approval: true,
                    md_signature: mdSignatureUrl,
                    md_approved_at: new Date().toISOString(),
                    md_remarks: remarksInput || ''
                })
                .eq('id', entry.id);

            if (error) throw error;
            
            toast(`Voucher #${entry.voucher_no} approved successfully!`);
            fetchData();
            if (isDetailOpen) closeDetails();
        } catch (error) {
            console.error("Approval error:", error);
            alert("Approval failed: " + error.message);
        }
    };

    const handleReject = async (entry) => {
        const proceed = await confirm(`Are you sure you want to reject voucher #${entry.voucher_no}?`);
        if (!proceed) return;

        const remarksInput = await prompt("Reason for rejection:", "");
        if (remarksInput === null) return;

        try {
            const { error } = await supabase
                .from('petty_cash_entries')
                .update({
                    status: 'Rejected',
                    md_approval: false,
                    md_approved_at: new Date().toISOString(),
                    md_remarks: remarksInput
                })
                .eq('id', entry.id);

            if (error) throw error;
            
            toast(`Voucher #${entry.voucher_no} rejected.`);
            fetchData();
            if (isDetailOpen) closeDetails();
        } catch (error) {
            alert("Update failed: " + error.message);
        }
    };

    if (loading) return <LoadingScreen message="Fetching payment requests..." />;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerTitle}>
                    <button className={styles.backBtn} onClick={() => navigate('/')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1>Petty Cash Approval</h1>
                        <p>Review and approve pending petty cash requests</p>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button 
                        className={styles.historyBtn}
                        onClick={() => navigate('/md-dashboard/history')}
                        title="View Update History"
                    >
                        <History size={18} />
                        <span>History Tracker</span>
                    </button>
                    <div className={styles.signatureBadge}>
                        <CheckCircle2 size={16} />
                        <span>MD AUTHORIZED</span>
                    </div>
                </div>
            </header>

            <div className={styles.filterBar}>
                <div className={styles.filterGroup}>
                    <Filter size={16} />
                    <select 
                        value={statusFilter} 
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={styles.select}
                    >
                        <option value="Pending">Pending Requests</option>
                        <option value="Approved">Approved History</option>
                        <option value="Rejected">Rejected History</option>
                        <option value="All">All Requests</option>
                    </select>
                </div>
                <div className={styles.stats}>
                    Showing {entries.length} requests
                </div>
            </div>

            <div className={styles.grid}>
                {loading ? (
                    Array(3).fill(0).map((_, i) => <div key={i} className={styles.skeleton}></div>)
                ) : entries.length === 0 ? (
                    <div className={styles.emptyState}>
                        <Clock size={48} />
                        <p>No {statusFilter.toLowerCase()} requests found.</p>
                    </div>
                ) : (
                    entries.map((entry) => (
                        <div key={entry.id} className={styles.entryCard}>
                            <div className={styles.cardHeader}>
                                <span className={styles.voucherNo}>#{entry.voucher_no}</span>
                                <span className={`${styles.status} ${styles[entry.status.toLowerCase()]}`}>
                                    {entry.status}
                                </span>
                            </div>
                            
                            <div className={styles.cardBody}>
                                <div className={styles.infoRow}>
                                    <User size={14} />
                                    <span>{entry.request_person}</span>
                                    <span className={styles.personType}>({entry.petty_cash_persons?.person_type})</span>
                                </div>
                                <div className={styles.infoRow}>
                                    <MapPin size={14} />
                                    <span>{entry.site_name}</span>
                                </div>
                                <div className={styles.amountBox}>
                                    <div className={styles.requested}>
                                        <label>Requested</label>
                                        <span>₹{parseFloat(entry.total_amount).toLocaleString('en-IN')}</span>
                                    </div>
                                    {entry.approved_amount && (
                                        <div className={styles.approved}>
                                            <label>Approved</label>
                                            <span>₹{parseFloat(entry.approved_amount).toLocaleString('en-IN')}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className={styles.cardFooter}>
                                <button 
                                    className={styles.viewBtn}
                                    onClick={() => openDetails(entry)}
                                >
                                    <Eye size={16} /> Details
                                </button>
                                {entry.status === 'Pending' && (
                                    <div className={styles.actionGroup}>
                                        <button 
                                            className={styles.approveBtn}
                                            onClick={() => handleApproval(entry, 'full')}
                                        >
                                            <CheckCircle2 size={16} /> Full
                                        </button>
                                        <button 
                                            className={styles.partialBtn}
                                            onClick={() => handleApproval(entry, 'partial')}
                                        >
                                            <DollarSign size={16} /> Partial
                                        </button>
                                        <button 
                                            className={styles.rejectBtn}
                                            onClick={() => handleReject(entry)}
                                        >
                                            <XCircle size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Detail Overlay Modal */}
            {isDetailOpen && selectedEntry && (
                <div className={styles.modalOverlay}>
                    <div className={styles.detailModal}>
                        <div className={styles.modalHeader}>
                            <button className={styles.closeBtn} onClick={closeDetails}>
                                <ArrowLeft size={18} /> Back to Dashboard
                            </button>
                            <span className={styles.modalVoucherId}>#{selectedEntry.voucher_no}</span>
                        </div>

                        {detailLoading ? (
                            <LoadingScreen message="Loading voucher details..." />
                        ) : (
                            <div className={styles.voucherContainer}>
                                <div className={styles.voucherInternal}>
                                    <div className={styles.voucherHeader}>
                                        <div className={styles.companyInfo}>
                                            <h2>INNOVATIVE INTERIORS</h2>
                                            <p>Petty Cash Voucher</p>
                                        </div>
                                        <div className={styles.statusBox}>
                                            <span className={`${styles.statusLabel} ${styles[selectedEntry.status.toLowerCase()]}`}>
                                                {selectedEntry.status}
                                            </span>
                                            <p className={styles.voucherDate}>{new Date(selectedEntry.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div className={styles.voucherDetailsGrid}>
                                        <div className={styles.detailItem}>
                                            <label>Requester</label>
                                            <p>{selectedEntry.request_person} ({selectedEntry.petty_cash_persons?.person_type})</p>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <label>Site / Project</label>
                                            <p>{selectedEntry.site_name}</p>
                                        </div>
                                        <div className={styles.detailItem}>
                                            <label>Entry Type</label>
                                            <p>{selectedEntry.entry_type}</p>
                                        </div>
                                    </div>

                                    <table className={styles.itemTable}>
                                        <thead>
                                            <tr>
                                                <th>Category</th>
                                                <th>Remarks / Description</th>
                                                <th align="right">Amount (₹)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {detailItems.map(item => (
                                                <tr key={item.id}>
                                                    <td>{item.category}</td>
                                                    <td className={styles.remarksCell}>{item.remarks || '---'}</td>
                                                    <td align="right">{parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan="2" align="right">RECORDED TOTAL</td>
                                                <td align="right">₹{parseFloat(selectedEntry.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                            {selectedEntry.approved_amount && selectedEntry.approved_amount !== selectedEntry.total_amount && (
                                                <tr className={styles.approvedRow}>
                                                    <td colSpan="2" align="right">MD APPROVED AMOUNT</td>
                                                    <td align="right">₹{parseFloat(selectedEntry.approved_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            )}
                                        </tfoot>
                                    </table>

                                    {selectedEntry.md_remarks && (
                                        <div className={styles.mdNote}>
                                            <label>MD Remarks:</label>
                                            <p>{selectedEntry.md_remarks}</p>
                                        </div>
                                    )}

                                    <div className={styles.voucherFooter}>
                                        <div className={styles.footerCol}>
                                            <div className={styles.sigLine}></div>
                                            <p>Prepared By</p>
                                        </div>
                                        <div className={styles.footerCol}>
                                            {selectedEntry.md_signature && (
                                                <img src={selectedEntry.md_signature} alt="MD Signature" className={styles.footerSig} />
                                            )}
                                            <div className={styles.sigLine}></div>
                                            <p>Managing Director</p>
                                        </div>
                                    </div>
                                </div>

                                {selectedEntry.status === 'Pending' && (
                                    <div className={styles.modalActionsSticky}>
                                        <button className={styles.approveBtn} onClick={() => handleApproval(selectedEntry, 'full')}>
                                            Approve Full (₹{parseFloat(selectedEntry.total_amount).toLocaleString()})
                                        </button>
                                        <button className={styles.partialBtn} onClick={() => handleApproval(selectedEntry, 'partial')}>
                                            Partial Approval
                                        </button>
                                        <button className={styles.rejectBtn} onClick={() => handleReject(selectedEntry)}>
                                            Reject Request
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MDDashboard;
