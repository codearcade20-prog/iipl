import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Search, Calendar, MapPin, Eye, Printer, Filter, X, Pencil, Trash2 } from 'lucide-react';
import styles from './PettyCashHistory.module.css';

const PettyCashHistory = () => {
    const navigate = useNavigate();
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sites, setSites] = useState([]);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        month: '',
        site: ''
    });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        fetchEntries();
    }, [filters, searchTerm]);

    const fetchInitialData = async () => {
        const { data: sitesData } = await supabase.from('sites').select('name').order('name');
        setSites(['OFFICE', ...(sitesData?.map(s => s.name) || [])]);
    };

    const fetchEntries = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('petty_cash_entries')
                .select('*')
                .order('date', { ascending: false });

            if (filters.startDate) {
                query = query.gte('date', filters.startDate);
            }
            if (filters.endDate) {
                query = query.lte('date', filters.endDate);
            }
            if (filters.site) {
                query = query.eq('site_name', filters.site);
            }
            if (filters.month) {
                const [year, month] = filters.month.split('-');
                const startDate = `${year}-${month}-01`;
                const lastDay = new Date(year, month, 0).getDate();
                const endDate = `${year}-${month}-${lastDay}`;
                query = query.gte('date', startDate).lte('date', endDate);
            }
            if (searchTerm) {
                query = query.ilike('request_person', `%${searchTerm}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setEntries(data || []);
        } catch (error) {
            console.error("Error fetching entries:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this petty cash entry? This will also remove all associated items.")) return;

        try {
            const { error } = await supabase.from('petty_cash_entries').delete().eq('id', id);
            if (error) throw error;
            
            alert("Success: Entry deleted.");
            fetchEntries(); // Refresh list
        } catch (error) {
            console.error("Error deleting entry:", error);
            alert("Error: Failed to delete entry. " + error.message);
        }
    };

    const clearFilters = () => {
        setFilters({ startDate: '', endDate: '', month: '', site: '' });
        setSearchTerm('');
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1 className={styles.title}>Petty Cash History</h1>
                    <p className={styles.subtitle}>View and filter all previous petty cash entries</p>
                </div>
                <div className={styles.searchWrapper}>
                    <Search size={18} className={styles.searchIcon} />
                    <input 
                        type="text" 
                        placeholder="Search person..." 
                        className={styles.searchInput}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </header>

            <section className={styles.filtersSection}>
                <div className={styles.filterGrid}>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>Start Date</label>
                        <input 
                            type="date" 
                            className={styles.filterInput}
                            value={filters.startDate}
                            onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>End Date</label>
                        <input 
                            type="date" 
                            className={styles.filterInput}
                            value={filters.endDate}
                            onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>By Month</label>
                        <input 
                            type="month" 
                            className={styles.filterInput}
                            value={filters.month}
                            onChange={(e) => setFilters({...filters, month: e.target.value})}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>By Site</label>
                        <select 
                            className={styles.filterSelect}
                            value={filters.site}
                            onChange={(e) => setFilters({...filters, site: e.target.value})}
                        >
                            <option value="">All Sites</option>
                            {sites.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <button className={styles.clearBtn} onClick={clearFilters}>
                    <X size={16} /> Clear Filters
                </button>
            </section>

            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Site Name</th>
                            <th>Request Person</th>
                            <th>Total Amount</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" className={styles.empty}>Loading entries...</td></tr>
                        ) : entries.length === 0 ? (
                            <tr><td colSpan="5" className={styles.empty}>No entries found matching filters</td></tr>
                        ) : (
                            entries.map((entry) => (
                                <tr key={entry.id}>
                                    <td>{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                                    <td><span className={styles.siteName}>{entry.site_name}</span></td>
                                    <td>{entry.request_person}</td>
                                    <td className={styles.amount}>₹{parseFloat(entry.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td className={styles.actions}>
                                        <button 
                                            className={styles.viewBtn}
                                            onClick={() => navigate(`/accounts/petty-cash/view/${entry.id}`)}
                                            title="View Detail"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button 
                                            className={styles.editBtn}
                                            onClick={() => navigate(`/accounts/petty-cash/edit/${entry.id}`)}
                                            title="Edit Entry"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button 
                                            className={styles.deleteBtn}
                                            onClick={() => handleDelete(entry.id)}
                                            title="Delete Entry"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PettyCashHistory;
