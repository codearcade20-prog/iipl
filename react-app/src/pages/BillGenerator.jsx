import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Button } from '../components/ui/Button';
import { Input, LoadingOverlay, SearchableSelect } from '../components/ui';
import PrintModal from '../components/PrintModal';
import RabGuideModal from '../components/RabGuideModal';
import styles from './BillGenerator.module.css';
import { numberToWords, formatDateShort } from '../utils';
import { useMessage } from '../context/MessageContext';

const BillGenerator = () => {
    const [vendors, setVendors] = useState([]);
    const [sites, setSites] = useState([]);
    const [filteredWOs, setFilteredWOs] = useState([]);
    const [loading, setLoading] = useState(false);

    const { alert, toast } = useMessage();
    const [billType, setBillType] = useState('FINAL'); // RUNNING or FINAL
    const [showIIPL, setShowIIPL] = useState(false);
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [guideModalOpen, setGuideModalOpen] = useState(false);
    const [showPreviewOverlay, setShowPreviewOverlay] = useState(false);
    const [currentBillId, setCurrentBillId] = useState(null);
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [savedBills, setSavedBills] = useState([]);
    
    // Admin Security State
    const [passwordModalOpen, setPasswordModalOpen] = useState(false);
    const [adminUsername, setAdminUsername] = useState('');
    const [adminPassword, setAdminPassword] = useState('');
    const [verifyingAdmin, setVerifyingAdmin] = useState(false);

    const [formData, setFormData] = useState({
        projectName: '',
        typeOfWork: '',
        subConName: '',
        vendorMobile: '',
        projectCode: '',
        clientCode: '',
        workOrderNo: '',
        orderDate: '',
        billingDate: new Date().toISOString().split('T')[0],
        rabNo: '1',
        housekeepingPercent: 0,
        retentionPercent: 5,
        discount: 0,
        includeRetention: false,
        includeGst: false,
    });




    const [items, setItems] = useState([{ desc: '', ml: '', unit: '', rate: 0, orderQty: 0, cumulativeQty: 0, rabPercent: 0, iiplRate: 0, isHeader: false }]);



    const [advances, setAdvances] = useState([]);



    const DB_COLUMNS = {
        NAME: "vendor_name",
        PHONE: "phone",
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

    const handleVendorChange = async (val) => {
        const vendor = vendors.find(v => v[DB_COLUMNS.NAME] === val);
        setFormData(prev => ({
            ...prev,
            subConName: val,
            vendorMobile: vendor?.[DB_COLUMNS.PHONE] || '',
            projectName: '', // Reset cascading fields
            workOrderNo: '',
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
        setFormData(prev => ({
            ...prev,
            projectName: val,
            workOrderNo: '', // Reset WO
        }));

        // Use the current vendor name from state
        if (formData.subConName && val) {
            updateFilteredWOs(formData.subConName, val);
        } else {
            setFilteredWOs([]);
        }
    };


    const updateFilteredWOs = async (vendorName, siteName) => {
        if (!vendorName || !siteName) {
            setFilteredWOs([]);
            return;
        }
        setLoading(true);
        console.log('--- Fetching WOs ---');
        console.log('Vendor:', vendorName);
        console.log('Site:', siteName);

        try {
            // Get IDs for vendor and site
            const { data: vData, error: vError } = await supabase.from('vendors').select('id').eq('vendor_name', vendorName).maybeSingle();
            const { data: sData, error: sError } = await supabase.from('sites').select('id').eq('name', siteName).maybeSingle();

            if (vError) console.error('Vendor fetch error:', vError);
            if (sError) console.error('Site fetch error:', sError);

            if (vData && sData) {
                console.log('Found IDs -> Vendor:', vData.id, 'Site:', sData.id);
                const { data: woData, error: woError } = await supabase
                    .from('work_orders')
                    .select('wo_no, wo_date, wo_value, housekeeping, retention')
                    .eq('vendor_id', vData.id)
                    .eq('site_id', sData.id);

                if (woError) throw woError;

                console.log('Work Orders found:', woData?.length || 0);
                setFilteredWOs(woData || []);
            } else {
                console.warn('Could not find vendor or site ID in database');
                setFilteredWOs([]);
            }
        } catch (e) {
            console.error('Critical error fetching WOs:', e);
            setFilteredWOs([]);
        } finally {
            setLoading(false);
            console.log('--- WO Fetch Complete ---');
        }
    };


    const handleWOChange = async (val) => {
        const wo = filteredWOs.find(w => w.wo_no === val);
        if (!wo) {
            setFormData(prev => ({ ...prev, workOrderNo: val }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            workOrderNo: val,
            orderDate: wo.wo_date || '',
            projectCode: wo.project_code || '',
            clientCode: wo.client_code || '',
            housekeepingPercent: wo.housekeeping || 0,
            retentionPercent: wo.retention || 0,
        }));

        // Load Payment History
        fetchWOHistory(val);
    };

    const fetchWOHistory = async (woNo) => {
        setLoading(true);
        try {
            const { data: woData, error: woError } = await supabase
                .from('work_orders')
                .select('id')
                .eq('wo_no', woNo)
                .single();

            if (woError || !woData) return;

            const { data: advData, error: advError } = await supabase
                .from('advances')
                .select('*')
                .eq('work_order_id', woData.id)
                .order('date', { ascending: true });

            if (advError) throw advError;

            if (advData && advData.length > 0) {
                const historyAdvances = advData.map(item => ({
                    label: item.payment_mode ? `ADVANCE (${item.payment_mode})` : (item.label || 'PAYMENT HISTORY'),
                    date: item.date || '',
                    amount: parseFloat(item.amount) || 0,
                    remark: (item.payment_mode || '').toUpperCase().trim(),
                    type: 'DEDUCTION'
                }));
                setAdvances(historyAdvances);
                toast(`Loaded ${historyAdvances.length} payment records.`);
            } else {

                setAdvances([]);
            }
        } catch (e) {
            console.error("Error fetching WO history", e);
            toast("Error loading history");
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBill = async () => {
        if (!formData.subConName || !formData.projectName) {
            toast('Please select SubCon and Project first!', 'error');
            return;
        }

        setLoading(true);
        try {
            const tempBillNo = formData.rabNo ? `BILL-${formData.rabNo}-${Date.now().toString().slice(-4)}` : `DRAFT-${Date.now()}`;

            const billData = {
                bill_no: tempBillNo, // Auto-generate if missing
                bill_type: billType,
                rab_no: formData.rabNo,
                project_name: formData.projectName,
                project_code: formData.projectCode || '',
                type_of_work: formData.typeOfWork || '',
                subcon_name: formData.subConName,
                vendor_mobile: formData.vendorMobile || '',
                client_code: formData.clientCode || '',
                work_order_no: formData.workOrderNo || '',
                order_date: formData.orderDate || null,
                billing_date: formData.billingDate || null,
                include_gst: formData.includeGst,
                include_retention: formData.includeRetention,
                retention_percent: parseFloat(formData.retentionPercent) || 0,
                housekeeping_percent: parseFloat(formData.housekeepingPercent) || 0,
                discount_amt: parseFloat(formData.discount) || 0,
                gross_total: grandTotals.rabAmt,
                taxable_value: taxableBase,
                gst_amount: gstAmount,
                final_payable: netPayable,
                updated_at: new Date().toISOString()
            };

            let billId = currentBillId;

            if (billId) {
                const { error } = await supabase.from('subcon_bills').update(billData).eq('id', billId);
                if (error) throw error;
            } else {
                const { data, error } = await supabase.from('subcon_bills').insert([billData]).select();
                if (error) throw error;
                billId = data[0].id;
                setCurrentBillId(billId);
            }

            // Sync Items
            await supabase.from('subcon_bill_items').delete().eq('bill_id', billId);
            const itemsToSave = items.map((item, idx) => ({
                bill_id: billId,
                description: item.desc,
                is_header: item.isHeader,
                m_plus_l: item.ml || '',
                unit: item.unit || '',
                order_rate: parseFloat(item.rate) || 0,
                order_qty: parseFloat(item.orderQty) || 0,
                cumulative_qty: parseFloat(item.cumulativeQty) || 0,
                billing_percent: parseFloat(item.rabPercent) || 0,
                iipl_rate: parseFloat(item.iiplRate) || 0,
                sort_order: idx
            }));
            const { error: itemsErr } = await supabase.from('subcon_bill_items').insert(itemsToSave);
            if (itemsErr) throw itemsErr;

            // Sync Adjustments
            await supabase.from('subcon_bill_adjustments').delete().eq('bill_id', billId);
            if (advances.length > 0) {
                const advsToSave = advances.map(adv => ({
                    bill_id: billId,
                    mode: adv.remark || '',
                    amount: parseFloat(adv.amount) || 0,
                    date: adv.date || null,
                    type: adv.type
                }));
                const { error: advErr } = await supabase.from('subcon_bill_adjustments').insert(advsToSave);
                if (advErr) throw advErr;
            }

            toast('Bill saved successfully!', 'success');
        } catch (e) {
            console.error('Error saving bill:', e);
            toast(`Failed to save: ${e.message || 'Unknown error'}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchBillHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('subcon_bills')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setSavedBills(data || []);
            setHistoryModalOpen(true);
        } catch (e) {
            console.error('Error fetching history:', e);
            toast('Failed to load history.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadBillFromHistory = async (bill) => {
        setLoading(true);
        try {
            const { data: itemData, error: itemErr } = await supabase
                .from('subcon_bill_items')
                .select('*')
                .eq('bill_id', bill.id)
                .order('sort_order', { ascending: true });
            if (itemErr) throw itemErr;

            const { data: adjData, error: adjErr } = await supabase
                .from('subcon_bill_adjustments')
                .select('*')
                .eq('bill_id', bill.id);
            if (adjErr) throw adjErr;

            setBillType(bill.bill_type);
            setFormData({
                projectName: bill.project_name,
                projectCode: bill.project_code || '',
                type_of_work: bill.type_of_work || '',
                subConName: bill.subcon_name,
                vendorMobile: bill.vendor_mobile || '',
                clientCode: bill.client_code || '',
                workOrderNo: bill.work_order_no || '',
                orderDate: bill.order_date || '',
                billingDate: bill.billing_date || '',
                rabNo: bill.rab_no || '1',
                housekeepingPercent: bill.housekeeping_percent || 0,
                retentionPercent: bill.retention_percent || 5,
                discount: bill.discount_amt || 0,
                includeRetention: bill.include_retention || false,
                includeGst: bill.include_gst || false,
            });

            setItems(itemData.map(i => ({
                desc: i.description,
                isHeader: i.is_header,
                ml: i.m_plus_l,
                unit: i.unit,
                rate: i.order_rate,
                orderQty: i.order_qty,
                cumulativeQty: i.cumulative_qty,
                rabPercent: i.billing_percent,
                iiplRate: i.iipl_rate
            })));

            setAdvances(adjData.map(a => ({
                remark: a.mode,
                amount: a.amount,
                date: a.date,
                type: a.type
            })));

            setCurrentBillId(bill.id);
            setHistoryModalOpen(false);
            toast('Bill loaded successfully!', 'success');
        } catch (e) {
            console.error('Error loading bill:', e);
            toast('Failed to load bill details.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const deleteBillFromHistory = async (id) => {
        if (!window.confirm('Delete this draft?')) return;
        try {
            await supabase.from('subcon_bills').delete().eq('id', id);
            setSavedBills(savedBills.filter(b => b.id !== id));
            if (currentBillId === id) setCurrentBillId(null);
            toast('Deleted.');
        } catch (e) {
            toast('Failed.');
        }
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
        const rabAmt = (rate * cQty) * (rabPerc / 100);
        const cumAmt = rabAmt; // Display the billable amount in the cumulative column as requested
        const varQty = oQty - cQty;
        const varAmt = orderAmt - cumAmt;
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

    // NEW CALCULATION RULES
    const certifiedBillValue = grandTotals.rabAmt;
    const discountAmt = parseFloat(formData.discount) || 0;
    const valueAfterDiscount = certifiedBillValue - discountAmt;

    // 1. M2 Payments are reduced BEFORE Tax/Retention/HK
    const m2Payments = advances.filter(a => a.remark === 'M2');
    const m2Total = m2Payments.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);

    const taxableBase = Math.max(0, valueAfterDiscount - m2Total);

    // 2. Retention/HK calculated on taxableBase
    const hkPercent = parseFloat(formData.housekeepingPercent) || 0;
    const retPercent = formData.includeRetention ? 5 : 0; // Fixed 5% if enabled

    const housekeepingAmt = hkPercent > 0 ? (taxableBase * (hkPercent / 100)) : 0;
    const retentionAmt = (taxableBase * (retPercent / 100));

    const subtotalBeforeGst = taxableBase - housekeepingAmt - retentionAmt;

    // 3. GST calculated on taxableBase (before Retention/HK are subtracted)
    const gstAmount = formData.includeGst ? (taxableBase * 0.18) : 0;
    const valueWithGst = taxableBase + gstAmount;

    const subtotalAfterTaxes = valueWithGst - housekeepingAmt - retentionAmt;

    // 4. Other Payments (M1, M3, M4, M5) reduced AFTER GST
    const otherPayments = advances.filter(a => a.remark !== 'M2');
    const otherTotal = otherPayments.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);

    const netPayable = subtotalAfterTaxes - otherTotal;

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

        // Detailed Calculation Rows in Excel
        wsData.push(["", "GROSS TOTAL", "", "", "", "", "", "", "", "", "", "", "", grandTotals.rabAmt]);
        if (discountAmt > 0) wsData.push(["", "Less: Discount", "", "", "", "", "", "", "", "", "", "", "", -discountAmt]);
        if (m2Total > 0) wsData.push(["", "Less: Cash Payments (M2)", "", "", "", "", "", "", "", "", "", "", "", -m2Total]);

        wsData.push(["", "TAXABLE VALUE", "", "", "", "", "", "", "", "", "", "", "", taxableBase]);

        if (retentionAmt > 0) wsData.push(["", `Less Retention (${formData.retentionPercent}%)`, "", "", "", "", "", "", "", "", "", "", "", -retentionAmt]);
        if (housekeepingAmt > 0) wsData.push(["", `Less Housekeeping (${formData.housekeepingPercent}%)`, "", "", "", "", "", "", "", "", "", "", "", -housekeepingAmt]);

        wsData.push(["", "NET BEFORE GST", "", "", "", "", "", "", "", "", "", "", "", subtotalBeforeGst]);

        if (formData.includeGst) {
            wsData.push(["", "Add GST (18%)", "", "", "", "", "", "", "", "", "", "", "", gstAmount]);
            wsData.push(["", "SUBTOTAL WITH GST", "", "", "", "", "", "", "", "", "", "", "", subtotalWithGst]);
        }

        if (otherTotal > 0) wsData.push(["", "Less: Other Advances (M1, M3, M4, M5)", "", "", "", "", "", "", "", "", "", "", "", -otherTotal]);

        wsData.push(["", "FINAL PAYABLE AMOUNT", "", "", "", "", "", "", "", "", "", "", "", netPayable]);


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

    const handleNewBill = () => {
        if (!window.confirm('Start a new bill? Current unsaved changes will be lost.')) return;
        setCurrentBillId(null);
        setFormData({
            projectName: '',
            typeOfWork: '',
            subConName: '',
            vendorMobile: '',
            projectCode: '',
            clientCode: '',
            workOrderNo: '',
            orderDate: '',
            billingDate: new Date().toISOString().split('T')[0],
            rabNo: '1',
            housekeepingPercent: 0,
            retentionPercent: 5,
            discount: 0,
            includeRetention: false,
            includeGst: false,
        });
        setItems([{ desc: '', ml: '', unit: '', rate: 0, orderQty: 0, cumulativeQty: 0, rabPercent: 0, iiplRate: 0, isHeader: false }]);
        setAdvances([]);
        toast('Started new bill draft.');
    };

    const handleVerifyAdmin = async () => {
        if (!adminUsername || !adminPassword) {
            toast("Please enter both credentials.", "error");
            return;
        }
        setVerifyingAdmin(true);
        try {
            const { data, error } = await supabase
                .from('app_users')
                .select('password, is_admin')
                .eq('username', adminUsername)
                .single();

            if (error || !data) {
                toast("Account not found!", "error");
                return;
            }

            if (data.password === adminPassword) {
                setPasswordModalOpen(false);
                setGuideModalOpen(true);
                setAdminUsername('');
                setAdminPassword('');
            } else {
                toast("Incorrect Password!", "error");
            }
        } catch (err) {
            toast("Verification failed.", "error");
        } finally {
            setVerifyingAdmin(false);
        }
    };

    const formattedDate = formatDateShort(formData.billingDate);

    return (
        <div className={styles.container}>
            {loading && <LoadingOverlay message="Please wait..." />}

            <div className={styles.sidebar}>
                <div className={styles.sidebarHeader}>
                    <h2 className={styles.title}>Bill Preparation</h2>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className={styles.homeBtn} style={{ background: 'var(--primary-blue)', color: 'white', borderRadius: '12px', padding: '0 16px', fontSize: '0.85rem', fontWeight: '600', height: '40px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }} onClick={() => setPasswordModalOpen(true)}>
                            <i className="fa-solid fa-lock"></i> Admin Guide
                        </button>
                        <Link to="/"><button className={styles.homeBtn} style={{ height: '40px', width: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><i className="fa-solid fa-house" style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}></i></button></Link>
                    </div>
                </div>

                <div className={styles.sidebarContent}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', alignItems: 'start' }}>
                        {/* General Information Section */}
                        <div className={styles.inputCard} style={{ margin: 0, height: '100%' }}>
                            <h3 className={styles.sectionTitle}><i className="fa-solid fa-file-invoice"></i> General Information</h3>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Bill Type</label>
                                <select className={styles.itemInput} value={billType} onChange={e => setBillType(e.target.value)} style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-soft)', fontSize: '0.9rem' }}>
                                    <option value="RUNNING">Running Bill (RAB)</option>
                                    <option value="FINAL">Final Bill</option>
                                </select>
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Sub Contractor</label>
                                <SearchableSelect
                                    options={vendors.map(v => v[DB_COLUMNS.NAME])}
                                    value={formData.subConName}
                                    onChange={handleVendorChange}
                                    placeholder="Select Vendor"
                                />
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '15px', marginTop: '10px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setShowIIPL(!showIIPL)}>
                                    <input type="checkbox" id="showIIPL" checked={showIIPL} onChange={e => setShowIIPL(e.target.checked)} style={{ cursor: 'pointer' }} />
                                    <label htmlFor="showIIPL" className={styles.label} style={{ marginBottom: 0, cursor: 'pointer' }}>Show IIPL</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setFormData({ ...formData, includeRetention: !formData.includeRetention })}>
                                    <input type="checkbox" id="includeRetention" checked={formData.includeRetention} onChange={e => setFormData({ ...formData, includeRetention: e.target.checked })} style={{ cursor: 'pointer' }} />
                                    <label htmlFor="includeRetention" className={styles.label} style={{ marginBottom: 0, cursor: 'pointer' }}>Add Retention (5%)</label>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setFormData({ ...formData, includeGst: !formData.includeGst })}>
                                    <input type="checkbox" id="includeGst" checked={formData.includeGst} onChange={e => setFormData({ ...formData, includeGst: e.target.checked })} style={{ cursor: 'pointer' }} />
                                    <label htmlFor="includeGst" className={styles.label} style={{ marginBottom: 0, cursor: 'pointer' }}>Add GST (18%)</label>
                                </div>
                            </div>
                        </div>

                        {/* Project Details Section */}
                        <div className={styles.inputCard} style={{ margin: 0, height: '100%' }}>
                            <h3 className={styles.sectionTitle}><i className="fa-solid fa-building"></i> Project Details</h3>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Project Name</label>
                                <SearchableSelect
                                    options={sites.map(s => s.name)}
                                    value={formData.projectName}
                                    onChange={handleSiteChange}
                                    placeholder="Select Project"
                                />
                            </div>
                            <Input label="Type of Work" value={formData.typeOfWork} onChange={e => setFormData({ ...formData, typeOfWork: e.target.value })} placeholder="e.g. FALSE CEILING" />

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <Input label="Project Code" value={formData.projectCode} onChange={e => setFormData({ ...formData, projectCode: e.target.value })} maxLength={16} placeholder="Code" />
                                <Input label="Client Code" value={formData.clientCode} onChange={e => setFormData({ ...formData, clientCode: e.target.value })} placeholder="Client" />
                            </div>
                        </div>

                        {/* Order Details & Adjustments Section */}
                        <div className={styles.inputCard} style={{ margin: 0, height: '100%' }}>
                            <h3 className={styles.sectionTitle}><i className="fa-solid fa-clipboard-list"></i> Order & Billing</h3>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Work Order No</label>
                                <SearchableSelect
                                    options={filteredWOs.map(w => w.wo_no)}
                                    value={formData.workOrderNo}
                                    onChange={handleWOChange}
                                    placeholder="Select Work Order"
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                <Input type="date" label="Order Date" value={formData.orderDate} onChange={e => setFormData({ ...formData, orderDate: e.target.value })} />
                                <Input type="date" label="Billing Date" value={formData.billingDate} onChange={e => setFormData({ ...formData, billingDate: e.target.value })} />
                            </div>
                            {billType === 'RUNNING' && (
                                <Input label="RAB No" value={formData.rabNo} onChange={e => setFormData({ ...formData, rabNo: e.target.value })} />
                            )}

                            {/* Nested Adjustments */}
                            <div style={{ marginTop: '15px', paddingTop: '15px', borderTop: '1px solid var(--border-soft)' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                    <Input type="text" inputMode="decimal" label="Retention %" value={formData.retentionPercent} onChange={e => setFormData({ ...formData, retentionPercent: e.target.value })} />
                                    <Input type="text" inputMode="decimal" label="Housekeeping %" value={formData.housekeepingPercent} onChange={e => setFormData({ ...formData, housekeepingPercent: e.target.value })} />
                                </div>
                                <Input type="text" inputMode="decimal" label="Discount Amount" value={formData.discount} onChange={e => setFormData({ ...formData, discount: e.target.value })} placeholder="Enter discount" />
                            </div>
                        </div>
                    </div>

                    {/* Items Section */}
                    <div className={styles.inputCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}><i className="fa-solid fa-list-check"></i> Bill Items</h3>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <Button variant="secondary" onClick={() => addItem(true)} style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '8px' }}><i className="fa-solid fa-plus"></i> Header</Button>
                                <Button variant="secondary" onClick={() => addItem(false)} style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '8px' }}><i className="fa-solid fa-plus"></i> Item</Button>
                            </div>
                        </div>

                        <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px', paddingRight: '5px' }}>
                            {items.map((item, index) => (
                                <div key={index} style={{ padding: '12px', background: item.isHeader ? '#f8fafc' : 'white', border: '1px solid var(--border-soft)', borderRadius: '12px', transition: 'all 0.2s', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                                            {item.isHeader ? 'Section Header' : `Item ${index + 1}`}
                                        </span>
                                        <button onClick={() => removeItem(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem' }}><i className="fa-solid fa-circle-xmark"></i></button>
                                    </div>
                                    <div className={styles.inputGroup}>
                                        <label className={styles.label}>Description</label>
                                        <textarea
                                            placeholder="Enter detailed work description..."
                                            className={styles.itemInput}
                                            value={item.desc}
                                            onChange={e => handleItemChange(index, 'desc', e.target.value)}
                                            style={{ width: '100%', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-soft)', fontSize: '0.9rem', minHeight: '80px', resize: 'vertical', fontFamily: 'inherit' }}
                                        />
                                    </div>
                                    {!item.isHeader && (
                                        <>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>Order Rate</label>
                                                    <input type="text" inputMode="decimal" placeholder="0.00" className={styles.itemInput} value={item.rate} onChange={e => handleItemChange(index, 'rate', e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border-soft)', fontSize: '0.9rem' }} />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>IIPL Rate</label>
                                                    <input type="text" inputMode="decimal" placeholder="0.00" className={styles.itemInput} value={item.iiplRate} onChange={e => handleItemChange(index, 'iiplRate', e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border-soft)', fontSize: '0.9rem' }} />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>Billing %</label>
                                                    <input type="text" inputMode="decimal" placeholder="100" className={styles.itemInput} value={item.rabPercent} onChange={e => handleItemChange(index, 'rabPercent', e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border-soft)', fontSize: '0.9rem' }} />
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginTop: '12px' }}>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>Order Qty</label>
                                                    <input type="text" inputMode="decimal" placeholder="0" className={styles.itemInput} value={item.orderQty} onChange={e => handleItemChange(index, 'orderQty', e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border-soft)', fontSize: '0.9rem' }} />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>Com. Qty</label>
                                                    <input type="text" inputMode="decimal" placeholder="0" className={styles.itemInput} value={item.cumulativeQty} onChange={e => handleItemChange(index, 'cumulativeQty', e.target.value)} style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border-soft)', fontSize: '0.9rem' }} />
                                                </div>
                                                <div className={styles.inputGroup}>
                                                    <label className={styles.label}>Unit</label>
                                                    <input placeholder="e.g. SFT" className={styles.itemInput} value={item.unit} onChange={handleItemChange ? e => handleItemChange(index, 'unit', e.target.value) : undefined} style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border-soft)', fontSize: '0.9rem' }} />
                                                </div>
                                            </div>
                                            <div className={styles.inputGroup} style={{ marginTop: '12px' }}>
                                                <label className={styles.label}>M+L Type</label>
                                                <input placeholder="e.g. Material Only" className={styles.itemInput} value={item.ml} onChange={handleItemChange ? e => handleItemChange(index, 'ml', e.target.value) : undefined} style={{ padding: '10px', borderRadius: '10px', border: '1px solid var(--border-soft)', fontSize: '0.9rem' }} />
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Advances Section */}
                    <div className={styles.inputCard}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                            <h3 className={styles.sectionTitle} style={{ marginBottom: 0 }}><i className="fa-solid fa-hand-holding-dollar"></i> Adjustments</h3>
                            <div style={{ display: 'flex', gap: '5px' }}>
                                <Button variant="secondary" onClick={() => addAdvance('ADDITION')} style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '8px' }}>+ Add</Button>
                                <Button variant="secondary" onClick={() => addAdvance('DEDUCTION')} style={{ padding: '6px 10px', fontSize: '11px', borderRadius: '8px' }}>- Deduct</Button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {advances.map((adv, index) => (
                                <div key={index} style={{ padding: '12px', border: `1px solid ${adv.type === 'ADDITION' ? '#dcfce7' : '#fee2e2'}`, background: adv.type === 'ADDITION' ? '#f0fdf4' : '#fef2f2', borderRadius: '12px', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <span style={{ fontSize: '0.7rem', fontWeight: '700', color: adv.type === 'ADDITION' ? '#166534' : '#991b1b', textTransform: 'uppercase' }}>
                                            {adv.type}
                                        </span>
                                        <button onClick={() => removeAdvance(index)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.1rem' }}><i className="fa-solid fa-circle-xmark"></i></button>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Mode</label>
                                            <select
                                                className={styles.itemInput}
                                                value={adv.remark || 'N/A'}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    handleAdvanceChange(index, 'remark', val);
                                                    handleAdvanceChange(index, 'label', val === 'N/A' ? 'ADJUSTMENT' : `ADVANCE (${val})`);
                                                }}
                                                style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-soft)', fontSize: '0.85rem', width: '100%' }}
                                            >
                                                <option value="N/A">N/A</option>
                                                <option value="M1">M1</option>
                                                <option value="M2">M2</option>
                                                <option value="M3">M3</option>
                                                <option value="M4">M4</option>
                                                <option value="M5">M5</option>
                                            </select>
                                        </div>

                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Amount</label>
                                            <input type="text" inputMode="decimal" placeholder="0.00" className={styles.itemInput} value={adv.amount} onChange={e => handleAdvanceChange(index, 'amount', e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-soft)', fontSize: '0.85rem', width: '100%' }} />
                                        </div>

                                        <div className={styles.inputGroup}>
                                            <label className={styles.label}>Date</label>
                                            <input type="date" className={styles.itemInput} value={adv.date} onChange={e => handleAdvanceChange(index, 'date', e.target.value)} style={{ padding: '8px', borderRadius: '8px', border: '1px solid var(--border-soft)', fontSize: '0.85rem', width: '100%' }} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', gap: '15px', paddingBottom: '60px' }}>
                        <Button onClick={handleNewBill} style={{ width: '60px', height: '56px', borderRadius: '16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer' }} title="New Bill">
                            <i className="fa-solid fa-plus"></i>
                        </Button>
                        <Button onClick={fetchBillHistory} style={{ width: '60px', height: '56px', borderRadius: '16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', color: '#64748b', border: '1px solid #e2e8f0', cursor: 'pointer' }} title="Bill History">
                            <i className="fa-solid fa-clock-rotate-left"></i>
                        </Button>
                        <Button onClick={handleSaveBill} style={{ width: '60px', height: '56px', borderRadius: '16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#10b981', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.3)' }} title="Save Bill">
                            <i className="fa-solid fa-floppy-disk"></i>
                        </Button>
                        <Button onClick={() => setShowPreviewOverlay(true)} style={{ flex: 1, height: '56px', borderRadius: '16px', fontSize: '1.1rem', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', background: 'var(--primary-blue)', color: 'white', border: 'none', cursor: 'pointer', boxShadow: '0 10px 25px -5px rgba(37, 99, 235, 0.4)' }}>
                            <i className="fa-solid fa-magnifying-glass-chart"></i> Preview Final Bill
                        </Button>
                        <Button style={{ height: '56px', width: '60px', borderRadius: '16px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f59e0b', color: 'white', border: 'none', cursor: 'pointer' }} onClick={exportToExcel} title="Excel">
                            <i className="fa-solid fa-file-excel"></i>
                        </Button>
                    </div>
                </div>
            </div>


            {/* Preview Overlay */}
            {showPreviewOverlay && (
                <div className={styles.modalOverlay} onClick={() => setShowPreviewOverlay(false)}>
                    <div className={styles.overlayContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.overlayHeader}>
                            <h2 style={{ margin: 0, color: 'white', display: 'flex', alignItems: 'center', gap: '15px' }}>
                                <i className="fa-solid fa-file-invoice-dollar"></i> Bill Preview
                            </h2>
                            <div style={{ display: 'flex', gap: '15px' }}>
                                <Button onClick={handlePrint} style={{ height: '44px', padding: '0 24px', borderRadius: '12px', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '10px', background: '#10b981', color: 'white', border: 'none' }}>
                                    <i className="fa-solid fa-print"></i> Print / PDF
                                </Button>
                                <button className={styles.overlayCloseBtn} onClick={() => setShowPreviewOverlay(false)}>
                                    <i className="fa-solid fa-xmark"></i>
                                </button>
                            </div>
                        </div>

                        <div className={styles.overlayBody}>
                            <div className={`${styles.billPaper} printable-content`}>
                                <div className={styles.headerSection}>
                                    <div className={styles.headerMain}>INNOVATIVE INTERIORS PVT LTD</div>
                                    <div className={styles.headerSub}>
                                        SUB CONTRACTOR - {billType === 'FINAL' ? 'FINAL BILL' : `RAB - ${formData.rabNo}`}
                                    </div>
                                </div>

                                <div className={styles.metadataGrid}>
                                    <div className={styles.metaCol}>
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>NAME OF PROJECT :</span>
                                            <span>{formData.projectName}</span>
                                        </div>
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>TYPE OF WORK :</span>
                                            <span>{formData.typeOfWork}</span>
                                        </div>
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>SUB CON NAME :</span>
                                            <span>{formData.subConName}</span>
                                        </div>
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>MOBILE NO :</span>
                                            <span>{formData.vendorMobile}</span>
                                        </div>
                                    </div>

                                    <div className={styles.logoBox}>
                                        <img src="/LOGO.png" alt="IIPL Logo" className={styles.logoImg} />
                                    </div>

                                    <div className={styles.metaCol}>
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>PROJECT / CLIENT CODE :</span>
                                            <span>{formData.projectCode} / {formData.clientCode}</span>
                                        </div>
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>WORK ORDER NO :</span>
                                            <span>{formData.workOrderNo}</span>
                                        </div>
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>ORDER DATE :</span>
                                            <span>{formData.orderDate}</span>
                                        </div>
                                        <div className={styles.metaItem}>
                                            <span className={styles.metaLabel}>BILLING DATE :</span>
                                            <span>{formData.billingDate}</span>
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
                                            {showIIPL && <th colSpan="1">IIPL</th>}
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
                                                <th style={{ width: colWidths['irate'] || '60px' }}>RATE<div className={styles.resizer} onMouseDown={e => handleResizeMouseDown(e, 'irate')}></div></th>
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
                                                            <td colSpan="2" className={styles.textLeft} style={{ fontWeight: 'bold', paddingLeft: '10px', whiteSpace: 'pre-wrap', verticalAlign: 'top' }}>
                                                                {item.desc}
                                                            </td>

                                                            <td colSpan={showIIPL ? 13 : 12}></td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td>{sNo++}</td>
                                                            <td className={styles.textLeft} style={{ whiteSpace: 'pre-wrap', verticalAlign: 'top', minWidth: '200px' }}>{item.desc}</td>
                                                            <td>{item.ml}</td>
                                                            <td>{item.unit}</td>
                                                            <td className={styles.textRight}>{item.rate}</td>
                                                            <td>{item.orderQty}</td>
                                                            <td className={styles.textRight}>{item.orderAmt > 0 ? item.orderAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                                                            <td>{item.cumulativeQty}</td>
                                                            <td className={styles.textRight}>{item.cumAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                            <td style={{ color: item.varQty < 0 ? 'red' : 'inherit' }}>{item.varQty === 0 ? '-' : item.varQty.toFixed(2)}</td>
                                                            <td className={styles.textRight} style={{ color: item.varAmt < 0 ? 'red' : 'inherit' }}>
                                                                {item.varAmt === 0 ? '-' : (item.varAmt < 0 ? `(${Math.abs(item.varAmt).toLocaleString('en-IN', { minimumFractionDigits: 2 })})` : item.varAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 }))}
                                                            </td>
                                                            <td>{item.cumulativeQty}</td>
                                                            <td>{item.rabPercent}%</td>
                                                            <td className={styles.textRight}>{item.rabAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                            {showIIPL && (
                                                                <td>{item.iiplRate}</td>
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
                                                <td></td>
                                            )}
                                        </tr>
                                    </tbody>
                                </table>

                                <div className={styles.summarySection} style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
                                    <div className={styles.paymentLeft} style={{ flex: '1.2' }}>
                                        <table className={styles.summaryTable}>
                                            <tbody>
                                                {/* Summary Rows */}
                                                <tr style={{ background: '#f8fafc' }}>
                                                    <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '6px 10px' }}>GROSS TOTAL</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 10px', width: '120px' }}>{grandTotals.rabAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                </tr>

                                                {discountAmt > 0 && (
                                                    <tr>
                                                        <td style={{ textAlign: 'right', padding: '6px 10px' }}>Less: Discount</td>
                                                        <td style={{ textAlign: 'right', color: '#ef4444', padding: '6px 10px' }}>- {discountAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                )}

                                                {m2Total > 0 && (
                                                    <tr>
                                                        <td style={{ textAlign: 'right', padding: '6px 10px' }}>Less: M2</td>
                                                        <td style={{ textAlign: 'right', color: '#ef4444', padding: '6px 10px' }}>- {m2Total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                )}

                                                {/* Only show Taxable Value if it changed from Gross Total */}
                                                {(discountAmt > 0 || m2Total > 0) && (
                                                    <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                                        <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '6px 10px' }}>TAXABLE VALUE</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 10px' }}>{taxableBase.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                )}

                                                {formData.includeGst && (
                                                    <>
                                                        <tr>
                                                            <td style={{ textAlign: 'right', padding: '6px 10px' }}>Add GST (18%)</td>
                                                            <td style={{ textAlign: 'right', color: '#10b981', padding: '6px 10px' }}>+ {gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                        </tr>
                                                        <tr style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                                                            <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '6px 10px' }}>TOTAL WITH GST</td>
                                                            <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 10px' }}>{valueWithGst.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                        </tr>
                                                    </>
                                                )}

                                                {retentionAmt > 0 && (
                                                    <tr>
                                                        <td style={{ textAlign: 'right', padding: '6px 10px' }}>Less Retention (5%)</td>
                                                        <td style={{ textAlign: 'right', color: '#ef4444', padding: '6px 10px' }}>- {retentionAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                )}
                                                {housekeepingAmt > 0 && (
                                                    <tr>
                                                        <td style={{ textAlign: 'right', padding: '6px 10px' }}>Less Housekeeping ({formData.housekeepingPercent}%)</td>
                                                        <td style={{ textAlign: 'right', color: '#ef4444', padding: '6px 10px' }}>- {housekeepingAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                )}

                                                {/* Only show Net Before Advances if it changed from valueWithGst */}
                                                {(retentionAmt > 0 || housekeepingAmt > 0) && (
                                                    <tr style={{ background: '#f8fafc' }}>
                                                        <td style={{ fontWeight: 'bold', textAlign: 'right', padding: '6px 10px' }}>NET BEFORE ADVANCES</td>
                                                        <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '6px 10px' }}>{subtotalAfterTaxes.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                )}

                                                {otherTotal > 0 && (
                                                    <tr>
                                                        <td style={{ textAlign: 'right', padding: '6px 10px' }}>
                                                            Less: Other Advances ({[...new Set(otherPayments.map(p => p.remark).filter(r => r && r !== 'N/A'))].join(', ')})
                                                        </td>
                                                        <td style={{ textAlign: 'right', color: '#ef4444', padding: '6px 10px' }}>- {otherTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                    </tr>
                                                )}

                                                <tr style={{ background: '#eff6ff', borderTop: '2px solid #3b82f6' }}>
                                                    <td style={{ fontWeight: 'bold', textAlign: 'right', color: '#0f172a', fontSize: '1rem', padding: '10px' }}>FINAL PAYABLE AMOUNT</td>
                                                    <td style={{ textAlign: 'right', fontWeight: 'bold', color: netPayable < 0 ? '#ef4444' : '#2563eb', fontSize: '1.2rem', padding: '10px' }}>
                                                        {netPayable < 0 ? `- ${Math.abs(netPayable).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : netPayable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className={styles.summaryTableRight} style={{ flex: '1', minWidth: '300px' }}>
                                        <div style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#64748b', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment History</div>
                                        <table className={styles.summaryTable} style={{ fontSize: '0.85rem' }}>
                                            <tbody>
                                                <tr style={{ background: '#f8fafc', fontSize: '0.7rem', fontWeight: 'bold' }}>
                                                    <td style={{ padding: '4px 8px' }}>MODE</td>
                                                    <td style={{ textAlign: 'right', padding: '4px 8px' }}>AMOUNT</td>
                                                    <td style={{ padding: '4px 8px' }}>DATE</td>
                                                </tr>
                                                {advances.map((adv, i) => (
                                                    <tr key={i}>
                                                        <td style={{ padding: '4px 8px' }}>
                                                            {adv.remark || 'N/A'}
                                                        </td>
                                                        <td style={{ textAlign: 'right', fontWeight: 'bold', padding: '4px 8px' }}>
                                                            {adv.type === 'DEDUCTION' ? '-' : '+'} {parseFloat(adv.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                                        </td>
                                                        <td style={{ padding: '4px 8px' }}>
                                                            {adv.date}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className={styles.previewAddActions} style={{ display: 'table-row' }}>
                                                    <td colSpan="3" style={{ border: 'none', padding: '10px 0' }}>
                                                        <button className={styles.previewAddBtn} onClick={() => addAdvance('ADDITION')} style={{ padding: '4px 8px', fontSize: '10px' }}>+ Add Addition</button>
                                                        <button className={styles.previewAddBtn} style={{ marginLeft: '8px', padding: '4px 8px', fontSize: '10px' }} onClick={() => addAdvance('DEDUCTION')}>+ Add Deduction</button>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
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
                    </div>
                </div>
            )}

            {/* Admin Password Modal */}
            {passwordModalOpen && (
                <div className={styles.modalOverlay} style={{ background: 'rgba(0,0,0,0.85)' }} onClick={() => setPasswordModalOpen(false)}>
                    <div className={styles.overlayContent} style={{ width: '400px', minWidth: 'unset', padding: '30px', background: '#0f172a', border: '1px solid #1e293b' }} onClick={e => e.stopPropagation()}>
                        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
                            <div style={{ width: '60px', height: '60px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 15px' }}>
                                <i className="fa-solid fa-shield-halved" style={{ fontSize: '1.5rem', color: '#3b82f6' }}></i>
                            </div>
                            <h2 style={{ margin: 0, color: 'white', fontSize: '1.25rem' }}>Admin Access</h2>
                            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '5px' }}>Documentation is restricted to administrators.</p>
                        </div>

                        <div className={styles.inputGroup} style={{ marginBottom: '15px' }}>
                            <label style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Username</label>
                            <input 
                                type="text" 
                                className={styles.itemInput} 
                                value={adminUsername}
                                onChange={(e) => setAdminUsername(e.target.value)}
                                placeholder="Admin Username"
                                style={{ background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '12px', borderRadius: '10px' }}
                            />
                        </div>

                        <div className={styles.inputGroup}>
                            <label style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: '600', marginBottom: '8px', display: 'block' }}>Password</label>
                            <input 
                                type="password" 
                                className={styles.itemInput} 
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleVerifyAdmin()}
                                placeholder="••••••••"
                                style={{ background: '#1e293b', border: '1px solid #334155', color: 'white', padding: '12px', borderRadius: '10px' }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                            <Button onClick={() => setPasswordModalOpen(false)} style={{ flex: 1, background: 'transparent', border: '1px solid #334155', color: '#94a3b8' }}>Cancel</Button>
                            <Button onClick={handleVerifyAdmin} disabled={verifyingAdmin} style={{ flex: 2, background: 'var(--primary-blue)' }}>
                                {verifyingAdmin ? 'Verifying...' : 'Unlock Guide'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <LoadingOverlay visible={loading} />

            <PrintModal
                isOpen={printModalOpen}
                onClose={() => setPrintModalOpen(false)}
                onConfirm={confirmPrint}
            />
            <RabGuideModal
                isOpen={guideModalOpen}
                onClose={() => setGuideModalOpen(false)}
            />

            {/* History Modal Overlay */}
            {historyModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setHistoryModalOpen(false)}>
                    <div className={styles.overlayContent} onClick={e => e.stopPropagation()}>
                        <div className={styles.overlayHeader}>
                            <h2 style={{ margin: 0, color: 'white' }}><i className="fa-solid fa-clock-rotate-left"></i> Bill Draft History</h2>
                            <button className={styles.closeBtn} onClick={() => setHistoryModalOpen(false)}>&times;</button>
                        </div>
                        <div style={{ padding: '40px', overflowY: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', color: 'white' }}>
                                <thead>
                                    <tr style={{ textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                        <th style={{ padding: '15px' }}>Date / Type</th>
                                        <th style={{ padding: '15px' }}>Project & Subcontractor</th>
                                        <th style={{ padding: '15px', textAlign: 'right' }}>Total Amount</th>
                                        <th style={{ padding: '15px', textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {savedBills.length === 0 ? (
                                        <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>No saved bills found.</td></tr>
                                    ) : savedBills.map(bill => (
                                        <tr key={bill.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                            <td style={{ padding: '15px' }}>
                                                <div style={{ fontWeight: '600' }}>{new Date(bill.created_at).toLocaleDateString()}</div>
                                                <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>{bill.bill_type}</div>
                                            </td>
                                            <td style={{ padding: '15px' }}>
                                                <div style={{ fontWeight: '600', color: '#60a5fa' }}>{bill.project_name}</div>
                                                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{bill.subcon_name}</div>
                                            </td>
                                            <td style={{ padding: '15px', textAlign: 'right', fontWeight: 'bold', color: bill.final_payable < 0 ? '#ef4444' : '#60a5fa' }}>
                                                ₹{bill.final_payable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                            </td>
                                            <td style={{ padding: '15px' }}>
                                                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                    <Button onClick={() => loadBillFromHistory(bill)} style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#3b82f6' }}>Load</Button>
                                                    <Button onClick={() => deleteBillFromHistory(bill.id)} style={{ padding: '6px 12px', fontSize: '0.8rem', background: '#ef4444' }}>Delete</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BillGenerator;
