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

    const handlePrint = () => {
        window.print();
    };

    if (loading) return <div className={styles.pageContainer}>Loading Salary Slip...</div>;
    if (!payroll) return <div className={styles.pageContainer}>Salary Slip not found.</div>;

    const emp = payroll.employees;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.controls}>
                <Link to="/payroll" className={styles.backBtn}>← Back to Payroll</Link>
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
                        <p className={styles.headerInfo}>123 Corporate Park, Tech District, Innovation City - 560100</p>
                        <p className={styles.headerInfo}>Email: hr@innovativeinteriors.com | Phone: +91 98765 43210</p>
                    </div>
                </div>

                <div className={styles.payslipTitleSection}>
                    <span className={styles.payslipTitle}>PAYSLIP FOR THE MONTH OF {payroll.pay_period.toUpperCase()}</span>
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
                                <tr>
                                    <td>Basic Salary + DA</td>
                                    <td className={styles.amountCol}>{payroll.basic_da.toFixed(2)}</td>
                                    <td>Provident Fund (PF)</td>
                                    <td className={styles.amountCol}>{payroll.pf.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td>House Rent Allowance (HRA)</td>
                                    <td className={styles.amountCol}>{payroll.hra.toFixed(2)}</td>
                                    <td>ESI</td>
                                    <td className={styles.amountCol}>{payroll.esi.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td>Conveyance Allowance</td>
                                    <td className={styles.amountCol}>{payroll.conveyance.toFixed(2)}</td>
                                    <td>Professional Tax</td>
                                    <td className={styles.amountCol}>0.00</td>
                                </tr>
                                <tr>
                                    <td>Medical Allowance</td>
                                    <td className={styles.amountCol}>{payroll.med_reimb.toFixed(2)}</td>
                                    <td>TDS / Income Tax</td>
                                    <td className={styles.amountCol}>0.00</td>
                                </tr>
                                <tr>
                                    <td>Special Allowance</td>
                                    <td className={styles.amountCol}>{payroll.special_allowance.toFixed(2)}</td>
                                    <td>Salary Advance</td>
                                    <td className={styles.amountCol}>{payroll.advance.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td>Other Earnings</td>
                                    <td className={styles.amountCol}>{(payroll.increment + payroll.arrears + payroll.other_earnings + payroll.allowance_increase).toFixed(2)}</td>
                                    <td>Other Deductions / LWF</td>
                                    <td className={styles.amountCol}>{(payroll.lwf + payroll.lop_amount).toFixed(2)}</td>
                                </tr>
                                <tr className={styles.totalRow}>
                                    <td className={styles.totalLabel}>Total Earnings</td>
                                    <td className={styles.amountCol}>{payroll.gross_salary.toFixed(2)}</td>
                                    <td className={styles.totalLabel}>Total Deductions</td>
                                    <td className={styles.amountCol}>{payroll.total_deductions.toFixed(2)}</td>
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

                <div className={styles.footerNote}>
                    This is a computer-generated document and does not require a physical signature. Generated on {new Date().toLocaleDateString()}
                </div>
            </div>
        </div>
    );
};

export default SalarySlip;
