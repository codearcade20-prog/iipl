import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui';
import styles from './InvoiceGenerator.module.css';
import { numberToWords } from '../utils';

const InvoiceGenerator = () => {
    const [vendors, setVendors] = useState([]);
    const [formData, setFormData] = useState({
        pan: '', vendorName: '', address: '', phone: '',
        invoiceNo: '', date: '', project: '',
        accName: '', acc: '', ifsc: '', bank: ''
    });

    const [items, setItems] = useState([{ desc: '', unit: '', amount: '' }]);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newVendor, setNewVendor] = useState({ name: '', pan: '', phone: '', address: '', acc_name: '', acc: '', bank: '', ifsc: '' });

    // History Modal
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historyList, setHistoryList] = useState([]);

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
    }, []);

    const fetchVendors = async () => {
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select('*')
                .order(DB_COLUMNS.NAME, { ascending: true });

            if (error) throw error;
            setVendors(data || []);
        } catch (e) {
            console.error(e);
            alert("Could not load vendors from Supabase.");
        }
    };

    const handleVendorChange = (e) => {
        const val = e.target.value;
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
            accName: vendor?.[DB_COLUMNS.HOLDER] || val
        }));
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
        try {
            const data = {
                [DB_COLUMNS.NAME]: newVendor.name,
                [DB_COLUMNS.PAN]: newVendor.pan,
                [DB_COLUMNS.PHONE]: newVendor.phone,
                [DB_COLUMNS.ADDRESS]: newVendor.address,
                [DB_COLUMNS.ACC]: newVendor.acc,
                [DB_COLUMNS.BANK]: newVendor.bank,
                [DB_COLUMNS.IFSC]: newVendor.ifsc.toUpperCase(),
            };

            const { error } = await supabase.from('vendors').insert([data]);
            if (error) throw error;

            alert("Vendor Saved");
            setIsModalOpen(false);
            fetchVendors();
        } catch (e) { alert(e.message); }
    };

    const saveToHistory = async () => {
        if (!formData.vendorName || items.length === 0) {
            alert('Please fill Vendor Name and add items');
            return;
        }

        const totalItems = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

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
                status: 'Pending',
                created_at: new Date().toISOString()
            };

            const { error } = await supabase.from('payment_history').insert([payload]);
            if (error) throw error;

            alert('Invoice Saved to History!');
        } catch (e) {
            console.error(e);
            alert('Failed to save history: ' + e.message);
        }
    };

    const openHistoryModal = async () => {
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
            alert(e.message);
        }
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
            date: item.date || '',
            project: item.project || ''
        });

        // Note: We cannot restore individual line items as they aren't stored in history heavily
        // But we can set up the basic structure
        setItems([{ desc: 'Imported from history - please verify details', unit: 'LS', amount: item.amount || '' }]);

        setHistoryModalOpen(false);
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

    return (
        <div className={styles.container}>
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

                <div className={styles.inputGroup}>
                    <label className={styles.label}>City / Address</label>
                    <textarea
                        className={styles.textarea}
                        value={formData.address}
                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                        placeholder="Enter City / Address"
                    />
                </div>

                <Input label="Phone Number" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />

                <hr className={styles.divider} />
                <div className={styles.grid2}>
                    <Input label="Invoice No" value={formData.invoiceNo} onChange={e => setFormData({ ...formData, invoiceNo: e.target.value })} />
                    <Input type="date" label="Date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} />
                </div>
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
                                <td><input type="number" className={styles.itemInput} value={item.amount} onChange={e => handleItemChange(index, 'amount', e.target.value)} /></td>
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
                    <Button onClick={() => window.print()}>Print Invoice</Button>
                    <div className={styles.row}>
                        <Button style={{ background: '#28a745', color: 'white', flex: 1 }} onClick={exportToExcel}>Save Excel</Button>
                        <Button style={{ background: '#0070c0', color: 'white', flex: 1 }} onClick={saveToHistory}>Save to History</Button>
                    </div>
                </div>
            </div>

            <div className={styles.previewArea}>
                <div className={styles.invoicePaper}>
                    <div className={styles.panNo}>PAN NO: <span style={{ fontWeight: 'bold' }}>{formData.pan}</span></div>

                    <div className={styles.borderBox} style={{ background: 'white', position: 'relative', zIndex: 1 }}>
                        <div className={styles.headerTitle}>INVOICE</div>
                        <div className={styles.vendorDetails}>
                            <div className={styles.previewVendorName}>{formData.vendorName}</div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{formData.address}</div>
                            <div>{formData.phone}</div>
                        </div>

                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>Invoice No: {formData.invoiceNo}</div>
                            <div className={styles.infoItem} style={{ textAlign: 'right' }}>{formatDate(formData.date)}</div>
                            <div className={styles.toSection} style={{ gridColumn: 'span 2' }}>TO</div>
                            <div className={styles.clientName} style={{ gridColumn: 'span 2' }}>
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
                                    <th style={{ width: '40px' }}>S.No</th>
                                    <th className={styles.descCol}>Description</th>
                                    <th style={{ width: '60px' }}>Unit</th>
                                    <th className={styles.amountCol}>Amount Rs.</th>
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

                        <div style={{ padding: '10px' }}>
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
                            <Input placeholder="PAN" value={newVendor.pan} onChange={e => setNewVendor({ ...newVendor, pan: e.target.value })} />
                            <div className={styles.grid2}>
                                <Input placeholder="Phone" value={newVendor.phone} onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })} />
                                <Input placeholder="Acc No" value={newVendor.acc} onChange={e => setNewVendor({ ...newVendor, acc: e.target.value })} />
                            </div>
                            <textarea
                                className={styles.textarea}
                                placeholder="Address"
                                value={newVendor.address}
                                onChange={e => setNewVendor({ ...newVendor, address: e.target.value })}
                            />
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
                                    {historyList.map(item => (
                                        <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '10px' }}>{item.date}</td>
                                            <td style={{ padding: '10px' }}>{item.vendor_name}</td>
                                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>₹{item.amount?.toLocaleString('en-IN')}</td>
                                            <td style={{ padding: '10px', textAlign: 'center' }}>
                                                <Button variant="secondary" style={{ padding: '4px 10px', fontSize: '0.85rem' }} onClick={() => loadHistoryItem(item)}>Load</Button>
                                            </td>
                                        </tr>
                                    ))}
                                    {historyList.length === 0 && <tr><td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>No history found.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvoiceGenerator;
