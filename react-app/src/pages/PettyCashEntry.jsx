import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Calendar, MapPin, User, Tag, CheckCircle, ArrowLeft } from 'lucide-react';
import { SearchableSelect } from '../components/ui';
import styles from './PettyCashEntry.module.css';

const PettyCashEntry = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const isEditing = !!id;
    
    const [sites, setSites] = useState([]);
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        date: new Date().toISOString().slice(0, 10),
        siteName: '',
        requestPerson: '',
        items: [{ category: 'Material', amount: '', remarks: '' }]
    });

    useEffect(() => {
        fetchInitialData();
    }, [id]);

    const fetchInitialData = async () => {
        await fetchSites();
        if (isEditing) {
            await fetchEntryData();
        }
    };

    const fetchSites = async () => {
        const { data } = await supabase.from('sites').select('name').order('name');
        const uniqueSites = (data || []).map(s => s.name).filter(Boolean);
        setSites(['OFFICE', ...uniqueSites]);
    };

    const fetchEntryData = async () => {
        setLoading(true);
        try {
            const { data: entryData, error: entryError } = await supabase
                .from('petty_cash_entries')
                .select('*')
                .eq('id', id)
                .single();

            if (entryError) throw entryError;

            const { data: itemsData, error: itemsError } = await supabase
                .from('petty_cash_items')
                .select('*')
                .eq('entry_id', id);

            if (itemsError) throw itemsError;

            setForm({
                date: entryData.date,
                siteName: entryData.site_name,
                requestPerson: entryData.request_person,
                items: itemsData.map(item => ({
                    category: item.category,
                    amount: item.amount.toString(),
                    remarks: item.remarks || ''
                }))
            });
        } catch (error) {
            console.error("Error fetching entry for edit:", error);
            alert("Error: Failed to load entry data.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        setForm({
            ...form,
            items: [...form.items, { category: 'Material', amount: '', remarks: '' }]
        });
    };

    const handleRemoveItem = (index) => {
        if (form.items.length === 1) return;
        const newItems = form.items.filter((_, i) => i !== index);
        setForm({ ...form, items: newItems });
    };

    const handleItemChange = (index, field, value) => {
        const newItems = [...form.items];
        newItems[index][field] = value;
        setForm({ ...form, items: newItems });
    };

    const totalAmount = form.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!form.siteName) {
            alert("Please select a site");
            return;
        }

        setLoading(true);

        try {
            let entryId = id;

            if (isEditing) {
                // 1. Update the main entry
                const { error: entryError } = await supabase
                    .from('petty_cash_entries')
                    .update({
                        date: form.date,
                        site_name: form.siteName,
                        request_person: form.requestPerson,
                        total_amount: totalAmount
                    })
                    .eq('id', id);

                if (entryError) throw entryError;

                // 2. Delete existing items and re-insert (simplest way to handle updates)
                const { error: deleteError } = await supabase
                    .from('petty_cash_items')
                    .delete()
                    .eq('entry_id', id);

                if (deleteError) throw deleteError;
            } else {
                // 1. Insert the main entry
                const { data: entryData, error: entryError } = await supabase
                    .from('petty_cash_entries')
                    .insert([{
                        date: form.date,
                        site_name: form.siteName,
                        request_person: form.requestPerson,
                        total_amount: totalAmount
                    }])
                    .select()
                    .single();

                if (entryError) throw entryError;
                entryId = entryData.id;
            }

            // 3. Insert all items
            const itemsToInsert = form.items.map(item => ({
                entry_id: entryId,
                category: item.category,
                amount: parseFloat(item.amount) || 0,
                remarks: item.remarks
            }));

            const { error: itemsError } = await supabase
                .from('petty_cash_items')
                .insert(itemsToInsert);

            if (itemsError) throw itemsError;

            alert(`Success: Petty Cash entry ${isEditing ? 'updated' : 'recorded'} successfully!`);
            
            if (isEditing) {
                navigate('/accounts/petty-cash/history');
            } else {
                // Reset form
                setForm({
                    date: new Date().toISOString().slice(0, 10),
                    siteName: '',
                    requestPerson: '',
                    items: [{ category: 'Material', amount: '', remarks: '' }]
                });
            }
        } catch (error) {
            console.error("Error submitting petty cash:", error);
            alert("Error: Failed to save entry. " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerTitleRow}>
                    {isEditing && (
                        <button className={styles.backBtn} onClick={() => navigate('/accounts/petty-cash/history')}>
                            <ArrowLeft size={18} />
                        </button>
                    )}
                    <h1 className={styles.title}>{isEditing ? 'Edit Petty Cash Entry' : 'Petty Cash Entry Form'}</h1>
                </div>
                <p className={styles.subtitle}>{isEditing ? `Editing record #${id.slice(0, 8)}` : 'Record site-level expenses and petty cash usage'}</p>
            </header>

            <form className={styles.formContainer} onSubmit={handleSubmit}>
                <div className={styles.mainFields}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Calendar size={14} /> Date</label>
                        <input 
                            type="date" 
                            className={styles.input} 
                            value={form.date} 
                            onChange={(e) => setForm({...form, date: e.target.value})} 
                            required 
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><MapPin size={14} /> Site Name</label>
                        <SearchableSelect 
                            options={sites}
                            value={form.siteName}
                            onChange={(val) => setForm({...form, siteName: val})}
                            placeholder="Select Site"
                        />
                    </div>
                    <div className={styles.fieldGroup} style={{ gridColumn: 'span 2' }}>
                        <label className={styles.label}><User size={14} /> Request Person</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            placeholder="Enter request person or vendor name" 
                            value={form.requestPerson} 
                            onChange={(e) => setForm({...form, requestPerson: e.target.value})} 
                            required 
                        />
                    </div>
                </div>

                <div className={styles.itemsSection}>
                    <h3 className={styles.sectionTitle}>Expense Items</h3>
                    {form.items.map((item, index) => (
                        <div key={index} className={styles.itemRow}>
                            <div className={styles.itemField}>
                                <label className={styles.label}>Category</label>
                                <select 
                                    className={styles.select} 
                                    value={item.category} 
                                    onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                                >
                                    <option>Material</option>
                                    <option>Labour</option>
                                    <option>Debris</option>
                                    <option>Travel</option>
                                    <option>Food/Staff Welfare</option>
                                    <option>Others</option>
                                </select>
                            </div>
                            <div className={styles.itemField}>
                                <label className={styles.label}>Amount (₹)</label>
                                <input 
                                    type="number" 
                                    className={styles.input} 
                                    placeholder="0.00" 
                                    value={item.amount} 
                                    onChange={(e) => handleItemChange(index, 'amount', e.target.value)} 
                                    required 
                                />
                            </div>
                            <div className={styles.itemField} style={{ flexGrow: 2 }}>
                                <label className={styles.label}>Remarks</label>
                                <input 
                                    type="text" 
                                    className={styles.input} 
                                    placeholder="Describe the expense" 
                                    value={item.remarks} 
                                    onChange={(e) => handleItemChange(index, 'remarks', e.target.value)} 
                                />
                            </div>
                            <button 
                                type="button" 
                                className={styles.removeBtn} 
                                onClick={() => handleRemoveItem(index)}
                                title="Remove Item"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    ))}

                    <button type="button" className={styles.addBtn} onClick={handleAddItem}>
                        <Plus size={16} /> Add More Items
                    </button>
                </div>

                <footer className={styles.formFooter}>
                    <div className={styles.totalDisplay}>
                        Total: <span className={styles.totalValue}>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <button type="submit" className={styles.submitBtn}>
                        <CheckCircle size={18} /> Submit Entry
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default PettyCashEntry;
