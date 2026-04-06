import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { 
    ArrowLeft, 
    Search, 
    Printer, 
    Trash2, 
    FileText, 
    Calendar,
    User,
    Loader2
} from 'lucide-react';
import styles from './SubVendorChecklist.module.css';
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
            toast.error('Failed to load history');
        } finally {
            setLoading(false);
        }
    }, []);

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
            
            // Instant update: reflect the change quickly without a full refresh
            setChecklists(prev => prev.filter(item => item.id !== id));
            toast.success('Record deleted successfully');
        } catch (err) {
            console.error('Error deleting record:', err);
            toast.error('Failed to delete record');
        }
    };

    const filteredChecklists = checklists.filter(item => 
        (item.project_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.vendor_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <button onClick={() => navigate('/sub-vendor-checklist')} className={styles.backBtn} style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>
                    <ArrowLeft size={18} /> Back to Form
                </button>
                <h1 className={styles.title}>Checklist History</h1>
                <p className={styles.subtitle}>View and manage saved Sub Vendor Checklists</p>
            </div>

            <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                    <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by project or vendor name..." 
                        className={styles.input} 
                        style={{ paddingLeft: '35px' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className={styles.checklist} style={{ padding: '0' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        <Loader2 className="animate-spin" style={{ margin: '0 auto 1rem' }} />
                        <p>Loading records...</p>
                    </div>
                ) : filteredChecklists.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                        <FileText size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
                        <p>No records found.</p>
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Date</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Project</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Vendor</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Value</th>
                                <th style={{ padding: '1rem', textAlign: 'center' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredChecklists.map((item) => (
                                <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Calendar size={14} color="#94a3b8" />
                                            {new Date(item.created_at).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}><strong>{item.project_name}</strong></td>
                                    <td style={{ padding: '1rem' }}>{item.vendor_name}</td>
                                    <td style={{ padding: '1rem' }}>₹{item.total_value?.toLocaleString() || 0}</td>
                                    <td style={{ padding: '1rem', textAlign: 'center' }}>
                                        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem' }}>
                                            <button 
                                                onClick={() => navigate(`/sub-vendor-checklist?id=${item.id}`)}
                                                className={styles.printBtn} 
                                                style={{ padding: '4px 8px', fontSize: '12px' }}
                                                title="View/Edit"
                                            >
                                                <FileText size={14} />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(item.id)}
                                                className={styles.printBtn} 
                                                style={{ padding: '4px 8px', fontSize: '12px', color: '#ef4444', borderColor: '#fee2e2' }}
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default SubVendorChecklistHistory;
