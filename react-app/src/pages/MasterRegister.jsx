import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useMessage } from '../context/MessageContext';
import { Button } from '../components/ui/Button';
import { LoadingOverlay } from '../components/ui';
import { Building2, Users, Search, ArrowLeft, Plus, Pencil, Trash2, Home, X, Printer, Share2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './AdminDashboard.module.css';

const MasterRegister = () => {
    const { user } = useAuth();
    const { alert, confirm, prompt, toast } = useMessage();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [currentView, setCurrentView] = useState('sites'); // 'sites' or 'vendors'

    // Sites Data
    const [sites, setSites] = useState([]);
    const [siteNameSearch, setSiteNameSearch] = useState('');
    const [siteModalOpen, setSiteModalOpen] = useState(false);
    const [editingSiteId, setEditingSiteId] = useState(null);
    const [siteForm, setSiteForm] = useState({ name: '', location: '', client: '' });

    // Vendors Data
    const [vendors, setVendors] = useState([]);
    const [vendorNameSearch, setVendorNameSearch] = useState('');
    const [vendorModalOpen, setVendorModalOpen] = useState(false);
    const [editingVendorId, setEditingVendorId] = useState(null);
    const [vendorForm, setVendorForm] = useState({
        name: '', holderName: '', pan: '', phone: '', address: '', acc: '', bank: '', ifsc: '', vendorType: 'both',
        vendorCompany: '', aadhaar: '', gst: '', bankBranch: ''
    });

    useEffect(() => {
        fetchSites();
        fetchVendors();
    }, []);

    const fetchSites = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('sites').select('*').order('name');
            if (error) throw error;
            setSites(data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchVendors = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('vendors').select('*').order('vendor_name');
            if (error) throw error;
            setVendors(data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    // --- SITES ACTIONS ---
    const openSiteModal = (s = null) => {
        if (s) {
            setEditingSiteId(s.id);
            setSiteForm({ name: s.name, location: s.location || '', client: s.client || '' });
        } else {
            setEditingSiteId(null);
            setSiteForm({ name: '', location: '', client: '' });
        }
        setSiteModalOpen(true);
    };

    const saveSite = async () => {
        if (!siteForm.name.trim()) return await alert("Site name is required.");
        setLoading(true);
        try {
            const payload = { name: siteForm.name.trim(), location: siteForm.location, client: siteForm.client };
            let error;
            if (editingSiteId) {
                const { error: err } = await supabase.from('sites').update(payload).eq('id', editingSiteId);
                error = err;
            } else {
                const { error: err } = await supabase.from('sites').insert([payload]);
                error = err;
            }
            if (error) throw error;
            toast(editingSiteId ? "Site updated!" : "Site added!");
            setSiteModalOpen(false);
            fetchSites();
        } catch (e) { await alert(e.message); }
        finally { setLoading(false); }
    };

    const deleteSite = async (id) => {
        const pwd = await prompt("Enter Admin Password to Delete Site:");
        if (pwd === null) return;
        if (pwd !== user?.password) return await alert("Incorrect Admin Password!");
        
        if (await confirm("Delete this site?")) {
            setLoading(true);
            try {
                const { error } = await supabase.from('sites').delete().eq('id', id);
                if (error) throw error;
                toast("Site deleted.");
                fetchSites();
            } catch (e) { await alert(e.message); }
            finally { setLoading(false); }
        }
    };

    // --- VENDORS ACTIONS ---
    const openVendorModal = (v = null) => {
        if (v) {
            setEditingVendorId(v.id);
            setVendorForm({
                name: v.vendor_name, holderName: v.account_holder, pan: v.pan_no, phone: v.phone,
                address: v.address, acc: v.account_number, bank: v.bank_name, ifsc: v.ifsc_code,
                vendorType: v.vendor_type || 'both',
                vendorCompany: v.vendor_company || '',
                aadhaar: v.aadhaar_no || '',
                gst: v.gst_no || '',
                bankBranch: v.bank_branch || ''
            });
        } else {
            setEditingVendorId(null);
            setVendorForm({
                name: '', holderName: '', pan: '', phone: '', address: '', acc: '', bank: '', ifsc: '', vendorType: 'both',
                vendorCompany: '', aadhaar: '', gst: '', bankBranch: ''
            });
        }
        setVendorModalOpen(true);
    };

    const saveVendor = async () => {
        if (!vendorForm.name.trim()) return await alert("Vendor name is required.");
        setLoading(true);
        try {
            const payload = {
                vendor_name: vendorForm.name.trim(), account_holder: vendorForm.holderName, pan_no: vendorForm.pan,
                phone: vendorForm.phone, address: vendorForm.address, account_number: vendorForm.acc,
                bank_name: vendorForm.bank, ifsc_code: vendorForm.ifsc.toUpperCase(),
                vendor_type: vendorForm.vendorType,
                vendor_company: vendorForm.vendorCompany,
                aadhaar_no: vendorForm.aadhaar,
                gst_no: vendorForm.gst,
                bank_branch: vendorForm.bankBranch
            };
            let error;
            if (editingVendorId) {
                const { error: err } = await supabase.from('vendors').update(payload).eq('id', editingVendorId);
                error = err;
            } else {
                const { error: err } = await supabase.from('vendors').insert([payload]);
                error = err;
            }
            if (error) throw error;
            toast(editingVendorId ? "Vendor updated!" : "Vendor added!");
            setVendorModalOpen(false);
            fetchVendors();
        } catch (e) { await alert(e.message); }
        finally { setLoading(false); }
    };

    const deleteVendor = async (id) => {
        const pwd = await prompt("Enter Admin Password to Delete Vendor:");
        if (pwd === null) return;
        if (pwd !== user?.password) return await alert("Incorrect Admin Password!");

        if (await confirm("Delete this vendor?")) {
            setLoading(true);
            try {
                const { error } = await supabase.from('vendors').delete().eq('id', id);
                if (error) throw error;
                toast("Vendor deleted.");
                fetchVendors();
            } catch (e) { await alert(e.message); }
            finally { setLoading(false); }
        }
    };

    const filteredSites = sites.filter(s => 
        s.name.toLowerCase().includes(siteNameSearch.toLowerCase()) ||
        (s.location || '').toLowerCase().includes(siteNameSearch.toLowerCase())
    );

    const filteredVendors = vendors.filter(v => 
        v.vendor_name.toLowerCase().includes(vendorNameSearch.toLowerCase()) ||
        (v.vendor_company || '').toLowerCase().includes(vendorNameSearch.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link to="/" className={styles.backBtn}><ArrowLeft size={20} /> Back</Link>
                    <h1 className={styles.title}>Master Registration Hub</h1>
                </div>
                <nav className={styles.nav}>
                    <button className={`${styles.navBtn} ${currentView === 'sites' ? styles.active : ''}`} onClick={() => setCurrentView('sites')}>Sites</button>
                    <button className={`${styles.navBtn} ${currentView === 'vendors' ? styles.active : ''}`} onClick={() => setCurrentView('vendors')}>Vendors</button>
                </nav>
            </header>

            <main className={styles.content}>
                {currentView === 'sites' ? (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Manage Project Sites</h3>
                            <Button onClick={() => openSiteModal()}>+ Add New Site</Button>
                        </div>
                        <div className={styles.searchSection}>
                            <input
                                type="text"
                                placeholder="Search sites..."
                                value={siteNameSearch}
                                onChange={(e) => setSiteNameSearch(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Site Name</th>
                                        <th>Location</th>
                                        <th>Client</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSites.map(s => (
                                        <tr key={s.id}>
                                            <td style={{ fontWeight: 600 }}>{s.name}</td>
                                            <td>{s.location || '-'}</td>
                                            <td>{s.client || '-'}</td>
                                            <td>
                                                <div className={styles.actions}>
                                                    <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => openSiteModal(s)}>Edit</Button>
                                                    <Button variant="danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => deleteSite(s.id)}>Del</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Manage Vendors</h3>
                            <Button onClick={() => openVendorModal()}>+ Add Vendor</Button>
                        </div>
                        <div className={styles.searchSection}>
                            <input
                                type="text"
                                placeholder="Search vendors..."
                                value={vendorNameSearch}
                                onChange={(e) => setVendorNameSearch(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Bank</th>
                                        <th>Account</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVendors.map(v => (
                                        <tr key={v.id}>
                                            <td style={{ fontWeight: 600 }}>{v.vendor_name}</td>
                                            <td>
                                                <span className={`${styles.badge} ${v.vendor_type === 'payment_request' ? styles.badgePayment : v.vendor_type === 'invoice' ? styles.badgeInvoice : styles.badgeBoth}`}>
                                                    {v.vendor_type === 'payment_request' ? 'Payment' : v.vendor_type === 'invoice' ? 'Invoice' : 'Both'}
                                                </span>
                                            </td>
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
            </main>

            {/* Site Modal */}
            {siteModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h3>{editingSiteId ? 'Edit Site' : 'Add New Site'}</h3>
                            <button onClick={() => setSiteModalOpen(false)} className={styles.closeBtn}><X /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label>Site Name</label>
                                <input type="text" value={siteForm.name} onChange={e => setSiteForm({ ...siteForm, name: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Location</label>
                                <input type="text" value={siteForm.location} onChange={e => setSiteForm({ ...siteForm, location: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <label>Client</label>
                                <input type="text" value={siteForm.client} onChange={e => setSiteForm({ ...siteForm, client: e.target.value })} />
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <Button variant="secondary" onClick={() => setSiteModalOpen(false)}>Cancel</Button>
                            <Button onClick={saveSite}>Save Record</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Vendor Modal */}
            {vendorModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal} style={{ maxWidth: '800px' }}>
                        <div className={styles.modalHeader}>
                            <h3>{editingVendorId ? 'Edit Vendor' : 'Add New Vendor'}</h3>
                            <button onClick={() => setVendorModalOpen(false)} className={styles.closeBtn}><X /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                <div className={styles.formGroup}>
                                    <label>Vendor Name</label>
                                    <input type="text" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Vendor Type</label>
                                    <select value={vendorForm.vendorType} onChange={e => setVendorForm({ ...vendorForm, vendorType: e.target.value })}>
                                        <option value="both">Both</option>
                                        <option value="payment_request">Payment Only</option>
                                        <option value="invoice">Invoice Only</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Account Holder</label>
                                    <input type="text" value={vendorForm.holderName} onChange={e => setVendorForm({ ...vendorForm, holderName: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Bank Name</label>
                                    <input type="text" value={vendorForm.bank} onChange={e => setVendorForm({ ...vendorForm, bank: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Account Number</label>
                                    <input type="text" value={vendorForm.acc} onChange={e => setVendorForm({ ...vendorForm, acc: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>IFSC Code</label>
                                    <input type="text" value={vendorForm.ifsc} onChange={e => setVendorForm({ ...vendorForm, ifsc: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>PAN Number</label>
                                    <input type="text" value={vendorForm.pan} onChange={e => setVendorForm({ ...vendorForm, pan: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>GST Number</label>
                                    <input type="text" value={vendorForm.gst} onChange={e => setVendorForm({ ...vendorForm, gst: e.target.value })} />
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <Button variant="secondary" onClick={() => setVendorModalOpen(false)}>Cancel</Button>
                            <Button onClick={saveVendor}>Save Record</Button>
                        </div>
                    </div>
                </div>
            )}

            {loading && <LoadingOverlay message="Processing records..." />}
        </div>
    );
};

export default MasterRegister;
