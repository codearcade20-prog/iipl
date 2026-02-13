import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Button } from '../components/ui/Button';
import { Input, LoadingOverlay } from '../components/ui';
import PrintModal from '../components/PrintModal';
import styles from './InvoiceGenerator.module.css';
import { numberToWords, formatDate } from '../utils';
import { useMessage } from '../context/MessageContext';

const InvoiceGenerator = () => {
    const [vendors, setVendors] = useState([]);
    const [sites, setSites] = useState([]);
    const [filteredWOs, setFilteredWOs] = useState([]);
    const [formData, setFormData] = useState({
        pan: '', vendorName: '', address: '', phone: '',
        invoiceNo: '', date: new Date().toISOString().split('T')[0], woDate: '', project: '',
        accName: '', acc: '', ifsc: '', bank: '', woNumber: ''
    });

    const [items, setItems] = useState([{ desc: '', unit: '', amount: '' }]);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [newVendor, setNewVendor] = useState({ name: '', pan: '', phone: '', address: '', acc_name: '', acc: '', bank: '', ifsc: '', vendorType: 'both' });

    // History Modal
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyList, setHistoryList] = useState([]);
    const [historyVendorSearch, setHistoryVendorSearch] = useState('');

    const [loading, setLoading] = useState(false);
    const [showWoDate, setShowWoDate] = useState(false);
    const { alert, confirm, toast } = useMessage();

    // DB Mapping
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
                .in('vendor_type', ['invoice', 'both'])
                .order(DB_COLUMNS.NAME, { ascending: true });

            if (error) throw error;
            setVendors(data || []);
        } catch (e) {
            console.error(e);
            await alert("Could not load vendors from Supabase.");
        } finally {
            setLoading(false);
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
                setFilteredWOs([]); // Reset WOs when vendor changes
            }
        } catch (e) {
            console.error('Error filtering sites:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleVendorChange = (e) => {
        const val = e.target.value;
        const vendor = vendors.find(v => v[DB_COLUMNS.NAME] === val);
        const newFormData = {
            ...formData,
            vendorName: val,
            pan: vendor?.[DB_COLUMNS.PAN] || '',
            address: vendor?.[DB_COLUMNS.ADDRESS] || '',
            phone: vendor?.[DB_COLUMNS.PHONE] || '',
            acc: vendor?.[DB_COLUMNS.ACC] || '',
            bank: vendor?.[DB_COLUMNS.BANK] || '',
            ifsc: vendor?.[DB_COLUMNS.IFSC] || '',
            accName: vendor?.[DB_COLUMNS.HOLDER] || val,
            project: '', // Reset project
            woNumber: '' // Reset WO
        };
        setFormData(newFormData);

        if (val) {
            updateFilteredSites(val);
        } else {
            fetchSites();
            setFilteredWOs([]);
        }
    };

    const handleSiteChange = (e) => {
        const val = e.target.value;
        const newFormData = { ...formData, project: val, woNumber: '' };
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
        setFormData(prev => ({ ...prev, woNumber: val }));

        // Auto-populate first item description
        if (items.length > 0) {
            const newItems = [...items];
            newItems[0].desc = val;
            setItems(newItems);
        }
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = () => setItems([...items, { desc: '', unit: '', amount: '' }]);
    const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

    const total = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    const exportToExcel = () => {
        const data = [
            ["INVOICE"],
            ["Vendor Name", formData.vendorName],
            ["PAN NO", formData.pan],
            ["Address", formData.address],
            ["Phone", formData.phone],
            ["Invoice No", formData.invoiceNo],
            ["Work Order No", formData.woNumber],
            ["Date", formData.date],
            ["Project", formData.project],
            [],
            ["S.No", "Description", "Unit", "Amount"]
        ];

        items.forEach((item, index) => {
            data.push([index + 1, item.desc, item.unit, parseFloat(item.amount) || 0]);
        });

        data.push([], ["", "", "Total", total]);
        data.push(["Amount in Words", numberToWords(total).toUpperCase() + " ONLY"]);
        data.push([], ["Bank Details"]);
        data.push(["Account Holder Name", formData.accName]);
        data.push(["Account Number", formData.acc]);
        data.push(["IFSC Code", formData.ifsc]);
        data.push(["Bank Name", formData.bank]);

        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Invoice");
        XLSX.writeFile(wb, `Invoice_${formData.invoiceNo}_${formData.vendorName}.xlsx`);
    };

    // New Vendor Logic
    const saveNewVendor = async () => {
        setLoading(true);
        try {
            const data = {
                [DB_COLUMNS.NAME]: newVendor.name,
                [DB_COLUMNS.HOLDER]: newVendor.acc_name,
                [DB_COLUMNS.PAN]: newVendor.pan,
                [DB_COLUMNS.PHONE]: newVendor.phone,
                [DB_COLUMNS.ADDRESS]: newVendor.address,
                [DB_COLUMNS.ACC]: newVendor.acc,
                [DB_COLUMNS.BANK]: newVendor.bank,
                [DB_COLUMNS.IFSC]: newVendor.ifsc.toUpperCase(),
                vendor_type: newVendor.vendorType
            };

            const { error } = await supabase.from('vendors').insert([data]);
            if (error) throw error;

            toast("Vendor Saved");
            setIsModalOpen(false);
            fetchVendors();
        } catch (e) { await alert(e.message); }
        finally { setLoading(false); }
    };



    const validateForm = async () => {
        const required = [
            { k: 'vendorName', l: 'Vendor Name' },
            { k: 'address', l: 'Address' },
            { k: 'invoiceNo', l: 'Invoice No' },
            { k: 'date', l: 'Date' },
            { k: 'project', l: 'Project Name' },
            { k: 'woNumber', l: 'Work Order No' },
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

        if (items.length === 0) {
            await alert("Please add at least one item");
            return false;
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

        const totalItems = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

        setLoading(true);
        try {
            const payload = {
                type: 'invoice',
                vendor_name: formData.vendorName,
                project: formData.project,
                amount: totalItems,
                wo_value: null,
                bill_status: 'FINAL',
                date: formData.date,
                invoice_no: formData.invoiceNo,
                // Add Work Order Number here. Note: User needs to add 'wo_no' column to DB if not exists.
                wo_no: formData.woNumber,
                status: 'Pending',
                paid_amount: 0,
                remaining_amount: totalItems,
                items_data: items,
                created_at: new Date().toISOString()
            };

            const { error } = await supabase.from('payment_history').insert([payload]);
            if (error) throw error;

            toast('Invoice Saved to History!');
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
                .eq('type', 'invoice')
                .order('created_at', { ascending: false })
                .limit(20);

            if (error) throw error;
            setHistoryList(data || []);
            setHistoryModalOpen(true);
        } catch (e) {
            await alert(e.message);
        } finally { setLoading(false); }
    };

    const loadHistoryItem = (item) => {
        // Find vendor to autofill details
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
            woNumber: item.wo_no || '', // Load WO Number
            date: item.date || '',
            woDate: item.wo_date || '',
            project: item.project || ''
        });

        if (item.items_data) {
            setItems(item.items_data);
        } else {
            // Legacy fallback for old history items
            setItems([{ desc: '', unit: 'LS', amount: item.amount || '' }]);
        }

        setHistoryModalOpen(false);
        setShowWoDate(!!item.wo_date);
    };

    const deleteHistoryItem = async (id, e) => {
        e.stopPropagation();
        if (await confirm('Are you sure you want to delete this invoice record?')) {
            setLoading(true);
            try {
                const { error } = await supabase.from('payment_history').delete().eq('id', id);
                if (error) throw error;
                setHistoryList(prev => prev.filter(item => item.id !== id));
                toast('Invoice deleted successfully');
            } catch (err) {
                await alert('Error deleting: ' + err.message);
            } finally { setLoading(false); }
        }
    };

    const formatDate = (d) => {
        if (!d) return '';
        const [y, m, day] = d.split('-');
        return `${day}-${m}-${y}`;
    };

    const getSigName = () => {
        if (!formData.vendorName) return '';
        const parts = formData.vendorName.split(' ');
        return parts[0] + (parts[1] ? ' ' + parts[1] : '');
    };

    // Filter history by vendor name
    const filteredHistoryList = historyList.filter(item =>
        !historyVendorSearch || item.vendor_name?.toLowerCase().includes(historyVendorSearch.toLowerCase())
    );

    return (
        <div className={styles.container}>
            {loading && <LoadingOverlay message="Please wait..." />}
            <div className={styles.sidebar}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Invoice Data Entry</h2>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button variant="secondary" onClick={openHistoryModal} style={{ padding: '8px 12px' }}>History</Button>
                        <Link to="/"><button className={styles.homeBtn}>🏠</button></Link>
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Vendor Name</label>
                    <div className={styles.row}>
                        <select className={styles.select} value={formData.vendorName} onChange={handleVendorChange}>
                            <option value="">Select Vendor</option>
                            {vendors.map((v, i) => <option key={i} value={v[DB_COLUMNS.NAME]}>{v[DB_COLUMNS.NAME]}</option>)}
                        </select>
                        <Button onClick={() => setIsModalOpen(true)} style={{ padding: '8px 14px' }}>+</Button>
                    </div>
                </div>

                <Input label="PAN NO" value={formData.pan} onChange={e => setFormData({ ...formData, pan: e.target.value })} />

                <Input label="City / Address" multiline={true} rows={3} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} placeholder="Enter City / Address" />

                <Input label="Phone Number" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />

                <hr className={styles.divider} />
                <div className={styles.grid2}>
                    <Input label="Invoice No" value={formData.invoiceNo} onChange={e => setFormData({ ...formData, invoiceNo: e.target.value })} />
                    <Input type="date" label="Date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
                <div style={{ marginTop: '12px' }}>
                    <Input
                        label="Work Order No"
                        value={formData.woNumber || ''}
                        onChange={e => {
                            const val = e.target.value;
                            setFormData(prev => ({ ...prev, woNumber: val }));

                            // Auto-populate first item description
                            if (items.length > 0) {
                                const newItems = [...items];
                                newItems[0].desc = val;
                                setItems(newItems);
                            }
                        }}
                    />
                </div>
                <div style={{ marginTop: '16px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        id="showWoDate"
                        checked={showWoDate}
                        onChange={(e) => setShowWoDate(e.target.checked)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="showWoDate" style={{ cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500', color: 'var(--text-secondary)' }}>
                        Include Work Order Date
                    </label>
                </div>

                {showWoDate && (
                    <div style={{ marginTop: '12px' }}>
                        <Input type="date" label="Work Order Date" value={formData.woDate} onChange={e => setFormData({ ...formData, woDate: e.target.value })} />
                    </div>
                )}
                <div style={{ marginTop: '12px' }}>
                    <Input label="Project Name" value={formData.project} onChange={e => setFormData({ ...formData, project: e.target.value })} />
                </div>

                <hr className={styles.divider} />
                <label className={styles.label}>Invoice Items</label>
                <table className={styles.itemsFormTable}>
                    <thead>
                        <tr>
                            <th style={{ width: '55%' }}>Desc</th>
                            <th style={{ width: '15%' }}>Unit</th>
                            <th style={{ width: '20%' }}>Amt</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={index}>
                                <td><textarea className={styles.itemInput} rows="1" value={item.desc} onChange={e => handleItemChange(index, 'desc', e.target.value)} /></td>
                                <td><input className={styles.itemInput} value={item.unit} onChange={e => handleItemChange(index, 'unit', e.target.value)} /></td>
                                <td><input type="text" inputMode="decimal" className={styles.itemInput} value={item.amount} onChange={e => handleItemChange(index, 'amount', e.target.value)} /></td>
                                <td><button className={styles.removeBtn} onClick={() => removeItem(index)}>×</button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <Button variant="secondary" onClick={addItem} style={{ width: '100%' }}>+ Add Item</Button>

                <hr className={styles.divider} />
                <Input label="Account Holder Name" value={formData.accName} onChange={e => setFormData({ ...formData, accName: e.target.value })} />
                <Input label="Account Number" value={formData.acc} onChange={e => setFormData({ ...formData, acc: e.target.value })} />
                <Input label="IFSC Code" value={formData.ifsc} onChange={e => setFormData({ ...formData, ifsc: e.target.value })} />
                <Input label="Bank Name" value={formData.bank} onChange={e => setFormData({ ...formData, bank: e.target.value })} />

                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Button onClick={handlePrint}>Print Invoice</Button>
                    <div className={styles.row}>
                        <Button style={{ background: '#28a745', color: 'white', flex: 1 }} onClick={exportToExcel}>Save Excel</Button>
                        <Button style={{ background: '#0070c0', color: 'white', flex: 1 }} onClick={saveToHistory}>Save to History</Button>
                    </div>
                </div>
            </div>

            <div className={styles.previewArea}>
                <div className={`${styles.invoicePaper} printable-content`}>
                    <div className={styles.panNo}>PAN NO: {formData.pan}</div>

                    <div className={styles.borderBox} style={{ background: 'white' }}>
                        <div className={styles.headerTitle}>INVOICE</div>
                        <div className={styles.vendorDetails}>
                            <div className={styles.previewVendorName}>{formData.vendorName}</div>
                            <div style={{ whiteSpace: 'pre-wrap', fontWeight: 'bold' }}>{formData.address}</div>
                            <div style={{ fontWeight: 'bold' }}>{formData.phone ? `Ph no: ${formData.phone}` : ''}</div>
                        </div>

                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem} style={{ fontWeight: 'bold' }}>Invoice No: {formData.invoiceNo}</div>
                            <div className={styles.infoItem} style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatDate(formData.date)}</div>
                            {showWoDate && (
                                <>
                                    <div className={styles.infoItem} style={{ fontWeight: 'bold' }}>WO Date: {formatDate(formData.woDate)}</div>
                                    <div className={styles.infoItem} style={{ textAlign: 'right' }}></div>
                                </>
                            )}
                            <div className={styles.toSection} style={{ gridColumn: 'span 2' }}>TO</div>
                            <div className={styles.clientName} style={{ gridColumn: 'span 2', paddingBottom: '10px' }}>
                                Innovative Interiors Pvt Ltd,<br />
                                No 7, V V Kovil Street,<br />
                                Chinmaya Nagar,<br />
                                Koyembedu, Chennai-92
                            </div>
                        </div>

                        <div className={styles.projectName}>{formData.project}</div>

                        <table className={styles.previewTable}>
                            <thead>
                                <tr>
                                    <th style={{ width: '50px' }}>S.No</th>
                                    <th className={styles.descCol}>Description</th>
                                    <th style={{ width: '80px' }}>Unit</th>
                                    <th className={styles.amountCol} style={{ textAlign: 'center' }}>Amount Rs.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, i) => (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        <td className={styles.descCol}>{item.desc}</td>
                                        <td>{item.unit}</td>
                                        <td className={styles.amountCol}>{(parseFloat(item.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr style={{ fontWeight: 'bold' }}>
                                    <td colSpan="3" style={{ textAlign: 'center' }}>Total</td>
                                    <td className={styles.amountCol}>{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tfoot>
                        </table>

                        <div className={styles.wordsSection}>
                            (RUPEES {numberToWords(total).toUpperCase()} ONLY)
                        </div>

                        <div style={{ padding: '15px' }}>
                            <div className={styles.bankDetails}>
                                ACCOUNT HOLDER NAME - {formData.accName}<br />
                                ACCOUNT NUMBER - {formData.acc}<br />
                                IFSC CODE - {formData.ifsc}<br />
                                BANK - {formData.bank}
                            </div>
                            <div className={styles.footerSig}>
                                For {getSigName()}
                            </div>
                        </div>
                    </div>
                </div>
            </div>


            {/* Modal */}
            {isModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: 'white', padding: 30, borderRadius: 16, width: 450, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <h3 className={styles.title} style={{ marginBottom: 20 }}>Add Vendor</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <Input placeholder="Name" value={newVendor.name} onChange={e => setNewVendor({ ...newVendor, name: e.target.value })} />
                            <Input placeholder="Account Holder Name" value={newVendor.acc_name} onChange={e => setNewVendor({ ...newVendor, acc_name: e.target.value })} />
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.9rem' }}>Vendor Type</label>
                                <select
                                    className={styles.select}
                                    value={newVendor.vendorType}
                                    onChange={e => setNewVendor({ ...newVendor, vendorType: e.target.value })}
                                    style={{ width: '100%', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                                >
                                    <option value="both">Both (Payment Request & Invoice)</option>
                                    <option value="payment_request">Payment Request Only</option>
                                    <option value="invoice">Invoice Only</option>
                                </select>
                            </div>
                            <Input placeholder="PAN" value={newVendor.pan} onChange={e => setNewVendor({ ...newVendor, pan: e.target.value })} />
                            <div className={styles.grid2}>
                                <Input placeholder="Phone" value={newVendor.phone} onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })} />
                                <Input placeholder="Acc No" value={newVendor.acc} onChange={e => setNewVendor({ ...newVendor, acc: e.target.value })} />
                            </div>
                            <Input placeholder="Address" multiline={true} rows={3} value={newVendor.address} onChange={e => setNewVendor({ ...newVendor, address: e.target.value })} />
                            <div className={styles.grid2}>
                                <Input placeholder="Bank" value={newVendor.bank} onChange={e => setNewVendor({ ...newVendor, bank: e.target.value })} />
                                <Input placeholder="IFSC" value={newVendor.ifsc} onChange={e => setNewVendor({ ...newVendor, ifsc: e.target.value })} />
                            </div>
                        </div>
                        <div className={styles.row} style={{ justifyContent: 'flex-end', marginTop: 24 }}>
                            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                            <Button onClick={saveNewVendor}>Save</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {historyModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: 'white', padding: 30, borderRadius: 16, width: 600, maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                            <h3 className={styles.title} style={{ margin: 0 }}>Previous Invoices</h3>
                            <button onClick={() => setHistoryModalOpen(false)} style={{ border: 'none', background: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}>×</button>
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
                        <div style={{ overflowY: 'auto', flex: 1 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                                <thead style={{ background: '#f8fafc', position: 'sticky', top: 0 }}>
                                    <tr>
                                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Date</th>
                                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Vendor</th>
                                        <th style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Amount</th>
                                        <th style={{ padding: '10px', textAlign: 'center', borderBottom: '1px solid #e2e8f0' }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHistoryList.map(item => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px' }}>{item.date}</td>
                                            <td style={{ padding: '10px' }}>{item.vendor_name}</td>
                                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>₹{item.amount?.toLocaleString('en-IN')}</td>
                                            <td style={{ padding: '10px', textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <Button variant="secondary" style={{ padding: '4px 10px', fontSize: '0.85rem' }} onClick={() => loadHistoryItem(item)}>Load</Button>
                                                <button
                                                    onClick={(e) => deleteHistoryItem(item.id, e)}
                                                    style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '1.1rem' }}
                                                    title="Delete"
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredHistoryList.length === 0 && <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No history found.</td></tr>}
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

export default InvoiceGenerator;
