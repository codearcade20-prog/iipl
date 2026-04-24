import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    ArrowLeft, 
    Search, 
    Trash2, 
    FileText, 
    Calendar,
    Loader2
} from 'lucide-react';
import styles from './SubVendorChecklistHistory.module.css';
import { useMessage } from '../context/MessageContext';

const SubVendorChecklistHistory = () => {
    const navigate = useNavigate();
    const { toast } = useMessage();
    const [checklists, setChecklists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('sub_vendor_checklists')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setChecklists(data || []);
        } catch (err) {
            console.error('Error fetching history:', err);
            toast('Failed to load history');
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        
        try {
            const { error } = await supabase
                .from('sub_vendor_checklists')
                .delete()
                .eq('id', id);

            if (error) throw error;
            
            setChecklists(prev => prev.filter(item => item.id !== id));
            toast('Record deleted successfully');
        } catch (err) {
            console.error('Error deleting record:', err);
            toast('Failed to delete record');
        }
    };

    const filteredChecklists = checklists.filter(item => 
        (item.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div>
                    <h1 className={styles.title}>Checklist History</h1>
                    <p className={styles.subtitle}>View and manage saved Sub Vendor Checklists</p>
                </div>
                <button onClick={() => navigate('/sub-vendor-checklist')} className={styles.backBtn}>
                    <ArrowLeft size={18} /> Back to Form
                </button>
            </header>

            <main className={styles.content}>
                <section className={styles.searchSection}>
                    <div className={styles.searchWrapper}>
                        <Search className={styles.searchIcon} size={20} />
                        <input 
                            type="text" 
                            placeholder="Search by project or vendor name..." 
                            className={styles.searchInput} 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </section>

                <div className={styles.tableCard}>
                    {loading ? (
                        <div className={styles.loadingWrapper}>
                            <Loader2 className={styles.loadingSpinner} size={48} />
                            <p>Loading records from database...</p>
                        </div>
                    ) : filteredChecklists.length === 0 ? (
                        <div className={styles.emptyWrapper}>
                            <FileText className={styles.emptyIcon} size={64} />
                            <p>{searchTerm ? 'No matching records found' : 'No checklists created yet'}</p>
                        </div>
                    ) : (
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Project</th>
                                    <th>Vendor</th>
                                    <th>Value</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredChecklists.map((item) => (
                                    <tr key={item.id}>
                                        <td>
                                            <div className={styles.dateCell}>
                                                <Calendar size={14} />
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className={styles.projectCell}>{item.project_name}</td>
                                        <td className={styles.vendorCell}>{item.vendor_name}</td>
                                        <td className={styles.valueCell}>₹{item.total_value?.toLocaleString() || 0}</td>
                                        <td>
                                            <div className={styles.actionsCell}>
                                                <button 
                                                    onClick={() => navigate(`/sub-vendor-checklist?id=${item.id}`)}
                                                    className={`${styles.actionBtn} ${styles.viewBtn}`} 
                                                    title="View or Edit Details"
                                                >
                                                    <FileText size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(item.id)}
                                                    className={`${styles.actionBtn} ${styles.deleteBtn}`} 
                                                    title="Delete Record"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SubVendorChecklistHistory;
