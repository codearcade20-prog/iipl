import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { useMessage } from '../context/MessageContext';
import { LoadingOverlay } from '../components/ui';
import {
    Search,
    ArrowLeft,
    Printer,
    Trash2,
    FileText,
    Calendar,
    Download,
    Eye
} from 'lucide-react';
import styles from './PayrollHistory.module.css';

const PayrollHistory = () => {
    const { alert, toast, confirm } = useMessage();
    const [loading, setLoading] = useState(false);
    const [payrolls, setPayrolls] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPayrolls();
    }, []);

    const fetchPayrolls = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('payrolls')
                .select('*, employees(full_name, employee_id, designation, department)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setPayrolls(data || []);
        } catch (e) {
            console.error(e);
            alert("Error fetching payroll history: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (await confirm("Are you sure you want to delete this payroll record?")) {
            setLoading(true);
            try {
                const { error } = await supabase.from('payrolls').delete().eq('id', id);
                if (error) throw error;
                toast("Payroll record deleted.");
                fetchPayrolls();
            } catch (e) {
                alert("Error deleting: " + e.message);
            } finally {
                setLoading(false);
            }
        }
    };

    const filteredPayrolls = useMemo(() => {
        return payrolls.filter(py =>
            py.employees?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            py.employees?.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            py.pay_period?.includes(searchTerm)
        );
    }, [payrolls, searchTerm]);

    const formatCurrency = (val) => {
        return "₹ " + (parseFloat(val) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 });
    };

    return (
        <div className={styles.container}>
            {loading && <LoadingOverlay message="Loading Records..." />}

            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <Link to="/hr-dashboard" className={styles.backBtn}>
                        <ArrowLeft size={24} />
                    </Link>
                    <h1 className={styles.title}>Payroll History</h1>
                </div>

                <div className={styles.searchWrapper}>
                    <div className={styles.searchBar}>
                        <Search size={18} color="#64748b" />
                        <input
                            className={styles.searchInput}
                            placeholder="Search by name, ID or month..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <main className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Pay Period</th>
                            <th>Gross Pay</th>
                            <th>Deductions</th>
                            <th>Net Salary</th>
                            <th>Method</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredPayrolls.length > 0 ? (
                            filteredPayrolls.map(py => (
                                <tr key={py.id}>
                                    <td>
                                        <div className={styles.empInfo}>
                                            <span className={styles.empName}>{py.employees?.full_name}</span>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{py.employees?.employee_id} • {py.employees?.designation}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={14} color="#3b82f6" />
                                            <span className={styles.periodBadge}>{py.pay_period}</span>
                                        </div>
                                    </td>
                                    <td className={styles.amount}>{formatCurrency(py.gross_salary)}</td>
                                    <td className={styles.amount} style={{ color: '#94a3b8' }}>{formatCurrency(py.total_deductions)}</td>
                                    <td className={`${styles.amount} ${styles.netPay}`}>{formatCurrency(py.net_pay)}</td>
                                    <td>
                                        <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>
                                            {py.payment_method}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.actionCell}>
                                            <Link to={`/salary-slip/${py.id}`} className={`${styles.actionBtn} ${styles.printBtn}`} title="View & Print Slip">
                                                <Printer size={16} />
                                            </Link>
                                            <button onClick={() => handleDelete(py.id)} className={`${styles.actionBtn} ${styles.deleteBtn}`} title="Delete Record">
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '80px', color: '#94a3b8' }}>
                                    <div style={{ marginBottom: '15px' }}><div style={{ display: 'inline-flex', padding: '20px', background: '#f8fafc', borderRadius: '50%' }}><FileText size={40} opacity={0.2} /></div></div>
                                    <p style={{ fontWeight: 600, fontSize: '1.1rem', margin: 0 }}>No payroll records found.</p>
                                    <p style={{ fontSize: '0.9rem' }}>{searchTerm ? "Try a different search term." : "Start by processing payroll for an employee."}</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </main>
        </div>
    );
};

export default PayrollHistory;
