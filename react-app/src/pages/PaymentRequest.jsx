import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input, LoadingOverlay, SearchableSelect } from '../components/ui';
import PrintModal from '../components/PrintModal';
import styles from './PaymentRequest.module.css';
import { numberToWords, formatDate } from '../utils';
import { useMessage } from '../context/MessageContext';

const PaymentRequest = () => {
    // State
    const [vendors, setVendors] = useState([]);
    const [sites, setSites] = useState([]);
    const [filteredWOs, setFilteredWOs] = useState([]);
    const [formData, setFormData] = useState({
        vendorName: '', pan: '', address: '', phone: '',
        accName: '', acc: '', bank: '', ifsc: '',
        invoiceNo: '', date: '', woDate: '', project: '',
        nature: '', amount: '', woValue: '', billStatus: ''
    });

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [newVendor, setNewVendor] = useState({
        name: '', pan: '', phone: '', address: '', acc_name: '', acc: '', bank: '', ifsc: '', vendorType: 'both'
    });

    // History Modal State
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyList, setHistoryList] = useState([]);
    const [historyVendorSearch, setHistoryVendorSearch] = useState('');

    const [loading, setLoading] = useState(false);
    const { alert, confirm, toast } = useMessage();

    // PAN field visibility control
    const [showPan, setShowPan] = useState(true);

    // Supabase Maps
    const DB_COLUMNS = {
        NAME: "vendor_name",
        HOLDER: "account_holder",
        PAN: "pan_no",
        PHONE: "phone",
        ADDRESS: "address",
        ACC: "account_number",
        BANK: "bank_name",
        IFSC: "ifsc_code"
    };

    useEffect(() => {
        fetchVendors();
        fetchSites();
    }, []);

    const fetchSites = async () => {
        try {
            const { data, error } = await supabase
                .from('sites')
                .select('name')
                .order('name');
            if (error) throw error;
            setSites(data || []);
        } catch (e) {
            console.error('Error fetching sites:', e);
        }
    };

    const fetchVendors = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select('*')
                .in('vendor_type', ['payment_request', 'both'])
                .order(DB_COLUMNS.NAME, { ascending: true });

            if (error) throw error;
            setVendors(data || []);
        } catch (e) {
            console.error(e);
            await alert('Could not fetch vendors. Please check connection.');
        } finally { setLoading(false); }
    };

    const handleVendorChange = (val) => {
        const vendor = vendors.find(v => v[DB_COLUMNS.NAME] === val);
        setFormData(prev => ({
            ...prev,
            vendorName: val,
            pan: vendor?.[DB_COLUMNS.PAN] || '',
            address: vendor?.[DB_COLUMNS.ADDRESS] || '',
            phone: vendor?.[DB_COLUMNS.PHONE] || '',
            acc: vendor?.[DB_COLUMNS.ACC] || '',
            bank: vendor?.[DB_COLUMNS.BANK] || '',
            ifsc: vendor?.[DB_COLUMNS.IFSC] || '',
            accName: vendor?.[DB_COLUMNS.HOLDER] || val,
            invoiceNo: '', // Reset WO
            woDate: '',
            woValue: ''
        }));
        if (val) {
            updateFilteredSites(val);
        } else {
            fetchSites();
            setFilteredWOs([]);
        }
    };

    const updateFilteredSites = async (vendorName) => {
        setLoading(true);
        try {
            const { data: vData } = await supabase.from('vendors').select('id').eq('vendor_name', vendorName).single();
            if (vData) {
                const { data, error } = await supabase
                    .from('work_orders')
                    .select('sites!inner(name)')
                    .eq('vendor_id', vData.id);

                if (error) throw error;

                // Get unique site names
                const uniqueSites = Array.from(new Set(data.map(item => item.sites.name)))
                    .map(name => ({ name }));

                setSites(uniqueSites);
                setFilteredWOs([]);
            }
        } catch (e) {
            console.error('Error filtering sites:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleSiteChange = (val) => {
        const newFormData = {
            ...formData,
            project: val,
            invoiceNo: '', // Reset WO
            woDate: '',
            woValue: ''
        };
        setFormData(newFormData);
        if (formData.vendorName && val) {
            updateFilteredWOs(formData.vendorName, val);
        } else {
            setFilteredWOs([]);
        }
    };

    const updateFilteredWOs = async (vendorName, siteName) => {
        setLoading(true);
        try {
            const { data: vData } = await supabase.from('vendors').select('id').eq('vendor_name', vendorName).single();
            const { data: sData } = await supabase.from('sites').select('id').eq('name', siteName).single();

            if (vData && sData) {
                const { data: woData, error } = await supabase
                    .from('work_orders')
                    .select('wo_no, wo_date, wo_value')
                    .eq('vendor_id', vData.id)
                    .eq('site_id', sData.id);

                if (error) throw error;
                setFilteredWOs(woData || []);
            } else {
                setFilteredWOs([]);
            }
        } catch (e) {
            console.error('Error fetching WOs:', e);
            setFilteredWOs([]);
        } finally {
            setLoading(false);
        }
    };

    const handleWOChange = (e) => {
        const val = e.target.value;
        const wo = filteredWOs.find(w => w.wo_no === val);
        setFormData(prev => ({
            ...prev,
            invoiceNo: val,
            woDate: wo?.wo_date || '',
            woValue: wo?.wo_value || ''
        }));
    };

    const saveNewVendor = async () => {
        setLoading(true);
        try {
            const data = {
                [DB_COLUMNS.NAME]: newVendor.name,
                [DB_COLUMNS.PAN]: newVendor.pan,
                [DB_COLUMNS.PHONE]: newVendor.phone,
                [DB_COLUMNS.ADDRESS]: newVendor.address,
                [DB_COLUMNS.HOLDER]: newVendor.acc_name,
                [DB_COLUMNS.ACC]: newVendor.acc,
                [DB_COLUMNS.BANK]: newVendor.bank,
                [DB_COLUMNS.IFSC]: newVendor.ifsc.toUpperCase(),
                vendor_type: newVendor.vendorType
            };

            const { error } = await supabase.from('vendors').insert([data]);
            if (error) throw error;

            toast('Vendor Saved to Supabase!');
            setIsModalOpen(false);
            fetchVendors();
        } catch (e) {
            await alert('Save Failed: ' + e.message);
        } finally { setLoading(false); }
    };

    const validateForm = async () => {
        const required = [
            { k: 'vendorName', l: 'Vendor Name' },
            { k: 'address', l: 'Address' },
            { k: 'invoiceNo', l: 'Work Order No / Invoice No' },
            { k: 'woDate', l: 'Work Order Date' },
            { k: 'project', l: 'Project' },
            { k: 'nature', l: 'Nature of Work' },
            { k: 'amount', l: 'Invoice Amount' },
            { k: 'woValue', l: 'WO Value' },
            { k: 'billStatus', l: 'Bill Status' },
            { k: 'accName', l: 'Account Holder Name' },
            { k: 'acc', l: 'Account Number' },
            { k: 'ifsc', l: 'IFSC Code' }
        ];

        for (let f of required) {
            if (!formData[f.k]) {
                await alert(`${f.l} is required`);
                return false;
            }
        }
        return true;
    };

    const handlePrint = async () => {
        if (await validateForm()) {
            setPrintModalOpen(true);
        }
    };

    const confirmPrint = () => {
        setPrintModalOpen(false);
        setTimeout(() => window.print(), 100);
    };

    const saveToHistory = async () => {
        if (!await validateForm()) return;

        setLoading(true);
        try {
            const payload = {
                type: 'payment_request',
                vendor_name: formData.vendorName,
                project: formData.project,
                amount: parseFloat(formData.amount) || 0,
                wo_value: parseFloat(formData.woValue) || 0,
                bill_status: formData.billStatus,
                date: new Date().toISOString().split('T')[0],
                wo_date: formData.woDate,
                invoice_no: formData.invoiceNo,
                nature_of_work: formData.nature,
                status: 'Pending',
                paid_amount: 0,
                remaining_amount: parseFloat(formData.amount) || 0,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase.from('payment_history').insert([payload]);
            if (error) throw error;

            toast('Payment Request Saved to History!');
        } catch (e) {
            console.error(e);
            await alert('Failed to save history: ' + e.message);
        } finally { setLoading(false); }
    };

    const openHistoryModal = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('payment_history')
                .select('*')
                .eq('type', 'payment_request')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setHistoryList(data || []);
            setHistoryModalOpen(true);
        } catch (e) {
            await alert(e.message);
        } finally { setLoading(false); }
    };

    const loadHistoryItem = async (item) => {
        // Auto-fill form with history data
        // First try to find vendor to auto-fill bank details if they match
        const vendor = vendors.find(v => v[DB_COLUMNS.NAME] === item.vendor_name);

        setFormData({
            vendorName: item.vendor_name,
            pan: vendor?.[DB_COLUMNS.PAN] || '',
            address: vendor?.[DB_COLUMNS.ADDRESS] || '',
            phone: vendor?.[DB_COLUMNS.PHONE] || '',
            accName: vendor?.[DB_COLUMNS.HOLDER] || item.vendor_name,
            acc: vendor?.[DB_COLUMNS.ACC] || '',
            bank: vendor?.[DB_COLUMNS.BANK] || '',
            ifsc: vendor?.[DB_COLUMNS.IFSC] || '',

            invoiceNo: item.invoice_no || '',
            date: item.date || '',
            woDate: item.wo_date || '',
            project: item.project || '',
            nature: item.nature_of_work || '',
            amount: item.amount || '',
            woValue: item.wo_value || '',
            billStatus: item.bill_status || ''
        });
        setHistoryModalOpen(false);
    };

    const deleteHistoryItem = async (id, e) => {
        e.stopPropagation();
        if (await confirm('Are you sure you want to delete this history record?')) {
            setLoading(true);
            try {
                const { error } = await supabase.from('payment_history').delete().eq('id', id);
                if (error) throw error;
                // Update local list
                setHistoryList(prev => prev.filter(item => item.id !== id));
                toast('Record deleted successfully');
            } catch (err) {
                await alert('Error deleting record: ' + err.message);
            } finally { setLoading(false); }
        }
    };

    const formatDate = (d) => {
        if (!d) return '';
        const parts = d.split('-');
        if (parts.length !== 3) return d;
        const [y, m, day] = parts;
        return `${day}-${m}-${y}`;
    };

    // Filter history by vendor name
    const filteredHistoryList = historyList.filter(item =>
        !historyVendorSearch || item.vendor_name?.toLowerCase().includes(historyVendorSearch.toLowerCase())
    );

    return (
        <div className={styles.container}>
            {loading && <LoadingOverlay message="Please wait..." />}
            <div className={styles.formSection}>
                <div className={styles.formHeader}>
                    <h2 className={styles.title}>Payment Request</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="secondary" onClick={openHistoryModal} style={{ padding: '8px 12px' }}>History</Button>
                        <Link to="/"><button className={styles.homeBtn}>🏠</button></Link>
                    </div>
                </div>

                <div className={styles.flexRow} style={{ marginBottom: '16px' }}>
                    <div style={{ flex: 1 }}>
                        <label className={styles.inputLabel}>Vendor Name</label>
                        <SearchableSelect
                            options={vendors.map(v => v[DB_COLUMNS.NAME])}
                            value={formData.vendorName}
                            onChange={handleVendorChange}
                            placeholder="Select Vendor"
                        />
                    </div>
                    <Button onClick={() => setIsModalOpen(true)} style={{ padding: '8px 12px' }}>+</Button>
                </div>

                <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        id="showPanCheckbox"
                        checked={showPan}
                        onChange={(e) => setShowPan(e.target.checked)}
                        style={{ cursor: 'pointer' }}
                    />
                    <label htmlFor="showPanCheckbox" style={{ cursor: 'pointer', userSelect: 'none' }}>Include PAN No</label>
                </div>

                <div className={styles.gridCols2}>
                    {showPan && <Input label="PAN NO" value={formData.pan} onChange={e => setFormData({ ...formData, pan: e.target.value })} />}
                    <Input label="Phone" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </div>
                <div style={{ marginTop: '12px' }}>
                    <Input label="Address" multiline={true} rows={3} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                </div>

                <hr className={styles.divider} />
                <div className={styles.gridCols2}>
                    <div>
                        <label className={styles.inputLabel}>Work Order No / Invoice No</label>
                        <select className={styles.select} value={formData.invoiceNo} onChange={handleWOChange}>
                            <option value="">Select Work Order</option>
                            {filteredWOs.map((wo, i) => (
                                <option key={i} value={wo.wo_no}>{wo.wo_no}</option>
                            ))}
                        </select>
                    </div>
                    <Input type="date" label="Work Order Date" value={formData.woDate} onChange={e => setFormData({ ...formData, woDate: e.target.value })} />
                </div>
                <div style={{ marginTop: '12px' }}>
                    <label className={styles.inputLabel}>Project</label>
                    <SearchableSelect
                        options={sites.map(s => s.name)}
                        value={formData.project}
                        onChange={handleSiteChange}
                        placeholder="Select Project"
                    />
                </div>
                <div style={{ marginTop: '12px' }}>
                    <Input label="Nature of Work" value={formData.nature} onChange={e => setFormData({ ...formData, nature: e.target.value })} />
                </div>
                <div className={styles.gridCols2} style={{ marginTop: '12px' }}>
                    <Input label="Invoice Amount" type="text" inputMode="decimal" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                    <Input label="WO Value" type="text" inputMode="decimal" value={formData.woValue} onChange={e => setFormData({ ...formData, woValue: e.target.value })} />
                </div>
                <div style={{ marginTop: '12px' }}>
                    <Input label="Bill Status" value={formData.billStatus} placeholder="ADVANCE / PARTIAL / FINAL" onChange={e => setFormData({ ...formData, billStatus: e.target.value })} />
                </div>

                <hr className={styles.divider} />
                <div className={styles.gridCols2}>
                    <Input label="Account Holder" value={formData.accName} onChange={e => setFormData({ ...formData, accName: e.target.value })} />
                    <Input label="Account No" value={formData.acc} onChange={e => setFormData({ ...formData, acc: e.target.value })} />
                </div>
                <div className={styles.gridCols2} style={{ marginTop: '12px' }}>
                    <Input label="Bank Name" value={formData.bank} onChange={e => setFormData({ ...formData, bank: e.target.value })} />
                    <Input label="IFSC Code" value={formData.ifsc} onChange={e => setFormData({ ...formData, ifsc: e.target.value })} />
                </div>

                <div className={styles.buttonGroup}>
                    <Button variant="secondary" style={{ flex: 1 }} onClick={handlePrint}>Print Request</Button>
                    <Button style={{ flex: 1 }} onClick={saveToHistory}>Save Record</Button>
                </div>
            </div>

            <div className={styles.previewSection}>
                <div id="printArea" className={`${styles.printArea} printable-content`}>
                    <table className={styles.gridTable}>
                        <tbody>
                            <tr>
                                <td colSpan="2" className={styles.headerRow}>SUB VENDOR PAYMENT REQUEST</td>
                            </tr>
                            <tr>
                                <td className={styles.labelCell}>PROJECT NAME</td>
                                <td className={styles.valueCell}>{formData.project}</td>
                            </tr>
                            <tr>
                                <td className={styles.labelCell}>SUB VENDOR NAME</td>
                                <td className={styles.valueCell} style={{ fontWeight: 'bold' }}>{formData.vendorName}</td>
                            </tr>
                            <tr>
                                <td className={styles.labelCell}>NAME OF WORK</td>
                                <td className={styles.valueCell}>{formData.nature}</td>
                            </tr>
                            <tr>
                                <td className={styles.labelCell}>WO -NO</td>
                                <td className={styles.valueCell}>{formData.invoiceNo}</td>
                            </tr>
                            <tr>
                                <td className={styles.labelCell}>WO-DATE</td>
                                <td className={styles.valueCell}>{formatDate(formData.woDate)}</td>
                            </tr>
                            <tr>
                                <td className={styles.labelCell}>WO-VALUE</td>
                                <td className={styles.valueCell}>{formData.woValue ? "Rs. " + parseFloat(formData.woValue).toLocaleString('en-IN') : ""}</td>
                            </tr>
                            <tr>
                                <td className={styles.labelCell}>ACOUNT NUMBER</td>
                                <td className={styles.valueCell}>{formData.acc}</td>
                            </tr>
                            <tr>
                                <td className={styles.labelCell}>BANK</td>
                                <td className={styles.valueCell}>{formData.bank}</td>
                            </tr>
                            <tr>
                                <td className={styles.labelCell}>IFSC</td>
                                <td className={styles.valueCell}>{formData.ifsc}</td>
                            </tr>
                            {showPan && (
                                <tr>
                                    <td className={styles.labelCell}>PAN NO</td>
                                    <td className={styles.valueCell}>{formData.pan}</td>
                                </tr>
                            )}
                            <tr>
                                <td className={styles.labelCell}>REQUEST DATE</td>
                                <td className={styles.valueCell}>{formatDate(new Date().toISOString().split('T')[0])}</td>
                            </tr>
                            <tr>
                                <td className={styles.labelCell} style={{ height: '55px' }}>BILL STATUS</td>
                                <td className={styles.valueCell} style={{ padding: 0, height: '55px' }}>
                                    <div className={styles.billStatusContainer}>
                                        <div className={styles.statusBox} style={{ flex: 1.5 }}>
                                            {formData.billStatus}
                                        </div>
                                        <div className={styles.statusBox} style={{ flex: 1, borderLeft: '1px solid #000', borderRight: '1px solid #000' }}>&nbsp;</div>
                                        <div className={styles.statusBox} style={{ flex: 1 }}>&nbsp;</div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <td className={styles.labelCell} style={{ height: '55px' }}>REQUEST AMOUNT</td>
                                <td className={styles.valueCell} style={{ padding: 0, height: '55px' }}>
                                    <div className={styles.billStatusContainer}>
                                        <div className={styles.statusBox} style={{ flex: 1.5, fontSize: '14pt' }}>
                                            <strong>{formData.amount ? "Rs. " + parseFloat(formData.amount).toLocaleString('en-IN') : ""}</strong>
                                        </div>
                                        <div className={styles.statusBox} style={{ flex: 1, borderLeft: '1px solid #000', borderRight: '1px solid #000' }}>&nbsp;</div>
                                        <div className={styles.statusBox} style={{ flex: 1 }}>&nbsp;</div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>

                    <div className={styles.rupeesSection}>
                        <div className={styles.rupeesValue}>
                            {formData.amount ? "(RUPEES " + numberToWords(Math.round(formData.amount)).toUpperCase() + " ONLY)" : ""}
                        </div>
                    </div>

                    <div className={styles.footerGrid}>
                        <div className={styles.footerItem}>PREPARED</div>
                        <div className={styles.footerItem}>GM</div>
                        <div className={styles.footerItem}>MD</div>
                        <div className={styles.footerItem}>ACCOUNTS</div>
                    </div>
                </div>
            </div>

            {/* Vendor Modal */}
            {isModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3 className={styles.modalTitle}>Add Vendor</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <Input placeholder="Vendor Name" value={newVendor.name} onChange={e => setNewVendor({ ...newVendor, name: e.target.value })} />
                            <Input placeholder="Account Holder Name" value={newVendor.acc_name} onChange={e => setNewVendor({ ...newVendor, acc_name: e.target.value })} />
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.9rem' }}>Vendor Type</label>
                                <select
                                    className={styles.select}
                                    value={newVendor.vendorType}
                                    onChange={e => setNewVendor({ ...newVendor, vendorType: e.target.value })}
                                    style={{ width: '100%', padding: '10px' }}
                                >
                                    <option value="both">Both (Payment Request & Invoice)</option>
                                    <option value="payment_request">Payment Request Only</option>
                                    <option value="invoice">Invoice Only</option>
                                </select>
                            </div>
                            <div className={styles.gridCols2}>
                                <Input placeholder="PAN" value={newVendor.pan} onChange={e => setNewVendor({ ...newVendor, pan: e.target.value })} />
                                <Input placeholder="Phone" value={newVendor.phone} onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })} />
                            </div>
                            <Input placeholder="Address" multiline={true} rows={3} value={newVendor.address} onChange={e => setNewVendor({ ...newVendor, address: e.target.value })} />
                            <Input placeholder="Acc No" value={newVendor.acc} onChange={e => setNewVendor({ ...newVendor, acc: e.target.value })} />
                            <div className={styles.gridCols2}>
                                <Input placeholder="Bank" value={newVendor.bank} onChange={e => setNewVendor({ ...newVendor, bank: e.target.value })} />
                                <Input placeholder="IFSC" value={newVendor.ifsc} onChange={e => setNewVendor({ ...newVendor, ifsc: e.target.value })} />
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button onClick={saveNewVendor}>Save</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {historyModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ maxWidth: '600px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 className={styles.modalTitle} style={{ margin: 0 }}>Previous Requests</h3>
                            <button onClick={() => setHistoryModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>×</button>
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <input
                                type="text"
                                placeholder="Search by vendor name..."
                                value={historyVendorSearch}
                                onChange={(e) => setHistoryVendorSearch(e.target.value)}
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.9rem' }}
                            />
                        </div>
                        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                                    <tr>
                                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                                        <th style={{ padding: '8px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Vendor</th>
                                        <th style={{ padding: '8px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Amount</th>
                                        <th style={{ padding: '8px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHistoryList.map(item => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '8px' }}>{item.date}</td>
                                            <td style={{ padding: '8px' }}>{item.vendor_name}</td>
                                            <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>₹{item.amount}</td>
                                            <td style={{ padding: '8px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <Button variant="secondary" style={{ padding: '2px 8px', fontSize: '0.8rem' }} onClick={() => loadHistoryItem(item)}>Load</Button>
                                                <button
                                                    onClick={(e) => deleteHistoryItem(item.id, e)}
                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1rem' }}
                                                    title="Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredHistoryList.length === 0 && <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center' }}>No history found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <PrintModal
                isOpen={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                onConfirm={confirmPrint}
            />
        </div>
    );
};

export default PaymentRequest;
