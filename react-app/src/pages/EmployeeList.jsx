import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
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
    const { alert, toast, confirm } = useMessage();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');

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
        if (await confirm("Are you sure you want to permanently delete this employee record? This action cannot be undone.")) {
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

                <div className={styles.searchBar}>
                    <Search size={18} color="#64748b" />
                    <input
                        className={styles.searchInput}
                        placeholder="Search by name, ID, department..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
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
                                        <button
                                            onClick={() => deleteEmployee(emp.id)}
                                            className={styles.deleteBtn}
                                            title="Delete Employee"
                                        >
                                            <Trash2 size={16} />
                                        </button>
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
        </div>
    );
};

export default EmployeeList;
