import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { User, Phone, CreditCard, Landmark, FileText, CheckCircle, ArrowLeft } from 'lucide-react';
import { useMessage } from '../context/MessageContext';
import LoadingScreen from '../components/LoadingScreen';
import styles from './PettyCashPersonEntry.module.css';

const PettyCashPersonEntry = () => {
    const navigate = useNavigate();
    const { alert, toast } = useMessage();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        name: '',
        phone: '',
        account_number: '',
        ifsc_code: '',
        bank_name: '',
        pan_number: '',
        person_type: 'Employee'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('petty_cash_persons')
                .insert([form]);

            if (error) throw error;

            toast('Request Person added successfully!', 'Success');
            navigate('/accounts/petty-cash/entry');
        } catch (error) {
            console.error('Error adding request person:', error);
            alert('Failed to add person: ' + error.message, 'Error');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <LoadingScreen message="Registering profile..." />;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerTitleRow}>
                    <button className={styles.backBtn} onClick={() => navigate(-1)}>
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className={styles.title}>Request Person Entry</h1>
                </div>
                <p className={styles.subtitle}>Register employees or vendors for petty cash requests</p>
            </header>

            <form className={styles.formContainer} onSubmit={handleSubmit}>
                <div className={styles.mainFields}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><User size={14} /> Full Name</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            placeholder="Enter full name" 
                            value={form.name} 
                            onChange={(e) => setForm({...form, name: e.target.value})} 
                            required 
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Phone size={14} /> Phone Number</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            placeholder="Enter 10-digit number" 
                            value={form.phone} 
                            onChange={(e) => setForm({...form, phone: e.target.value})} 
                            required 
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><CreditCard size={14} /> Account Number</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            placeholder="Enter bank account number" 
                            value={form.account_number} 
                            onChange={(e) => setForm({...form, account_number: e.target.value})} 
                            required 
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Landmark size={14} /> IFSC Code</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            placeholder="Enter bank IFSC code" 
                            value={form.ifsc_code} 
                            onChange={(e) => setForm({...form, ifsc_code: e.target.value.toUpperCase()})} 
                            required 
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Landmark size={14} /> Bank Name</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            placeholder="Enter bank name" 
                            value={form.bank_name} 
                            onChange={(e) => setForm({...form, bank_name: e.target.value})} 
                            required 
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><FileText size={14} /> PAN Number (Optional)</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            placeholder="Enter PAN number" 
                            value={form.pan_number} 
                            onChange={(e) => setForm({...form, pan_number: e.target.value.toUpperCase()})} 
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}>Person Type</label>
                        <select 
                            className={styles.select} 
                            value={form.person_type} 
                            onChange={(e) => setForm({...form, person_type: e.target.value})}
                        >
                            <option value="Employee">Employee</option>
                            <option value="Vendor">Vendor</option>
                        </select>
                    </div>
                </div>

                <footer className={styles.formFooter}>
                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        <CheckCircle size={18} /> {loading ? 'Saving...' : 'Register Person'}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default PettyCashPersonEntry;
