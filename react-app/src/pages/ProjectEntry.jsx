import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, Calendar, MapPin, CheckCircle, Briefcase, Pencil, User } from 'lucide-react';
import { useMessage } from '../context/MessageContext';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from '../components/LoadingScreen';
import styles from './ProjectEntry.module.css';

const ProjectEntry = () => {
    const { alert, confirm, toast } = useMessage();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [personnel, setPersonnel] = useState([]);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [form, setForm] = useState({
        name: '',
        location: '',
        coordinator: '',
        designer: '',
        site_engineer: '',
        start_date: '',
        end_date: '',
        remarks: ''
    });

    useEffect(() => {
        fetchProjects();
        fetchPersonnel();
    }, []);

    const fetchPersonnel = async () => {
        try {
            const { data, error } = await supabase
                .from('project_personnel')
                .select('*')
                .order('name');
            if (error) throw error;
            setPersonnel(data || []);
        } catch (error) {
            console.error("Error fetching personnel:", error);
        }
    };

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (isEditing) {
                const { error } = await supabase
                    .from('projects')
                    .update({
                        name: form.name,
                        location: form.location,
                        coordinator: form.coordinator,
                        designer: form.designer,
                        site_engineer: form.site_engineer,
                        start_date: form.start_date || null,
                        end_date: form.end_date || null,
                        remarks: form.remarks,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', editId);
                if (error) throw error;
                toast("Project updated successfully!");
            } else {
                const { error } = await supabase
                    .from('projects')
                    .insert([{
                        name: form.name,
                        location: form.location,
                        coordinator: form.coordinator,
                        designer: form.designer,
                        site_engineer: form.site_engineer,
                        start_date: form.start_date || null,
                        end_date: form.end_date || null,
                        remarks: form.remarks,
                        created_by: user?.username || 'Unknown'
                    }]);
                if (error) throw error;
                toast("Project created successfully!");
            }
            resetForm();
            fetchProjects();
        } catch (error) {
            console.error("Error saving project:", error);
            alert("Failed to save project: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (project) => {
        setIsEditing(true);
        setEditId(project.id);
        setForm({
            name: project.name,
            location: project.location || '',
            coordinator: project.coordinator || '',
            designer: project.designer || '',
            site_engineer: project.site_engineer || '',
            start_date: project.start_date || '',
            end_date: project.end_date || '',
            remarks: project.remarks || ''
        });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = async (id) => {
        if (!await confirm("Are you sure you want to delete this project? This will also delete all its status updates.")) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('projects')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast("Project deleted.");
            fetchProjects();
        } catch (error) {
            console.error("Error deleting project:", error);
            alert("Failed to delete project.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setForm({
            name: '',
            location: '',
            coordinator: '',
            designer: '',
            site_engineer: '',
            start_date: '',
            end_date: '',
            remarks: ''
        });
        setIsEditing(false);
        setEditId(null);
    };

    if (loading && projects.length === 0) return <LoadingScreen message="Loading projects..." />;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Project Entry</h1>
                <p className={styles.subtitle}>Manage your projects and their details</p>
            </header>

            <form className={styles.formCard} onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                    <div className={styles.fieldGroup} style={{ gridColumn: 'span 2' }}>
                        <label className={styles.label}><Briefcase size={14} /> Project Name</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            value={form.name} 
                            onChange={(e) => setForm({...form, name: e.target.value})} 
                            placeholder="Enter project name"
                            required 
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><MapPin size={14} /> Location</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            value={form.location} 
                            onChange={(e) => setForm({...form, location: e.target.value})} 
                            placeholder="Enter location"
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><User size={14} /> Coordinator</label>
                        <select
                            className={styles.input}
                            value={form.coordinator}
                            onChange={(e) => setForm({...form, coordinator: e.target.value})}
                        >
                            <option value="">Select Coordinator...</option>
                            {personnel.filter(p => p.role === 'Coordinator').map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><User size={14} /> Designer</label>
                        <select
                            className={styles.input}
                            value={form.designer}
                            onChange={(e) => setForm({...form, designer: e.target.value})}
                        >
                            <option value="">Select Designer...</option>
                            {personnel.filter(p => p.role === 'Designer').map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><User size={14} /> Site Engineer</label>
                        <select
                            className={styles.input}
                            value={form.site_engineer}
                            onChange={(e) => setForm({...form, site_engineer: e.target.value})}
                        >
                            <option value="">Select Site Engineer...</option>
                            {personnel.filter(p => p.role === 'Site Engineer').map(p => (
                                <option key={p.id} value={p.name}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Calendar size={14} /> Start Date</label>
                        <input 
                            type="date" 
                            className={styles.input} 
                            value={form.start_date} 
                            onChange={(e) => setForm({...form, start_date: e.target.value})} 
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Calendar size={14} /> End Date</label>
                        <input 
                            type="date" 
                            className={styles.input} 
                            value={form.end_date} 
                            onChange={(e) => setForm({...form, end_date: e.target.value})} 
                        />
                    </div>

                    <div className={styles.fieldGroup} style={{ gridColumn: 'span 2' }}>
                        <label className={styles.label}>Remarks</label>
                        <textarea 
                            className={styles.textarea} 
                            value={form.remarks} 
                            onChange={(e) => setForm({...form, remarks: e.target.value})} 
                            placeholder="Add any project remarks"
                            rows={3}
                        />
                    </div>
                </div>

                <div className={styles.formActions}>
                    {isEditing && (
                        <button type="button" className={styles.cancelBtn} onClick={resetForm}>
                            Cancel
                        </button>
                    )}
                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        <CheckCircle size={18} /> {loading ? 'Saving...' : (isEditing ? 'Update Project' : 'Create Project')}
                    </button>
                </div>
            </form>

            <div className={styles.listSection}>
                <h2 className={styles.sectionTitle}>Existing Projects</h2>
                <div className={styles.projectGrid}>
                    {projects.length > 0 ? projects.map(project => (
                        <div key={project.id} className={styles.projectCard}>
                            <div className={styles.cardHeader}>
                                <h3 className={styles.projectName}>{project.name}</h3>
                                <div className={styles.cardActions}>
                                    <button className={styles.actionBtn} onClick={() => handleEdit(project)} title="Edit">
                                        <Pencil size={16} />
                                    </button>
                                    <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(project.id)} title="Delete">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                            <div className={styles.cardBody}>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Created By:</span>
                                    <span className={styles.detailValue}>{project.created_by || 'N/A'}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Coordinator:</span>
                                    <span className={styles.detailValue}>{project.coordinator || 'N/A'}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Designer:</span>
                                    <span className={styles.detailValue}>{project.designer || 'N/A'}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Site Engineer:</span>
                                    <span className={styles.detailValue}>{project.site_engineer || 'N/A'}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Location:</span>
                                    <span className={styles.detailValue}>{project.location || 'N/A'}</span>
                                </div>
                                <div className={styles.detailItem}>
                                    <span className={styles.detailLabel}>Period:</span>
                                    <span className={styles.detailValue}>
                                        {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'N/A'} - {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'N/A'}
                                    </span>
                                </div>
                                {project.remarks && (
                                    <div className={styles.detailItem}>
                                        <span className={styles.detailLabel}>Remarks:</span>
                                        <p className={styles.remarksText}>{project.remarks}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )) : (
                        <p className={styles.noData}>No projects found. Create your first project above.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectEntry;
