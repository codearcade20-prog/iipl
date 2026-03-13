import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Printer, ArrowLeft, Download, Calendar, MapPin, User, FileText, CreditCard, Landmark, CheckCircle, Clock, XCircle } from 'lucide-react';
import LoadingScreen from '../components/LoadingScreen';
import { useMessage } from '../context/MessageContext';
import styles from './PettyCashDetail.module.css';
import SignatureImage from '../components/SignatureImage';


const PettyCashDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { confirm } = useMessage();
    const isMD = location.pathname.startsWith('/md-dashboard');
    const [entry, setEntry] = useState(null);
    const [person, setPerson] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch entry
            const { data: entryData, error: entryError } = await supabase
                .from('petty_cash_entries')
                .select('*')
                .eq('id', id)
                .single();

            if (entryError) throw entryError;
            setEntry(entryData);

            // Fetch person if person_id exists
            if (entryData.person_id) {
                const { data: personData } = await supabase
                    .from('petty_cash_persons')
                    .select('*')
                    .eq('id', entryData.person_id)
                    .single();
                setPerson(personData);
            }

            // Fetch items
            const { data: itemsData, error: itemsError } = await supabase
                .from('petty_cash_items')
                .select('*')
                .eq('entry_id', id);

            if (itemsError) throw itemsError;
            setItems(itemsData || []);
        } catch (error) {
            console.error("Error fetching entry detail:", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = async () => {
        let orientation = 'portrait';
        try {
            const landscape = await confirm("Which orientation would you like to use?", { 
                title: "Print Orientation",
                okText: "Landscape",
                cancelText: "Portrait"
            });
            orientation = landscape ? 'landscape' : 'portrait';
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
                #petty-cash-voucher-print, 
                #petty-cash-voucher-print * { 
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
                #petty-cash-voucher-print { 
                    position: absolute !important; 
                    left: 0 !important; 
                    top: 0 !important; 
                    width: 100% !important; 
                    z-index: 99999 !important;
                }
            }
        `;
        document.head.appendChild(style);


        setTimeout(() => {
            window.print();
            setTimeout(() => {
                const el = document.getElementById('print-override');
                if (el) document.head.removeChild(el);
            }, 1000);
        }, 300);
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Approved': return { color: '#22c55e', background: '#f0fdf4' };
            case 'Rejected': return { color: '#ef4444', background: '#fef2f2' };
            default: return { color: '#f59e0b', background: '#fffbeb' };
        }
    };

    if (loading) return <LoadingScreen message="Generating voucher report..." />;
    if (!entry) return <div className={styles.error}>Entry not found</div>;

    return (
        <div className={styles.container}>
            <div className={styles.noPrint}>
                <div className={styles.headerInfo}>
                    <button className={styles.backBtn} onClick={() => navigate(isMD ? '/md-dashboard/history' : '/accounts/petty-cash/history')}>
                        <ArrowLeft size={18} />
                    </button>
                    <div>
                        <h1 className={styles.title}>Voucher Details</h1>
                        <p className={styles.subtitle}>Complete breakdown of voucher #{entry?.voucher_no || 'Pending'}</p>
                    </div>
                </div>
                <div className={styles.actionButtons}>
                    <button className={styles.printBtn} onClick={handlePrint}>
                        <Printer size={18} /> Print Voucher
                    </button>
                </div>
            </div>

            <div id="petty-cash-voucher-print" className={styles.voucher}>

                <header className={styles.voucherHeader}>
                    <div className={styles.companyInfo}>
                        <h1 className={styles.companyName}>Innovative Interiors</h1>
                        <p className={styles.companyType}>Vendor Management System</p>
                    </div>
                    <div className={styles.voucherTitle}>
                        <h1>PETTY CASH VOUCHER</h1>
                        <p className={styles.voucherId}>#{entry.voucher_no || entry.id.slice(0, 8).toUpperCase()}</p>
                        <div className={styles.statusBadge} style={getStatusStyle(entry.status)}>
                            {entry.status || 'Pending'}
                        </div>
                    </div>
                </header>

                <div className={styles.entryGrid}>
                    <div className={styles.infoSection}>
                        <h3 className={styles.sectionTitle}>Request Information</h3>
                        <div className={styles.infoLine}><strong>Date:</strong> {new Date(entry.date).toLocaleDateString('en-GB')}</div>
                        <div className={styles.infoLine}><strong>Site:</strong> {entry.site_name}</div>
                        <div className={styles.infoLine}><strong>Type:</strong> <span className={styles.entryTypeTag}>{entry.entry_type || 'Operational Expense'}</span></div>
                    </div>

                    <div className={styles.infoSection}>
                        <h3 className={styles.sectionTitle}>Requester Details</h3>
                        <div className={styles.infoLine}><strong>Name:</strong> {person?.name || entry.request_person}</div>
                        <div className={styles.infoLine}><strong>Phone:</strong> {person?.phone || '---'}</div>
                        <div className={styles.infoLine}><strong>Type:</strong> {person?.person_type || '---'}</div>
                    </div>

                    {person && (
                        <div className={styles.infoSection} style={{ gridColumn: 'span 2' }}>
                            <h3 className={styles.sectionTitle}>Bank Account Information</h3>
                            <div className={styles.bankGrid}>
                                <div className={styles.infoLine}><strong>Bank:</strong> {person.bank_name}</div>
                                <div className={styles.infoLine}><strong>Account:</strong> {person.account_number}</div>
                                <div className={styles.infoLine}><strong>IFSC:</strong> {person.ifsc_code}</div>
                                {person.pan_number && <div className={styles.infoLine}><strong>PAN:</strong> {person.pan_number}</div>}
                            </div>
                        </div>
                    )}

                    {entry.status === 'Paid' && (
                        <div className={styles.infoSection} style={{ gridColumn: 'span 2' }}>
                            <h3 className={styles.sectionTitle}>Payment Information</h3>
                            <div className={styles.bankGrid}>
                                <div className={styles.infoLine}><strong>Paid Date:</strong> {new Date(entry.paid_date).toLocaleDateString('en-GB')}</div>
                                {entry.paid_remarks && <div className={styles.infoLine}><strong>Payment Remarks:</strong> {entry.paid_remarks}</div>}
                            </div>
                        </div>
                    )}
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Category</th>
                                <th>Remarks / Description</th>
                                <th align="right">Amount (₹)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map((item, index) => (
                                <tr key={item.id}>
                                    <td>{index + 1}</td>
                                    <td>{item.category}</td>
                                    <td>{item.remarks || '---'}</td>
                                    <td align="right">{parseFloat(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan="3" align="right"><strong>REQUESTED TOTAL</strong></td>
                                <td align="right" className={styles.totalAmount}>
                                    ₹{parseFloat(entry.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                            {entry.approved_amount && entry.approved_amount !== entry.total_amount && (
                                <tr>
                                    <td colSpan="3" align="right" style={{ color: '#16a34a' }}><strong>APPROVED AMOUNT</strong></td>
                                    <td align="right" className={styles.totalAmount} style={{ color: '#16a34a' }}>
                                        ₹{parseFloat(entry.approved_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            )}
                            {entry.md_remarks && (
                                <tr>
                                    <td colSpan="4">
                                        <div style={{ fontSize: '0.85rem', color: '#4b5563', fontStyle: 'italic', padding: '0.5rem 0' }}>
                                            <strong>MD Remarks: </strong> {entry.md_remarks}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tfoot>
                    </table>
                </div>

                <div className={styles.footerInfo}>
                    <div className={styles.signatures}>
                        <div className={styles.sigBox}>
                            <div className={styles.sigLine}></div>
                            <p>Requested By</p>
                            <p className={styles.sigName}>{person?.name || entry.request_person}</p>
                        </div>
                        <div className={styles.sigBox}>
                            {entry.md_signature ? (
                                <div className={styles.signatureDisplay}>
                                    <SignatureImage src={entry.md_signature} alt="MD Signature" className={styles.sigImage} />
                                    <div className={styles.sigLine}></div>
                                </div>
                            ) : (
                                <div className={styles.sigLine}></div>
                            )}
                            <p>Authorized Signatory (MD)</p>
                            {entry.md_approved_at && (
                                <p className={styles.sigDate}>
                                    {entry.status === 'Rejected' ? 'Rejected on ' : 'Approved on '}
                                    {new Date(entry.md_approved_at).toLocaleDateString()}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PettyCashDetail;
