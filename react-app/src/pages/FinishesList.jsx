import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, CheckCircle, ListChecks, Download, LayoutList } from 'lucide-react';
import Select from 'react-select';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useMessage } from '../context/MessageContext';
import LoadingScreen from '../components/LoadingScreen';
import styles from './FinishesList.module.css';

const FinishesList = () => {
    const { alert, confirm, toast } = useMessage();
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [selectedProjectId, setSelectedProjectId] = useState('');
    
    const [items, setItems] = useState([]);
    const [newItemName, setNewItemName] = useState('');
    const [savingItem, setSavingItem] = useState(false);
    
    const [activeTab, setActiveTab] = useState('project'); // 'project' | 'master'
    const [masterItems, setMasterItems] = useState([]);
    const [filterProjectId, setFilterProjectId] = useState('');

    useEffect(() => {
        fetchProjects();
    }, []);

    useEffect(() => {
        if (activeTab === 'project' && selectedProjectId) {
            fetchItems(selectedProjectId);
        } else if (activeTab === 'master') {
            fetchMasterItems();
        } else {
            setItems([]);
        }
    }, [selectedProjectId, activeTab]);

    const fetchProjects = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setProjects(data || []);
        } catch (error) {
            console.error("Error fetching projects:", error);
            alert("Failed to load projects.");
        } finally {
            setLoading(false);
        }
    };

    const fetchItems = async (projectId) => {
        try {
            const { data, error } = await supabase
                .from('project_finishes')
                .select('*')
                .eq('project_id', projectId)
                .order('created_at', { ascending: true });
                
            if (error) {
                if (error.code === '42P01') {
                    alert("The 'project_finishes' table is missing in the database. Please run the provided SQL script.");
                    return;
                }
                throw error;
            }
            setItems(data || []);
        } catch (error) {
            console.error("Error fetching finishes:", error);
            alert("Failed to load finishes items.");
        }
    };

    const fetchMasterItems = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('project_finishes')
                .select('*, projects(name, code)')
                .order('created_at', { ascending: false });
                
            if (error) {
                if (error.code === '42P01') return;
                throw error;
            }
            setMasterItems(data || []);
        } catch (error) {
            console.error("Error fetching master items:", error);
            alert("Failed to load master sheet.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddItem = async (e) => {
        e.preventDefault();
        if (!newItemName.trim() || !selectedProjectId) return;
        
        setSavingItem(true);
        try {
            const { data, error } = await supabase
                .from('project_finishes')
                .insert([{
                    project_id: selectedProjectId,
                    item_name: newItemName.trim(),
                    status: 'pending'
                }])
                .select()
                .single();

            if (error) throw error;
            
            setItems(prev => [...prev, data]);
            setNewItemName('');
            toast("Item added successfully!");
        } catch (error) {
            console.error("Error adding item:", error);
            alert("Failed to add item: " + error.message);
        } finally {
            setSavingItem(false);
        }
    };

    const handleStatusUpdate = async (id, newStatus) => {
        try {
            // Optimistic UI update
            setItems(prev => prev.map(item => 
                item.id === id ? { ...item, status: newStatus } : item
            ));

            const { error } = await supabase
                .from('project_finishes')
                .update({ status: newStatus, updated_at: new Date().toISOString() })
                .eq('id', id);

            if (error) {
                fetchItems(selectedProjectId);
                throw error;
            }
            toast("Status updated!");
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Failed to update status.");
        }
    };

    const handleDeleteItem = async (id) => {
        if (!await confirm("Are you sure you want to delete this item?")) return;
        
        try {
            const { error } = await supabase
                .from('project_finishes')
                .delete()
                .eq('id', id);
                
            if (error) throw error;
            setItems(prev => prev.filter(item => item.id !== id));
            toast("Item deleted.");
        } catch (error) {
            console.error("Error deleting item:", error);
            alert("Failed to delete item.");
        }
    };

    const getPercentage = (status) => {
        switch (status) {
            case 'completed': return 100;
            case 'process': return 50;
            case 'pending': default: return 0;
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text('Master Finishes List', 14, 15);
        
        const filtered = filterProjectId 
            ? masterItems.filter(item => item.project_id === filterProjectId)
            : masterItems;

        const grouped = filtered.reduce((acc, item) => {
            if (!acc[item.project_id]) acc[item.project_id] = { project: item.projects, items: [] };
            acc[item.project_id].items.push(item);
            return acc;
        }, {});

        const tableColumn = ["Item Name", "Status", "Percentage"];
        const tableRows = [];

        Object.values(grouped).forEach(group => {
            tableRows.push([
                { 
                    content: `Project Name: ${group.project ? group.project.name : 'Unknown'} ${group.project?.code ? `(${group.project.code})` : ''}`, 
                    colSpan: 3, 
                    styles: { fillColor: [241, 245, 249], fontStyle: 'bold', textColor: [15, 23, 42] } 
                }
            ]);
            group.items.forEach(item => {
                tableRows.push([
                    item.item_name,
                    item.status,
                    `${getPercentage(item.status)}%`
                ]);
            });
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [37, 99, 235] }
        });

        doc.save('master_finishes_list.pdf');
        toast("Download started!");
    };

    const overallPercentage = items.length === 0 
        ? 0 
        : Math.round(items.reduce((acc, curr) => acc + getPercentage(curr.status), 0) / items.length);

    if (loading && projects.length === 0) return <LoadingScreen message="Loading projects..." />;

    const projectOptions = projects.map(p => ({
        value: p.id,
        label: `${p.name} ${p.code ? `(${p.code})` : ''}`
    }));

    const filteredMasterItems = filterProjectId 
        ? masterItems.filter(item => item.project_id === filterProjectId)
        : masterItems;

    const groupedMasterItems = filteredMasterItems.reduce((acc, item) => {
        if (!acc[item.project_id]) acc[item.project_id] = { project: item.projects, items: [] };
        acc[item.project_id].items.push(item);
        return acc;
    }, {});

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}><ListChecks size={28} style={{ display: 'inline', verticalAlign: 'text-bottom', marginRight: '8px', color: '#2563eb' }} />Finishes List</h1>
                <p className={styles.subtitle}>Manage finish items and track their progress percentage</p>
            </header>

            <div className={styles.tabs}>
                <button 
                    className={`${styles.tab} ${activeTab === 'project' ? styles.active : ''}`}
                    onClick={() => setActiveTab('project')}
                >
                    Project View
                </button>
                <button 
                    className={`${styles.tab} ${activeTab === 'master' ? styles.active : ''}`}
                    onClick={() => setActiveTab('master')}
                >
                    Master Sheet
                </button>
            </div>

            {activeTab === 'project' && (
                <>
                    <div className={styles.card}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Select Project</label>
                            <Select 
                                options={projectOptions}
                                value={projectOptions.find(opt => opt.value === selectedProjectId) || null}
                                onChange={(selected) => setSelectedProjectId(selected ? selected.value : '')}
                                placeholder="Search and Select Project..."
                                isClearable
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        padding: '4px',
                                        borderRadius: '8px',
                                        borderColor: '#e2e8f0',
                                        backgroundColor: '#f8fafc',
                                        fontSize: '0.95rem',
                                        boxShadow: 'none',
                                        '&:hover': {
                                            borderColor: '#3b82f6'
                                        }
                                    })
                                }}
                            />
                        </div>
                    </div>

                    {selectedProjectId && (
                        <div className={styles.card}>
                            <div className={styles.formGroup}>
                                <form className={styles.addSection} onSubmit={handleAddItem}>
                                    <div className={styles.addInputWrapper}>
                                        <label className={styles.label}>Add New Item</label>
                                        <input 
                                            type="text"
                                            className={styles.input}
                                            value={newItemName}
                                            onChange={(e) => setNewItemName(e.target.value)}
                                            placeholder="e.g. Wardrobe, Kitchen Cabinets..."
                                            required
                                        />
                                    </div>
                                    <button type="submit" className={styles.addBtn} disabled={!newItemName.trim() || savingItem}>
                                        <Plus size={18} /> {savingItem ? 'Adding...' : 'Add Item'}
                                    </button>
                                </form>
                            </div>

                            <div className={styles.summarySection}>
                                <div className={styles.summaryHeader}>
                                    <h3 className={styles.summaryTitle}>Progress Tracking</h3>
                                    <span className={styles.overallPercentage}>{overallPercentage}%</span>
                                </div>
                                
                                <div className={styles.progressBarContainer}>
                                    <div 
                                        className={styles.progressBar} 
                                        style={{ width: `${overallPercentage}%` }}
                                    ></div>
                                </div>

                                <div className={styles.itemsList}>
                                    {items.length === 0 ? (
                                        <p className={styles.noItems}>No items added yet. Add an item above to start tracking.</p>
                                    ) : (
                                        items.map(item => {
                                            const percent = getPercentage(item.status);
                                            return (
                                                <div key={item.id} className={styles.itemCard}>
                                                    <div className={styles.itemInfo}>
                                                        <div className={styles.itemName}>{item.item_name}</div>
                                                        <div className={styles.itemProgressText}>Progress: {percent}%</div>
                                                    </div>
                                                    <div className={styles.itemActions}>
                                                        <select
                                                            className={`${styles.statusSelect} ${styles[item.status]}`}
                                                            value={item.status}
                                                            onChange={(e) => handleStatusUpdate(item.id, e.target.value)}
                                                        >
                                                            <option value="pending">Pending (0%)</option>
                                                            <option value="process">Process (50%)</option>
                                                            <option value="completed">Completed (100%)</option>
                                                        </select>
                                                        
                                                        <button 
                                                            onClick={() => handleDeleteItem(item.id)}
                                                            className={styles.deleteBtn}
                                                            title="Delete Item"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'master' && (
                <div className={styles.card}>
                    <div className={styles.summaryHeaderMaster}>
                        <h3 className={styles.summaryTitle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <LayoutList size={22} color="#2563eb" /> 
                            Master Sheet View
                        </h3>
                        <button className={styles.exportBtn} onClick={handleExportPDF} disabled={masterItems.length === 0}>
                            <Download size={18} /> {masterItems.length === 0 ? 'No Data' : 'Export PDF'}
                        </button>
                    </div>
                    
                    <div style={{ marginBottom: '1.5rem', maxWidth: '400px' }}>
                        <label className={styles.label}>Filter by Site / Project</label>
                        <Select 
                            options={projectOptions}
                            value={projectOptions.find(opt => opt.value === filterProjectId) || null}
                            onChange={(selected) => setFilterProjectId(selected ? selected.value : '')}
                            placeholder="All Sites (Select to Filter)..."
                            isClearable
                            styles={{
                                control: (base) => ({
                                    ...base,
                                    borderRadius: '8px',
                                    borderColor: '#e2e8f0',
                                    fontSize: '0.95rem'
                                })
                            }}
                        />
                    </div>

                    <div className={styles.tableSection}>
                        {loading ? (
                            <p style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>Loading master list data...</p>
                        ) : (
                            <table className={styles.masterTable}>
                                <thead>
                                    <tr>
                                        <th>Item Name</th>
                                        <th>Status</th>
                                        <th>Progress</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.keys(groupedMasterItems).length === 0 ? (
                                        <tr><td colSpan="3" className={styles.noItems}>No finishing items found.</td></tr>
                                    ) : (
                                        Object.values(groupedMasterItems).map(group => (
                                            <React.Fragment key={group.project?.id || Math.random()}>
                                                <tr style={{ backgroundColor: '#f1f5f9' }}>
                                                    <td colSpan="3" style={{ padding: '0.75rem 1rem' }}>
                                                        <strong style={{ color: '#0f172a' }}>{group.project?.name || 'Unknown Project'}</strong>
                                                        {group.project?.code && <span style={{ marginLeft: '8px', fontSize: '0.8rem', color: '#64748b' }}>({group.project.code})</span>}
                                                    </td>
                                                </tr>
                                                {group.items.map(item => (
                                                    <tr key={item.id}>
                                                        <td style={{ paddingLeft: '2rem' }}>{item.item_name}</td>
                                                        <td>
                                                            <span className={`${styles.badge} ${styles[item.status]}`}>
                                                                {item.status}
                                                            </span>
                                                        </td>
                                                        <td style={{ fontWeight: '600' }}>
                                                            {getPercentage(item.status)}%
                                                        </td>
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default FinishesList;
