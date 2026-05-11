import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { numberToWords } from '../utils';
import styles from './SalarySlip.module.css';

const SalarySlip = () => {
    const { id } = useParams();
    const [payroll, setPayroll] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPayroll = async () => {
            const { data, error } = await supabase
                .from('payrolls')
                .select('*, employees(*)')
                .eq('id', id)
                .single();

            if (error) {
                console.error("Error fetching payroll:", error);
            } else {
                setPayroll(data);
            }
            setLoading(false);
        };

        fetchPayroll();
    }, [id]);

    const formatPayPeriod = (period) => {
        if (!period) return '';
        const [year, month] = period.split('-');
        const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
        const monthIndex = parseInt(month, 10) - 1;
        return `${monthNames[monthIndex]} - ${year}`;
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className={styles.pageContainer}>Loading Salary Slip...</div>;
    if (!payroll) return <div className={styles.pageContainer}>Salary Slip not found.</div>;

    const emp = payroll.employees;
    const showLop = payroll.remarks?.includes("[SHOW_LOP]");

    const basicDisplay = payroll.basic_da || 0;
    const grossDisplay = payroll.gross_salary || 0;
    const totalDeducDisplay = showLop ? (payroll.total_deductions || 0) : ((payroll.total_deductions || 0) - (payroll.lop_amount || 0));

    const otherEarnings = (payroll.increment || 0) + (payroll.arrears || 0) + (payroll.other_earnings || 0) + (payroll.allowance_increase || 0) + (payroll.child_edu || 0) + (payroll.child_hostel || 0);
    const otherDeducDisplay = (payroll.lwf || 0) + (payroll.other_deduction || 0) + (showLop ? (payroll.lop_amount || 0) : 0);

    // Dynamic Row Generation to keep tables balanced
    const earningsRows = [
        { label: 'Basic Salary + DA', value: basicDisplay },
        { label: 'House Rent Allowance (HRA)', value: payroll.hra || 0 },
        { label: 'Conveyance Allowance', value: payroll.conveyance || 0 },
        { label: 'Medical Allowance', value: payroll.med_reimb || 0 },
        { label: 'Special Allowance', value: payroll.special_allowance || 0 },
        { label: 'Other Earnings', value: otherEarnings }
    ];

    if (payroll.bonus_amount > 0) {
        earningsRows.push({ label: `Bonus (${payroll.bonus_name || 'Festive'})`, value: payroll.bonus_amount, isBonus: true });
    }

    const deductionsRows = [
        { label: 'Provident Fund (PF)', value: payroll.pf || 0 },
        { label: 'ESI', value: payroll.esi || 0 },
        { label: 'Professional Tax', value: 0 },
        { label: 'TDS / Income Tax', value: 0 },
        { label: 'Salary Advance', value: payroll.advance || 0 }
    ];

    if (payroll.food_deduction > 0) {
        deductionsRows.push({ label: 'Food Deduction', value: payroll.food_deduction });
    }

    const otherDeducLabel = `Other Deductions / LWF${showLop ? ' / LOP' : ''}${payroll.other_deduction > 0 ? ' / Others' : ''}`;
    deductionsRows.push({ label: otherDeducLabel, value: otherDeducDisplay });

    // Balance the rows
    const maxRows = Math.max(earningsRows.length, deductionsRows.length);
    while (earningsRows.length < maxRows) earningsRows.push({ label: '', value: null });
    while (deductionsRows.length < maxRows) deductionsRows.push({ label: '', value: null });

    return (
        <div className={styles.pageContainer}>
            <div className={styles.controls}>
                <Link to="/employee-list" className={styles.backBtn}>← Back to Employee List</Link>
                <button onClick={handlePrint} className={styles.printBtn}>⎙ Print Salary Slip</button>
            </div>

            <div className={styles.slip}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <img
                            src="LOGO.png"
                            alt="Company Logo"
                            className={styles.companyLogo}
                            onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                        <div className={styles.logoFallback} style={{ display: 'none' }}>II</div>
                    </div>
                    <div className={styles.headerRight}>
                        <h1 className={styles.companyName}>INNOVATIVE INTERIORS PVT LTD</h1>
                        <p className={styles.headerInfo}>No 7, V V Kovil Street, Chinmaya Nagar, Koyembedu, Chennai-92</p>
                    </div>
                </div>

                <div className={styles.payslipTitleSection}>
                    <span className={styles.payslipTitle}>PAYSLIP FOR THE MONTH OF {formatPayPeriod(payroll.pay_period)}</span>
                </div>

                <div className={styles.infoSection}>
                    <div className={styles.infoGrid}>
                        <div className={styles.infoCol}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Employee Name</span>
                                <span className={styles.infoValue}>{emp.full_name}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Employee ID</span>
                                <span className={styles.infoValue}>{emp.employee_id}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Designation</span>
                                <span className={styles.infoValue}>{emp.designation}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Department</span>
                                <span className={styles.infoValue}>{emp.department}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Date of Joining</span>
                                <span className={styles.infoValue}>{emp.date_of_joining ? new Date(emp.date_of_joining).toLocaleDateString('en-GB') : 'N/A'}</span>
                            </div>
                        </div>
                        <div className={styles.infoCol}>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Bank Name</span>
                                <span className={styles.infoValue}>{emp.bank_name}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Account No.</span>
                                <span className={styles.infoValue}>{emp.account_no}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>PAN Number</span>
                                <span className={styles.infoValue}>{emp.pan_no}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.infoLabel}>Pay Days</span>
                                <span className={styles.infoValue}>{payroll.pay_days}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.tablesSection}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th className={styles.headerCell}>EARNINGS</th>
                                    <th className={`${styles.headerCell} ${styles.amountCol}`}>AMOUNT (₹)</th>
                                    <th className={styles.headerCell}>DEDUCTIONS</th>
                                    <th className={`${styles.headerCell} ${styles.amountCol}`}>AMOUNT (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {Array.from({ length: maxRows }).map((_, index) => (
                                    <tr key={index}>
                                        <td style={earningsRows[index].isBonus ? { color: '#10b981', fontWeight: 700 } : {}}>
                                            {earningsRows[index].label}
                                        </td>
                                        <td className={styles.amountCol} style={earningsRows[index].isBonus ? { color: '#10b981', fontWeight: 700 } : {}}>
                                            {earningsRows[index].value !== null ? earningsRows[index].value.toFixed(2) : ''}
                                        </td>
                                        <td>{deductionsRows[index].label}</td>
                                        <td className={styles.amountCol}>
                                            {deductionsRows[index].value !== null ? deductionsRows[index].value.toFixed(2) : ''}
                                        </td>
                                    </tr>
                                ))}
                                <tr className={styles.totalRow}>
                                    <td className={styles.totalLabel}>Total Earnings</td>
                                    <td className={styles.amountCol}>{grossDisplay.toFixed(2)}</td>
                                    <td className={styles.totalLabel}>Total Deductions</td>
                                    <td className={styles.amountCol}>{totalDeducDisplay.toFixed(2)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className={styles.netPayContainer}>
                    <div className={styles.netPayLabelBox}>
                        <div className={styles.netPayMainLabel}>NET PAY</div>
                        <div className={styles.netPayInWords}>Rupees {numberToWords(Math.round(payroll.net_pay))} Only</div>
                    </div>
                    <div className={styles.netPayValueBox}>
                        {payroll.net_pay.toFixed(2)}
                    </div>
                </div>

                {payroll.remarks && payroll.remarks.replace(" [SHOW_LOP]", "").trim() !== "" && (
                    <div style={{ marginTop: '20px', padding: '15px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '5px' }}>Remarks / Notes</div>
                        <div style={{ fontSize: '0.9rem', color: '#1e293b', whiteSpace: 'pre-wrap' }}>
                            {payroll.remarks.replace(" [SHOW_LOP]", "")}
                        </div>
                    </div>
                )}

                {payroll.show_signatures && (
                    <div style={{ marginTop: '50px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #cbd5e1', paddingTop: '40px' }}>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{ width: '120px', borderBottom: '1px solid #94a3b8', margin: '0 auto 8px' }}></div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>HR DEPARTMENT</div>
                        </div>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{ width: '120px', borderBottom: '1px solid #94a3b8', margin: '0 auto 8px' }}></div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>ACCOUNTS DEPT.</div>
                        </div>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{ width: '120px', borderBottom: '1px solid #94a3b8', margin: '0 auto 8px' }}></div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>GENERAL MANAGER</div>
                        </div>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{ width: '120px', borderBottom: '1px solid #94a3b8', margin: '0 auto 8px' }}></div>
                            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>MANAGING DIRECTOR</div>
                        </div>
                    </div>
                )}

                <div className={styles.footerNote}>
                    This is a computer-generated document and does not require a physical signature. Generated on {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>
    );
};

export default SalarySlip;
