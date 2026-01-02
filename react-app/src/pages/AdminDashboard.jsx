import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui';
import styles from './AdminDashboard.module.css';

const AdminDashboard = () => {
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState(false);

    // Navigation State
    const [currentView, setCurrentView] = useState('history');

    // --- VENDORS STATE ---
    const [vendors, setVendors] = useState([]);
    // eslint-disable-next-line
    const [loadingVendors, setLoadingVendors] = useState(false);
    const [vendorModalOpen, setVendorModalOpen] = useState(false);
    const [editingVendorId, setEditingVendorId] = useState(null);
    const [vendorForm, setVendorForm] = useState({
        name: '', holderName: '', pan: '', phone: '', address: '', acc: '', bank: '', ifsc: ''
    });

    // --- HISTORY STATE ---
    const [history, setHistory] = useState([]);
    // eslint-disable-next-line
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [statusFilter, setStatusFilter] = useState('All');

    // --- AUTH ---
    const handleLogin = () => {
        if (password === 'boss207') {
            setIsAuthenticated(true);
            setAuthError(false);
        } else {
            setAuthError(true);
        }
    };

    // --- EFFECTS ---
    useEffect(() => {
        if (isAuthenticated) {
            if (currentView === 'vendors') fetchVendors();
            else fetchHistory();
        }
    }, [isAuthenticated, currentView]);

    // --- VENDOR ACTIONS ---
    const fetchVendors = async () => {
        setLoadingVendors(true);
        try {
            const { data, error } = await supabase.from('vendors').select('*').order('vendor_name', { ascending: true });
            if (error) throw error;
            setVendors(data || []);
        } catch (e) { alert(e.message); }
        finally { setLoadingVendors(false); }
    };

    const openVendorModal = (v = null) => {
        if (v) {
            setEditingVendorId(v.id);
            setVendorForm({
                name: v.vendor_name, holderName: v.account_holder, pan: v.pan_no, phone: v.phone,
                address: v.address, acc: v.account_number, bank: v.bank_name, ifsc: v.ifsc_code
            });
        } else {
            setEditingVendorId(null);
            setVendorForm({ name: '', holderName: '', pan: '', phone: '', address: '', acc: '', bank: '', ifsc: '' });
        }
        setVendorModalOpen(true);
    };

    const saveVendor = async () => {
        const payload = {
            vendor_name: vendorForm.name, account_holder: vendorForm.holderName, pan_no: vendorForm.pan,
            phone: vendorForm.phone, address: vendorForm.address, account_number: vendorForm.acc,
            bank_name: vendorForm.bank, ifsc_code: vendorForm.ifsc.toUpperCase()
        };
        try {
            if (editingVendorId) await supabase.from('vendors').update(payload).eq('id', editingVendorId);
            else await supabase.from('vendors').insert([payload]);
            setVendorModalOpen(false);
            fetchVendors();
        } catch (e) { alert(e.message); }
    };

    const deleteVendor = async (id) => {
        if (window.confirm('Delete this vendor?')) {
            await supabase.from('vendors').delete().eq('id', id);
            fetchVendors();
        }
    };

    // --- HISTORY ACTIONS ---
    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const { data, error } = await supabase.from('payment_history').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setHistory(data || []);
        } catch (e) {
            console.error(e);
        } finally { setLoadingHistory(false); }
    };

    const updateStatus = async (id, newStatus) => {
        try {
            const { error } = await supabase.from('payment_history').update({ status: newStatus }).eq('id', id);
            if (error) throw error;
            setHistory(history.map(h => h.id === id ? { ...h, status: newStatus } : h));
        } catch (e) { alert(e.message); }
    };

    const deleteHistory = async (id) => {
        if (window.confirm('Delete this record permanently?')) {
            try {
                await supabase.from('payment_history').delete().eq('id', id);
                setHistory(history.filter(h => h.id !== id));
            } catch (e) { alert(e.message); }
        }
    };

    // Filter Logic
    const filteredHistory = history.filter(item => {
        if (statusFilter === 'All') return true;
        return item.status === statusFilter;
    });

    const totalAmount = filteredHistory.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    // Clearance List (Only Paid)
    const clearanceList = history.filter(h => h.status === 'Paid');
    const clearanceTotal = clearanceList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);


    if (!isAuthenticated) {
        return (
            <div className={styles.authOverlay}>
                <div className={styles.loginCard}>
                    <h2 className={styles.loginTitle}>Admin Login</h2>
                    <Input type="password" placeholder="Enter Password" value={password}
                        onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
                    <div style={{ marginTop: '20px' }}>
                        <Button onClick={handleLogin} style={{ width: '100%' }}>Login</Button>
                    </div>
                    {authError && <p style={{ color: 'var(--danger)', marginTop: '10px' }}>Wrong Password!</p>}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Navbar */}
            <div className={styles.topBar}>
                <div className={styles.titleSection}>
                    <h2 className={styles.pageTitle}>Admin Dashboard</h2>
                    <div className={styles.navGroup}>
                        <button
                            className={`${styles.navButton} ${currentView === 'history' ? styles.navButtonActive : ''}`}
                            onClick={() => setCurrentView('history')}
                        >History</button>
                        <button
                            className={`${styles.navButton} ${currentView === 'clearance' ? styles.navButtonActive : ''}`}
                            onClick={() => setCurrentView('clearance')}
                        >Clearance List</button>
                        <button
                            className={`${styles.navButton} ${currentView === 'vendors' ? styles.navButtonActive : ''}`}
                            onClick={() => setCurrentView('vendors')}
                        >Vendors</button>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Link to="/"><Button variant="secondary">Home</Button></Link>
                </div>
            </div>

            <div className="px-6">
                {/* --- HISTORY VIEW --- */}
                {currentView === 'history' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Payment & Invoice History</h3>
                            <div className="flex gap-4 items-center">
                                <select
                                    className={styles.statusSelect}
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{ padding: '8px 12px', minWidth: '150px' }}
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                                <button className={styles.refreshBtn} onClick={fetchHistory}>Refresh Data</button>
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
                                        <th style={{ textAlign: 'right' }}>Amount</th>
                                        <th>Bill Status</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
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
                                            <td>{item.project}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{item.amount?.toLocaleString('en-IN')}</td>
                                            <td>{item.bill_status || '-'}</td>
                                            <td>
                                                <select
                                                    value={item.status || 'Pending'}
                                                    onChange={(e) => updateStatus(item.id, e.target.value)}
                                                    className={`${styles.statusSelect} ${styles['status' + (item.status || 'Pending')]}`}
                                                >
                                                    <option value="Pending">Pending</option>
                                                    <option value="Approved">Approved</option>
                                                    <option value="Paid">Paid</option>
                                                    <option value="Rejected">Rejected</option>
                                                </select>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <button onClick={() => deleteHistory(item.id)} className={styles.actionBtn}>🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredHistory.length === 0 && (
                                        <tr><td colSpan="8" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No records found matching filter.</td></tr>
                                    )}
                                </tbody>
                                {filteredHistory.length > 0 && (
                                    <tfoot style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold', padding: '15px' }}>Total Amount:</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary-dark)', padding: '15px' }}>
                                                ₹{totalAmount.toLocaleString('en-IN')}
                                            </td>
                                            <td colSpan="3"></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}

                {/* --- CLEARANCE LIST VIEW --- */}
                {currentView === 'clearance' && (
                    <div className={styles.card} style={{ borderColor: 'var(--accent)' }}>
                        <div className={styles.cardHeader} style={{ background: '#f0fdf4' }}>
                            <h3 className={styles.cardTitle} style={{ color: 'var(--accent)' }}>Clearance List (Paid Items)</h3>
                            <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                                Total Paid: ₹{clearanceTotal.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Vendor</th>
                                        <th>Details</th>
                                        <th style={{ textAlign: 'right' }}>Amount Paid</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clearanceList.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.date}</td>
                                            <td style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>{item.type?.replace('_', ' ')}</td>
                                            <td style={{ fontWeight: 600 }}>{item.vendor_name}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>
                                                {item.project} <br />
                                                <span style={{ fontSize: '0.8rem' }}>{item.invoice_no}</span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>₹{item.amount?.toLocaleString('en-IN')}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`${styles.badge} ${styles.badgePaid}`}>PAID</span>
                                            </td>
                                        </tr>
                                    ))}
                                    {clearanceList.length === 0 && (
                                        <tr><td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No paid items in clearance list yet.</td></tr>
                                    )}
                                </tbody>
                                {clearanceList.length > 0 && (
                                    <tfoot style={{ background: '#f0fdf4', borderTop: '2px solid #bbf7d0' }}>
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold', padding: '15px', color: '#166534' }}>Total Clearance Amount:</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: '#15803d', padding: '15px' }}>
                                                ₹{clearanceTotal.toLocaleString('en-IN')}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}

                {/* --- VENDORS VIEW --- */}
                {currentView === 'vendors' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Manage Vendors</h3>
                            <Button onClick={() => openVendorModal()}>+ Add Vendor</Button>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Bank</th>
                                        <th>Account</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {vendors.map(v => (
                                        <tr key={v.id}>
                                            <td style={{ fontWeight: 500 }}>{v.vendor_name}</td>
                                            <td>{v.bank_name}</td>
                                            <td style={{ fontFamily: 'monospace' }}>{v.account_number}</td>
                                            <td>
                                                <div className={styles.actions}>
                                                    <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => openVendorModal(v)}>Edit</Button>
                                                    <Button variant="danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => deleteVendor(v.id)}>Del</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* Vendor Modal */}
            {vendorModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3 className={styles.modalTitle}>{editingVendorId ? 'Edit Vendor' : 'Add Vendor'}</h3>
                        <div className="flex flex-col gap-3">
                            <Input placeholder="Vendor Name" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} />
                            <Input placeholder="Account Holder Name" value={vendorForm.holderName} onChange={e => setVendorForm({ ...vendorForm, holderName: e.target.value })} />
                            <div className={styles.formGrid}>
                                <Input placeholder="PAN Number" value={vendorForm.pan} onChange={e => setVendorForm({ ...vendorForm, pan: e.target.value })} />
                                <Input placeholder="Phone Number" value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} />
                            </div>
                            <Input placeholder="Address" value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })} />
                            <Input placeholder="Account Number" value={vendorForm.acc} onChange={e => setVendorForm({ ...vendorForm, acc: e.target.value })} />
                            <div className={styles.formGrid}>
                                <Input placeholder="Bank Name" value={vendorForm.bank} onChange={e => setVendorForm({ ...vendorForm, bank: e.target.value })} />
                                <Input placeholder="IFSC Code" value={vendorForm.ifsc} onChange={e => setVendorForm({ ...vendorForm, ifsc: e.target.value })} />
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <Button variant="secondary" onClick={() => setVendorModalOpen(false)}>Cancel</Button>
                            <Button onClick={saveVendor}>Save Vendor</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDashboard;
