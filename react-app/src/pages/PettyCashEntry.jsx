import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, Calendar, MapPin, User, Tag, CheckCircle, ArrowLeft, Briefcase, Truck } from 'lucide-react';
import { SearchableSelect } from '../components/ui';
import { useMessage } from '../context/MessageContext';
import LoadingScreen from '../components/LoadingScreen';
import styles from './PettyCashEntry.module.css';

const PettyCashEntry = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { alert, confirm, toast } = useMessage();
    const isEditing = !!id;
    
    const [sites, setSites] = useState([]);
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasSite, setHasSite] = useState(true);
    const [form, setForm] = useState({
        date: new Date().toISOString().slice(0, 10),
        siteName: '',
        personId: '',
        entryType: 'Operational Expense', // 'Staff Advance' or 'Operational Expense'
        items: [{ category: 'Materials', amount: '', remarks: '' }]
    });

    useEffect(() => {
        fetchInitialData();
    }, [id]);

    const fetchInitialData = async () => {
        await fetchSites();
        await fetchPersons();
        if (isEditing) {
            await fetchEntryData();
        }
    };

    const fetchSites = async () => {
        const { data } = await supabase.from('sites').select('name').order('name');
        const uniqueSites = (data || []).map(s => s.name).filter(Boolean);
        setSites(['OFFICE', ...uniqueSites]);
    };

    const fetchPersons = async () => {
        const { data } = await supabase.from('petty_cash_persons').select('*').order('name');
        setPersons(data || []);
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
                personId: entryData.person_id || '',
                entryType: entryData.entry_type || 'Operational Expense',
                items: itemsData.map(item => ({
                    category: item.category,
                    amount: item.amount.toString(),
                    remarks: item.remarks || ''
                }))
            });
            setHasSite(entryData.site_name !== 'OFFICE');
        } catch (error) {
            console.error("Error fetching entry for edit:", error);
            alert("Failed to load entry data.", "Load Error");
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = () => {
        setForm({
            ...form,
            items: [...form.items, { category: 'Materials', amount: '', remarks: '' }]
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

    const handleTypeChange = (type) => {
        let newItems = [...form.items];
        if (type === 'Staff Advance') {
            newItems = [{ category: 'Staff Advance', amount: '', remarks: '' }];
        } else if (form.entryType === 'Staff Advance') {
            // If switching from Staff Advance to Operational Expense, reset items
            newItems = [{ category: 'Materials', amount: '', remarks: '' }];
        }
        setForm({ ...form, entryType: type, items: newItems });
    };

    const totalAmount = form.items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const finalSiteName = hasSite ? form.siteName : 'OFFICE';

        if (hasSite && !form.siteName) {
            toast("Please select a site or uncheck 'Add Site'");
            return;
        }

        if (!form.personId) {
            toast("Please select a request person");
            return;
        }

        setLoading(true);

        try {
            let entryId = id;

            // Find person name for backward compatibility or display
            const selectedPerson = persons.find(p => p.id === form.personId);
            const requestPersonName = selectedPerson ? selectedPerson.name : 'Unknown';

            if (isEditing) {
                // 1. Update the main entry
                const { error: entryError } = await supabase
                    .from('petty_cash_entries')
                    .update({
                        date: form.date,
                        site_name: finalSiteName,
                        request_person: requestPersonName,
                        person_id: form.personId,
                        entry_type: form.entryType,
                        total_amount: totalAmount
                    })
                    .eq('id', id);

                if (entryError) throw entryError;

                // 2. Delete existing items and re-insert
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
                        site_name: finalSiteName,
                        request_person: requestPersonName, // Keep this for legacy compatibility
                        person_id: form.personId,
                        entry_type: form.entryType,
                        total_amount: totalAmount,
                        status: 'Pending'
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

            toast(`Petty Cash entry ${isEditing ? 'updated' : 'recorded'} successfully!`, "Success");
            
            if (isEditing) {
                navigate('/accounts/petty-cash/history');
            } else {
                // Reset form
                setForm({
                    date: new Date().toISOString().slice(0, 10),
                    siteName: '',
                    personId: '',
                    entryType: 'Operational Expense',
                    items: [{ category: 'Materials', amount: '', remarks: '' }]
                });
            }
        } catch (error) {
            console.error("Error submitting petty cash:", error);
            alert("Failed to save entry. " + error.message, "Error");
        } finally {
            setLoading(false);
        }
    };

    const operationalCategories = [
        'Materials',
        'Travel',
        'Food/Staff Welfare',
        'Loading/Unloading',
        'Debris Removal',
        'Others'
    ];

    if (loading) return <LoadingScreen message={isEditing ? "Updating record..." : "Saving your entry..."} />;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerTitleRow}>
                    <button className={styles.backBtn} onClick={() => navigate('/accounts/petty-cash/history')}>
                        <ArrowLeft size={18} />
                    </button>
                    <h1 className={styles.title}>{isEditing ? 'Edit Petty Cash Entry' : 'Petty Cash Entry Form'}</h1>
                </div>
                <p className={styles.subtitle}>{isEditing ? `Editing record #${id.slice(0, 8)}` : 'Record site-level expenses and petty cash usage'}</p>
            </header>

            <div className={styles.moduleSelector}>
                <button 
                    className={`${styles.moduleBtn} ${form.entryType === 'Staff Advance' ? styles.active : ''}`}
                    onClick={() => handleTypeChange('Staff Advance')}
                >
                    <Briefcase size={20} />
                    <span>Staff Advance</span>
                </button>
                <button 
                    className={`${styles.moduleBtn} ${form.entryType === 'Operational Expense' ? styles.active : ''}`}
                    onClick={() => handleTypeChange('Operational Expense')}
                >
                    <Truck size={20} />
                    <span>Operational Expenses</span>
                </button>
            </div>

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
                        <div className={styles.siteToggleHeader}>
                            <label className={styles.label}><MapPin size={14} /> Site Name</label>
                            <label className={styles.toggleWrapper}>
                                <input 
                                    type="checkbox" 
                                    checked={hasSite} 
                                    onChange={(e) => setHasSite(e.target.checked)} 
                                    className={styles.toggleInput}
                                />
                                <span className={styles.toggleSlider}></span>
                                <span className={styles.toggleLabelText}>{hasSite ? 'Onsite' : 'Office'}</span>
                            </label>
                        </div>
                        {hasSite ? (
                            <SearchableSelect 
                                options={sites}
                                value={form.siteName}
                                onChange={(val) => setForm({...form, siteName: val})}
                                placeholder="Select Project Site"
                            />
                        ) : (
                            <div className={styles.officeBadge}>
                                🏢 Billing to Head Office
                            </div>
                        )}
                    </div>

                    <div className={styles.fieldGroup} style={{ gridColumn: 'span 2' }}>
                        <label className={styles.label}><User size={14} /> Request Person</label>
                        <div className={styles.personSelectorRow}>
                            <select 
                                className={styles.select}
                                value={form.personId}
                                onChange={(e) => setForm({...form, personId: e.target.value})}
                                required
                            >
                                <option value="">Select a person</option>
                                {persons.map(p => (
                                    <option key={p.id} value={p.id}>{p.name} ({p.person_type})</option>
                                ))}
                            </select>
                            <button 
                                type="button" 
                                className={styles.smallAddBtn}
                                onClick={() => navigate('/accounts/petty-cash/persons/new')}
                                title="Add New Person"
                            >
                                <Plus size={16} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className={styles.itemsSection}>
                    <h3 className={styles.sectionTitle}>
                        {form.entryType === 'Staff Advance' ? 'Advance Details' : 'Expense Items'}
                    </h3>
                    
                    {form.items.map((item, index) => (
                        <div key={index} className={styles.itemRow}>
                            <div className={styles.itemField}>
                                <label className={styles.label}>Category</label>
                                {form.entryType === 'Staff Advance' ? (
                                    <input type="text" className={styles.input} value="Staff Advance" readOnly />
                                ) : (
                                    <select 
                                        className={styles.select} 
                                        value={item.category} 
                                        onChange={(e) => handleItemChange(index, 'category', e.target.value)}
                                    >
                                        {operationalCategories.map(cat => (
                                            <option key={cat}>{cat}</option>
                                        ))}
                                    </select>
                                )}
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
                            <div className={styles.itemField} style={{ flexGrow: 3 }}>
                                <label className={styles.label}>Remarks</label>
                                <textarea 
                                    className={styles.textarea} 
                                    placeholder={form.entryType === 'Staff Advance' ? "Reason for advance" : "Describe the expense"} 
                                    value={item.remarks} 
                                    onChange={(e) => handleItemChange(index, 'remarks', e.target.value)} 
                                    rows={1}
                                />
                            </div>
                            {form.entryType === 'Operational Expense' && (
                                <button 
                                    type="button" 
                                    className={styles.removeBtn} 
                                    onClick={() => handleRemoveItem(index)}
                                    title="Remove Item"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}

                    {form.entryType === 'Operational Expense' && (
                        <button type="button" className={styles.addBtn} onClick={handleAddItem}>
                            <Plus size={16} /> Add More Items
                        </button>
                    )}
                </div>

                <footer className={styles.formFooter}>
                    <div className={styles.totalDisplay}>
                        Total: <span className={styles.totalValue}>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>

                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        <CheckCircle size={18} /> {loading ? 'Saving...' : (isEditing ? 'Update Entry' : 'Submit Entry')}
                    </button>
                </footer>
            </form>
        </div>
    );
};

export default PettyCashEntry;
