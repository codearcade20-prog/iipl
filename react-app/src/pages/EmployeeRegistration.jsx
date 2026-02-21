import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { useMessage } from '../context/MessageContext';
import { Input, LoadingOverlay } from '../components/ui';
import styles from './EmployeeRegistration.module.css';

const EmployeeRegistration = () => {
    const { alert, toast } = useMessage();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        employee_id: '',
        full_name: '',
        location: '',
        email: '',
        phone: '',
        designation: '',
        department: '',
        date_of_joining: new Date().toISOString().split('T')[0],
        basic_salary: '',
        pan_no: '',
        bank_name: '',
        account_no: '',
        ifsc_code: '',
        hra: 0,
        conveyance: 0,
        child_edu: 0,
        child_hostel: 0,
        med_reimb: 0,
        special_allowance: 0,
        pf: 0,
        esi: 0,
        lwf: 0,
        payment_method: 'Bank Transfer'
    });

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({ ...prev, [id]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.employee_id || !formData.full_name) {
            await alert("Employee ID and Full Name are required!");
            return;
        }

        setLoading(true);
        try {
            // Check for existing records to provide clear specialized errors
            const { data: existing } = await supabase
                .from('employees')
                .select('employee_id, email, pan_no, phone')
                .or(`employee_id.eq.${formData.employee_id},email.eq.${formData.email},pan_no.eq.${formData.pan_no},phone.eq.${formData.phone}`);

            if (existing && existing.length > 0) {
                const dup = existing[0];
                if (dup.employee_id === formData.employee_id) throw new Error(`Employee ID "${formData.employee_id}" is already used!`);
                if (dup.email === formData.email && formData.email) throw new Error(`Email "${formData.email}" is already registered!`);
                if (dup.pan_no === formData.pan_no && formData.pan_no) throw new Error(`PAN Number "${formData.pan_no}" is already used!`);
                if (dup.phone === formData.phone && formData.phone) throw new Error(`Phone number "${formData.phone}" is already registered!`);
            }

            const { error } = await supabase
                .from('employees')
                .insert([
                    {
                        ...formData,
                        basic_salary: parseFloat(formData.basic_salary) || 0
                    }
                ]);

            if (error) throw error;

            toast("Employee registered successfully!");
            setFormData({
                employee_id: '',
                full_name: '',
                location: '',
                email: '',
                phone: '',
                designation: '',
                department: '',
                date_of_joining: new Date().toISOString().split('T')[0],
                basic_salary: '',
                pan_no: '',
                bank_name: '',
                account_no: '',
                ifsc_code: '',
                hra: 0,
                conveyance: 0,
                child_edu: 0,
                child_hostel: 0,
                med_reimb: 0,
                special_allowance: 0,
                pf: 0,
                esi: 0,
                lwf: 0,
                payment_method: 'Bank Transfer'
            });
        } catch (e) {
            console.error(e);
            await alert("Error registering employee: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            {loading && <LoadingOverlay message="Processing..." />}

            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <Link to="/hr-dashboard" className={styles.homeBtn}>← Back</Link>
                    <h1 className={styles.title}>New Employee Registration</h1>
                </div>
                <div className={styles.headerRight}>
                    <Link to="/employee-list" className={styles.payrollLink}>View Employee List 👥</Link>
                </div>
            </header>

            <main className={styles.mainContent}>
                <div className={styles.registrationCard}>
                    <h2 className={styles.sectionTitle}>Employee Details</h2>

                    <form onSubmit={handleSubmit}>
                        <div className={styles.formGrid}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="employee_id">Employee ID</label>
                                <input
                                    className={styles.input}
                                    id="employee_id"
                                    placeholder="e.g. EMP001"
                                    value={formData.employee_id}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="full_name">Full Name</label>
                                <input
                                    className={styles.input}
                                    id="full_name"
                                    placeholder="Enter full name"
                                    value={formData.full_name}
                                    onChange={handleInputChange}
                                    required
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="location">Location</label>
                                <input
                                    className={styles.input}
                                    id="location"
                                    placeholder="Site / Office location"
                                    value={formData.location}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="email">Email Address</label>
                                <input
                                    className={styles.input}
                                    id="email"
                                    type="email"
                                    placeholder="email@company.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="phone">Phone Number</label>
                                <input
                                    className={styles.input}
                                    id="phone"
                                    placeholder="Enter phone number"
                                    value={formData.phone}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="designation">Designation</label>
                                <input
                                    className={styles.input}
                                    id="designation"
                                    placeholder="e.g. Site Engineer"
                                    value={formData.designation}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="department">Department</label>
                                <input
                                    className={styles.input}
                                    id="department"
                                    placeholder="e.g. Operations"
                                    value={formData.department}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="date_of_joining">Date of Joining</label>
                                <input
                                    className={styles.input}
                                    id="date_of_joining"
                                    type="date"
                                    value={formData.date_of_joining}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="basic_salary">Basic Salary (₹)</label>
                                <input
                                    className={styles.input}
                                    id="basic_salary"
                                    type="number"
                                    placeholder="0.00"
                                    value={formData.basic_salary}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="pan_no">PAN Number</label>
                                <input
                                    className={styles.input}
                                    id="pan_no"
                                    placeholder="ABCDE1234F"
                                    value={formData.pan_no}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="bank_name">Bank Name</label>
                                <input
                                    className={styles.input}
                                    id="bank_name"
                                    placeholder="e.g. HDFC Bank"
                                    value={formData.bank_name}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="account_no">Account No.</label>
                                <input
                                    className={styles.input}
                                    id="account_no"
                                    placeholder="Enter account number"
                                    value={formData.account_no}
                                    onChange={handleInputChange}
                                />
                            </div>

                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="ifsc_code">IFSC Code</label>
                                <input
                                    className={styles.input}
                                    id="ifsc_code"
                                    placeholder="HDFC0001234"
                                    value={formData.ifsc_code}
                                    onChange={handleInputChange}
                                />
                            </div>
                        </div>

                        <h2 className={styles.sectionTitle} style={{ marginTop: '40px' }}>💰 Fixed Payroll Structure</h2>
                        <div className={styles.formGrid}>
                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="hra">HRA (Fixed)</label>
                                <input className={styles.input} id="hra" type="number" value={formData.hra} onChange={handleInputChange} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="conveyance">Conveyance (Fixed)</label>
                                <input className={styles.input} id="conveyance" type="number" value={formData.conveyance} onChange={handleInputChange} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="med_reimb">Medical (Fixed)</label>
                                <input className={styles.input} id="med_reimb" type="number" value={formData.med_reimb} onChange={handleInputChange} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="special_allowance">Special Allowance (Fixed)</label>
                                <input className={styles.input} id="special_allowance" type="number" value={formData.special_allowance} onChange={handleInputChange} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="child_edu">Child Education (Fixed)</label>
                                <input className={styles.input} id="child_edu" type="number" value={formData.child_edu} onChange={handleInputChange} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="child_hostel">Child Hostel (Fixed)</label>
                                <input className={styles.input} id="child_hostel" type="number" value={formData.child_hostel} onChange={handleInputChange} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="pf">PF (Monthly Deduction)</label>
                                <input className={styles.input} id="pf" type="number" value={formData.pf} onChange={handleInputChange} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="esi">ESI (Monthly Deduction)</label>
                                <input className={styles.input} id="esi" type="number" value={formData.esi} onChange={handleInputChange} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label} htmlFor="lwf">LWF</label>
                                <input className={styles.input} id="lwf" type="number" value={formData.lwf} onChange={handleInputChange} />
                            </div>
                            <div className={styles.inputGroup}>
                                <label className={styles.label}>Payment Method</label>
                                <select className={styles.input} id="payment_method" value={formData.payment_method} onChange={handleInputChange}>
                                    <option>Bank Transfer</option>
                                    <option>Cash</option>
                                    <option>Cheque</option>
                                </select>
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <button type="submit" className={styles.submitBtn} disabled={loading}>
                                {loading ? "Registering..." : "Register Employee"}
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div>
    );
};

export default EmployeeRegistration;
