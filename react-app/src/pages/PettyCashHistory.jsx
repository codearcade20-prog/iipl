import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Calendar, MapPin, Eye, Printer, Filter, X, Pencil, Trash2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { useMessage } from '../context/MessageContext';
import LoadingScreen from '../components/LoadingScreen';
import styles from './PettyCashHistory.module.css';

const PettyCashHistory = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { toast, alert, confirm, prompt } = useMessage();
    const isMD = location.pathname.startsWith('/md');
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sites, setSites] = useState([]);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        month: '',
        site: '',
        status: ''
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
            if (filters.status) {
                query = query.eq('status', filters.status);
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
        const confirmed = await confirm("Are you sure you want to delete this petty cash entry? This will also remove all associated items.");
        if (!confirmed) return;

        try {
            const { error } = await supabase.from('petty_cash_entries').delete().eq('id', id);
            if (error) throw error;

            toast("Success: Entry deleted.");
            fetchEntries(); // Refresh list
        } catch (error) {
            console.error("Error deleting entry:", error);
            alert("Failed to delete entry. " + error.message, "Error");
        }
    };

    const handleMarkAsPaid = async (entry) => {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = await prompt(
            `Mark Voucher #${entry.voucher_no || 'Pending'} as Paid?\nEnter payment date (YYYY-MM-DD):`,
            today
        );
        
        if (dateInput === null) return; // Cancelled
        
        // Basic date format validation
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            alert("Invalid date format. Please use YYYY-MM-DD.");
            return;
        }

        const remarksInput = await prompt("Enter payment remarks (optional):", "");

        try {
            const { error } = await supabase
                .from('petty_cash_entries')
                .update({ 
                    status: 'Paid',
                    paid_date: dateInput + 'T00:00:00Z',
                    paid_remarks: remarksInput || ''
                })
                .eq('id', entry.id);

            if (error) throw error;

            toast(`Voucher #${entry.voucher_no || ''} marked as Paid!`);
            fetchEntries();
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to mark as paid. " + error.message, "Error");
        }
    };

    const clearFilters = () => {
        setFilters({ startDate: '', endDate: '', month: '', site: '', status: '' });
        setSearchTerm('');
    };

    if (loading && entries.length === 0) return <LoadingScreen message="Loading transaction history..." />;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerInfo}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        {isMD && (
                            <button className={styles.backBtn} onClick={() => navigate('/md')}>
                                <ArrowLeft size={18} />
                            </button>
                        )}
                        <div>
                            <h1 className={styles.title}>Petty Cash History</h1>
                            <p className={styles.subtitle}>View and filter all previous petty cash entries</p>
                        </div>
                    </div>
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
                            onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>End Date</label>
                        <input
                            type="date"
                            className={styles.filterInput}
                            value={filters.endDate}
                            onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>By Month</label>
                        <input
                            type="month"
                            className={styles.filterInput}
                            value={filters.month}
                            onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                        />
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>By Site</label>
                        <select
                            className={styles.filterSelect}
                            value={filters.site}
                            onChange={(e) => setFilters({ ...filters, site: e.target.value })}
                        >
                            <option value="">All Sites</option>
                            {sites.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className={styles.filterGroup}>
                        <label className={styles.filterLabel}>By Status</label>
                        <select
                            className={styles.filterSelect}
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                        >
                            <option value="">All Statuses</option>
                            <option value="Pending">Pending</option>
                            <option value="Approved">Approved</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Paid">Paid</option>
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
                            <th>Voucher No</th>
                            <th>Date</th>
                            <th>Type</th>
                            <th>Site Name</th>
                            <th>Request Person</th>
                            <th>Total Amount</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {entries.length === 0 ? (
                            <tr><td colSpan="8" className={styles.empty}>{loading ? 'Refreshing...' : 'No entries found matching filters'}</td></tr>
                        ) : (
                            entries.map((entry) => (
                                <tr key={entry.id}>
                                    <td className={styles.voucherNo}>#{entry.voucher_no || 'Pending'}</td>
                                    <td>{new Date(entry.date).toLocaleDateString('en-IN')}</td>
                                    <td><span className={styles.typeBadge}>{entry.entry_type || 'Operational'}</span></td>
                                    <td><span className={styles.siteName}>{entry.site_name}</span></td>
                                    <td>{entry.request_person}</td>
                                    <td className={styles.amount}>₹{parseFloat(entry.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[entry.status?.toLowerCase() || 'pending']}`}>
                                            {entry.status || 'Pending'}
                                        </span>
                                    </td>
                                    <td className={styles.actions}>
                                        <button
                                            className={styles.viewBtn}
                                            onClick={() => navigate(isMD ? `/md/view/${entry.id}` : `/accounts/petty-cash/view/${entry.id}`)}
                                            title="View Detail"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        {entry.status === 'Pending' && (
                                            <>
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
                                            </>
                                        )}
                                        {entry.status === 'Approved' && !isMD && (
                                            <button 
                                                className={styles.paidBtn}
                                                onClick={() => handleMarkAsPaid(entry)}
                                                title="Mark as Paid"
                                            >
                                                <CheckCircle2 size={16} />
                                            </button>
                                        )}
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
