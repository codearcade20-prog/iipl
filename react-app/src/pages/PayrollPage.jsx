import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { useMessage } from '../context/MessageContext';
import { LoadingOverlay } from '../components/ui';
import styles from './PayrollPage.module.css';

const PayrollPage = () => {
    const { alert, toast, confirm } = useMessage();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [payrolls, setPayrolls] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [editingId, setEditingId] = useState(null);

    const initialFormData = {
        employee_id: '',
        pay_period: new Date().toISOString().slice(0, 7), // YYYY-MM
        pay_days: 30,
        per_day_wage: 0,
        // Earnings
        basic_da: 0,
        hra: 0,
        conveyance: 0,
        child_edu: 0,
        child_hostel: 0,
        med_reimb: 0,
        special_allowance: 0,
        // Adjustments
        increment: 0,
        arrears: 0,
        other_earnings: 0,
        allowance_increase: 0,
        // Deductions
        pf: 0,
        esi: 0,
        advance: 0,
        lwf: 0,
        lop_amount: 0,
        payment_method: 'Bank Transfer',
        remarks: ''
    };

    const [formData, setFormData] = useState(initialFormData);

    useEffect(() => {
        fetchEmployees();
        fetchPayrolls();
    }, []);

    const fetchEmployees = async () => {
        const { data } = await supabase.from('employees').select('*').order('full_name');
        setEmployees(data || []);
    };

    const fetchPayrolls = async () => {
        const { data } = await supabase
            .from('payrolls')
            .select('*, employees(full_name, employee_id, designation)')
            .order('created_at', { ascending: false });
        setPayrolls(data || []);
    };

    const handleEmployeeChange = (e) => {
        const empId = e.target.value;
        const emp = employees.find(ev => ev.id === empId);
        setSelectedEmployee(emp);
        if (emp) {
            setFormData(prev => ({
                ...prev,
                employee_id: empId,
                per_day_wage: (parseFloat(emp.basic_salary) / 30).toFixed(2)
            }));
        } else {
            setFormData(prev => ({ ...prev, employee_id: '' }));
        }
    };

    const handleInputChange = (e) => {
        const { id, value, type } = e.target;
        if (type === 'number') {
            // Allow empty string so user can delete the number
            setFormData(prev => ({ ...prev, [id]: value === '' ? '' : parseFloat(value) }));
        } else {
            setFormData(prev => ({ ...prev, [id]: value }));
        }
    };

    // Calculations
    const totals = useMemo(() => {
        const getVal = (val) => parseFloat(val) || 0;
        const earnings = [
            getVal(formData.basic_da), getVal(formData.hra), getVal(formData.conveyance),
            getVal(formData.child_edu), getVal(formData.child_hostel), getVal(formData.med_reimb),
            getVal(formData.special_allowance), getVal(formData.increment), getVal(formData.arrears),
            getVal(formData.other_earnings), getVal(formData.allowance_increase)
        ].reduce((a, b) => a + b, 0);

        const deductions = [
            getVal(formData.pf), getVal(formData.esi), getVal(formData.advance),
            getVal(formData.lwf), getVal(formData.lop_amount)
        ].reduce((a, b) => a + b, 0);

        return {
            gross: earnings,
            deductions: deductions,
            net: earnings - deductions
        };
    }, [formData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.employee_id) return alert("Please select an employee");

        setLoading(true);
        const payload = {
            ...formData,
            gross_salary: totals.gross,
            total_deductions: totals.deductions,
            net_pay: totals.net
        };

        try {
            if (editingId) {
                await supabase.from('payrolls').update(payload).eq('id', editingId);
                toast("Payroll updated successfully!");
            } else {
                await supabase.from('payrolls').insert([payload]);
                toast("Payroll saved successfully!");
            }
            setFormData(initialFormData);
            setSelectedEmployee(null);
            setEditingId(null);
            fetchPayrolls();
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (payroll) => {
        setEditingId(payroll.id);
        const emp = employees.find(e => e.id === payroll.employee_id);
        setSelectedEmployee(emp);
        setFormData({
            employee_id: payroll.employee_id,
            pay_period: payroll.pay_period,
            pay_days: payroll.pay_days,
            per_day_wage: payroll.per_day_wage,
            basic_da: payroll.basic_da,
            hra: payroll.hra,
            conveyance: payroll.conveyance,
            child_edu: payroll.child_edu,
            child_hostel: payroll.child_hostel,
            med_reimb: payroll.med_reimb,
            special_allowance: payroll.special_allowance,
            increment: payroll.increment,
            arrears: payroll.arrears,
            other_earnings: payroll.other_earnings,
            allowance_increase: payroll.allowance_increase,
            pf: payroll.pf,
            esi: payroll.esi,
            advance: payroll.advance,
            lwf: payroll.lwf,
            lop_amount: payroll.lop_amount,
            payment_method: payroll.payment_method,
            remarks: payroll.remarks || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (await confirm("Delete this payroll record?")) {
            setLoading(true);
            await supabase.from('payrolls').delete().eq('id', id);
            fetchPayrolls();
            setLoading(false);
            toast("Deleted successfully");
        }
    };

    return (
        <div className={styles.container}>
            {loading && <LoadingOverlay message="Saving Payroll..." />}
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link to="/hr-dashboard" className={styles.homeBtn}>← Back</Link>
                    <h1 className={styles.formTitle}>Payroll Management</h1>
                </div>
                <div className={styles.headerRight}>
                    <Link to="/payroll-history" className={styles.payrollLink} style={{ textDecoration: 'none', background: '#3b82f6', color: 'white', padding: '8px 16px', borderRadius: '8px', fontWeight: '600' }}>View History 📜</Link>
                </div>
            </header>

            <main className={styles.mainContent}>
                <form className={styles.payrollForm} onSubmit={handleSubmit}>
                    <div className={styles.formHeader}>
                        <h2 className={styles.formTitle}>{editingId ? "Edit Payroll Entry" : "New Payroll Entry"}</h2>
                        <div className={styles.inputGroup} style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <label className={styles.label}>Month:</label>
                            <input type="month" id="pay_period" className={styles.input} value={formData.pay_period} onChange={handleInputChange} />
                        </div>
                    </div>

                    <div className={styles.formBody}>
                        {/* Employee & Bank Section */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionHeading}>👤 Employee & Bank Details</h3>
                            <div className={styles.grid}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Select Employee</label>
                                    <select className={styles.select} value={formData.employee_id} onChange={handleEmployeeChange}>
                                        <option value="">Choose Employee...</option>
                                        {employees.map(emp => (
                                            <option key={emp.id} value={emp.id}>{emp.full_name} ({emp.employee_id})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Department</label>
                                    <input className={`${styles.input} ${styles.readOnly}`} readOnly value={selectedEmployee?.department || '-'} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Designation</label>
                                    <input className={`${styles.input} ${styles.readOnly}`} readOnly value={selectedEmployee?.designation || '-'} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>PAN Number</label>
                                    <input className={`${styles.input} ${styles.readOnly}`} readOnly value={selectedEmployee?.pan_no || '-'} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Bank Name</label>
                                    <input className={`${styles.input} ${styles.readOnly}`} readOnly value={selectedEmployee?.bank_name || '-'} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Account No.</label>
                                    <input className={`${styles.input} ${styles.readOnly}`} readOnly value={selectedEmployee?.account_no || '-'} />
                                </div>
                            </div>
                        </div>

                        {/* Wage Section */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionHeading}>📅 Attendance & Wage</h3>
                            <div className={styles.grid}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Total Pay Days</label>
                                    <input type="number" id="pay_days" className={styles.input} value={formData.pay_days} onChange={handleInputChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Per Day Wage (₹)</label>
                                    <input type="number" id="per_day_wage" className={styles.input} value={formData.per_day_wage} onChange={handleInputChange} />
                                </div>
                            </div>
                        </div>

                        {/* Earnings Section */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionHeading}>💰 Earnings</h3>
                            <div className={styles.grid}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Basic + DA</label>
                                    <input type="number" id="basic_da" className={styles.input} value={formData.basic_da} onChange={handleInputChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>HRA</label>
                                    <input type="number" id="hra" className={styles.input} value={formData.hra} onChange={handleInputChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Conveyance</label>
                                    <input type="number" id="conveyance" className={styles.input} value={formData.conveyance} onChange={handleInputChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Children Education</label>
                                    <input type="number" id="child_edu" className={styles.input} value={formData.child_edu} onChange={handleInputChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Children Hostel</label>
                                    <input type="number" id="child_hostel" className={styles.input} value={formData.child_hostel} onChange={handleInputChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Medical Reimb.</label>
                                    <input type="number" id="med_reimb" className={styles.input} value={formData.med_reimb} onChange={handleInputChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Special Allowance</label>
                                    <input type="number" id="special_allowance" className={styles.input} value={formData.special_allowance} onChange={handleInputChange} />
                                </div>
                            </div>
                        </div>

                        {/* Adjustments Section */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionHeading}>🔄 Adjustments</h3>
                            <div className={styles.grid}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Increment</label>
                                    <input type="number" id="increment" className={styles.input} value={formData.increment} onChange={handleInputChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Arrears</label>
                                    <input type="number" id="arrears" className={styles.input} value={formData.arrears} onChange={handleInputChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Other Earnings</label>
                                    <input type="number" id="other_earnings" className={styles.input} value={formData.other_earnings} onChange={handleInputChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Allowance/Increase</label>
                                    <input type="number" id="allowance_increase" className={styles.input} value={formData.allowance_increase} onChange={handleInputChange} />
                                </div>
                            </div>
                        </div>

                        {/* Deductions Section */}
                        <div className={styles.section}>
                            <h3 className={styles.sectionHeading}>🛑 Deductions</h3>
                            <div className={styles.grid}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>PF</label>
                                    <input type="number" id="pf" className={styles.input} value={formData.pf} onChange={handleInputChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>ESI</label>
                                    <input type="number" id="esi" className={styles.input} value={formData.esi} onChange={handleInputChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Salary Advance</label>
                                    <input type="number" id="advance" className={styles.input} value={formData.advance} onChange={handleInputChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>LWF</label>
                                    <input type="number" id="lwf" className={styles.input} value={formData.lwf} onChange={handleInputChange} />
                                </div>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>LOP (Amount)</label>
                                    <input type="number" id="lop_amount" className={styles.input} value={formData.lop_amount} onChange={handleInputChange} />
                                </div>
                            </div>
                        </div>

                        {/* Payment & Remarks */}
                        <div className={styles.section}>
                            <div className={styles.grid}>
                                <div className={styles.inputGroup}>
                                    <label className={styles.label}>Payment Method</label>
                                    <select id="payment_method" className={styles.select} value={formData.payment_method} onChange={handleInputChange}>
                                        <option>Bank Transfer</option>
                                        <option>Cash</option>
                                        <option>Cheque</option>
                                    </select>
                                </div>
                                <div className={styles.inputGroup} style={{ gridColumn: 'span 2' }}>
                                    <label className={styles.label}>Remarks</label>
                                    <input type="text" id="remarks" className={styles.input} value={formData.remarks} onChange={handleInputChange} placeholder="Any notes..." />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.summary}>
                        <div className={styles.summaryItem}>
                            <div className={styles.summaryLabel}>Total Gross Salary</div>
                            <div className={styles.summaryValue}>₹ {totals.gross.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className={styles.summaryItem}>
                            <div className={styles.summaryLabel}>Total Deductions</div>
                            <div className={styles.summaryValue}>₹ {totals.deductions.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className={styles.summaryItem}>
                            <div className={styles.summaryLabel}>Net Pay</div>
                            <div className={`${styles.summaryValue} ${styles.netPayValue}`}>₹ {totals.net.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button type="button" className={styles.cancelBtn} onClick={() => { setFormData(initialFormData); setEditingId(null); setSelectedEmployee(null); }}>Clear</button>
                        <button type="submit" className={styles.saveBtn} disabled={loading}>{editingId ? "Update Payroll" : "Save Payroll"}</button>
                    </div>
                </form>
            </main>
        </div>
    );
};

export default PayrollPage;
