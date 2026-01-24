import React, { useState, useEffect, useMemo, useRef } from 'react';
import styles from './VendorSiteDashboard.module.css';
import { vendorSupabase } from '../../lib/vendorSupabase';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { LoadingOverlay } from '../ui';
import {
    LayoutDashboard,
    Building2,
    Users,
    PlusCircle,
    Shield,
    FileText,
    Menu,
    Search,
    ArrowLeft,
    File,
    LogOut,
    Trash2,
    Pencil,
    Plus,
    X,
    Printer,
    ChevronRight,
    Table as TableIcon,
    Settings,
    Home
} from 'lucide-react';

const VendorSiteDashboard = ({ readOnly = false }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [currentView, setCurrentView] = useState('overview');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [rawData, setRawData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [detailId, setDetailId] = useState(null); // specific site or vendor name

    // Form State
    const [editingState, setEditingState] = useState(null);
    const [formData, setFormData] = useState({
        siteName: '',
        vendorName: '',
        woNo: '',
        woDate: '',
        woValue: '',
        billCertifiedValue: '',
        housekeeping: '',
        retention: '',
        remarks: '',
        pdfUrl: ''
    });
    const [advances, setAdvances] = useState([{ amount: '', date: '', payment_mode: 'M1' }]);
    const fileInputRef = useRef(null);

    // Statements State
    const [statementMode, setStatementMode] = useState('menu'); // menu, master, vendor, tracker
    const [vendorStatementView, setVendorStatementView] = useState('detailed'); // detailed, simple
    const [selectedStatementVendor, setSelectedStatementVendor] = useState(null);
    const [balancePopup, setBalancePopup] = useState(null);
    const [masterVendors, setMasterVendors] = useState([]); // Master list from admin
    const [masterSites, setMasterSites] = useState([]); // Master list of sites
    const [summaryColumns, setSummaryColumns] = useState({
        index: true,
        site: true,
        wo_no: true,
        wo_date: true,
        wo_value: true,
        bill_certified: true,
        deductions: true,
        paid: true,
        balance: true
    });
    const [showColumnSettings, setShowColumnSettings] = useState(false);
    const [printOrientation, setPrintOrientation] = useState('portrait'); // 'portrait' or 'landscape'
    const [showPrintModal, setShowPrintModal] = useState(false);

    // Fetch Data
    useEffect(() => {
        const loadInitialData = async () => {
            await fetchData();

            // Handle URL params for deep linking
            const params = new URLSearchParams(location.search);
            const siteParam = params.get('site');
            const vendorParam = params.get('vendor');

            if (siteParam) {
                setCurrentView('site_detail');
                setDetailId(siteParam);
            } else if (vendorParam) {
                setCurrentView('vendor_detail');
                setDetailId(vendorParam);
            }
        };

        loadInitialData();
    }, [location.search]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Corrected Query matching script.js
            const { data, error } = await vendorSupabase
                .from('work_orders')
                .select(`
                    *,
                    sites (name),
                    vendors (vendor_name),
                    advances (*)
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform nested relation data into the flat structure required by the UI
            const flattened = (data || []).map(wo => ({
                id: wo.id,
                created_at: wo.created_at,
                site_name: wo.sites?.name || 'Unknown Site',
                vendor_name: wo.vendors?.vendor_name || 'Unknown Vendor',
                wo_no: wo.wo_no,
                wo_date: wo.wo_date,
                wo_value: wo.wo_value,
                bill_certified_value: wo.bill_certified_value,
                housekeeping: wo.housekeeping,
                retention: wo.retention,
                remarks: wo.remarks,
                wo_pdf_url: wo.wo_pdf_url,
                advance_details: wo.advances // Keep as array, code handles it
            }));

            setRawData(flattened);

            // Fetch Master Vendors
            const { data: vData } = await vendorSupabase.from('vendors').select('vendor_name').order('vendor_name');
            setMasterVendors(vData || []);

            const { data: sData } = await vendorSupabase.from('sites').select('name').order('name');
            setMasterSites(sData || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Derived Data
    const sites = useMemo(() => {
        const unique = [...new Set(rawData.map(item => item.site_name))];
        return unique.map(site => {
            const siteEntries = rawData.filter(d => d.site_name === site);
            const totalValue = siteEntries.reduce((sum, item) => sum + (parseFloat(item.wo_value) || 0), 0);
            return { name: site, totalValue, count: siteEntries.length, entries: siteEntries };
        });
    }, [rawData]);

    const vendors = useMemo(() => {
        const vendorMap = {};
        rawData.forEach(item => {
            if (!vendorMap[item.vendor_name]) {
                vendorMap[item.vendor_name] = {
                    name: item.vendor_name,
                    totalValue: 0,
                    advances: 0,
                    sites: new Set(),
                    entries: []
                };
            }
            const v = vendorMap[item.vendor_name];
            v.totalValue += parseFloat(item.wo_value) || 0;

            let adv = 0;
            try {
                const advList = typeof item.advance_details === 'string' ? JSON.parse(item.advance_details) : item.advance_details;
                if (Array.isArray(advList)) {
                    adv = advList.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
                }
            } catch (e) { }
            v.advances += adv;
            v.sites.add(item.site_name);
            v.entries.push(item);
        });
        return Object.values(vendorMap);
    }, [rawData]);

    // Format Currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return 'N/A';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            }).replace(/\//g, '-');
        } catch (e) {
            return dateStr;
        }
    };

    // Parse Advances safely
    const parseAdvances = (jsonOrArray) => {
        try {
            return typeof jsonOrArray === 'string' ? JSON.parse(jsonOrArray) : (jsonOrArray || []);
        } catch (e) {
            return [];
        }
    };

    // View Navigation
    const handleSwitchView = (view, id = null) => {
        setCurrentView(view);
        if (id) setDetailId(id);
        setSidebarOpen(false);
        setSearchQuery('');
        window.scrollTo(0, 0);

        // Reset Form if switching away from add_entry
        if (view !== 'add_entry') {
            resetForm();
        }
    };

    const resetForm = () => {
        setEditingState(null);
        setFormData({ siteName: '', vendorName: '', woNo: '', woDate: '', woValue: '', billCertifiedValue: '', housekeeping: '', retention: '', remarks: '', pdfUrl: '' });
        setAdvances([{ amount: '', date: '', payment_mode: 'M1' }]);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // --- CRUD Operations ---

    // 1. Delete
    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to PERMANENTLY delete this entry?')) return;
        setLoading(true);
        try {
            const { error } = await vendorSupabase.from('work_orders').delete().eq('id', id);

            if (error) throw error;
            await fetchData();
            alert('Entry deleted.');
        } catch (err) {
            console.error(err);
            alert('Error deleting entry.');
        } finally {
            setLoading(false);
        }
    };

    // 2. Edit Setup
    const handleEditSetup = (siteName, vendorName) => {
        const entry = rawData.find(d => d.site_name === siteName && d.vendor_name === vendorName);
        if (!entry) return;

        setFormData({
            siteName: entry.site_name,
            vendorName: entry.vendor_name,
            woNo: entry.wo_no,
            woDate: entry.wo_date,
            woValue: entry.wo_value,
            billCertifiedValue: entry.bill_certified_value,
            housekeeping: entry.housekeeping,
            retention: entry.retention,
            remarks: entry.remarks,
            wo_pdf_url: entry.wo_pdf_url
        });

        const existingAdvances = parseAdvances(entry.advance_details);
        setAdvances(existingAdvances.length > 0 ? existingAdvances : [{ amount: '', date: '', payment_mode: 'M1' }]);

        setEditingState({ id: entry.id });
        handleSwitchView('add_entry');
    };

    // 3. Submit (Create/Update)
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Unique Work Order Check (Only for new entries)
        if (!editingState && formData.woNo) {
            setLoading(true);
            try {
                const { data: existingWO, error: checkError } = await vendorSupabase
                    .from('work_orders')
                    .select('id')
                    .eq('wo_no', formData.woNo)
                    .maybeSingle();

                if (checkError) throw checkError;
                if (existingWO) {
                    alert('the work order is already exist');
                    setLoading(false);
                    return;
                }
            } catch (err) {
                console.error('Check error:', err);
                alert('Error checking work order: ' + err.message);
                setLoading(false);
                return;
            }
        }

        // Work Order Date Validation
        if (!formData.woDate) {
            alert('Please Fill the Work Order Date Field');
            return;
        }

        setLoading(true);

        try {
            // Handle PDF Upload first
            let finalPdfUrl = formData.pdfUrl;
            if (fileInputRef.current && fileInputRef.current.files[0]) {
                const file = fileInputRef.current.files[0];
                const fileName = `wo_${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
                const { error: uploadError } = await vendorSupabase.storage
                    .from('work_orders')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: publicUrlData } = vendorSupabase.storage
                    .from('work_orders')
                    .getPublicUrl(fileName);

                finalPdfUrl = publicUrlData.publicUrl;
            }

            const cleanAdvances = advances.filter(a => a.amount > 0);

            if (editingState) {
                await updateEntry(editingState.id, formData, finalPdfUrl, cleanAdvances);
            } else {
                await createEntry(formData, finalPdfUrl, cleanAdvances);
            }

            alert('Saved successfully!');
            await fetchData();
            handleSwitchView('admin_panel');

        } catch (err) {
            console.error(err);
            const msg = err.message === 'Bucket not found'
                ? 'Storage bucket "work_orders" not found. Please create it in your Supabase Dashboard -> Storage.'
                : err.message;
            alert('Error saving: ' + msg);
        } finally {
            setLoading(false);
        }
    };

    const createEntry = async (data, pdfUrl, advs) => {
        // Find existing Site
        const { data: existingSite } = await vendorSupabase.from('sites').select('id').eq('name', data.siteName).single();
        if (!existingSite) throw new Error("Site not found. Please add from Admin.");
        const siteId = existingSite.id;

        // Find existing Vendor
        const { data: existingVendor } = await vendorSupabase.from('vendors').select('id').eq('vendor_name', data.vendorName).single();
        if (!existingVendor) throw new Error("Vendor not found. Please add from Admin.");
        const vendorId = existingVendor.id;

        // Create WO
        const { data: wo, error: woErr } = await vendorSupabase.from('work_orders').insert({
            site_id: siteId,
            vendor_id: vendorId,
            wo_no: data.woNo,
            wo_date: data.woDate,
            wo_value: data.woValue,
            bill_certified_value: data.billCertifiedValue || 0,
            housekeeping: data.housekeeping || 0,
            retention: data.retention || 0,
            remarks: data.remarks,
            wo_pdf_url: pdfUrl
        }).select().single();
        if (woErr) throw woErr;

        // Create Advances (Manual entries from dashboard)
        if (advs.length > 0) {
            const { error: advErr } = await vendorSupabase.from('advances').insert(
                advs.map(a => ({ work_order_id: wo.id, amount: a.amount, date: a.date, payment_mode: a.payment_mode }))
            );
            if (advErr) throw advErr;
        }
    };

    const updateEntry = async (id, data, pdfUrl, advs) => {
        // Find existing Site
        const { data: newSite } = await vendorSupabase.from('sites').select('id').eq('name', data.siteName).single();
        if (!newSite) throw new Error("New Site not found in master records.");
        const newSiteId = newSite.id;

        // Find existing Vendor
        const { data: newVendor } = await vendorSupabase.from('vendors').select('id').eq('vendor_name', data.vendorName).single();
        if (!newVendor) throw new Error("New Vendor not found in master records.");
        const newVendorId = newVendor.id;

        // Update WO
        const { error: woUpdateErr } = await vendorSupabase.from('work_orders').update({
            site_id: newSiteId,
            vendor_id: newVendorId,
            wo_no: data.woNo,
            wo_date: data.woDate,
            wo_value: data.woValue,
            bill_certified_value: data.billCertifiedValue || 0,
            housekeeping: data.housekeeping || 0,
            retention: data.retention || 0,
            remarks: data.remarks,
            wo_pdf_url: pdfUrl // Update PDF
        }).eq('id', id);
        if (woUpdateErr) throw woUpdateErr;

        // Update Advances (Delete all old, Insert new - simplest strategy)
        await vendorSupabase.from('advances').delete().eq('work_order_id', id);
        if (advs.length > 0) {
            const { error: advErr } = await vendorSupabase.from('advances').insert(
                advs.map(a => ({ work_order_id: id, amount: a.amount, date: a.date, payment_mode: a.payment_mode }))
            );
            if (advErr) throw advErr;
        }
    };


    // --- Render Functions ---

    const renderOverview = () => {
        const totalWOValue = rawData.reduce((sum, item) => sum + (parseFloat(item.wo_value) || 0), 0);

        return (
            <>
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.bgGradient1}`}><Building2 /></div>
                        <div className={styles.statInfo}>
                            <h3>Total Sites</h3>
                            <p>{sites.length}</p>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.bgGradient2}`}><Users /></div>
                        <div className={styles.statInfo}>
                            <h3>Active Vendors</h3>
                            <p>{vendors.length}</p>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={`${styles.statIcon} ${styles.bgGradient3}`}><FileText /></div>
                        <div className={styles.statInfo}>
                            <h3>Total WO Value</h3>
                            <p>{formatCurrency(totalWOValue)}</p>
                        </div>
                    </div>
                </div>

                <h2 className={styles.subtitle} style={{ marginBottom: '1rem', fontWeight: 600, fontSize: '1.2rem' }}>Recent Entries</h2>
                <div className={styles.gridContainer}>
                    {rawData.slice(0, 6).map((item) => (
                        <div key={item.id} className={styles.infoCard}>
                            <div className={styles.cardHeader}>
                                <span>{item.site_name}</span>
                                <span className={styles.tag}>{item.wo_no}</span>
                            </div>
                            <div className={styles.cardBody}>
                                <div className={styles.listItem}>
                                    <span className={styles.listItemTitle}>{item.vendor_name}</span>
                                </div>
                                <div className={styles.listItem}>
                                    <span className={styles.listItemSub}>Work Order Date</span>
                                    <span style={{ fontWeight: 600, color: '#475569' }}>{formatDate(item.wo_date)}</span>
                                </div>
                                <div className={styles.listItem}>
                                    <span className={styles.listItemSub}>WO Value</span>
                                    <span className={styles.currency}>{formatCurrency(item.wo_value)}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </>
        )
    };

    const renderSites = () => (
        <div className={styles.gridContainer}>
            {sites.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase())).map(site => (
                <div key={site.name} className={styles.infoCard} onClick={() => handleSwitchView('site_detail', site.name)}>
                    <div className={styles.cardHeader}>
                        <Building2 size={20} />
                        <span>{site.name}</span>
                        <ChevronRight size={16} />
                    </div>
                    <div className={styles.cardBody}>
                        <div className={styles.listItem}>
                            <span className={styles.listItemSub}>Total Value</span>
                            <span className={styles.currency}>{formatCurrency(site.totalValue)}</span>
                        </div>
                        <div className={styles.listItem}>
                            <span className={styles.listItemSub}>Vendors</span>
                            <span style={{ fontWeight: 600 }}>{new Set(site.entries.map(e => e.vendor_name)).size}</span>
                        </div>
                        <div className={styles.tag} style={{ marginTop: '1rem', background: '#eff6ff', color: '#4f46e5' }}>Click for Details</div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderVendors = () => (
        <div className={styles.gridContainer}>
            {vendors.filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase())).map(vendor => (
                <div key={vendor.name} className={styles.infoCard} onClick={() => handleSwitchView('vendor_detail', vendor.name)}>
                    <div className={styles.cardHeader}>
                        <Users size={20} />
                        <span>{vendor.name}</span>
                        <ChevronRight size={16} />
                    </div>
                    <div className={styles.cardBody}>
                        <div className={styles.listItem}>
                            <span className={styles.listItemSub}>Total Projects</span>
                            <span className={styles.currency}>{formatCurrency(vendor.totalValue)}</span>
                        </div>
                        <div className={styles.listItem}>
                            <span className={styles.listItemSub}>Active Sites</span>
                            <span>{vendor.sites.size}</span>
                        </div>
                        <div className={styles.tag} style={{ marginTop: '1rem', background: '#eff6ff', color: '#4f46e5' }}>Click for Details</div>
                    </div>
                </div>
            ))}
        </div>
    );

    const renderSiteDetail = () => {
        const site = sites.find(s => s.name === detailId);
        if (!site) return <div>Site not found</div>;

        return (
            <div>
                <div className={styles.detailHeader}>
                    <Button variant="secondary" onClick={() => handleSwitchView('sites')}>
                        <ArrowLeft size={16} /> Back to Sites
                    </Button>
                </div>
                <div className={styles.gridContainer}>
                    {site.entries.map(entry => {
                        const allAdvs = parseAdvances(entry.advance_details);
                        const totalAdv = allAdvs.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
                        return (
                            <div key={entry.id || Math.random()} className={styles.infoCard} style={{ cursor: 'default' }}>
                                <div className={styles.cardHeader}>
                                    <span>{entry.vendor_name}</span>
                                    {entry.wo_pdf_url && (
                                        <a href={entry.wo_pdf_url} target="_blank" rel="noopener noreferrer" className={styles.pdfBtn}>
                                            <FileText size={14} /> PDF
                                        </a>
                                    )}
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.listItem}>
                                        <span className={styles.listItemSub}>Work Order No</span>
                                        <span className={styles.listItemTitle}>{entry.wo_no || 'N/A'}</span>
                                    </div>
                                    <div className={styles.listItem}>
                                        <span className={styles.listItemSub}>Work Order Date</span>
                                        <span style={{ fontWeight: 600, color: '#475569' }}>{formatDate(entry.wo_date)}</span>
                                    </div>
                                    <div className={styles.listItem}>
                                        <span className={styles.listItemSub}>WO Value</span>
                                        <span className={styles.currency}>{formatCurrency(entry.wo_value)}</span>
                                    </div>
                                    <div className={styles.listItem}>
                                        <span className={styles.listItemSub}>Total Paid</span>
                                        <span className={styles.currency} style={{ color: '#4f46e5' }}>{formatCurrency(totalAdv)}</span>
                                    </div>
                                    <div className={styles.listItem}
                                        style={{ background: '#fef2f2', padding: '4px 8px', borderRadius: '4px', marginTop: '4px', cursor: 'pointer' }}
                                        onClick={(e) => { e.stopPropagation(); setBalancePopup(entry); }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                            <span className={styles.listItemSub} style={{ fontWeight: 600, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Balance to Pay <div style={{ fontSize: '0.7em', border: '1px solid #b91c1c', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>i</div>
                                            </span>
                                            <span className={styles.currency} style={{ fontWeight: 700, color: '#b91c1c' }}>
                                                {formatCurrency((parseFloat(entry.bill_certified_value) || 0) - (parseFloat(entry.housekeeping) || 0) - (parseFloat(entry.retention) || 0) - totalAdv)}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>Payment History</div>
                                        {allAdvs.length > 0 ? allAdvs.map((a, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px', padding: '4px', background: '#f8fafc', borderRadius: '4px' }}>
                                                <div>
                                                    <span style={{ display: 'block', fontWeight: 500 }}>{a.date || 'N/A'}</span>
                                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{a.payment_mode || 'M1'}</span>
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{formatCurrency(a.amount)}</span>
                                            </div>
                                        )) : <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No payments</div>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderVendorDetail = () => {
        const vendor = vendors.find(v => v.name === detailId);
        if (!vendor) return <div>Vendor not found</div>;

        return (
            <div>
                <div className={styles.detailHeader}>
                    <Button variant="secondary" onClick={() => handleSwitchView('vendors')}>
                        <ArrowLeft size={16} /> Back to Vendors
                    </Button>
                </div>
                <div className={styles.gridContainer}>
                    {vendor.entries.map(entry => {
                        const allAdvs = parseAdvances(entry.advance_details);
                        const totalAdv = allAdvs.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
                        return (
                            <div key={entry.id || Math.random()} className={styles.infoCard} style={{ cursor: 'default' }}>
                                <div className={styles.cardHeader}>
                                    <span>{entry.site_name}</span>
                                    {entry.wo_pdf_url && (
                                        <a href={entry.wo_pdf_url} target="_blank" rel="noopener noreferrer" className={styles.pdfBtn}>
                                            <FileText size={14} /> PDF
                                        </a>
                                    )}
                                </div>
                                <div className={styles.cardBody}>
                                    <div className={styles.listItem}>
                                        <span className={styles.listItemSub}>Work Order No</span>
                                        <span className={styles.listItemTitle}>{entry.wo_no || 'N/A'}</span>
                                    </div>
                                    <div className={styles.listItem}>
                                        <span className={styles.listItemSub}>Work Order Date</span>
                                        <span style={{ fontWeight: 600, color: '#475569' }}>{formatDate(entry.wo_date)}</span>
                                    </div>
                                    <div className={styles.listItem}>
                                        <span className={styles.listItemSub}>WO Value</span>
                                        <span className={styles.currency}>{formatCurrency(entry.wo_value)}</span>
                                    </div>
                                    <div className={styles.listItem}>
                                        <span className={styles.listItemSub}>Total Paid</span>
                                        <span className={styles.currency} style={{ color: '#4f46e5' }}>{formatCurrency(totalAdv)}</span>
                                    </div>
                                    <div className={styles.listItem}
                                        style={{ background: '#fef2f2', padding: '4px 8px', borderRadius: '4px', marginTop: '4px', cursor: 'pointer' }}
                                        onClick={(e) => { e.stopPropagation(); setBalancePopup(entry); }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                            <span className={styles.listItemSub} style={{ fontWeight: 600, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                Balance to Pay <div style={{ fontSize: '0.7em', border: '1px solid #b91c1c', borderRadius: '50%', width: '14px', height: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>i</div>
                                            </span>
                                            <span className={styles.currency} style={{ fontWeight: 700, color: '#b91c1c' }}>
                                                {formatCurrency((parseFloat(entry.bill_certified_value) || 0) - (parseFloat(entry.housekeeping) || 0) - (parseFloat(entry.retention) || 0) - totalAdv)}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ marginTop: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '0.5rem' }}>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 600 }}>Payment History</div>
                                        {allAdvs.length > 0 ? allAdvs.map((a, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px', padding: '4px', background: '#f8fafc', borderRadius: '4px' }}>
                                                <div>
                                                    <span style={{ display: 'block', fontWeight: 500 }}>{a.date || 'N/A'}</span>
                                                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{a.payment_mode || 'M1'}</span>
                                                </div>
                                                <span style={{ fontWeight: 600 }}>{formatCurrency(a.amount)}</span>
                                            </div>
                                        )) : <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic' }}>No payments</div>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderAddEntry = () => (
        <div className={styles.formContainer}>
            <h2 style={{ marginBottom: '1.5rem', fontWeight: 600, fontSize: '1.5rem' }}>
                {editingState ? 'Edit Entry' : 'New Work Order Entry'}
            </h2>
            <form onSubmit={handleSubmit}>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Site Name</label>
                    <select
                        className={styles.formInput}
                        value={formData.siteName}
                        onChange={e => setFormData({ ...formData, siteName: e.target.value })}
                        required
                    >
                        <option value="">-- Select Site --</option>
                        {masterSites.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Vendor Name</label>
                    <select
                        className={styles.formInput}
                        value={formData.vendorName}
                        onChange={e => setFormData({ ...formData, vendorName: e.target.value })}
                        required
                    >
                        <option value="">-- Select Vendor --</option>
                        {masterVendors.map(v => <option key={v.vendor_name} value={v.vendor_name}>{v.vendor_name}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Work Order No</label>
                    <input
                        className={styles.formInput}
                        value={formData.woNo}
                        onChange={e => setFormData({ ...formData, woNo: e.target.value })}
                        placeholder="IIPL/WO/..."
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Work Order Date</label>
                    <input
                        type="date"
                        className={styles.formInput}
                        value={formData.woDate}
                        onChange={e => setFormData({ ...formData, woDate: e.target.value })}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Work Order Value</label>
                    <input
                        type="number"
                        className={styles.formInput}
                        value={formData.woValue}
                        onChange={e => setFormData({ ...formData, woValue: e.target.value, billCertifiedValue: e.target.value })}
                        required
                        placeholder="0"
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Bill Certified Value</label>
                        <input
                            type="number"
                            className={styles.formInput}
                            value={formData.billCertifiedValue}
                            onChange={e => setFormData({ ...formData, billCertifiedValue: e.target.value })}
                            placeholder="0"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Housekeeping Deductions</label>
                        <input
                            type="number"
                            className={styles.formInput}
                            value={formData.housekeeping}
                            onChange={e => setFormData({ ...formData, housekeeping: e.target.value })}
                            placeholder="0"
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.formLabel}>Retention</label>
                        <input
                            type="number"
                            className={styles.formInput}
                            value={formData.retention}
                            onChange={e => setFormData({ ...formData, retention: e.target.value })}
                            placeholder="0"
                        />
                    </div>
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Remarks</label>
                    <textarea
                        className={styles.formInput}
                        value={formData.remarks}
                        onChange={e => setFormData({ ...formData, remarks: e.target.value })}
                        placeholder="Add remarks..."
                        rows={3}
                        style={{ padding: '0.75rem' }}
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Work Order PDF</label>
                    <input type="file" className={styles.formInput} ref={fileInputRef} accept="application/pdf" />
                    {formData.pdfUrl && <div style={{ marginTop: '0.5rem', fontSize: '0.8rem' }}><a href={formData.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5' }}>View Current PDF</a></div>}
                </div>

                <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Advance Payments</label>
                    <div className={styles.advanceList}>
                        {advances.map((adv, idx) => (
                            <div key={idx} className={styles.advanceItem} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    className={styles.formInput}
                                    value={adv.amount}
                                    onChange={e => {
                                        const newAdvs = [...advances];
                                        newAdvs[idx].amount = e.target.value;
                                        setAdvances(newAdvs);
                                    }}
                                />
                                <input
                                    type="date"
                                    className={styles.formInput}
                                    value={adv.date}
                                    style={{ width: '150px' }}
                                    onChange={e => {
                                        const newAdvs = [...advances];
                                        newAdvs[idx].date = e.target.value;
                                        setAdvances(newAdvs);
                                    }}
                                />
                                <select
                                    className={styles.formInput}
                                    value={adv.payment_mode}
                                    style={{ width: '150px' }}
                                    onChange={e => {
                                        const newAdvs = [...advances];
                                        newAdvs[idx].payment_mode = e.target.value;
                                        setAdvances(newAdvs);
                                    }}
                                >
                                    <option value="M1">M1 (Account)</option>
                                    <option value="M2">M2 (Cash)</option>
                                    <option value="M3">M3 (Materials)</option>
                                    <option value="M4">M4 (Wages)</option>
                                    <option value="M5">M5 (Rent)</option>
                                </select>
                                <button type="button" className={styles.removeAdvanceBtn} onClick={() => setAdvances(advances.filter((_, i) => i !== idx))}>
                                    <X size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                    <Button type="button" variant="secondary" onClick={() => setAdvances([...advances, { amount: '', date: '', payment_mode: 'M1' }])}>
                        <Plus size={16} /> Add Advance
                    </Button>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.5rem' }}>
                        * Zero value advances will be ignored on save.
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                    <Button type="submit" style={{ flex: 1 }}>{editingState ? 'Update Entry' : 'Add Entry'}</Button>
                    {editingState && <Button type="button" variant="secondary" onClick={() => handleSwitchView('admin_panel')}>Cancel</Button>}
                </div>
            </form>
        </div>
    );

    const renderAdminPanel = () => {
        const filtered = rawData.filter(item =>
            item.site_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.vendor_name.toLowerCase().includes(searchQuery.toLowerCase())
        );

        return (
            <div>
                <h2 style={{ marginBottom: '1.5rem', fontWeight: 600, fontSize: '1.5rem' }}>System Records</h2>
                <div className={styles.tableContainer}>
                    <table className={styles.adminTable}>
                        <thead>
                            <tr>
                                <th>Site Name</th>
                                <th>Vendor Name</th>
                                <th>WO No / Date</th>
                                <th>WO Value</th>
                                <th>Total Advance</th>
                                <th>Balance</th>
                                {!readOnly && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length > 0 ? filtered.map(item => {
                                const advs = parseAdvances(item.advance_details);
                                const totalAdv = advs.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
                                const balance = (parseFloat(item.bill_certified_value) || 0) - (parseFloat(item.housekeeping) || 0) - (parseFloat(item.retention) || 0) - totalAdv;
                                return (
                                    <tr key={item.id}>
                                        <td>{item.site_name}</td>
                                        <td>{item.vendor_name}</td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: '#1e293b' }}>{item.wo_no || '-'}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{formatDate(item.wo_date)}</div>
                                        </td>
                                        <td>{formatCurrency(item.wo_value)}</td>
                                        <td>{formatCurrency(totalAdv)}</td>
                                        <td style={{ color: '#b91c1c', fontWeight: 600 }}>{formatCurrency(balance)}</td>
                                        {!readOnly && (
                                            <td style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button className={`${styles.actionBtn} ${styles.editBtn}`} onClick={() => handleEditSetup(item.site_name, item.vendor_name)}>
                                                    <Pencil size={18} />
                                                </button>
                                                <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(item.id)}>
                                                    <Trash2 size={18} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                )
                            }) : (
                                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No matching records found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    // --- Master Report & Vendor Statement Logic ---
    const renderStatements = () => {
        if (statementMode === 'menu') {
            return (
                <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', paddingTop: '2rem' }}>
                    <h2 style={{ marginBottom: '2rem', fontSize: '1.5rem', fontWeight: 600 }}>Select Report Type</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <div
                            className={styles.infoCard}
                            onClick={() => setStatementMode('master')}
                            style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s', textAlign: 'center' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div className={`${styles.statIcon} ${styles.bgGradient2}`} style={{ marginBottom: '1.5rem' }}><TableIcon size={32} /></div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Master Site Report</h3>
                            <p style={{ color: '#64748b' }}>Comprehensive view of all sites, vendors, and advances.</p>
                        </div>

                        <div
                            className={styles.infoCard}
                            onClick={() => setStatementMode('vendor')}
                            style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s', textAlign: 'center' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div className={`${styles.statIcon} ${styles.bgGradient1}`} style={{ marginBottom: '1.5rem' }}><FileText size={32} /></div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Generate Vendor Statement</h3>
                            <p style={{ color: '#64748b' }}>Detailed individual ledger or summary for a specific vendor.</p>
                        </div>

                        <div
                            className={styles.infoCard}
                            onClick={() => setStatementMode('tracker')}
                            style={{ padding: '3rem 2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', transition: 'transform 0.2s', textAlign: 'center' }}
                            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-5px)'}
                            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}
                        >
                            <div className={`${styles.statIcon} ${styles.bgGradient3}`} style={{ marginBottom: '1.5rem' }}><LayoutDashboard size={32} /></div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Vendor Payment Tracker</h3>
                            <p style={{ color: '#64748b' }}>Consolidated tracker grouped by vendors (Classic Excel Format).</p>
                        </div>
                    </div>
                </div>
            );
        }

        if (statementMode === 'tracker') {
            const vendorGroups = {};
            rawData.forEach(item => {
                const vName = item.vendor_name || 'UNKNOWN VENDOR';
                if (!vendorGroups[vName]) vendorGroups[vName] = [];
                vendorGroups[vName].push(item);
            });

            const sortedVendors = Object.keys(vendorGroups)
                .filter(v => v.toLowerCase().includes((searchQuery || '').toLowerCase()))
                .sort();

            return (
                <div className={styles.statementContainer}>
                    <div className={styles.printHide} style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Button variant="secondary" onClick={() => { setStatementMode('menu'); setSearchQuery(''); }}>
                                <ArrowLeft size={16} /> Back
                            </Button>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Vendor Payment Tracker</h2>
                        </div>
                        <Button onClick={() => { setPrintOrientation('landscape'); setShowPrintModal(true); }}>
                            <Printer size={18} style={{ marginRight: '0.5rem' }} /> Print Tracker
                        </Button>
                    </div>

                    <div className={styles.printHide} style={{ marginBottom: '1rem' }}>
                        <div className={styles.searchBar} style={{ width: '100%' }}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search vendor name in tracker..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ background: 'white', padding: '1rem', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}>
                        <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
                            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e40af', textDecoration: 'underline' }}>VENDOR PAYMENT TRACKER</h1>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '0.75rem', border: '2px solid #000' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#4f46e5', color: 'white' }}>
                                        <th style={{ padding: '6px', border: '1px solid #000' }}>SNO</th>
                                        <th style={{ padding: '6px', border: '1px solid #000', textAlign: 'left' }}>PROJECT NAME</th>
                                        <th style={{ padding: '6px', border: '1px solid #000' }}>WORK ORDER NO</th>
                                        <th style={{ padding: '6px', border: '1px solid #000' }}>ORDER DATE</th>
                                        <th style={{ padding: '6px', border: '1px solid #000', textAlign: 'right' }}>ORDER VALUE</th>
                                        <th style={{ padding: '6px', border: '1px solid #000', textAlign: 'right' }}>BILL CERTIFIED</th>
                                        <th style={{ padding: '6px', border: '1px solid #000', textAlign: 'right' }}>HSK</th>
                                        <th style={{ padding: '6px', border: '1px solid #000', textAlign: 'right' }}>RET</th>
                                        <th style={{ padding: '6px', border: '1px solid #000', textAlign: 'right' }}>NET PAYABLE</th>
                                        <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'right' }}>M1</th>
                                        <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'right' }}>M2</th>
                                        <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'right' }}>M3+M5</th>
                                        <th style={{ padding: '4px', border: '1px solid #000', textAlign: 'right' }}>M4</th>
                                        <th style={{ padding: '6px', border: '1px solid #000', textAlign: 'right' }}>TOTAL PAID</th>
                                        <th style={{ padding: '6px', border: '1px solid #000', textAlign: 'right' }}>BALANCE</th>
                                        <th style={{ padding: '6px', border: '1px solid #000' }}>REMARKS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedVendors.map((vName, vIdx) => {
                                        const entries = vendorGroups[vName];
                                        let vOrderTotal = 0, vCertifiedTotal = 0, vHskTotal = 0, vRetTotal = 0, vNetTotal = 0;
                                        let vM1 = 0, vM2 = 0, vM35 = 0, vM4 = 0, vTotalPaid = 0, vBalance = 0;

                                        return (
                                            <React.Fragment key={vName}>
                                                <tr style={{ backgroundColor: '#bfdbfe', fontWeight: 'bold' }}>
                                                    <td colSpan="16" style={{ padding: '8px', fontSize: '1rem', textAlign: 'center', border: '1px solid #000', color: '#1e40af' }}>
                                                        {vIdx + 1}. {vName.toUpperCase()}
                                                    </td>
                                                </tr>
                                                {entries.map((entry, eIdx) => {
                                                    const advs = parseAdvances(entry.advance_details);
                                                    const m1 = advs.filter(a => a.payment_mode === 'M1').reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
                                                    const m2 = advs.filter(a => a.payment_mode === 'M2').reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
                                                    const m35 = advs.filter(a => a.payment_mode === 'M3' || a.payment_mode === 'M5').reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
                                                    const m4 = advs.filter(a => a.payment_mode === 'M4').reduce((s, a) => s + (parseFloat(a.amount) || 0), 0);
                                                    const rowPaid = m1 + m2 + m35 + m4;

                                                    const orderVal = parseFloat(entry.wo_value) || 0;
                                                    const certVal = parseFloat(entry.bill_certified_value) || 0;
                                                    const hsk = parseFloat(entry.housekeeping) || 0;
                                                    const ret = parseFloat(entry.retention) || 0;
                                                    const netPayable = (certVal || orderVal) - hsk - ret;
                                                    const balance = netPayable - rowPaid;

                                                    vOrderTotal += orderVal;
                                                    vCertifiedTotal += certVal;
                                                    vHskTotal += hsk;
                                                    vRetTotal += ret;
                                                    vNetTotal += netPayable;
                                                    vM1 += m1; vM2 += m2; vM35 += m35; vM4 += m4;
                                                    vTotalPaid += rowPaid;
                                                    vBalance += balance;

                                                    return (
                                                        <tr key={entry.id} style={{ backgroundColor: eIdx % 2 === 0 ? '#fef9c3' : '#fff' }}>
                                                            <td style={{ border: '1px solid #000', textAlign: 'center' }}>{eIdx + 1}</td>
                                                            <td style={{ border: '1px solid #000', fontWeight: 500 }}>{entry.site_name.toUpperCase()}</td>
                                                            <td style={{ border: '1px solid #000', textAlign: 'center' }}>{entry.wo_no || '-'}</td>
                                                            <td style={{ border: '1px solid #000', textAlign: 'center' }}>{formatDate(entry.wo_date)}</td>
                                                            <td style={{ border: '1px solid #000', textAlign: 'right' }}>{orderVal ? Math.round(orderVal).toLocaleString() : '-'}</td>
                                                            <td style={{ border: '1px solid #000', textAlign: 'right', fontWeight: 600 }}>{certVal ? Math.round(certVal).toLocaleString() : '-'}</td>
                                                            <td style={{ border: '1px solid #000', textAlign: 'right' }}>{hsk ? Math.round(hsk).toLocaleString() : '-'}</td>
                                                            <td style={{ border: '1px solid #000', textAlign: 'right' }}>{ret ? Math.round(ret).toLocaleString() : '-'}</td>
                                                            <td style={{ border: '1px solid #000', textAlign: 'right', fontWeight: 700 }}>{Math.round(netPayable).toLocaleString()}</td>
                                                            <td style={{ border: '1px solid #000', textAlign: 'right' }}>{m1 ? Math.round(m1).toLocaleString() : '-'}</td>
                                                            <td style={{ border: '1px solid #000', textAlign: 'right' }}>{m2 ? Math.round(m2).toLocaleString() : '-'}</td>
                                                            <td style={{ border: '1px solid #000', textAlign: 'right' }}>{m35 ? Math.round(m35).toLocaleString() : '-'}</td>
                                                            <td style={{ border: '1px solid #000', textAlign: 'right' }}>{m4 ? Math.round(m4).toLocaleString() : '-'}</td>
                                                            <td style={{ border: '1px solid #000', textAlign: 'right', fontWeight: 700 }}>{Math.round(rowPaid).toLocaleString()}</td>
                                                            <td style={{ border: '1px solid #000', textAlign: 'right', fontWeight: 800, color: balance >= -1 && balance <= 1 ? '#000' : (balance > 0 ? '#16a34a' : '#dc2626') }}>{Math.round(balance).toLocaleString()}</td>
                                                            <td style={{ border: '1px solid #000', fontSize: '0.65rem', fontStyle: 'italic' }}>{entry.remarks}</td>
                                                        </tr>
                                                    );
                                                })}
                                                <tr style={{ backgroundColor: '#94a3b8', color: 'white', fontWeight: 'bold' }}>
                                                    <td colSpan="4" style={{ border: '1px solid #000', textAlign: 'right', padding: '4px 8px' }}>TOTAL</td>
                                                    <td style={{ border: '1px solid #000', textAlign: 'right' }}>{Math.round(vOrderTotal).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #000', textAlign: 'right' }}>{Math.round(vCertifiedTotal).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #000', textAlign: 'right' }}>{Math.round(vHskTotal).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #000', textAlign: 'right' }}>{Math.round(vRetTotal).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #000', textAlign: 'right' }}>{Math.round(vNetTotal).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #000', textAlign: 'right' }}>{Math.round(vM1).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #000', textAlign: 'right' }}>{Math.round(vM2).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #000', textAlign: 'right' }}>{Math.round(vM35).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #000', textAlign: 'right' }}>{Math.round(vM4).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #000', textAlign: 'right' }}>{Math.round(vTotalPaid).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #000', textAlign: 'right' }}>{Math.round(vBalance).toLocaleString()}</td>
                                                    <td style={{ border: '1px solid #000' }}></td>
                                                </tr>
                                            </React.Fragment>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            );
        }

        if (statementMode === 'master') {
            // Group data by Site for the Master Report
            const reportData = sites.filter(site =>
                site.name.toLowerCase().includes((searchQuery || '').toLowerCase()) ||
                site.entries.some(e => e.vendor_name.toLowerCase().includes((searchQuery || '').toLowerCase()))
            );

            return (
                <div className={styles.statementContainer}>
                    <div className={styles.printHide} style={{ marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Button variant="secondary" onClick={() => setStatementMode('menu')}>
                                <ArrowLeft size={16} /> Back
                            </Button>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Master Site Report</h2>
                        </div>
                        <Button onClick={() => setShowPrintModal(true)}>
                            <Printer size={18} style={{ marginRight: '0.5rem' }} /> Print Report
                        </Button>
                    </div>

                    <div className={styles.printHide} style={{ marginBottom: '1rem' }}>
                        <div className={styles.searchBar} style={{ width: '100%' }}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search site or vendor name in report..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div style={{ overflowX: 'auto' }}>
                        <table className={styles.masterTable}>
                            <thead>
                                <tr>
                                    <th style={{ width: '200px' }}>SITE NAMES</th>
                                    <th colSpan="100%">VENDOR DETAILS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {reportData.length > 0 ? reportData.map(site => {
                                    const siteVendors = site.entries;
                                    if (siteVendors.length === 0) return null;

                                    let maxAdvances = 0;
                                    siteVendors.forEach(v => {
                                        const advs = parseAdvances(v.advance_details);
                                        if (advs.length > maxAdvances) maxAdvances = advs.length;
                                    });
                                    if (maxAdvances === 0) maxAdvances = 1;

                                    const totalRows = 4 + 6 + maxAdvances;

                                    return (
                                        <React.Fragment key={site.name}>
                                            <tr>
                                                <td rowSpan={totalRows} style={{ verticalAlign: 'middle', textAlign: 'center', fontWeight: 600, backgroundColor: '#f8fafc' }}>
                                                    {site.name}
                                                </td>
                                                <td style={{ fontWeight: 500 }}>VENDOR NAME</td>
                                                {siteVendors.map((v, i) => (
                                                    <td key={i} style={{ fontWeight: 600, backgroundColor: i % 2 === 0 ? '#86efac' : '#fde047' }}>
                                                        {v.vendor_name}
                                                    </td>
                                                ))}
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 500 }}>WORK ORDER NO</td>
                                                {siteVendors.map((v, i) => <td key={i}>{v.wo_no || '-'}</td>)}
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 500 }}>WORK ORDER DATE</td>
                                                {siteVendors.map((v, i) => <td key={i}>{formatDate(v.wo_date)}</td>)}
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 500 }}>WORK ORDER VALUE</td>
                                                {siteVendors.map((v, i) => <td key={i}>{formatCurrency(v.wo_value)}</td>)}
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 500 }}>BILL CERTIFIED VALUE</td>
                                                {siteVendors.map((v, i) => <td key={i}>{v.bill_certified_value ? formatCurrency(v.bill_certified_value) : '-'}</td>)}
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 500 }}>HOUSEKEEPING</td>
                                                {siteVendors.map((v, i) => <td key={i}>{v.housekeeping ? formatCurrency(v.housekeeping) : '-'}</td>)}
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 500 }}>RETENTION</td>
                                                {siteVendors.map((v, i) => <td key={i}>{v.retention ? formatCurrency(v.retention) : '-'}</td>)}
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 500 }}>TOTAL PAID</td>
                                                {siteVendors.map((v, i) => {
                                                    const advs = parseAdvances(v.advance_details);
                                                    const total = advs.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
                                                    return <td key={i} style={{ fontWeight: 600, color: '#4f46e5' }}>{formatCurrency(total)}</td>;
                                                })}
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 500 }}>BALANCE TO PAY</td>
                                                {siteVendors.map((v, i) => {
                                                    const advs = parseAdvances(v.advance_details);
                                                    const total = advs.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
                                                    const balance = (parseFloat(v.bill_certified_value) || 0) - (parseFloat(v.housekeeping) || 0) - (parseFloat(v.retention) || 0) - total;
                                                    return <td key={i} style={{ fontWeight: 700, color: '#dc2626' }}>{formatCurrency(balance)}</td>;
                                                })}
                                            </tr>
                                            <tr>
                                                <td style={{ fontWeight: 500 }}>REMARKS</td>
                                                {siteVendors.map((v, i) => <td key={i} style={{ fontSize: '0.8rem', fontStyle: 'italic', color: '#64748b' }}>{v.remarks || '-'}</td>)}
                                            </tr>
                                            {Array.from({ length: maxAdvances }).map((_, advIdx) => (
                                                <tr key={`adv-${advIdx}`}>
                                                    <td style={{ fontWeight: 500 }}>ADVANCE {maxAdvances > 1 ? advIdx + 1 : ''}</td>
                                                    {siteVendors.map((v, i) => {
                                                        const advs = parseAdvances(v.advance_details);
                                                        const adv = advs[advIdx];
                                                        return (
                                                            <td key={i} style={{ fontSize: '0.75rem' }}>
                                                                {adv ? (
                                                                    <>
                                                                        <div style={{ fontWeight: 600 }}>{formatCurrency(adv.amount)}</div>
                                                                        <div style={{ color: '#64748b' }}>{adv.date} | {adv.payment_mode || 'M1'}</div>
                                                                    </>
                                                                ) : null}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    );
                                }) : (
                                    <tr><td colSpan="100%" style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>No matching records found</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
        }

        if (statementMode === 'vendor') {
            if (!selectedStatementVendor) {
                return (
                    <div style={{ maxWidth: '800px', margin: '0 auto' }}>
                        <div className={styles.detailHeader}>
                            <button className={styles.backBtn} onClick={() => setStatementMode('menu')}>
                                <ArrowLeft size={16} /> Back
                            </button>
                            <h1>Select Vendor</h1>
                        </div>
                        <div className={styles.searchBar} style={{ width: '100%', marginBottom: '2rem' }}>
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search for a vendor..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className={styles.gridContainer}>
                            {vendors
                                .filter(v => v.name.toLowerCase().includes((searchQuery || '').toLowerCase()))
                                .map(v => (
                                    <div key={v.name} className={styles.infoCard} onClick={() => { setSelectedStatementVendor(v); setSearchQuery(''); }}>
                                        <div className={styles.cardHeader}>
                                            <Users size={20} />
                                            <span>{v.name}</span>
                                        </div>
                                        <div className={styles.cardBody}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className={styles.listItemSub}>Active Sites</span>
                                                <span style={{ fontWeight: 600 }}>{v.sites.size}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                );
            }

            // Vendor Statement Rendering
            const vendor = selectedStatementVendor;
            const dateStr = new Date().toLocaleDateString();

            let content;
            if (vendorStatementView === 'detailed') {
                let grandTotalCredit = 0;
                let grandTotalDebit = 0;

                content = (
                    <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {vendor.entries.map((entry, idx) => {
                            const billCertified = parseFloat(entry.bill_certified_value) || 0;
                            const housekeeping = parseFloat(entry.housekeeping) || 0;
                            const retention = parseFloat(entry.retention) || 0;
                            const woValue = parseFloat(entry.wo_value) || 0;
                            const advs = parseAdvances(entry.advance_details);
                            const totalPaid = advs.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);

                            const finalCredit = billCertified > 0 ? billCertified : woValue;
                            const finalDebit = housekeeping + retention + totalPaid;
                            const siteBalance = finalCredit - finalDebit;

                            grandTotalCredit += finalCredit;
                            grandTotalDebit += finalDebit;

                            return (
                                <div key={idx} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
                                    {/* Header */}
                                    <div style={{ padding: '1.25rem 1.5rem', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.25rem' }}>{entry.site_name}</h3>
                                            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>
                                                <span style={{ fontWeight: 500 }}>WO No:</span> {entry.wo_no || 'N/A'}
                                                <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>|</span>
                                                <span style={{ fontWeight: 500 }}>Date:</span> {formatDate(entry.wo_date)}
                                                <span style={{ margin: '0 0.5rem', color: '#cbd5e1' }}>|</span>
                                                <span style={{ fontWeight: 500 }}>Limit:</span> {formatCurrency(woValue)}
                                            </div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 600 }}>Balance</div>
                                            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: siteBalance >= 0 ? '#10b981' : '#ef4444' }}>
                                                {formatCurrency(siteBalance)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content Body - List Style */}
                                    <div style={{ padding: '0' }}>
                                        {/* Bill Row */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.5rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontWeight: 600, color: '#334155' }}>{billCertified > 0 ? 'Bill Certified Value' : 'Work Order Value (Assumed)'}</span>
                                            </div>
                                            <span style={{ fontWeight: 600, color: '#334155' }}>{formatCurrency(finalCredit)}</span>
                                        </div>

                                        {/* Deductions */}
                                        {(housekeeping > 0 || retention > 0) && (
                                            <div style={{ padding: '0 1.5rem 1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                                {housekeeping > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
                                                        <span style={{ color: '#475569', display: 'flex', alignItems: 'center' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', marginRight: '8px' }}></span>Less: Housekeeping</span>
                                                        <span style={{ color: '#ef4444' }}>- {formatCurrency(housekeeping)}</span>
                                                    </div>
                                                )}
                                                {retention > 0 && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.95rem' }}>
                                                        <span style={{ color: '#475569', display: 'flex', alignItems: 'center' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', marginRight: '8px' }}></span>Less: Retention</span>
                                                        <span style={{ color: '#ef4444' }}>- {formatCurrency(retention)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Payments Section */}
                                        {advs.length > 0 && (
                                            <div style={{ background: '#f8fafc', padding: '1rem 1.5rem', borderTop: '1px solid #e2e8f0' }}>
                                                <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.75rem' }}>Payments Received</div>
                                                {advs.map((adv, i) => (
                                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
                                                        <div style={{ display: 'flex', gap: '1rem' }}>
                                                            <span style={{ color: '#64748b', width: '90px' }}>{adv.date}</span>
                                                            <span style={{ color: '#334155' }}>Advance Paid ({adv.payment_mode || 'M1'})</span>
                                                        </div>
                                                        <span style={{ color: '#64748b', fontWeight: 500 }}>- {formatCurrency(adv.amount)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Grand Total Section */}
                        <div style={{ marginTop: '1rem', borderTop: '2px solid #0f172a', paddingTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                                    <span style={{ color: '#64748b' }}>Total Billed Value:</span>
                                    <span style={{ fontWeight: 600 }}>{formatCurrency(grandTotalCredit)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1rem' }}>
                                    <span style={{ color: '#64748b' }}>Total Deductions & Paid:</span>
                                    <span style={{ fontWeight: 600 }}>{formatCurrency(grandTotalDebit)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginTop: '0.5rem', borderTop: '1px solid #cbd5e1', paddingTop: '0.75rem' }}>
                                    <span>Net Payable:</span>
                                    <span style={{ color: (grandTotalCredit - grandTotalDebit) >= 0 ? '#10b981' : '#ef4444' }}>
                                        {formatCurrency(grandTotalCredit - grandTotalDebit)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                );

            } else {
                // Simple Summary
                let totalCertified = 0, totalDeductions = 0, totalPaid = 0, totalWoValue = 0;
                content = (
                    <table className={styles.masterTable} style={{ marginTop: '2rem' }}>
                        <thead>
                            <tr>
                                {summaryColumns.index && <th>#</th>}
                                {summaryColumns.site && <th style={{ textAlign: 'left' }}>Site / Project</th>}
                                {summaryColumns.wo_date && <th style={{ textAlign: 'left' }}>WO Date</th>}
                                {summaryColumns.wo_value && <th style={{ textAlign: 'right' }}>WO Value</th>}
                                {summaryColumns.bill_certified && <th style={{ textAlign: 'right' }}>Bill Certified</th>}
                                {summaryColumns.deductions && <th style={{ textAlign: 'right' }}>Deductions</th>}
                                {summaryColumns.paid && <th style={{ textAlign: 'right' }}>Total Paid</th>}
                                {summaryColumns.balance && <th style={{ textAlign: 'right' }}>Balance</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {vendor.entries.map((entry, idx) => {
                                const advs = parseAdvances(entry.advance_details);
                                const sitePaid = advs.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);

                                const billCertified = parseFloat(entry.bill_certified_value) || 0;
                                const housekeeping = parseFloat(entry.housekeeping) || 0;
                                const retention = parseFloat(entry.retention) || 0;
                                const woValue = parseFloat(entry.wo_value) || 0;

                                // Use Bill Certified if > 0, else WO Value
                                const finalBillValue = billCertified > 0 ? billCertified : woValue;
                                const totalDed = housekeeping + retention;
                                const bal = finalBillValue - totalDed - sitePaid;

                                totalCertified += finalBillValue;
                                totalWoValue += woValue;
                                totalDeductions += totalDed;
                                totalPaid += sitePaid;

                                return (
                                    <tr key={idx}>
                                        {summaryColumns.index && <td style={{ textAlign: 'center' }}>{idx + 1}</td>}
                                        {summaryColumns.site && (
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{entry.site_name}</div>
                                                {summaryColumns.wo_no && <div style={{ fontSize: '0.8em', color: '#64748b' }}>WO: {entry.wo_no || 'N/A'}</div>}
                                            </td>
                                        )}
                                        {summaryColumns.wo_date && <td>{formatDate(entry.wo_date)}</td>}
                                        {summaryColumns.wo_value && <td style={{ textAlign: 'right' }}>{formatCurrency(woValue)}</td>}
                                        {summaryColumns.bill_certified && <td style={{ textAlign: 'right' }}>{formatCurrency(finalBillValue)}</td>}
                                        {summaryColumns.deductions && <td style={{ textAlign: 'right' }}>{formatCurrency(totalDed)}</td>}
                                        {summaryColumns.paid && <td style={{ textAlign: 'right' }}>{formatCurrency(sitePaid)}</td>}
                                        {summaryColumns.balance && (
                                            <td style={{ textAlign: 'right', color: bal > 0 ? '#10b981' : '#ef4444', fontWeight: '600' }}>
                                                {formatCurrency(bal)}
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                        <tfoot>
                            <tr style={{ background: '#f8fafc', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                <td colSpan={[summaryColumns.index, summaryColumns.site, summaryColumns.wo_date].filter(Boolean).length} style={{ textAlign: 'right' }}>Grand Total</td>
                                {summaryColumns.wo_value && <td style={{ textAlign: 'right' }}>{formatCurrency(totalWoValue)}</td>}
                                {summaryColumns.bill_certified && <td style={{ textAlign: 'right' }}>{formatCurrency(totalCertified)}</td>}
                                {summaryColumns.deductions && <td style={{ textAlign: 'right' }}>{formatCurrency(totalDeductions)}</td>}
                                {summaryColumns.paid && <td style={{ textAlign: 'right' }}>{formatCurrency(totalPaid)}</td>}
                                {summaryColumns.balance && <td style={{ textAlign: 'right' }}>{formatCurrency(totalCertified - totalDeductions - totalPaid)}</td>}
                            </tr>
                        </tfoot>
                    </table>
                );
            }

            return (
                <div className={styles.statementContainer}>
                    <div className={styles.printHide} style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Button variant="secondary" onClick={() => { setSelectedStatementVendor(null); setSearchQuery(''); }}>
                                <ArrowLeft size={16} /> Select Vendor
                            </Button>
                        </div>
                        <div className={styles.viewToggle}>
                            <button
                                className={`${styles.toggleBtn} ${vendorStatementView === 'detailed' ? styles.active : ''}`}
                                onClick={() => setVendorStatementView('detailed')}
                            >
                                Detailed Ledger
                            </button>
                            <button
                                className={`${styles.toggleBtn} ${vendorStatementView === 'simple' ? styles.active : ''}`}
                                onClick={() => setVendorStatementView('simple')}
                            >
                                Simple Summary
                            </button>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            {vendorStatementView === 'simple' && (
                                <div style={{ position: 'relative' }}>
                                    <button
                                        className={styles.btnSecondary}
                                        style={{ width: 'auto', padding: '10px' }}
                                        onClick={() => setShowColumnSettings(!showColumnSettings)}
                                        title="Customize Columns"
                                    >
                                        <Settings size={18} />
                                    </button>
                                    {showColumnSettings && (
                                        <div style={{
                                            position: 'absolute',
                                            right: 0,
                                            top: '100%',
                                            zIndex: 100,
                                            background: 'white',
                                            padding: '1rem',
                                            borderRadius: '12px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                            minWidth: '220px',
                                            marginTop: '8px'
                                        }}>
                                            <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '1rem', color: '#1e293b', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.5rem' }}>Visible Columns</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                                {[
                                                    { key: 'index', label: 'Index (#)' },
                                                    { key: 'site', label: 'Site Name' },
                                                    { key: 'wo_no', label: 'Work Order No' },
                                                    { key: 'wo_date', label: 'Work Order Date' },
                                                    { key: 'wo_value', label: 'Work Order Value' },
                                                    { key: 'bill_certified', label: 'Bill Certified Value' },
                                                    { key: 'deductions', label: 'Deductions' },
                                                    { key: 'paid', label: 'Total Paid' },
                                                    { key: 'balance', label: 'Balance' }
                                                ].map(col => (
                                                    <label key={col.key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '0.9rem', color: '#475569' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={summaryColumns[col.key]}
                                                            onChange={() => setSummaryColumns(prev => ({ ...prev, [col.key]: !prev[col.key] }))}
                                                            style={{ width: '16px', height: '16px', accentColor: '#4f46e5' }}
                                                        />
                                                        {col.label}
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            <Button onClick={() => setShowPrintModal(true)}>
                                <Printer size={18} style={{ marginRight: '0.5rem' }} /> Print PDF
                            </Button>
                        </div>
                    </div>

                    {/* Printable Area */}
                    <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem' }}>
                        <div style={{ textAlign: 'center', marginBottom: '3rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem' }}>
                            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '0.5rem' }}>Vendor Statement</h1>
                            <p style={{ color: '#64748b' }}>{vendorStatementView === 'detailed' ? 'Detailed Transaction Log' : 'Project-wise Summary'}</p>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                            <div>
                                <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Vendor Name</h3>
                                <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{vendor.name}</p>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <h3 style={{ fontSize: '0.85rem', color: '#64748b', textTransform: 'uppercase' }}>Date</h3>
                                <p style={{ fontSize: '1.2rem' }}>{dateStr}</p>
                            </div>
                        </div>

                        {content}

                        <div style={{ marginTop: '4rem', display: 'flex', justifyContent: 'space-between', paddingTop: '2rem' }}>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ borderTop: '1px solid #cbd5e1', width: '200px', marginBottom: '0.5rem' }}></div>
                                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '1px' }}>Authorized Signatory</span>
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <div style={{ borderTop: '1px solid #cbd5e1', width: '200px', marginBottom: '0.5rem' }}></div>
                                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', color: '#64748b', letterSpacing: '1px' }}>Vendor Signature</span>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }
    };

    const renderContent = () => {
        if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: '#64748b' }}>Loading Dashboard Data...</div>;
        switch (currentView) {
            case 'overview': return renderOverview();
            case 'sites': return renderSites();
            case 'vendors': return renderVendors();
            case 'site_detail': return renderSiteDetail();
            case 'vendor_detail': return renderVendorDetail();
            case 'add_entry': return renderAddEntry();
            case 'admin_panel': return renderAdminPanel();
            case 'statements': return renderStatements();
            default: return renderOverview();
        }
    };

    const renderPrintModal = () => {
        if (!showPrintModal) return null;
        return (
            <div className={styles.modalOverlay}>
                <div className={styles.modalContent} style={{ maxWidth: '400px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Print Settings</h3>
                        <button onClick={() => setShowPrintModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={24} /></button>
                    </div>
                    <p style={{ color: '#64748b', marginBottom: '2rem' }}>Select page orientation for your report:</p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                        <div
                            onClick={() => setPrintOrientation('portrait')}
                            style={{
                                padding: '1.5rem 1rem',
                                border: `2px solid ${printOrientation === 'portrait' ? '#4f46e5' : '#e2e8f0'}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: printOrientation === 'portrait' ? '#f5f3ff' : 'white',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ width: '40px', height: '56px', border: '2px solid #64748b', margin: '0 auto 1rem auto', borderRadius: '4px', background: '#f8fafc' }}></div>
                            <span style={{ fontWeight: 600, color: printOrientation === 'portrait' ? '#4f46e5' : '#475569' }}>Portrait</span>
                        </div>
                        <div
                            onClick={() => setPrintOrientation('landscape')}
                            style={{
                                padding: '1.5rem 1rem',
                                border: `2px solid ${printOrientation === 'landscape' ? '#4f46e5' : '#e2e8f0'}`,
                                borderRadius: '12px',
                                cursor: 'pointer',
                                background: printOrientation === 'landscape' ? '#f5f3ff' : 'white',
                                transition: 'all 0.2s'
                            }}
                        >
                            <div style={{ width: '56px', height: '40px', border: '2px solid #64748b', margin: '8px auto 1rem auto', borderRadius: '4px', background: '#f8fafc' }}></div>
                            <span style={{ fontWeight: 600, color: printOrientation === 'landscape' ? '#4f46e5' : '#475569' }}>Landscape</span>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <Button variant="secondary" onClick={() => setShowPrintModal(false)} style={{ margin: 0 }}>Cancel</Button>
                        <Button onClick={() => { setShowPrintModal(false); setTimeout(() => window.print(), 300); }}>Continue to Print</Button>
                    </div>
                </div>
            </div>
        );
    };

    const renderBalancePopup = () => {
        if (!balancePopup) return null;
        const entry = balancePopup;
        const advs = parseAdvances(entry.advance_details || []);
        const totalAdv = advs.reduce((a, b) => a + (parseFloat(b.amount) || 0), 0);
        const billCertified = parseFloat(entry.bill_certified_value) || 0;
        const housekeeping = parseFloat(entry.housekeeping) || 0;
        const retention = parseFloat(entry.retention) || 0;
        const balance = billCertified - housekeeping - retention - totalAdv;

        return (
            <div className={styles.modalOverlay} onClick={() => setBalancePopup(null)} style={{ alignItems: 'center', justifyContent: 'center', display: 'flex' }}>
                <div className={styles.modalContent} onClick={e => e.stopPropagation()} style={{ maxWidth: '400px', width: '90%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Balance Details</h3>
                        <button onClick={() => setBalancePopup(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}><X size={20} /></button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#64748b' }}>Bill Certified Value:</span>
                            <span style={{ fontWeight: 600 }}>{formatCurrency(billCertified)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                            <span>Less: Housekeeping</span>
                            <span>- {formatCurrency(housekeeping)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                            <span>Less: Retention</span>
                            <span>- {formatCurrency(retention)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#4f46e5', borderTop: '1px dashed #cbd5e1', paddingTop: '0.5rem' }}>
                            <span>Total Paid (M1...M5)</span>
                            <span>- {formatCurrency(totalAdv)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '2px solid #e2e8f0', fontSize: '1.1rem', fontWeight: 700, color: '#b91c1c' }}>
                            <span>Balance to Pay</span>
                            <span>{formatCurrency(balance)}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className={`${styles.dashboardContainer} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
            {loading && <LoadingOverlay message="Please wait, processing data..." />}
            <style>
                {`
                @media print {
                    @page {
                        size: ${printOrientation};
                        margin: 1cm;
                    }
                }
                `}
            </style>

            <aside className={`${styles.sidebar} ${sidebarOpen ? styles.open : ''}`}>
                <div className={styles.brand}>
                    <LayoutDashboard size={28} />
                    <span>IIPL QS</span>
                </div>

                <nav className={styles.navLinks}>
                    <button
                        className={`${styles.navItem} ${currentView === 'overview' ? styles.navItemActive : ''}`}
                        onClick={() => handleSwitchView('overview')}
                    >
                        <LayoutDashboard size={18} /> Overview
                    </button>
                    <button
                        className={`${styles.navItem} ${currentView === 'sites' ? styles.navItemActive : ''}`}
                        onClick={() => handleSwitchView('sites')}
                    >
                        <Building2 size={18} /> Sites Management
                    </button>
                    <button
                        className={`${styles.navItem} ${currentView === 'vendors' ? styles.navItemActive : ''}`}
                        onClick={() => handleSwitchView('vendors')}
                    >
                        <Users size={18} /> Vendors List
                    </button>
                    {!readOnly && (
                        <>
                            <button
                                className={`${styles.navItem} ${currentView === 'add_entry' ? styles.navItemActive : ''}`}
                                onClick={() => handleSwitchView('add_entry')}
                            >
                                <PlusCircle size={18} /> {editingState ? 'Edit Entry' : 'New WO Entry'}
                            </button>
                            <button
                                className={`${styles.navItem} ${currentView === 'statements' ? styles.navItemActive : ''}`}
                                onClick={() => handleSwitchView('statements')}
                            >
                                <FileText size={18} /> Statement Reports
                            </button>
                            <button
                                className={`${styles.navItem} ${currentView === 'admin_panel' ? styles.navItemActive : ''}`}
                                onClick={() => handleSwitchView('admin_panel')}
                            >
                                <Shield size={18} /> Admin Controls
                            </button>
                        </>
                    )}
                </nav>

                <div className={styles.sidebarFooter}>
                    <p>Developed By <a href="https://www.youtube.com/channel/UC6McNBm7VIaLlwAjKOP5_VA" target="_blank" rel="noreferrer">Codearcade</a></p>
                    <Link to="/" style={{ display: 'block', marginTop: '1rem', color: '#10b981', fontWeight: 600 }}>← Back to Main</Link>
                </div>
            </aside>

            <main className={styles.mainContent}>
                <header className={styles.topBar}>
                    <button className={styles.menuToggle} onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <Menu size={24} />
                    </button>

                    <div className={styles.pageTitle}>
                        <h1>{readOnly && currentView === 'overview' ? 'Project Overview' : currentView.charAt(0).toUpperCase() + currentView.slice(1).replace('_', ' ')}</h1>
                        <p className={styles.subtitle}>Innovative Interiors - QS Dashboard</p>
                    </div>

                    <div className={styles.searchBar}>
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="Search site, vendor or WO..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <button
                            className={styles.logoutBtn}
                            onClick={() => navigate('/')}
                            title="Back to Home"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', color: '#64748b', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={e => { e.currentTarget.style.color = '#4f46e5'; e.currentTarget.style.borderColor = '#4f46e5'; }}
                            onMouseOut={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                        >
                            <Home size={18} />
                        </button>
                        <button
                            className={styles.logoutBtn}
                            onClick={logout}
                            title="Logout Session"
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px', borderRadius: '8px', border: '1px solid #fee2e2', background: '#fff1f2', color: '#e11d48', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={e => { e.currentTarget.style.background = '#ffe4e6'; e.currentTarget.style.borderColor = '#fda4af'; }}
                            onMouseOut={e => { e.currentTarget.style.background = '#fff1f2'; e.currentTarget.style.borderColor = '#fee2e2'; }}
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </header>

                <div className={styles.contentArea}>
                    {renderContent()}
                </div>
            </main>

            {renderBalancePopup()}
            {renderPrintModal()}
        </div>
    );
};

export default VendorSiteDashboard;
