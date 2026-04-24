import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useMessage } from '../context/MessageContext';
import { Button } from '../components/ui/Button';
import { LoadingOverlay } from '../components/ui';
import { Building2, Users, Search, ArrowLeft, Plus, Pencil, Trash2, Home, X, Printer, Share2, LayoutDashboard, ChevronRight } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import styles from './MasterRegister.module.css';
import VendorPrintTemplate from '../components/VendorPrintTemplate';

const MasterRegister = () => {
    const { user } = useAuth();
    const { alert, confirm, prompt, toast } = useMessage();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [currentView, setCurrentView] = useState('sites'); // 'sites' or 'vendors'
    const [printVendor, setPrintVendor] = useState(null);

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
        vendorCompany: '', aadhaar: '', gst: '', bankBranch: '', natureOfWork: ''
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
                bankBranch: v.bank_branch || '',
                natureOfWork: v.nature_of_work || ''
            });
        } else {
            setEditingVendorId(null);
            setVendorForm({
                name: '', holderName: '', pan: '', phone: '', address: '', acc: '', bank: '', ifsc: '', vendorType: 'both',
                vendorCompany: '', aadhaar: '', gst: '', bankBranch: '', natureOfWork: ''
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
                bank_branch: vendorForm.bankBranch,
                nature_of_work: vendorForm.natureOfWork
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
        <div className={styles.dashboardContainer}>
            {/* Sidebar */}
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <LayoutDashboard size={28} />
                    <span>IIPL Hub</span>
                </div>

                <nav className={styles.navLinks}>
                    <button
                        className={`${styles.navItem} ${currentView === 'sites' ? styles.navItemActive : ''}`}
                        onClick={() => setCurrentView('sites')}
                    >
                        <Building2 size={18} /> Sites Register
                    </button>
                    <button
                        className={`${styles.navItem} ${currentView === 'vendors' ? styles.navItemActive : ''}`}
                        onClick={() => setCurrentView('vendors')}
                    >
                        <Users size={18} /> Vendors Master
                    </button>
                </nav>

                <div className={styles.sidebarFooter}>
                    <p>Master Data Management</p>
                    <Link to="/" style={{ color: '#4ade80', fontWeight: 600, textDecoration: 'none', display: 'block', marginTop: '1rem' }}>← Back to Home</Link>
                </div>
            </aside>

            {/* Main Content */}
            <main className={styles.mainContent}>
                <header className={styles.topBar}>
                    <div className={styles.pageTitle}>
                        <h1>{currentView === 'sites' ? 'Sites Management' : 'Vendor Management'}</h1>
                        <p className={styles.subtitle}>Register and update master credentials</p>
                    </div>

                    <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                        <div className={styles.searchBar}>
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder={currentView === 'sites' ? "Search sites..." : "Search vendors..."}
                                value={currentView === 'sites' ? siteNameSearch : vendorNameSearch}
                                onChange={(e) => currentView === 'sites' ? setSiteNameSearch(e.target.value) : setVendorNameSearch(e.target.value)}
                            />
                        </div>
                        <Button 
                            onClick={currentView === 'sites' ? () => openSiteModal() : () => openVendorModal()}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.25rem', borderRadius: '2rem' }}
                        >
                            <Plus size={18} /> Add {currentView === 'sites' ? 'Site' : 'Vendor'}
                        </Button>
                    </div>
                </header>

                <div className={styles.contentArea}>
                    <div className={styles.card}>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                {currentView === 'sites' ? (
                                    <>
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
                                                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{s.name}</td>
                                                    <td>{s.location || '-'}</td>
                                                    <td>{s.client || '-'}</td>
                                                    <td>
                                                        <div className={styles.actions}>
                                                            <button 
                                                                onClick={() => openSiteModal(s)}
                                                                className={styles.editBtn}
                                                            >
                                                                Edit
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredSites.length === 0 && (
                                                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No sites found matching your search.</td></tr>
                                            )}
                                        </tbody>
                                    </>
                                ) : (
                                    <>
                                        <thead>
                                            <tr>
                                                <th>Vendor Name</th>
                                                <th>Type</th>
                                                <th>Bank Name</th>
                                                <th>Account No</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredVendors.map(v => (
                                                <tr key={v.id}>
                                                    <td style={{ fontWeight: 600, color: '#1e293b' }}>{v.vendor_name}</td>
                                                    <td>
                                                        <span className={`${styles.badge} ${v.vendor_type === 'payment_request' ? styles.badgePayment : v.vendor_type === 'invoice' ? styles.badgeInvoice : styles.badgeBoth}`}>
                                                            {v.vendor_type === 'payment_request' ? 'Payment' : v.vendor_type === 'invoice' ? 'Invoice' : 'Both'}
                                                        </span>
                                                    </td>
                                                    <td>{v.bank_name || '-'}</td>
                                                    <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{v.account_number || '-'}</td>
                                                    <td>
                                                        <div className={styles.actions}>
                                                            <button 
                                                                onClick={() => openVendorModal(v)}
                                                                className={styles.editBtn}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button 
                                                                onClick={() => setPrintVendor(v)}
                                                                className={styles.editBtn}
                                                                title="Share Details"
                                                                style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                                            >
                                                                <Share2 size={16} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredVendors.length === 0 && (
                                                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>No vendors found matching your search.</td></tr>
                                            )}
                                        </tbody>
                                    </>
                                )}
                            </table>
                        </div>
                    </div>
                </div>
            </main>

            {/* Site Modal */}
            {siteModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h3>{editingSiteId ? 'Edit Site Details' : 'Register New Site'}</h3>
                            <button onClick={() => setSiteModalOpen(false)} className={styles.closeBtn}><X size={20} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                                <div className={styles.formGroup}>
                                    <label>Site Name</label>
                                    <input type="text" placeholder="e.g. AKKARAI RESIDENCE" value={siteForm.name} onChange={e => setSiteForm({ ...siteForm, name: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Location</label>
                                    <input type="text" placeholder="e.g. CHENNAI" value={siteForm.location} onChange={e => setSiteForm({ ...siteForm, location: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Client Name</label>
                                    <input type="text" placeholder="Enter client name..." value={siteForm.client} onChange={e => setSiteForm({ ...siteForm, client: e.target.value })} />
                                </div>
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
                            <h3>{editingVendorId ? 'Edit Vendor Credentials' : 'Register New Vendor'}</h3>
                            <button onClick={() => setVendorModalOpen(false)} className={styles.closeBtn}><X size={20} /></button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label>WO Vendor name</label>
                                    <input type="text" placeholder="Full name..." value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Vendor Company Name</label>
                                    <input type="text" placeholder="Company name..." value={vendorForm.vendorCompany} onChange={e => setVendorForm({ ...vendorForm, vendorCompany: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Nature of work</label>
                                    <input type="text" placeholder="e.g. Electrical, Plumbing..." value={vendorForm.natureOfWork} onChange={e => setVendorForm({ ...vendorForm, natureOfWork: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Vendor Type</label>
                                    <select value={vendorForm.vendorType} onChange={e => setVendorForm({ ...vendorForm, vendorType: e.target.value })}>
                                        <option value="both">Both (Payment & Invoice)</option>
                                        <option value="payment_request">Payment Only</option>
                                        <option value="invoice">Invoice Only</option>
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Phone Number</label>
                                    <input type="text" placeholder="Contact number..." value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} />
                                </div>
                                <div className={styles.formGroup} style={{ gridColumn: 'span 2' }}>
                                    <label>Address</label>
                                    <textarea 
                                        value={vendorForm.address} 
                                        onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })}
                                        style={{ width: '100%', padding: '0.75rem 1rem', border: '1px solid #e2e8f0', borderRadius: '0.75rem', outline: 'none', fontSze: '0.95rem', minHeight: '80px', resize: 'vertical' }}
                                        placeholder="Full address details..."
                                    />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Account Holder Name</label>
                                    <input type="text" value={vendorForm.holderName} onChange={e => setVendorForm({ ...vendorForm, holderName: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Account Number</label>
                                    <input type="text" value={vendorForm.acc} onChange={e => setVendorForm({ ...vendorForm, acc: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Bank Name</label>
                                    <input type="text" value={vendorForm.bank} onChange={e => setVendorForm({ ...vendorForm, bank: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label>Bank Branch</label>
                                    <input type="text" value={vendorForm.bankBranch} onChange={e => setVendorForm({ ...vendorForm, bankBranch: e.target.value })} />
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
                                <div className={styles.formGroup}>
                                    <label>Aadhaar Number</label>
                                    <input type="text" value={vendorForm.aadhaar} onChange={e => setVendorForm({ ...vendorForm, aadhaar: e.target.value })} />
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

            {loading && <LoadingOverlay message="Processing master data..." />}
            {/* Vendor Print Template */}
            {printVendor && (
                <VendorPrintTemplate 
                    vendor={printVendor} 
                    onClose={() => setPrintVendor(null)} 
                />
            )}
        </div>
    );
};

export default MasterRegister;
