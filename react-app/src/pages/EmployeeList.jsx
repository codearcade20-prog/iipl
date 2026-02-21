import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { useMessage } from '../context/MessageContext';
import { LoadingOverlay } from '../components/ui';
import {
    Search,
    ArrowLeft,
    Trash2,
    User,
    Building,
    MapPin,
    Mail,
    Phone
} from 'lucide-react';
import styles from './EmployeeList.module.css';

const EmployeeList = () => {
    const navigate = useNavigate();
    const { alert, toast, confirm } = useMessage();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
    const [showPayrollModal, setShowPayrollModal] = useState(false);
    const [activeEmployee, setActiveEmployee] = useState(null);
    const [existingPayrollId, setExistingPayrollId] = useState(null);
    const [attendance, setAttendance] = useState({
        workingDays: 30,
        presentDays: 30,
        lopDays: 0,
        increment: 0,
        arrears: 0,
        tempAdvance: 0,
        remarks: '',
        // Master Overrides
        basic_salary: 0,
        hra: 0,
        conveyance: 0,
        med_reimb: 0,
        special_allowance: 0,
        child_edu: 0,
        child_hostel: 0,
        pf: 0,
        esi: 0,
        lwf: 0
    });
    const [editMode, setEditMode] = useState(false); // Master vs Attendance toggle
    const [showMore, setShowMore] = useState(false); // More button toggle

    useEffect(() => {
        fetchEmployees();
    }, []);

    const fetchEmployees = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEmployees(data || []);
        } catch (e) {
            console.error(e);
            alert("Error fetching employees: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteEmployee = async (id) => {
        const password = window.prompt("To delete this employee master record, please enter the administrator password:");

        if (password === 'boss702') {
            if (await confirm("Are you sure you want to permanently delete this employee record and all their history? This action cannot be undone.")) {
                setLoading(true);
                try {
                    const { error } = await supabase
                        .from('employees')
                        .delete()
                        .eq('id', id);

                    if (error) throw error;
                    toast("Employee record deleted.");
                    fetchEmployees();
                } catch (e) {
                    alert("Error deleting: " + e.message);
                } finally {
                    setLoading(false);
                }
            }
        } else if (password !== null) {
            alert("Incorrect password! Deletion cancelled.");
        }
    };

    const handleProcessPayroll = (emp) => {
        setActiveEmployee(emp);
        setAttendance({
            workingDays: 30,
            presentDays: 30,
            lopDays: 0,
            increment: 0,
            arrears: 0,
            tempAdvance: 0,
            remarks: '',
            basic_salary: emp.basic_salary || 0,
            hra: emp.hra || 0,
            conveyance: emp.conveyance || 0,
            med_reimb: emp.med_reimb || 0,
            special_allowance: emp.special_allowance || 0,
            child_edu: emp.child_edu || 0,
            child_hostel: emp.child_hostel || 0,
            pf: emp.pf || 0,
            esi: emp.esi || 0,
            lwf: emp.lwf || 0
        });
        setShowPayrollModal(true);
        setEditMode(false);
        setShowMore(false);
    };

    // --- NEW: Dynamic Loading of existing record if user changes month INSIDE modal ---
    useEffect(() => {
        const checkExisting = async () => {
            if (!showPayrollModal || !activeEmployee) {
                setExistingPayrollId(null);
                return;
            }

            // 1. FIND ANY EXISTING RECORD FOR THIS EMPLOYEE (To avoid duplication across months)
            const { data: existing } = await supabase
                .from('payrolls')
                .select('id')
                .eq('employee_id', activeEmployee.id)
                .maybeSingle();

            setExistingPayrollId(existing?.id || null);
        };
        checkExisting();
    }, [selectedMonth, activeEmployee, showPayrollModal]);

    const generatePayroll = async () => {
        if (!activeEmployee) return;

        setLoading(true);
        try {
            // 0. Update Master Data in 'employees' table first if they changed
            const { error: masterError } = await supabase
                .from('employees')
                .update({
                    basic_salary: attendance.basic_salary,
                    hra: attendance.hra,
                    conveyance: attendance.conveyance,
                    med_reimb: attendance.med_reimb,
                    special_allowance: attendance.special_allowance,
                    child_edu: attendance.child_edu,
                    child_hostel: attendance.child_hostel,
                    pf: attendance.pf,
                    esi: attendance.esi,
                    lwf: attendance.lwf
                })
                .eq('id', activeEmployee.id);

            if (masterError) throw masterError;

            // 1. We already have 'existingPayrollId' from the useEffect!
            const existingId = existingPayrollId;

            // 2. Calculations: Keep Salary Components FIXED (Don't apply LOP factor to earnings)
            const workingDays = parseFloat(attendance.workingDays) || 30;
            const lopDays = parseFloat(attendance.lopDays) || 0;
            const paidDays = workingDays - lopDays;

            // Earnings - Fixed Monthly Values
            const basic_da = parseFloat(attendance.basic_salary) || 0;
            const hra = parseFloat(attendance.hra) || 0;
            const conveyance = parseFloat(attendance.conveyance) || 0;
            const med_reimb = parseFloat(attendance.med_reimb) || 0;
            const special_allowance = parseFloat(attendance.special_allowance) || 0;
            const child_edu = parseFloat(attendance.child_edu) || 0;
            const child_hostel = parseFloat(attendance.child_hostel) || 0;

            // Fixed Monthly Deductions
            const pf = parseFloat(attendance.pf) || 0;
            const esi = parseFloat(attendance.esi) || 0;
            const lwf = parseFloat(attendance.lwf) || 0;

            // LOP Calculation: (Basic / WorkingDays) * LOP Days
            const perDayWage = basic_da / workingDays;
            const lop_amount = perDayWage * lopDays;

            // Manual Adjustments/Deductions
            const increment = parseFloat(attendance.increment) || 0;
            const arrears = parseFloat(attendance.arrears) || 0;
            const advance = parseFloat(attendance.tempAdvance) || 0;

            const gross = basic_da + hra + conveyance + med_reimb + special_allowance + child_edu + child_hostel + increment + arrears;
            const total_deductions = pf + esi + lwf + advance + lop_amount;
            const net = gross - total_deductions;

            const payrollPayload = {
                employee_id: activeEmployee.id,
                pay_period: selectedMonth,
                pay_days: paidDays,
                per_day_wage: perDayWage.toFixed(2),
                basic_da,
                hra,
                conveyance,
                med_reimb,
                special_allowance,
                child_edu,
                child_hostel,
                increment,
                arrears,
                pf,
                esi,
                lwf,
                advance,
                lop_amount,
                gross_salary: gross,
                total_deductions: total_deductions,
                net_pay: net,
                payment_method: activeEmployee.payment_method || 'Bank Transfer',
                remarks: attendance.remarks || `Generated via Auto-Payroll. Working Days: ${workingDays}, LOP Days: ${lopDays}`
            };

            let result;
            if (existingId) {
                // UPDATE existing record
                result = await supabase.from('payrolls').update(payrollPayload).eq('id', existingId).select();
            } else {
                // INSERT new record
                result = await supabase.from('payrolls').insert([payrollPayload]).select();
            }

            if (result.error) throw result.error;
            const data = result.data;

            if (data && data[0]) {
                toast("Master updated & Payslip generated successfully!");
                setShowPayrollModal(false);
                navigate(`/salary-slip/${data[0].id}`);
            }
        } catch (e) {
            console.error(e);
            alert("Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredEmployees = useMemo(() => {
        return employees.filter(emp =>
            emp.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.employee_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.designation?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.location?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [employees, searchTerm]);

    return (
        <div className={styles.container}>
            {loading && <LoadingOverlay message="Fetching Data..." />}

            <header className={styles.header}>
                <div className={styles.titleSection}>
                    <Link to="/hr-dashboard" className={styles.backBtn}>
                        <ArrowLeft size={20} />
                    </Link>
                    <h1 className={styles.title}>Employee Records</h1>
                </div>

                <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                    <div className={styles.monthSelector}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>PAY MONTH:</label>
                        <input
                            type="month"
                            className={styles.dateInput}
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                        />
                    </div>
                    <div className={styles.searchBar}>
                        <Search size={18} color="#64748b" />
                        <input
                            className={styles.searchInput}
                            placeholder="Search by name, ID, department..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </header>

            <main className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Employee Details</th>
                            <th>Role & Department</th>
                            <th>Location</th>
                            <th>Contact Info</th>
                            <th>Basic Salary</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredEmployees.length > 0 ? (
                            filteredEmployees.map(emp => (
                                <tr key={emp.id}>
                                    <td>
                                        <div className={styles.empName}>{emp.full_name}</div>
                                        <div className={styles.empId}>{emp.employee_id}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{emp.designation || 'N/A'}</div>
                                        <div className={styles.empId}>{emp.department || 'N/A'}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <MapPin size={12} /> {emp.location || 'N/A'}
                                        </div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: '0.8rem' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={12} /> {emp.email || '-'}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={12} /> {emp.phone || '-'}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`${styles.badge} ${styles.blueBadge}`}>
                                            ₹{(parseFloat(emp.basic_salary) || 0).toLocaleString('en-IN')}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => handleProcessPayroll(emp)}
                                                className={styles.processBtn}
                                                style={{ padding: '6px 12px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem' }}
                                            >
                                                Process Pay
                                            </button>
                                            <button
                                                onClick={() => deleteEmployee(emp.id)}
                                                className={styles.deleteBtn}
                                                title="Delete Employee"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '60px', color: '#94a3b8' }}>
                                    <div style={{ marginBottom: '10px' }}><Search size={48} opacity={0.3} /></div>
                                    {searchTerm ? "No employees match your search." : "No employees found in database."}
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </main>

            {showPayrollModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: '30px', borderRadius: '12px', width: '400px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <h2 style={{ margin: '0 0 20px 0', fontSize: '1.25rem' }}>Process Pay for {activeEmployee?.full_name}</h2>
                        <div style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '500' }}>Month:</span>
                            <input
                                type="month"
                                style={{ border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px 8px', fontSize: '0.9rem', fontWeight: '700', color: '#1e293b' }}
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                            />
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Company Working Days</label>
                                <input
                                    type="number"
                                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                    value={attendance.workingDays}
                                    onChange={(e) => setAttendance({ ...attendance, workingDays: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>LOP Days</label>
                                <input
                                    type="number"
                                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                    value={attendance.lopDays}
                                    onChange={(e) => setAttendance({ ...attendance, lopDays: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Paid Days (Calculated)</label>
                                <input
                                    readOnly
                                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px', background: '#f8fafc', fontWeight: 'bold' }}
                                    value={(parseFloat(attendance.workingDays) || 0) - (parseFloat(attendance.lopDays) || 0)}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Increment (Monthly)</label>
                                <input
                                    type="number"
                                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                    value={attendance.increment}
                                    onChange={(e) => setAttendance({ ...attendance, increment: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Arrears</label>
                                <input
                                    type="number"
                                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                    value={attendance.arrears}
                                    onChange={(e) => setAttendance({ ...attendance, arrears: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Salary Advance Ded.</label>
                                <input
                                    type="number"
                                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                    value={attendance.tempAdvance}
                                    onChange={(e) => setAttendance({ ...attendance, tempAdvance: e.target.value })}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.85rem', marginBottom: '5px' }}>Remarks</label>
                                <input
                                    type="text"
                                    style={{ width: '100%', padding: '8px', border: '1px solid #e2e8f0', borderRadius: '6px' }}
                                    value={attendance.remarks}
                                    onChange={(e) => setAttendance({ ...attendance, remarks: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* More Section (Master Table Update) */}
                        <div style={{ marginTop: '20px' }}>
                            <button
                                onClick={() => setShowMore(!showMore)}
                                style={{ width: '100%', padding: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '0.9rem', fontWeight: 600, color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                            >
                                {showMore ? '🔼 Show Less' : '🔽 More (Edit Master Record)'}
                            </button>

                            {showMore && (
                                <div style={{ marginTop: '20px', padding: '15px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                                        <h3 style={{ margin: 0, fontSize: '0.85rem', color: '#1e293b' }}>🛡️ Fixed Salary Structure</h3>
                                        <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>AFFECTS MASTER TABLE</span>
                                    </div>

                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '2px' }}>Basic Salary</label>
                                            <input type="number" style={{ width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} value={attendance.basic_salary} onChange={(e) => setAttendance({ ...attendance, basic_salary: e.target.value })} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '2px' }}>HRA</label>
                                            <input type="number" style={{ width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} value={attendance.hra} onChange={(e) => setAttendance({ ...attendance, hra: e.target.value })} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '2px' }}>Conveyance</label>
                                            <input type="number" style={{ width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} value={attendance.conveyance} onChange={(e) => setAttendance({ ...attendance, conveyance: e.target.value })} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '2px' }}>PF Ded.</label>
                                            <input type="number" style={{ width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} value={attendance.pf} onChange={(e) => setAttendance({ ...attendance, pf: e.target.value })} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '2px' }}>ESI Ded.</label>
                                            <input type="number" style={{ width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} value={attendance.esi} onChange={(e) => setAttendance({ ...attendance, esi: e.target.value })} />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '0.7rem', marginBottom: '2px' }}>Med. Reimb.</label>
                                            <input type="number" style={{ width: '100%', padding: '6px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px' }} value={attendance.med_reimb} onChange={(e) => setAttendance({ ...attendance, med_reimb: e.target.value })} />
                                        </div>
                                    </div>
                                    <p style={{ fontSize: '0.65rem', color: '#64748b', marginTop: '10px', fontStyle: 'italic' }}>* Changes made here will permanently update the employee's fixed salary record.</p>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
                            <button
                                onClick={() => setShowPayrollModal(false)}
                                style={{ flex: 1, padding: '10px', background: '#f1f5f9', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                            >Cancel</button>
                            <button
                                onClick={generatePayroll}
                                style={{ flex: 1, padding: '10px', background: existingPayrollId ? '#10b981' : '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
                            >
                                {existingPayrollId ? 'Update Existing record' : 'Generate Payslip'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmployeeList;
