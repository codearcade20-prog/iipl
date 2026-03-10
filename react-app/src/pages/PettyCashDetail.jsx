import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Printer, ArrowLeft, Download, Calendar, MapPin, User, FileText } from 'lucide-react';
import styles from './PettyCashDetail.module.css';

const PettyCashDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [entry, setEntry] = useState(null);
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [id]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: entryData, error: entryError } = await supabase
                .from('petty_cash_entries')
                .select('*')
                .eq('id', id)
                .single();

            if (entryError) throw entryError;
            setEntry(entryData);

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

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className={styles.loading}>Loading detailed report...</div>;
    if (!entry) return <div className={styles.error}>Entry not found</div>;

    return (
        <div className={styles.container}>
            <div className={styles.noPrint}>
                <button className={styles.backBtn} onClick={() => navigate('/accounts/petty-cash/history')}>
                    <ArrowLeft size={18} /> Back to History
                </button>
                <button className={styles.printBtn} onClick={handlePrint}>
                    <Printer size={18} /> Print Voucher
                </button>
            </div>

            <div className={styles.voucher}>
                <header className={styles.voucherHeader}>
                    <div className={styles.companyInfo}>
                        <h1 className={styles.companyName}>Innovative Interiors</h1>
                        <p className={styles.companyType}>Vendor Management System</p>
                    </div>
                    <div className={styles.voucherTitle}>
                        <h1>PETTY CASH VOUCHER</h1>
                        <p className={styles.voucherId}>#{entry.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                </header>

                <div className={styles.entryInfo}>
                    <div className={styles.infoCol}>
                        <div className={styles.infoLine}><strong>Date:</strong> {new Date(entry.date).toLocaleDateString('en-GB')}</div>
                        <div className={styles.infoLine}><strong>Site:</strong> {entry.site_name}</div>
                    </div>
                    <div className={styles.infoCol}>
                        <div className={styles.infoLine}><strong>Request Person:</strong> {entry.request_person}</div>
                    </div>
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
                                <td colSpan="3" align="right"><strong>GRAND TOTAL</strong></td>
                                <td align="right" className={styles.totalAmount}>
                                    ₹{parseFloat(entry.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div className={styles.signatures}>
                    <div className={styles.sigBox}>
                        <div className={styles.sigLine}></div>
                        <p>Requested By</p>
                    </div>
                    <div className={styles.sigBox}>
                        <div className={styles.sigLine}></div>
                        <p>Authorized Signatory</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PettyCashDetail;
