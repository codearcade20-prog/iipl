import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Calendar, Filter, FileText, Printer, ArrowLeft, Download, ChevronDown, Settings } from 'lucide-react';
import { useMessage } from '../context/MessageContext';
import LoadingScreen from '../components/LoadingScreen';
import styles from './PettyCashMasterSheet.module.css';

const PettyCashMasterSheet = () => {
    const { alert, confirm, toast } = useMessage();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [filteredData, setFilteredData] = useState([]);
    
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        person: '',
        voucherNo: '',
        site: ''
    });

    const [showSettings, setShowSettings] = useState(false);
    const [columns, setColumns] = useState({
        voucher: true,
        date: true,
        site: true,
        person: true,
        accountNo: false,
        panNo: false,
        category: true,
        remarks: true,
        reqAmount: true,
        apprAmount: true,
        paidDate: false,
        paidRemarks: false,
        mdRemarks: false
    });

    const columnLabels = {
        voucher: 'Voucher No',
        date: 'Date',
        site: 'Site / Project',
        person: 'Request Person',
        accountNo: 'Account No',
        panNo: 'PAN No',
        category: 'Category',
        remarks: 'Description / Remarks',
        reqAmount: 'Req. Amount',
        apprAmount: 'Appr. Amount',
        paidDate: 'Paid Date',
        paidRemarks: 'Paid Remarks',
        mdRemarks: 'MD Remarks'
    };

    const [printOrientation, setPrintOrientation] = useState('landscape'); // landscape default for master sheets

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        applyFilters();
    }, [filters, data]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Join petty_cash_items with petty_cash_entries
            const { data: items, error } = await supabase
                .from('petty_cash_items')
                .select(`
                    *,
                    petty_cash_entries (
                        voucher_no,
                        date,
                        request_person,
                        site_name,
                        status,
                        approved_amount,
                        total_amount,
                        paid_date,
                        paid_remarks,
                        md_remarks,
                        petty_cash_persons (
                            account_number,
                            pan_number
                        )
                    )
                `)
                .order('id', { ascending: false });

            if (error) throw error;
            setData(items || []);
        } catch (error) {
            console.error("Error fetching master sheet data:", error);
            toast("Failed to load data", "Error");
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let result = [...data];

        if (filters.startDate) {
            result = result.filter(item => item.petty_cash_entries.date >= filters.startDate);
        }
        if (filters.endDate) {
            result = result.filter(item => item.petty_cash_entries.date <= filters.endDate);
        }
        if (filters.person) {
            result = result.filter(item => 
                item.petty_cash_entries.request_person.toLowerCase().includes(filters.person.toLowerCase())
            );
        }
        if (filters.voucherNo) {
            result = result.filter(item => 
                item.petty_cash_entries.voucher_no?.toLowerCase().includes(filters.voucherNo.toLowerCase())
            );
        }
        if (filters.site) {
            result = result.filter(item => 
                item.petty_cash_entries.site_name?.toLowerCase().includes(filters.site.toLowerCase())
            );
        }

        setFilteredData(result);
    };

    const handlePrint = async () => {
        let orientation = 'landscape';
        try {
            const choice = await confirm("Which layout would you like to use?", { 
                title: "Print Orientation",
                okText: "Landscape",
                cancelText: "Portrait"
            });
            orientation = choice ? 'landscape' : 'portrait';
        } catch (error) {
            orientation = 'portrait';
        }
        
        const style = document.createElement('style');
        style.id = 'print-override';
        style.innerHTML = `
            @page { size: ${orientation}; margin: 10mm; }
            @media print {
                /* Aggressively hide everything */
                body * { visibility: hidden !important; }
                
                /* Show our target and its children */
                #petty-cash-print-area, 
                #petty-cash-print-area * { 
                    visibility: visible !important; 
                }
                
                /* Reset parents so they don't clip or hide the content */
                html, body, #root, #root > *, [class*="wrapper"], [class*="content"], [class*="container"] {
                    visibility: visible !important;
                    display: block !important;
                    overflow: visible !important;
                    height: auto !important;
                    min-height: 0 !important;
                    position: static !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                    box-shadow: none !important;
                    background: transparent !important;
                }

                /* Position the target at the top of the printed page */
                #petty-cash-print-area { 
                    position: absolute !important; 
                    left: 0 !important; 
                    top: 0 !important; 
                    width: 100% !important; 
                    z-index: 99999 !important;
                }
            }
        `;
        document.head.appendChild(style);


        // Mark the table wrapper for print targeting
        const printArea = document.getElementById('petty-cash-print-area');
        if (printArea) {
            printArea.style.display = 'block';
        }

        setTimeout(() => {
            window.print();
            setTimeout(() => {
                const el = document.getElementById('print-override');
                if (el) document.head.removeChild(el);
            }, 1000);
        }, 300);
    };

    const totalRequested = filteredData.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    // Note: Approved amount is entry level, so summing it on item level is tricky.
    // I'll calculate it by filtering unique entries in the visible set.
    const uniqueEntryIds = [...new Set(filteredData.map(item => item.entry_id))];
    const totalApproved = uniqueEntryIds.reduce((sum, entryId) => {
        const entry = filteredData.find(item => item.entry_id === entryId)?.petty_cash_entries;
        if (entry?.status === 'Approved' || entry?.status === 'Paid') {
            return sum + (parseFloat(entry.approved_amount || entry.total_amount) || 0);
        }
        return sum;
    }, 0);

    const leftColCount = 1 + [columns.voucher, columns.date, columns.site, columns.person, columns.accountNo, columns.panNo, columns.category, columns.remarks, columns.paidDate, columns.paidRemarks, columns.mdRemarks].filter(Boolean).length;

    if (loading) return <LoadingScreen message="Compiling master sheet..." />;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.titleArea}>
                    <h1 className={styles.title}>Petty Cash Master Sheet</h1>
                    <p className={styles.subtitle}>Consolidated view of all petty cash transactions and items</p>
                </div>
                <div className={styles.actions}>
                    <div className={styles.settingsWrapper}>
                        <button className={styles.exportBtn} onClick={() => setShowSettings(!showSettings)}>
                            <Settings size={18} /> Columns
                        </button>
                        {showSettings && (
                            <div className={styles.settingsDropdown}>
                                <h3>Column Settings</h3>
                                {Object.keys(columns).map(key => (
                                    <label key={key} className={styles.columnToggle}>
                                        <input 
                                            type="checkbox" 
                                            checked={columns[key]}
                                            onChange={() => setColumns({...columns, [key]: !columns[key]})}
                                        />
                                        <span>{columnLabels[key]}</span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    <button className={styles.printBtn} onClick={handlePrint}>
                        <Printer size={18} /> Print Sheet
                    </button>
                </div>
            </header>

            <section className={styles.filterSection}>
                <div className={styles.filterGrid}>
                    <div className={styles.filterGroup}>
                        <label>Voucher No</label>
                        <div className={styles.inputWrapper}>
                            <Search size={14} />
                            <input 
                                type="text" 
                                placeholder="Search voucher..." 
                                value={filters.voucherNo}
                                onChange={e => setFilters({...filters, voucherNo: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className={styles.filterGroup}>
                        <label>Site / Project</label>
                        <div className={styles.inputWrapper}>
                            <Search size={14} />
                            <input 
                                type="text" 
                                placeholder="Search site..." 
                                value={filters.site}
                                onChange={e => setFilters({...filters, site: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className={styles.filterGroup}>
                        <label>Request Person</label>
                        <div className={styles.inputWrapper}>
                            <Search size={14} />
                            <input 
                                type="text" 
                                placeholder="Name..." 
                                value={filters.person}
                                onChange={e => setFilters({...filters, person: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className={styles.filterGroup}>
                        <label>Date Range</label>
                        <div className={styles.rangeInputs}>
                            <input 
                                type="date" 
                                value={filters.startDate}
                                onChange={e => setFilters({...filters, startDate: e.target.value})}
                            />
                            <span>to</span>
                            <input 
                                type="date" 
                                value={filters.endDate}
                                onChange={e => setFilters({...filters, endDate: e.target.value})}
                            />
                        </div>
                    </div>
                </div>
                {(filters.startDate || filters.endDate || filters.person || filters.voucherNo || filters.site) && (
                    <button className={styles.clearBtn} onClick={() => setFilters({startDate:'', endDate:'', person:'', voucherNo:'', site:''})}>
                        Clear All Filters
                    </button>
                )}
            </section>

            <div id="petty-cash-print-area" className={styles.tableWrapper}>
                <table className={styles.masterTable}>
                    <thead>
                        <tr>
                            <th>#</th>
                            {columns.voucher && <th>Voucher</th>}
                            {columns.date && <th>Date</th>}
                            {columns.site && <th>Site / Project</th>}
                            {columns.person && <th>Request Person</th>}
                            {columns.accountNo && <th>Account No</th>}
                            {columns.panNo && <th>PAN No</th>}
                            {columns.category && <th>Category</th>}
                            {columns.remarks && <th>Description / Remarks</th>}
                            {columns.reqAmount && <th align="right">Req. Amount</th>}
                            {columns.apprAmount && <th align="right">Appr. Amount</th>}
                            {columns.paidDate && <th>Paid Date</th>}
                            {columns.paidRemarks && <th>Paid Remarks</th>}
                            {columns.mdRemarks && <th>MD Remarks</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredData.length > 0 ? (
                            filteredData.map((item, index) => {
                                const entry = item.petty_cash_entries;
                                // For Approved Amount, we only show it on the "first" item of an entry if we want to avoid double counting visually,
                                // but for a simple table it might be clearer to show entry total or mark it.
                                // Actually, let's show the entry total but with a note or just show it for every row.
                                // Professional sheets usually show the entry total once, then items.
                                const isFirstInGroup = index === 0 || filteredData[index-1].entry_id !== item.entry_id;
                                
                                return (
                                    <tr key={item.id} className={isFirstInGroup ? styles.newEntryRow : ''}>
                                        <td className={styles.muted}>{index + 1}</td>
                                        {columns.voucher && <td className={styles.voucherCell}>{entry.voucher_no}</td>}
                                        {columns.date && <td className={styles.dateCell}>{new Date(entry.date).toLocaleDateString('en-GB')}</td>}
                                        {columns.site && <td>{entry.site_name}</td>}
                                        {columns.person && <td>{entry.request_person}</td>}
                                        {columns.accountNo && <td>{entry.petty_cash_persons?.account_number || '---'}</td>}
                                        {columns.panNo && <td>{entry.petty_cash_persons?.pan_number || '---'}</td>}
                                        {columns.category && <td><span className={styles.catBadge}>{item.category}</span></td>}
                                        {columns.remarks && <td className={styles.remarksCell}>{item.remarks || '---'}</td>}
                                        {columns.reqAmount && <td align="right" className={styles.amount}>₹{parseFloat(item.amount).toLocaleString()}</td>}
                                        {columns.apprAmount && <td align="right" className={styles.apprAmount}>
                                            {isFirstInGroup ? (
                                                <div className={styles.apprContainer}>
                                                    <span className={entry.status === 'Approved' || entry.status === 'Paid' ? styles.green : styles.orange}>
                                                        ₹{parseFloat(entry.approved_amount || entry.total_amount).toLocaleString()}
                                                    </span>
                                                    {entry.status === 'Paid' && (
                                                        <div className={styles.paidBadgeWrapper}>
                                                            <span className={styles.paidBadge}>PAID</span>
                                                            {entry.paid_date && <span className={styles.paidDate}>{new Date(entry.paid_date).toLocaleDateString('en-GB')}</span>}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className={styles.multiSign}>--</span>
                                            )}
                                        </td>}
                                        {columns.paidDate && <td className={styles.dateCell}>{entry.paid_date ? new Date(entry.paid_date).toLocaleDateString('en-GB') : '---'}</td>}
                                        {columns.paidRemarks && <td className={styles.remarksCell}>{entry.paid_remarks || '---'}</td>}
                                        {columns.mdRemarks && <td className={styles.remarksCell}>{entry.md_remarks || '---'}</td>}
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan="9" className={styles.noData}>No records found matching filters</td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={leftColCount} align="center"><strong>PAGE TOTAL</strong></td>
                            {columns.reqAmount && <td align="right" className={styles.footerAmt}>₹{totalRequested.toLocaleString()}</td>}
                            {columns.apprAmount && <td align="right" className={styles.footerAmtTotal}>₹{totalApproved.toLocaleString()}</td>}
                        </tr>
                    </tfoot>
                </table>
            </div>

            <div className={styles.printFooter}>
                <p>Generated on {new Date().toLocaleString()} | Innovative Interiors Management System</p>
                <div className={styles.printSignatures}>
                    <div className={styles.sigLine}>Prepared By</div>
                    <div className={styles.sigLine}>Authorized By</div>
                </div>
            </div>
        </div>
    );
};

export default PettyCashMasterSheet;
