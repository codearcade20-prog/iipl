import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Calendar, LayoutDashboard, Percent, Link as LinkIcon, MessageSquare, User, Clock, CheckCircle, Trash2 } from 'lucide-react';
import { useMessage } from '../context/MessageContext';
import LoadingScreen from '../components/LoadingScreen';
import styles from './ProjectStatusUpdate.module.css';

const ProjectStatusUpdate = () => {
    const { user } = useAuth();
    const { alert, confirm, toast } = useMessage();
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [updates, setUpdates] = useState([]);
    const [form, setForm] = useState({
        project_id: '',
        completion_percentage: '',
        site_measurement: '',
        site_marking: '',
        finishes_list: '',
        mrf_status: '',
        shop_drawing: '',
        production: '',
        material_delivery: '',
        site_installation: '',
        site_work: '',
        remarks: '',
        file_url: ''
    });

    const currentDate = new Date().toISOString().slice(0, 10);

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        const fields = [
            'site_measurement', 'site_marking', 'finishes_list', 
            'mrf_status', 'shop_drawing', 'production', 
            'material_delivery', 'site_installation', 'site_work'
        ];
        
        const sum = fields.reduce((acc, field) => acc + (parseFloat(form[field]) || 0), 0);
        const average = (sum / fields.length).toFixed(2);
        
        setForm(prev => ({ ...prev, completion_percentage: average }));
    }, [
        form.site_measurement, form.site_marking, form.finishes_list,
        form.mrf_status, form.shop_drawing, form.production,
        form.material_delivery, form.site_installation, form.site_work
    ]);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const { data: projData } = await supabase.from('projects').select('id, name').order('name');
            setProjects(projData || []);
            
            const { data: updateData } = await supabase
                .from('project_status_updates')
                .select('*, projects(name)')
                .order('updated_at', { ascending: false });
            setUpdates(updateData || []);
        } catch (error) {
            console.error("Error fetching initial data:", error);
            alert("Failed to load project updates.");
        } finally {
            setLoading(false);
        }
    };

    const handlePercentageChange = (field, value) => {
        let val = value === '' ? '' : parseFloat(value);
        if (val !== '' && val > 100) val = 100;
        if (val !== '' && val < 0) val = 0;
        setForm({ ...form, [field]: val === '' ? '' : val.toString() });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.project_id) {
            toast("Please select a project");
            return;
        }

        const percentageFields = [
            'site_measurement', 'site_marking', 'finishes_list', 
            'mrf_status', 'shop_drawing', 'production', 
            'material_delivery', 'site_installation', 'site_work'
        ];

        for (const field of percentageFields) {
            const val = parseFloat(form[field]) || 0;
            if (val < 0 || val > 100) {
                toast(`Invalid value for ${field.replace(/_/g, ' ')}. Must be between 0-100.`);
                return;
            }
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('project_status_updates')
                .insert([{
                    project_id: form.project_id,
                    status_date: currentDate,
                    completion_percentage: parseFloat(form.completion_percentage),
                    site_measurement: parseFloat(form.site_measurement) || 0,
                    site_marking: parseFloat(form.site_marking) || 0,
                    finishes_list: parseFloat(form.finishes_list) || 0,
                    mrf_status: parseFloat(form.mrf_status) || 0,
                    shop_drawing: parseFloat(form.shop_drawing) || 0,
                    production: parseFloat(form.production) || 0,
                    material_delivery: parseFloat(form.material_delivery) || 0,
                    site_installation: parseFloat(form.site_installation) || 0,
                    site_work: parseFloat(form.site_work) || 0,
                    remarks: form.remarks,
                    file_url: form.file_url,
                    username: user?.username || 'System',
                    updated_at: new Date().toISOString()
                }]);

            if (error) throw error;
            
            toast("Status update recorded successfully!");
            setForm({
                project_id: '',
                completion_percentage: '',
                site_measurement: '',
                site_marking: '',
                finishes_list: '',
                mrf_status: '',
                shop_drawing: '',
                production: '',
                material_delivery: '',
                site_installation: '',
                site_work: '',
                remarks: '',
                file_url: ''
            });
            fetchInitialData();
        } catch (error) {
            console.error("Error saving status update:", error);
            alert("Failed to save status update: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!await confirm("Delete this status update?")) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('project_status_updates')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast("Update deleted.");
            fetchInitialData();
        } catch (error) {
            console.error("Error deleting update:", error);
            alert("Failed to delete update.");
        } finally {
            setLoading(false);
        }
    };

    if (loading && updates.length === 0) return <LoadingScreen message="Loading updates..." />;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Project Status Update</h1>
                <p className={styles.subtitle}>Post daily progress and completion percentages</p>
            </header>

            <form className={styles.formCard} onSubmit={handleSubmit}>
                <div className={styles.formGrid}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><LayoutDashboard size={14} /> Project Selection</label>
                        <select 
                            className={styles.select}
                            value={form.project_id}
                            onChange={(e) => setForm({...form, project_id: e.target.value})}
                            required
                        >
                            <option value="">Select a Project</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Calendar size={14} /> Update Date</label>
                        <input 
                            type="text" 
                            className={styles.input} 
                            value={currentDate} 
                            readOnly 
                            title="Current date is automatically selected"
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Percent size={14} /> Site Measurement (%)</label>
                        <input type="number" className={styles.input} value={form.site_measurement} onChange={(e) => handlePercentageChange('site_measurement', e.target.value)} placeholder="0-100" min="0" max="100" />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Percent size={14} /> Site Marking Status (%)</label>
                        <input type="number" className={styles.input} value={form.site_marking} onChange={(e) => handlePercentageChange('site_marking', e.target.value)} placeholder="0-100" min="0" max="100" />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Percent size={14} /> Finishes List Status (%)</label>
                        <input type="number" className={styles.input} value={form.finishes_list} onChange={(e) => handlePercentageChange('finishes_list', e.target.value)} placeholder="0-100" min="0" max="100" />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Percent size={14} /> MRF Status (%)</label>
                        <input type="number" className={styles.input} value={form.mrf_status} onChange={(e) => handlePercentageChange('mrf_status', e.target.value)} placeholder="0-100" min="0" max="100" />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Percent size={14} /> Shop Drawing (%)</label>
                        <input type="number" className={styles.input} value={form.shop_drawing} onChange={(e) => handlePercentageChange('shop_drawing', e.target.value)} placeholder="0-100" min="0" max="100" />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Percent size={14} /> Production (%)</label>
                        <input type="number" className={styles.input} value={form.production} onChange={(e) => handlePercentageChange('production', e.target.value)} placeholder="0-100" min="0" max="100" />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Percent size={14} /> Material Delivery (%)</label>
                        <input type="number" className={styles.input} value={form.material_delivery} onChange={(e) => handlePercentageChange('material_delivery', e.target.value)} placeholder="0-100" min="0" max="100" />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Percent size={14} /> Site Installation (%)</label>
                        <input type="number" className={styles.input} value={form.site_installation} onChange={(e) => handlePercentageChange('site_installation', e.target.value)} placeholder="0-100" min="0" max="100" />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Percent size={14} /> Site Work (%)</label>
                        <input type="number" className={styles.input} value={form.site_work} onChange={(e) => handlePercentageChange('site_work', e.target.value)} placeholder="0-100" min="0" max="100" />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><Percent size={14} /> Overall Work Completion (%)</label>
                        <input 
                            type="number" 
                            className={styles.input} 
                            value={form.completion_percentage} 
                            readOnly
                            placeholder="Auto-calculated"
                        />
                    </div>

                    <div className={styles.fieldGroup}>
                        <label className={styles.label}><LinkIcon size={14} /> File Attachment URL</label>
                        <input 
                            type="url" 
                            className={styles.input} 
                            value={form.file_url} 
                            onChange={(e) => setForm({...form, file_url: e.target.value})} 
                            placeholder="https://..."
                        />
                    </div>

                    <div className={styles.fieldGroup} style={{ gridColumn: 'span 2' }}>
                        <label className={styles.label}><MessageSquare size={14} /> Progress Remarks</label>
                        <textarea 
                            className={styles.textarea} 
                            value={form.remarks} 
                            onChange={(e) => setForm({...form, remarks: e.target.value})} 
                            placeholder="Describe current status and activities"
                            rows={3}
                        />
                    </div>
                </div>

                <div className={styles.userStamp}>
                    <div className={styles.stampItem}>
                        <User size={14} /> <span>Updating as: <strong>{user?.username}</strong></span>
                    </div>
                    <div className={styles.stampItem}>
                        <Clock size={14} /> <span>Time: {new Date().toLocaleTimeString()}</span>
                    </div>
                </div>

                <div className={styles.formActions}>
                    <button type="submit" className={styles.submitBtn} disabled={loading}>
                        <CheckCircle size={18} /> {loading ? 'Posting...' : 'Post Status Update'}
                    </button>
                </div>
            </form>

            <div className={styles.historySection}>
                <h2 className={styles.sectionTitle}>Recent Status Updates</h2>
                <div className={styles.updateList}>
                    {updates.length > 0 ? updates.map(update => (
                        <div key={update.id} className={styles.updateCard}>
                            <div className={styles.updateHeader}>
                                <div>
                                    <h3 className={styles.projectTitle}>{update.projects?.name}</h3>
                                    <span className={styles.updateDate}>{new Date(update.status_date).toLocaleDateString()}</span>
                                </div>
                                <div className={styles.percentageBadge}>
                                    {update.completion_percentage}% Done
                                </div>
                            </div>
                            <div className={styles.updateBody}>
                                <div className={styles.breakdownGrid}>
                                    <div className={styles.breakdownItem}><span>Site Measurement:</span> <strong>{update.site_measurement}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Site Marking:</span> <strong>{update.site_marking}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Finishes List:</span> <strong>{update.finishes_list}%</strong></div>
                                    <div className={styles.breakdownItem}><span>MRF Status:</span> <strong>{update.mrf_status}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Shop Drawing:</span> <strong>{update.shop_drawing}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Production:</span> <strong>{update.production}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Material Delivery:</span> <strong>{update.material_delivery}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Site Installation:</span> <strong>{update.site_installation}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Site Work:</span> <strong>{update.site_work}%</strong></div>
                                </div>
                                <p className={styles.remarks}>{update.remarks || 'No remarks provided'}</p>
                                {update.file_url && (
                                    <a href={update.file_url} target="_blank" rel="noreferrer" className={styles.fileLink}>
                                        <LinkIcon size={14} /> View Attachment
                                    </a>
                                )}
                            </div>
                            <div className={styles.updateFooter}>
                                <div className={styles.footerInfo}>
                                    <span>Updated by: {update.username}</span>
                                    <span>{new Date(update.updated_at).toLocaleTimeString()}</span>
                                </div>
                                <button className={styles.deleteBtn} onClick={() => handleDelete(update.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    )) : (
                        <p className={styles.noData}>No status updates found yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectStatusUpdate;
