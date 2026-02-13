import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Button } from '../components/ui/Button';
import { Input, LoadingOverlay } from '../components/ui';
import PrintModal from '../components/PrintModal';
import styles from './BillGenerator.module.css';
import { numberToWords, formatDateShort } from '../utils';
import { useMessage } from '../context/MessageContext';

const BillGenerator = () => {
    const [vendors, setVendors] = useState([]);
    const [loading, setLoading] = useState(false);
    const { alert, toast } = useMessage();
    const [billType, setBillType] = useState('FINAL'); // RUNNING or FINAL
    const [showIIPL, setShowIIPL] = useState(false);
    const [printModalOpen, setPrintModalOpen] = useState(false);

    const [formData, setFormData] = useState({
        projectName: 'KHAZANA PONDY',
        typeOfWork: 'FALSE CEILING',
        subConName: 'MODERN INTERIOR DECORS',
        vendorMobile: '',
        projectCode: 'CII2C3Y32025648',
        clientCode: 'COCOJL2025613',
        workOrderNo: 'IIPL/WO/SEP/01/25-26',
        orderDate: '2025-09-01',
        billingDate: '2026-01-29',
        rabNo: '1',
        housekeepingPercent: 0,
    });

    const [items, setItems] = useState([
        {
            desc: 'CALCIUM SILICATE FALSE CEILING',
            ml: 'L',
            unit: 'SFT',
            rate: 45,
            orderQty: 2700,
            cumulativeQty: 3021,
            rabPercent: 100,
            iiplRate: 0,
            isHeader: false
        },
        {
            desc: 'VERTICAL CEILING',
            ml: 'L',
            unit: 'SFT',
            rate: 35,
            orderQty: 400,
            cumulativeQty: 871,
            rabPercent: 100,
            iiplRate: 0,
            isHeader: false
        },
        {
            desc: 'ADDITIONAL WORKS',
            isHeader: true
        },
        {
            desc: 'DESIGN ROUND CEILING',
            ml: 'L',
            unit: 'NOS',
            rate: 6200,
            orderQty: 0,
            cumulativeQty: 1,
            rabPercent: 100,
            iiplRate: 0,
            isHeader: false
        },
        {
            desc: 'S CEILING',
            ml: 'L',
            unit: 'NOS',
            rate: 3800,
            orderQty: 0,
            cumulativeQty: 1,
            rabPercent: 100,
            iiplRate: 0,
            isHeader: false
        }
    ]);

    const [advances, setAdvances] = useState([
        { label: 'ADVANCE - 1', date: '2025-09-17', amount: 100000, remark: 'M1', type: 'DEDUCTION' },
        { label: 'ADVANCE - 2', date: '2025-10-30', amount: 18000, remark: '', type: 'DEDUCTION' },
    ]);


    const DB_COLUMNS = {
        NAME: "vendor_name",
        PHONE: "phone",
    };

    useEffect(() => {
        fetchVendors();
    }, []);

    const fetchVendors = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select('*')
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

    const handleBillTypeChange = async (e) => {
        const val = e.target.value;
        setBillType(val);
        if (val === 'RUNNING') {
            const num = await prompt("Enter RAB Number (1, 2, 3...)", formData.rabNo || "1");
            if (num !== null && num !== "") {
                setFormData(prev => ({ ...prev, rabNo: num }));
            }
        }
    };

    const handleVendorChange = (e) => {
        const val = e.target.value;
        const vendor = vendors.find(v => v[DB_COLUMNS.NAME] === val);
        setFormData(prev => ({
            ...prev,
            subConName: val,
            vendorMobile: vendor?.[DB_COLUMNS.PHONE] || '',
        }));
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const addItem = (isHeader = false) => {
        if (isHeader) {
            setItems([...items, { desc: '', isHeader: true }]);
        } else {
            setItems([...items, { desc: '', ml: '', unit: '', rate: '', orderQty: '', cumulativeQty: '', rabPercent: 100, iiplRate: '', isHeader: false }]);
        }
    };

    const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

    const handleAdvanceChange = (index, field, value) => {
        const newAdvances = [...advances];
        newAdvances[index][field] = value;
        setAdvances(newAdvances);
    };

    const addAdvance = (type = 'DEDUCTION') => setAdvances([...advances, { label: type === 'DEDUCTION' ? `ADVANCE - ${advances.filter(a => a.type === 'DEDUCTION').length + 1}` : 'NEW ROW', date: '', amount: '', remark: '', type }]);
    const removeAdvance = (index) => setAdvances(advances.filter((_, i) => i !== index));

    // Calculations
    const calculatedItems = items.map(item => {
        if (item.isHeader) return item;

        const rate = parseFloat(item.rate) || 0;
        const oQty = parseFloat(item.orderQty) || 0;
        const cQty = parseFloat(item.cumulativeQty) || 0;
        const rabPerc = parseFloat(item.rabPercent) || 0;
        const iiplRate = parseFloat(item.iiplRate) || 0;

        const orderAmt = rate * oQty;
        const cumAmt = rate * cQty;
        const varQty = oQty - cQty;
        const varAmt = orderAmt - cumAmt;
        const rabAmt = cumAmt * (rabPerc / 100);
        const iiplAmt = iiplRate * cQty;

        return {
            ...item,
            orderAmt,
            cumAmt,
            varQty,
            varAmt,
            rabAmt,
            iiplAmt
        };
    });

    const grandTotals = calculatedItems.reduce((acc, item) => {
        if (item.isHeader) return acc;
        return {
            orderAmt: acc.orderAmt + item.orderAmt,
            cumAmt: acc.cumAmt + item.cumAmt,
            varAmt: acc.varAmt + item.varAmt,
            rabAmt: acc.rabAmt + item.rabAmt,
            iiplAmt: acc.iiplAmt + item.iiplAmt
        };
    }, { orderAmt: 0, cumAmt: 0, varAmt: 0, rabAmt: 0, iiplAmt: 0 });

    const totalDeductions = advances.filter(a => a.type === 'DEDUCTION').reduce((sum, adv) => sum + (parseFloat(adv.amount) || 0), 0);
    const totalAdditions = advances.filter(a => a.type === 'ADDITION').reduce((sum, adv) => sum + (parseFloat(adv.amount) || 0), 0);
    const housekeepingAmt = billType === 'FINAL' && formData.housekeepingPercent > 0 ? (grandTotals.rabAmt * (formData.housekeepingPercent / 100)) : 0;
    const netPayable = grandTotals.rabAmt + totalAdditions - housekeepingAmt - totalDeductions;

    const handlePrint = () => setPrintModalOpen(true);

    const confirmPrint = () => {
        setPrintModalOpen(false);
        setTimeout(() => window.print(), 100);
    };

    const exportToExcel = () => {
        const wb = XLSX.utils.book_new();
        const wsData = [
            ["INNOVATIVE INTERIORS PVT LTD"],
            [`SUB CONTRACTOR - ${billType === 'FINAL' ? 'FINAL BILL' : 'RUNNING BILL'}`],
            [],
            ["Project Name", formData.projectName, "", "", "Work Order No", formData.workOrderNo],
            ["Sub Con Name", formData.subConName, "", "", "Billing Date", formData.billingDate],
            [],
            ["S.No", "Description", "M+L", "Unit", "Order Rate", "Order Qty", "Order Amt", "Cum Qty", "Cum Amt", "Var Qty", "Var Amt", "Bill Qty", "Bill %", "Bill Amt"]
        ];

        let sNo = 1;
        calculatedItems.forEach((item) => {
            if (item.isHeader) {
                wsData.push(["", item.desc, "", "", "", "", "", "", "", "", "", "", "", ""]);
            } else {
                wsData.push([
                    sNo++, item.desc, item.ml, item.unit, item.rate, item.orderQty, item.orderAmt,
                    item.cumulativeQty, item.cumAmt, item.varQty, item.varAmt,
                    item.cumulativeQty, item.rabPercent, item.rabAmt
                ]);
            }
        });

        wsData.push([]);
        wsData.push(["", "TOTAL", "", "", "", "", grandTotals.orderAmt, "", grandTotals.cumAmt, "", grandTotals.varAmt, "", "", grandTotals.rabAmt]);
        wsData.push([]);

        advances.forEach((adv) => {
            wsData.push(["", adv.label, "", "", "", "", "", "", "", "", "", "", "", `${adv.type === 'DEDUCTION' ? '-' : '+'} ${adv.amount}`]);
        });

        wsData.push(["", formData.balanceLabel || "BALANCE", "", "", "", "", "", "", "", "", "", "", "", netPayable]);
        wsData.push(["", formData.totalLabel || "TOTAL ADVANCE", "", "", "", "", "", "", "", "", "", "", "", totalDeductions]);


        const ws = XLSX.utils.aoa_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Bill");
        XLSX.writeFile(wb, `${billType}_Bill_${formData.workOrderNo}.xlsx`);
    };

    const [colWidths, setColWidths] = useState({});

    const handleResizeMouseDown = (e, colId) => {
        e.preventDefault();
        const startX = e.pageX;
        const startWidth = e.target.parentElement.offsetWidth;

        const onMouseMove = (moveEvent) => {
            const currentWidth = startWidth + (moveEvent.pageX - startX);
            setColWidths(prev => ({ ...prev, [colId]: Math.max(20, currentWidth) }));
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    const formattedDate = formatDateShort(formData.billingDate);

    return (
        <div className={styles.container}>
            {loading && <LoadingOverlay message="Please wait..." />}

            <div className={styles.sidebar}>
                <div className={styles.header}>
                    <h2 className={styles.title}>Bill Preparation</h2>
                    <Link to="/"><button className={styles.homeBtn}>🏠</button></Link>
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Bill Type</label>
                    <select className={styles.select} value={billType} onChange={handleBillTypeChange}>
                        <option value="RUNNING">Running Account Bill (RAB)</option>
                        <option value="FINAL">Final Bill</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <input type="checkbox" id="showIIPL" checked={showIIPL} onChange={e => setShowIIPL(e.target.checked)} />
                        <label htmlFor="showIIPL" className={styles.label} style={{ marginBottom: 0 }}>Show IIPL</label>
                    </div>
                </div>

                <div className={styles.inputGroup}>
                    <label className={styles.label}>Sub Contractor</label>
                    <select className={styles.select} value={formData.subConName} onChange={handleVendorChange}>
                        <option value="">Select Vendor</option>
                        {vendors.map((v, i) => <option key={i} value={v[DB_COLUMNS.NAME]}>{v[DB_COLUMNS.NAME]}</option>)}
                    </select>
                </div>

                <Input label="Project Name" value={formData.projectName} onChange={e => setFormData({ ...formData, projectName: e.target.value })} />
                <Input label="Type of Work" value={formData.typeOfWork} onChange={e => setFormData({ ...formData, typeOfWork: e.target.value })} />
                <Input label="Work Order No" value={formData.workOrderNo} onChange={e => setFormData({ ...formData, workOrderNo: e.target.value })} />
                <Input label="Project Code" value={formData.projectCode} onChange={e => setFormData({ ...formData, projectCode: e.target.value })} />
                <Input label="Client Code" value={formData.clientCode} onChange={e => setFormData({ ...formData, clientCode: e.target.value })} />
                <Input label="Vendor Mobile" value={formData.vendorMobile} onChange={e => setFormData({ ...formData, vendorMobile: e.target.value })} />

                <div className={styles.grid2}>
                    <Input type="date" label="Order Date" value={formData.orderDate} onChange={e => setFormData({ ...formData, orderDate: e.target.value })} />
                    <Input type="date" label="Billing Date" value={formData.billingDate} onChange={e => setFormData({ ...formData, billingDate: e.target.value })} />
                </div>
                {billType === 'RUNNING' && (
                    <Input label="RAB No" value={formData.rabNo} onChange={e => setFormData({ ...formData, rabNo: e.target.value })} />
                )}
                {billType === 'FINAL' && (
                    <Input type="text" inputMode="decimal" label="Housekeeping %" value={formData.housekeepingPercent} onChange={e => setFormData({ ...formData, housekeepingPercent: e.target.value })} />
                )}

                <hr className={styles.divider} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label className={styles.label}>Bill Items</label>
                    <div style={{ display: 'flex', gap: '5px' }}>
                        <Button variant="secondary" onClick={() => addItem(true)} style={{ padding: '4px 8px', fontSize: '10px' }}>+ Header</Button>
                        <Button variant="secondary" onClick={() => addItem(false)} style={{ padding: '4px 8px', fontSize: '10px' }}>+ Item</Button>
                    </div>
                </div>

                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '10px', border: '1px solid #eee', padding: '5px' }}>
                    {items.map((item, index) => (
                        <div key={index} style={{ marginBottom: '10px', padding: '10px', background: item.isHeader ? '#f8fafc' : '#fff', border: '1px solid #ddd', borderRadius: '4px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                <span style={{ fontSize: '10px', fontWeight: 'bold' }}>{item.isHeader ? 'HEADER ROW' : `ITEM ${index + 1}`}</span>
                                <button className={styles.removeBtn} onClick={() => removeItem(index)}>×</button>
                            </div>
                            <input placeholder="Description" className={styles.itemInput} value={item.desc} onChange={e => handleItemChange(index, 'desc', e.target.value)} />
                            {!item.isHeader && (
                                <div className={styles.grid2} style={{ marginTop: '5px' }}>
                                    <input type="text" inputMode="decimal" placeholder="Rate" className={styles.itemInput} value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} />
                                    <input type="text" inputMode="decimal" placeholder="Order Qty" className={styles.itemInput} value={item.orderQty} onChange={e => handleItemChange(index, 'orderQty', e.target.value)} />
                                    <input type="text" inputMode="decimal" placeholder="Cum. Qty" className={styles.itemInput} value={item.cumulativeQty} onChange={e => handleItemChange(index, 'cumulativeQty', e.target.value)} />
                                    <input placeholder="M+L" className={styles.itemInput} value={item.ml} onChange={e => handleItemChange(index, 'ml', e.target.value)} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                <label className={styles.label}>Summary Rows (Advances/Additions)</label>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {advances.map((adv, index) => (
                        <div key={index} style={{ marginBottom: '8px', padding: '8px', border: `1px solid ${adv.type === 'ADDITION' ? '#d1fae5' : '#fee2e2'}`, background: adv.type === 'ADDITION' ? '#f0fdf4' : '#fef2f2' }}>
                            <div className={styles.grid2}>
                                <input className={styles.itemInput} value={adv.label} onChange={e => handleAdvanceChange(index, 'label', e.target.value)} placeholder="Label" />
                                <Input type="text" inputMode="decimal" placeholder="Amount" value={adv.amount} onChange={e => handleAdvanceChange(index, 'amount', e.target.value)} />
                            </div>
                            <div className={styles.grid2} style={{ marginTop: '5px' }}>
                                <Input type="date" value={adv.date} onChange={e => handleAdvanceChange(index, 'date', e.target.value)} />
                                <div style={{ display: 'flex', gap: '5px' }}>
                                    <Input placeholder="Remark" value={adv.remark} onChange={e => handleAdvanceChange(index, 'remark', e.target.value)} />
                                    <button className={styles.removeBtn} onClick={() => removeAdvance(index)}>×</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '5px', marginTop: '5px' }}>
                    <Button variant="secondary" onClick={() => addAdvance('ADDITION')} style={{ flex: 1, fontSize: '10px' }}>+ Add Addition</Button>
                    <Button variant="secondary" onClick={() => addAdvance('DEDUCTION')} style={{ flex: 1, fontSize: '10px' }}>+ Add Deduction</Button>
                </div>


                <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <Button onClick={handlePrint}>Print Bill</Button>
                    <Button style={{ background: '#28a745', color: 'white' }} onClick={exportToExcel}>Export Excel</Button>
                </div>
            </div>

            {/* Preview Area */}
            <div className={styles.previewArea}>
                <div className={`${styles.billPaper} printable-content`}>
                    <div className={styles.headerSection}>
                        <div className={styles.headerMain}>INNOVATIVE INTERIORS PVT LTD</div>
                        <div className={styles.headerSub}>
                            SUB CONTRACTOR - {billType === 'FINAL' ? 'FINAL BILL' : (
                                <>
                                    RAB - <input className={styles.inlineInput} style={{ width: '40px', fontWeight: 'bold' }} value={formData.rabNo} onChange={e => setFormData({ ...formData, rabNo: e.target.value })} />
                                </>
                            )}
                        </div>
                    </div>

                    <div className={styles.metadataGrid}>
                        <div className={styles.metaCol}>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>NAME OF PROJECT :</span>
                                <input className={styles.inlineInput} value={formData.projectName} onChange={e => setFormData({ ...formData, projectName: e.target.value })} />
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>TYPE OF WORK :</span>
                                <input className={styles.inlineInput} value={formData.typeOfWork} onChange={e => setFormData({ ...formData, typeOfWork: e.target.value })} />
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>SUB CON NAME :</span>
                                <input className={styles.inlineInput} value={formData.subConName} onChange={e => setFormData({ ...formData, subConName: e.target.value })} />
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>MOBILE NO :</span>
                                <input className={styles.inlineInput} value={formData.vendorMobile} onChange={e => setFormData({ ...formData, vendorMobile: e.target.value })} />
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>PROJECT CODE :</span>
                                <input className={styles.inlineInput} value={formData.projectCode} onChange={e => setFormData({ ...formData, projectCode: e.target.value })} />
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>CLIENT CODE :</span>
                                <input className={styles.inlineInput} value={formData.clientCode} onChange={e => setFormData({ ...formData, clientCode: e.target.value })} />
                            </div>
                        </div>
                        <div className={styles.logoBox}>
                            <img src="/innovativeinteriors/LOGO.png" alt="Innovative Interiors Logo" className={styles.logoImg} />
                        </div>


                        <div className={styles.metaCol}>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>WORK ORDER NO :</span>
                                <input className={styles.inlineInput} value={formData.workOrderNo} onChange={e => setFormData({ ...formData, workOrderNo: e.target.value })} />
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>ORDER DATE :</span>
                                <input type="date" className={styles.inlineInput} value={formData.orderDate} onChange={e => setFormData({ ...formData, orderDate: e.target.value })} />
                            </div>
                            <div className={styles.metaItem}>
                                <span className={styles.metaLabel}>BILLING DATE :</span>
                                <input type="date" className={styles.inlineInput} value={formData.billingDate} onChange={e => setFormData({ ...formData, billingDate: e.target.value })} />
                            </div>
                        </div>
                    </div>

                    <table className={styles.billTable}>
                        <thead>
                            <tr>
                                <th rowSpan="2" style={{ width: colWidths['sno'] || '35px' }}>
                                    S.NO
                                    <div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'sno')}></div>
                                </th>
                                <th rowSpan="2" style={{ width: colWidths['desc'] || '300px' }}>

                                    DESCRIPTION OF WORK
                                    <div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'desc')}></div>
                                </th>
                                <th rowSpan="2" style={{ width: colWidths['ml'] || '35px' }}>
                                    M+L
                                    <div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'ml')}></div>
                                </th>
                                <th rowSpan="2" style={{ width: colWidths['unit'] || '40px' }}>
                                    UNIT
                                    <div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'unit')}></div>
                                </th>
                                <th rowSpan="2" style={{ width: colWidths['rate'] || '60px' }}>
                                    ORDER RATE
                                    <div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'rate')}></div>
                                </th>
                                <th colSpan="2">ORDER</th>
                                <th colSpan="2">CUMULATIVE</th>
                                <th colSpan="2">VARIANCE</th>
                                <th colSpan="3">{billType === 'FINAL' ? 'FINAL BILL' : `RAB-${formData.rabNo}`}</th>
                                {showIIPL && <th colSpan="3">IIPL</th>}
                            </tr>

                            <tr>
                                <th style={{ width: colWidths['oqty'] || '60px' }}>QTY<div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'oqty')}></div></th>
                                <th style={{ width: colWidths['oamt'] || '100px' }}>AMOUNT<div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'oamt')}></div></th>
                                <th style={{ width: colWidths['cqty'] || '60px' }}>QTY<div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'cqty')}></div></th>
                                <th style={{ width: colWidths['camt'] || '100px' }}>AMT<div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'camt')}></div></th>
                                <th style={{ width: colWidths['vqty'] || '60px' }}>QTY<div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'vqty')}></div></th>
                                <th style={{ width: colWidths['vamt'] || '100px' }}>AMT<div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'vamt')}></div></th>
                                <th style={{ width: colWidths['bqty'] || '60px' }}>QTY<div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'bqty')}></div></th>
                                <th style={{ width: colWidths['bper'] || '60px' }}>%<div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'bper')}></div></th>
                                <th style={{ width: colWidths['bamt'] || '100px' }}>AMT<div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'bamt')}></div></th>
                                {showIIPL && (
                                    <>
                                        <th style={{ width: colWidths['iqty'] || '60px' }}>QTY<div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'iqty')}></div></th>
                                        <th style={{ width: colWidths['irate'] || '60px' }}>RATE<div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'irate')}></div></th>
                                        <th style={{ width: colWidths['iamt'] || '100px' }}>AMT<div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'iamt')}></div></th>
                                    </>
                                )}

                            </tr>

                        </thead>
                        <tbody>
                            {(() => {
                                let sNo = 1;
                                return calculatedItems.map((item, i) => (
                                    <tr key={i} className={item.isHeader ? styles.headerRow : ''} style={{ position: 'relative' }}>
                                        {item.isHeader ? (
                                            <>
                                                <td colSpan="2" className={styles.textLeft} style={{ fontWeight: 'bold', paddingLeft: '10px' }}>
                                                    <button className={styles.rowActionBtn} onClick={() => removeItem(i)}>×</button>
                                                    <input className={styles.inlineInput} style={{ fontWeight: 'bold' }} value={item.desc} onChange={e => handleItemChange(i, 'desc', e.target.value)} />
                                                </td>

                                                <td colSpan={showIIPL ? 15 : 12}></td>
                                            </>
                                        ) : (
                                            <>
                                                <td style={{ position: 'relative' }}>
                                                    <button className={styles.rowActionBtn} onClick={() => removeItem(i)}>×</button>
                                                    {sNo++}
                                                </td>
                                                <td className={styles.textLeft}>
                                                    <input className={styles.inlineInput} value={item.desc} onChange={e => handleItemChange(i, 'desc', e.target.value)} />
                                                </td>
                                                <td>
                                                    <input className={styles.inlineInput} value={item.ml} onChange={e => handleItemChange(i, 'ml', e.target.value)} />
                                                </td>
                                                <td>
                                                    <input className={styles.inlineInput} value={item.unit} onChange={e => handleItemChange(i, 'unit', e.target.value)} />
                                                </td>
                                                <td className={styles.textRight}>
                                                    <input type="text" inputMode="decimal" className={styles.inlineInput} value={item.rate} onChange={e => handleItemChange(i, 'rate', e.target.value)} />
                                                </td>
                                                <td>
                                                    <input type="text" inputMode="decimal" className={styles.inlineInput} value={item.orderQty} onChange={e => handleItemChange(i, 'orderQty', e.target.value)} />
                                                </td>
                                                <td className={styles.textRight}>{item.orderAmt > 0 ? item.orderAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                                                <td>
                                                    <input type="text" inputMode="decimal" className={styles.inlineInput} value={item.cumulativeQty} onChange={e => handleItemChange(i, 'cumulativeQty', e.target.value)} />
                                                </td>
                                                <td className={styles.textRight}>{item.cumAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                <td style={{ color: item.varQty < 0 ? 'red' : 'inherit' }}>{item.varQty === 0 ? '-' : item.varQty.toFixed(2)}</td>
                                                <td className={styles.textRight} style={{ color: item.varAmt < 0 ? 'red' : 'inherit' }}>
                                                    {item.varAmt === 0 ? '-' : (item.varAmt < 0 ? `(${Math.abs(item.varAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })})` : item.varAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                                                </td>
                                                <td>{item.cumulativeQty}</td>
                                                <td style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                                                    <input type="text" inputMode="decimal" className={styles.inlineInput} style={{ width: '35px' }} value={item.rabPercent} onChange={e => handleItemChange(i, 'rabPercent', e.target.value)} />
                                                    <span>%</span>
                                                </td>

                                                <td className={styles.textRight}>{item.rabAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                {showIIPL && (
                                                    <>
                                                        <td>
                                                            <input type="text" inputMode="decimal" className={styles.inlineInput} value={item.cumulativeQty} onChange={e => handleItemChange(i, 'cumulativeQty', e.target.value)} />
                                                        </td>
                                                        <td>
                                                            <input type="text" inputMode="decimal" className={styles.inlineInput} value={item.iiplRate} onChange={e => handleItemChange(i, 'iiplRate', e.target.value)} />
                                                        </td>
                                                        <td className={styles.textRight}>{item.iiplAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    </>
                                                )}
                                            </>
                                        )}
                                    </tr>
                                ));
                            })()}

                            <tr className={styles.totalRow}>
                                <td colSpan="5">TOTAL</td>

                                <td></td>
                                <td className={styles.textRight}>{grandTotals.orderAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td></td>
                                <td className={styles.textRight}>{grandTotals.cumAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                <td></td>
                                <td className={styles.textRight} style={{ color: grandTotals.varAmt < 0 ? 'red' : 'inherit' }}>
                                    {grandTotals.varAmt < 0 ? `(${Math.abs(grandTotals.varAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })})` : grandTotals.varAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                                <td></td>
                                <td></td>
                                <td className={styles.textRight}>{grandTotals.rabAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                {showIIPL && (
                                    <>
                                        <td></td>
                                        <td></td>
                                        <td className={styles.textRight}>{grandTotals.iiplAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </>
                                )}
                            </tr>
                        </tbody>
                    </table>

                    <div className={styles.previewAddActions}>
                        <button className={styles.previewAddBtn} onClick={() => addItem(false)}>+ Add Item</button>
                        <button className={styles.previewAddBtn} onClick={() => addItem(true)}>+ Add Header Row</button>
                    </div>

                    <div className={styles.summarySection}>
                        <div className={styles.paymentLeft}>
                            <table className={styles.summaryTable}>
                                <tbody>
                                    {advances.map((adv, i) => (
                                        <tr key={i} style={{ position: 'relative' }}>
                                            <td style={{ width: '120px', position: 'relative' }}>
                                                <button className={styles.rowActionBtn} onClick={() => removeAdvance(i)}>×</button>
                                                <input className={styles.inlineInput} value={adv.label} onChange={e => handleAdvanceChange(i, 'label', e.target.value)} />
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold', width: '120px' }}>
                                                <input type="text" inputMode="decimal" className={styles.inlineInput} value={adv.amount} onChange={e => handleAdvanceChange(i, 'amount', e.target.value)} />
                                            </td>
                                            <td style={{ paddingLeft: '20px' }}>
                                                <input className={styles.inlineInput} value={adv.remark} onChange={e => handleAdvanceChange(i, 'remark', e.target.value)} />
                                            </td>
                                            <td style={{ textAlign: 'right', width: '100px' }}>
                                                {adv.type === 'DEDUCTION' ? '-' : '+'} {adv.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ textAlign: 'left', paddingLeft: '10px' }}>
                                                <input type="date" className={styles.inlineInput} style={{ width: 'auto' }} value={adv.date} onChange={e => handleAdvanceChange(i, 'date', e.target.value)} />
                                            </td>
                                        </tr>
                                    ))}
                                    <tr className={styles.previewAddActions} style={{ display: 'table-row' }}>
                                        <td colSpan="5" style={{ border: 'none', padding: '5px 0' }}>
                                            <button className={styles.previewAddBtn} onClick={() => addAdvance('ADDITION')}>+ Add Addition</button>
                                            <button className={styles.previewAddBtn} style={{ marginLeft: '10px' }} onClick={() => addAdvance('DEDUCTION')}>+ Add Deduction</button>
                                        </td>
                                    </tr>

                                    <tr style={{ height: '10px' }}><td colSpan="5" style={{ border: 'none' }}></td></tr>
                                    <tr>
                                        <td>
                                            <input className={styles.inlineInput} value={formData.balanceLabel || "BALANCE"} onChange={e => setFormData({ ...formData, balanceLabel: e.target.value })} />
                                        </td>
                                        <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        <td colSpan="2" style={{ textAlign: 'right', fontWeight: 'bold', border: 'none' }}>
                                            <input className={styles.inlineInput} style={{ textAlign: 'right' }} value={formData.totalLabel || "TOTAL ADVANCE"} onChange={e => setFormData({ ...formData, totalLabel: e.target.value })} />
                                        </td>
                                        <td style={{ textAlign: 'left', paddingLeft: '10px', fontWeight: 'bold', border: 'none' }}>{totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    </tr>



                                </tbody>
                            </table>
                        </div>

                        <div className={styles.summaryTableRight}>
                            {/* Small summary table logic here if needed, but the layout matches the left side more in the new reference */}
                        </div>
                    </div>

                    <div className={styles.footerSigSection}>
                        <div className={styles.sigBox}>QS</div>
                        <div className={styles.sigBox}>PROJECT</div>
                        <div className={styles.sigBox}>GM</div>
                        <div className={styles.sigBox}>CEO</div>
                        <div className={styles.sigBox}>MD</div>
                    </div>


                </div>

            </div>


            <PrintModal
                isOpen={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                onConfirm={confirmPrint}
            />
        </div >
    );
};

export default BillGenerator;
