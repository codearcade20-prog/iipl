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
        planning_kickstart: '',
        site_pooja: '',
        office_documentation: '',
        site_measurement: '',
        site_marking: '',
        sample_moodboard: '',
        shop_drawing: '',
        line_drawing: '',
        review_revisions: '',
        shop_drawing_final: '',
        cutting_plan: '',
        finishes_list: '',
        finishes_accessories: '',
        mrf_status: '',
        raw_materials: '',
        long_lead_materials: '',
        production: '',
        cutting_panelling: '',
        assembly: '',
        polishing: '',
        final_finishing: '',
        packing_forwarding: '',
        material_delivery: '',
        site_installation: '',
        site_work: '',
        civil_work: '',
        false_ceiling: '',
        carpentry_work: '',
        painting: '',
        remarks: '',
        file_url: ''
    });

    const currentDate = new Date().toISOString().slice(0, 10);

    useEffect(() => {
        fetchInitialData();
    }, []);

    // Consolidated Auto-calculation for all progress metrics
    useEffect(() => {
        // 1. Calculate Planning & Kick Start Overall (Average of 3 sub-fields)
        const planningSubFields = ['site_pooja', 'office_documentation', 'sample_moodboard'];
        const planningSubValues = planningSubFields.map(f => parseFloat(form[f]) || 0);
        const planningAvg = planningSubValues.reduce((a, b) => a + b, 0) / planningSubFields.length;

        // 2. Calculate Site Work Overall (Average of 4 sub-fields)
        const siteSubFields = ['civil_work', 'false_ceiling', 'carpentry_work', 'painting'];
        const siteSubValues = siteSubFields.map(f => parseFloat(form[f]) || 0);
        const siteWorkAvg = siteSubValues.reduce((a, b) => a + b, 0) / siteSubFields.length;

        // 3. Calculate Production Overall (Average of 5 factory sub-fields)
        const prodSubFields = ['cutting_panelling', 'assembly', 'polishing', 'final_finishing', 'packing_forwarding'];
        const prodSubValues = prodSubFields.map(f => parseFloat(form[f]) || 0);
        const productionAvg = prodSubValues.reduce((a, b) => a + b, 0) / prodSubFields.length;
        
        // 4. Prepare manual main status fields for Overall Completion (Excluding the three calculated ones)
        const manualMainFields = [
            'site_measurement', 'site_marking',
            'shop_drawing', 'line_drawing', 'review_revisions', 'shop_drawing_final', 'cutting_plan',
            'finishes_list', 'finishes_accessories', 'mrf_status', 'raw_materials', 'long_lead_materials',
            'material_delivery', 'site_installation'
        ];
        
        // Sum the 14 manual main fields
        const manualSum = manualMainFields.reduce((acc, field) => acc + (parseFloat(form[field]) || 0), 0);
        
        // Add the 3 calculated averages (Planning, Production, Site Work)
        const totalSum = manualSum + planningAvg + siteWorkAvg + productionAvg;
        const totalAvg = totalSum / 17; // Now dividing by 17 main categories

        // 5. Update form state once with all calculated values
        setForm(prev => ({ 
            ...prev, 
            planning_kickstart: planningAvg.toFixed(2),
            site_work: siteWorkAvg.toFixed(2),
            production: productionAvg.toFixed(2),
            completion_percentage: totalAvg.toFixed(2)
        }));
    }, [
        // Dependencies: all sub-fields and independent main fields
        form.site_pooja, form.office_documentation, form.sample_moodboard,
        form.site_measurement, form.site_marking,
        form.shop_drawing, form.line_drawing, form.review_revisions, form.shop_drawing_final, form.cutting_plan,
        form.finishes_list, form.finishes_accessories, form.mrf_status, form.raw_materials, form.long_lead_materials,
        form.material_delivery, form.site_installation,
        form.civil_work, form.false_ceiling, form.carpentry_work, form.painting,
        form.cutting_panelling, form.assembly, form.polishing, form.final_finishing, form.packing_forwarding
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

    const fetchLatestProjectStatus = async (projectId) => {
        if (!projectId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('project_status_updates')
                .select('*')
                .eq('project_id', projectId)
                .order('updated_at', { ascending: false })
                .limit(1)
                .single();

            if (data) {
                // Pre-fill form with latest data to allow merging updates
                setForm(prev => ({
                    ...prev,
                    ...data,
                    project_id: projectId, // Ensure project_id stays same
                    remarks: '', // Clear remarks for new update
                    file_url: '' // Clear file_url for new update
                }));
                toast("Fetched latest progress for this project.");
            } else {
                // Reset form if no previous data
                setForm(prev => ({
                    ...prev,
                    project_id: projectId,
                    completion_percentage: 0,
                    planning_kickstart: 0, site_pooja: 0, office_documentation: 0,
                    site_measurement: 0, site_marking: 0, sample_moodboard: 0,
                    shop_drawing: 0, line_drawing: 0, review_revisions: 0, shop_drawing_final: 0, cutting_plan: 0,
                    finishes_list: 0, finishes_accessories: 0, mrf_status: 0, raw_materials: 0, long_lead_materials: 0,
                    production: 0, cutting_panelling: 0, assembly: 0, polishing: 0, final_finishing: 0, packing_forwarding: 0,
                    material_delivery: 0, site_installation: 0, site_work: 0,
                    civil_work: 0, false_ceiling: 0, carpentry_work: 0, painting: 0,
                    remarks: '', file_url: ''
                }));
            }
        } catch (error) {
            console.error("Error fetching latest status:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleProjectChange = (projectId) => {
        setForm({ ...form, project_id: projectId });
        if (projectId) {
            fetchLatestProjectStatus(projectId);
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
            'planning_kickstart', 'site_pooja', 'office_documentation', 
            'site_measurement', 'site_marking', 'sample_moodboard',
            'shop_drawing', 'line_drawing', 'review_revisions', 'shop_drawing_final', 'cutting_plan',
            'finishes_list', 'finishes_accessories', 'mrf_status', 'raw_materials', 'long_lead_materials',
            'production', 'cutting_panelling', 'assembly', 'polishing', 'final_finishing', 'packing_forwarding',
            'material_delivery', 'site_installation', 'site_work',
            'civil_work', 'false_ceiling', 'carpentry_work', 'painting'
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
                    planning_kickstart: parseFloat(form.planning_kickstart) || 0,
                    site_pooja: parseFloat(form.site_pooja) || 0,
                    office_documentation: parseFloat(form.office_documentation) || 0,
                    site_measurement: parseFloat(form.site_measurement) || 0,
                    site_marking: parseFloat(form.site_marking) || 0,
                    sample_moodboard: parseFloat(form.sample_moodboard) || 0,
                    shop_drawing: parseFloat(form.shop_drawing) || 0,
                    line_drawing: parseFloat(form.line_drawing) || 0,
                    review_revisions: parseFloat(form.review_revisions) || 0,
                    shop_drawing_final: parseFloat(form.shop_drawing_final) || 0,
                    cutting_plan: parseFloat(form.cutting_plan) || 0,
                    finishes_list: parseFloat(form.finishes_list) || 0,
                    finishes_accessories: parseFloat(form.finishes_accessories) || 0,
                    mrf_status: parseFloat(form.mrf_status) || 0,
                    raw_materials: parseFloat(form.raw_materials) || 0,
                    long_lead_materials: parseFloat(form.long_lead_materials) || 0,
                    production: parseFloat(form.production) || 0,
                    cutting_panelling: parseFloat(form.cutting_panelling) || 0,
                    assembly: parseFloat(form.assembly) || 0,
                    polishing: parseFloat(form.polishing) || 0,
                    final_finishing: parseFloat(form.final_finishing) || 0,
                    packing_forwarding: parseFloat(form.packing_forwarding) || 0,
                    material_delivery: parseFloat(form.material_delivery) || 0,
                    site_installation: parseFloat(form.site_installation) || 0,
                    site_work: parseFloat(form.site_work) || 0,
                    civil_work: parseFloat(form.civil_work) || 0,
                    false_ceiling: parseFloat(form.false_ceiling) || 0,
                    carpentry_work: parseFloat(form.carpentry_work) || 0,
                    painting: parseFloat(form.painting) || 0,
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
                planning_kickstart: '',
                site_pooja: '',
                office_documentation: '',
                site_measurement: '',
                site_marking: '',
                sample_moodboard: '',
                shop_drawing: '',
                line_drawing: '',
                review_revisions: '',
                shop_drawing_final: '',
                cutting_plan: '',
                finishes_list: '',
                finishes_accessories: '',
                mrf_status: '',
                raw_materials: '',
                long_lead_materials: '',
                production: '',
                cutting_panelling: '',
                assembly: '',
                polishing: '',
                final_finishing: '',
                packing_forwarding: '',
                material_delivery: '',
                site_installation: '',
                site_work: '',
                civil_work: '',
                false_ceiling: '',
                carpentry_work: '',
                painting: '',
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
                            onChange={(e) => handleProjectChange(e.target.value)}
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

                    {(!user?.team_role || user.team_role === 'coordinator' || user.team_role === 'admin') && (
                    <div className={styles.section} style={{ gridColumn: 'span 2' }}>
                        <div className={styles.sectionHeader}><User size={18} color="#3b82f6" /> 1. Project Coordinators Team</div>
                        <div className={styles.subGrid}>
                            <div className={styles.nestedGroup}>
                                <div className={styles.nestedHeader}>Planning & Kick Start Breakdown</div>
                                <div className={styles.fieldGroup} style={{ marginBottom: '1.5rem' }}>
                                    <label className={styles.label}>
                                        <span className={styles.labelLong}>Planning & Kick Start (%)</span>
                                        <span className={styles.labelShort}>Planning (%)</span>
                                    </label>
                                    <input type="number" className={`${styles.input} ${styles.readOnlyHighlight}`} value={form.planning_kickstart} readOnly placeholder="Auto-calculated" />
                                </div>
                                <div className={styles.subGrid}>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            <span className={styles.labelLong}>Site Pooja (%)</span>
                                            <span className={styles.labelShort}>Pooja (%)</span>
                                        </label>
                                        <input type="number" className={styles.input} value={form.site_pooja} onChange={(e) => handlePercentageChange('site_pooja', e.target.value)} placeholder="0-100" min="0" max="100" />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            <span className={styles.labelLong}>Office Documentation (%)</span>
                                            <span className={styles.labelShort}>Office Doc (%)</span>
                                        </label>
                                        <input type="number" className={styles.input} value={form.office_documentation} onChange={(e) => handlePercentageChange('office_documentation', e.target.value)} placeholder="0-100" min="0" max="100" />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            <span className={styles.labelLong}>Sample Arr. (Moodboard) (%)</span>
                                            <span className={styles.labelShort}>Moodboard (%)</span>
                                        </label>
                                        <input type="number" className={styles.input} value={form.sample_moodboard} onChange={(e) => handlePercentageChange('sample_moodboard', e.target.value)} placeholder="0-100" min="0" max="100" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    )}

                    {(!user?.team_role || user.team_role === 'design' || user.team_role === 'admin') && (
                    <div className={styles.section} style={{ gridColumn: 'span 2' }}>
                        <div className={styles.sectionHeader}><Percent size={18} color="#10b981" /> 2. Design Team</div>
                        <div className={styles.subGrid}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    <span className={styles.labelLong}>Shop Drawing (Initial) (%)</span>
                                    <span className={styles.labelShort}>Shop Drw (I) (%)</span>
                                </label>
                                <input type="number" className={styles.input} value={form.shop_drawing} onChange={(e) => handlePercentageChange('shop_drawing', e.target.value)} placeholder="0-100" min="0" max="100" />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    <span className={styles.labelLong}>Line Drawing (%)</span>
                                    <span className={styles.labelShort}>Line Drw (%)</span>
                                </label>
                                <input type="number" className={styles.input} value={form.line_drawing} onChange={(e) => handlePercentageChange('line_drawing', e.target.value)} placeholder="0-100" min="0" max="100" />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    <span className={styles.labelLong}>Review & Revisions (%)</span>
                                    <span className={styles.labelShort}>Review (%)</span>
                                </label>
                                <input type="number" className={styles.input} value={form.review_revisions} onChange={(e) => handlePercentageChange('review_revisions', e.target.value)} placeholder="0-100" min="0" max="100" />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    <span className={styles.labelLong}>Shop Drawing (Final) (%)</span>
                                    <span className={styles.labelShort}>Shop Drw (F) (%)</span>
                                </label>
                                <input type="number" className={styles.input} value={form.shop_drawing_final} onChange={(e) => handlePercentageChange('shop_drawing_final', e.target.value)} placeholder="0-100" min="0" max="100" />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    <span className={styles.labelLong}>Cutting Plan (%)</span>
                                    <span className={styles.labelShort}>Cutting Plan (%)</span>
                                </label>
                                <input type="number" className={styles.input} value={form.cutting_plan} onChange={(e) => handlePercentageChange('cutting_plan', e.target.value)} placeholder="0-100" min="0" max="100" />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    <span className={styles.labelLong}>Finishes List (%)</span>
                                    <span className={styles.labelShort}>Finishes (%)</span>
                                </label>
                                <input type="number" className={styles.input} value={form.finishes_list} onChange={(e) => handlePercentageChange('finishes_list', e.target.value)} placeholder="0-100" min="0" max="100" />
                            </div>
                        </div>
                    </div>
                    )}

                    {(!user?.team_role || user.team_role === 'purchase' || user.team_role === 'admin') && (
                    <div className={styles.section} style={{ gridColumn: 'span 2' }}>
                        <div className={styles.sectionHeader}><Percent size={18} color="#8b5cf6" /> 3. Purchase Team</div>
                        <div className={styles.subGrid}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    <span className={styles.labelLong}>MRF Status (%)</span>
                                    <span className={styles.labelShort}>MRF (%)</span>
                                </label>
                                <input type="number" className={styles.input} value={form.mrf_status} onChange={(e) => handlePercentageChange('mrf_status', e.target.value)} placeholder="0-100" min="0" max="100" />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    <span className={styles.labelLong}>Raw Materials (%)</span>
                                    <span className={styles.labelShort}>Raw Mat (%)</span>
                                </label>
                                <input type="number" className={styles.input} value={form.raw_materials} onChange={(e) => handlePercentageChange('raw_materials', e.target.value)} placeholder="0-100" min="0" max="100" />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    <span className={styles.labelLong}>Long Lead Materials (%)</span>
                                    <span className={styles.labelShort}>Long Lead (%)</span>
                                </label>
                                <input type="number" className={styles.input} value={form.long_lead_materials} onChange={(e) => handlePercentageChange('long_lead_materials', e.target.value)} placeholder="0-100" min="0" max="100" />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    <span className={styles.labelLong}>Finishes & Accessories (%)</span>
                                    <span className={styles.labelShort}>Accessories (%)</span>
                                </label>
                                <input type="number" className={styles.input} value={form.finishes_accessories} onChange={(e) => handlePercentageChange('finishes_accessories', e.target.value)} placeholder="0-100" min="0" max="100" />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    <span className={styles.labelLong}>Material Delivery (%)</span>
                                    <span className={styles.labelShort}>Delivery (%)</span>
                                </label>
                                <input type="number" className={styles.input} value={form.material_delivery} onChange={(e) => handlePercentageChange('material_delivery', e.target.value)} placeholder="0-100" min="0" max="100" />
                            </div>
                        </div>
                    </div>
                    )}

                    {(!user?.team_role || user.team_role === 'factory' || user.team_role === 'admin') && (
                    <div className={styles.section} style={{ gridColumn: 'span 2' }}>
                        <div className={styles.sectionHeader}><Percent size={18} color="#f59e0b" /> 4. Factory Team</div>
                        <div className={styles.subGrid}>
                            <div className={styles.nestedGroup}>
                                <div className={styles.nestedHeader}>Factory Production Breakdown</div>
                                <div className={styles.fieldGroup} style={{ marginBottom: '1.5rem' }}>
                                    <label className={styles.label}>
                                        <span className={styles.labelLong}>Production Overall (%)</span>
                                        <span className={styles.labelShort}>Production (%)</span>
                                    </label>
                                    <input type="number" className={`${styles.input} ${styles.readOnlyHighlight}`} value={form.production} readOnly placeholder="Auto-calculated" />
                                </div>
                                <div className={styles.subGrid}>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            <span className={styles.labelLong}>Cutting/Panelling (%)</span>
                                            <span className={styles.labelShort}>Cutting (%)</span>
                                        </label>
                                        <input type="number" className={styles.input} value={form.cutting_panelling} onChange={(e) => handlePercentageChange('cutting_panelling', e.target.value)} placeholder="0-100" min="0" max="100" />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            <span className={styles.labelLong}>Assembly (%)</span>
                                            <span className={styles.labelShort}>Assembly (%)</span>
                                        </label>
                                        <input type="number" className={styles.input} value={form.assembly} onChange={(e) => handlePercentageChange('assembly', e.target.value)} placeholder="0-100" min="0" max="100" />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            <span className={styles.labelLong}>Polishing (%)</span>
                                            <span className={styles.labelShort}>Polishing (%)</span>
                                        </label>
                                        <input type="number" className={styles.input} value={form.polishing} onChange={(e) => handlePercentageChange('polishing', e.target.value)} placeholder="0-100" min="0" max="100" />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            <span className={styles.labelLong}>Final Finishing (%)</span>
                                            <span className={styles.labelShort}>Finishing (%)</span>
                                        </label>
                                        <input type="number" className={styles.input} value={form.final_finishing} onChange={(e) => handlePercentageChange('final_finishing', e.target.value)} placeholder="0-100" min="0" max="100" />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            <span className={styles.labelLong}>Packing & Forwarding (%)</span>
                                            <span className={styles.labelShort}>Packing (%)</span>
                                        </label>
                                        <input type="number" className={styles.input} value={form.packing_forwarding} onChange={(e) => handlePercentageChange('packing_forwarding', e.target.value)} placeholder="0-100" min="0" max="100" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    )}

                    {(!user?.team_role || user.team_role === 'site_engineers' || user.team_role === 'admin') && (
                    <div className={styles.section} style={{ gridColumn: 'span 2' }}>
                        <div className={styles.sectionHeader}><Percent size={18} color="#06b6d4" /> 5. Site Engineers Team</div>
                        <div className={styles.subGrid}>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    <span className={styles.labelLong}>Site Measurement (%)</span>
                                    <span className={styles.labelShort}>Measurement (%)</span>
                                </label>
                                <input type="number" className={styles.input} value={form.site_measurement} onChange={(e) => handlePercentageChange('site_measurement', e.target.value)} placeholder="0-100" min="0" max="100" />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    <span className={styles.labelLong}>Site Marking (%)</span>
                                    <span className={styles.labelShort}>Marking (%)</span>
                                </label>
                                <input type="number" className={styles.input} value={form.site_marking} onChange={(e) => handlePercentageChange('site_marking', e.target.value)} placeholder="0-100" min="0" max="100" />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    <span className={styles.labelLong}>Site Installation (%)</span>
                                    <span className={styles.labelShort}>Installation (%)</span>
                                </label>
                                <input type="number" className={styles.input} value={form.site_installation} onChange={(e) => handlePercentageChange('site_installation', e.target.value)} placeholder="0-100" min="0" max="100" />
                            </div>
                            
                            <div className={styles.nestedGroup}>
                                <div className={styles.nestedHeader}>Site Work Status Breakdown</div>
                                <div className={styles.fieldGroup} style={{ marginBottom: '1.5rem' }}>
                                    <label className={styles.label}>
                                        <span className={styles.labelLong}>Site Work Overall (%)</span>
                                        <span className={styles.labelShort}>Site Work (%)</span>
                                    </label>
                                    <input type="number" className={`${styles.input} ${styles.readOnlyHighlight}`} value={form.site_work} readOnly placeholder="Auto-calculated" />
                                </div>
                                <div className={styles.subGrid}>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            <span className={styles.labelLong}>Civil Work (%)</span>
                                            <span className={styles.labelShort}>Civil (%)</span>
                                        </label>
                                        <input type="number" className={styles.input} value={form.civil_work} onChange={(e) => handlePercentageChange('civil_work', e.target.value)} placeholder="0-100" min="0" max="100" />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            <span className={styles.labelLong}>False Ceiling (%)</span>
                                            <span className={styles.labelShort}>Ceiling (%)</span>
                                        </label>
                                        <input type="number" className={styles.input} value={form.false_ceiling} onChange={(e) => handlePercentageChange('false_ceiling', e.target.value)} placeholder="0-100" min="0" max="100" />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            <span className={styles.labelLong}>Carpentry Work (%)</span>
                                            <span className={styles.labelShort}>Carpentry (%)</span>
                                        </label>
                                        <input type="number" className={styles.input} value={form.carpentry_work} onChange={(e) => handlePercentageChange('carpentry_work', e.target.value)} placeholder="0-100" min="0" max="100" />
                                    </div>
                                    <div className={styles.fieldGroup}>
                                        <label className={styles.label}>
                                            <span className={styles.labelLong}>Painting (%)</span>
                                            <span className={styles.labelShort}>Painting (%)</span>
                                        </label>
                                        <input type="number" className={styles.input} value={form.painting} onChange={(e) => handlePercentageChange('painting', e.target.value)} placeholder="0-100" min="0" max="100" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    )}

                    <div className={styles.section} style={{ gridColumn: 'span 2', background: '#eff6ff' }}>
                        <div className={styles.fieldGroup}>
                            <label className={styles.label} style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e40af' }}>
                                <Percent size={18} /> 
                                <span className={styles.labelLong}>Overall Project Completion (%)</span>
                                <span className={styles.labelShort}>Overall (%)</span>
                            </label>
                            <input 
                                type="number" 
                                className={`${styles.input} ${styles.readOnlyHighlight}`} 
                                style={{ fontSize: '1.25rem', height: '4rem' }}
                                value={form.completion_percentage} 
                                readOnly
                                placeholder="Auto-calculated"
                            />
                        </div>
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
                                    <div className={styles.breakdownItem}><span style={{ color: '#3b82f6' }}>Coordinator:</span></div>
                                    <div className={styles.breakdownItem}><span>Planning & Kick Start:</span> <strong>{update.planning_kickstart}%</strong></div>
                                    <div className={styles.breakdownItem}><span>— Site Pooja:</span> <strong>{update.site_pooja}%</strong></div>
                                    <div className={styles.breakdownItem}><span>— Office Doc:</span> <strong>{update.office_documentation}%</strong></div>
                                    <div className={styles.breakdownItem}><span>— Sample Moodboard:</span> <strong>{update.sample_moodboard}%</strong></div>
                                    <div className={styles.breakdownItem}><span style={{ color: '#10b981' }}>Design:</span></div>
                                    <div className={styles.breakdownItem}><span>Shop Drw (I):</span> <strong>{update.shop_drawing}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Line Drawing:</span> <strong>{update.line_drawing}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Review & Rev:</span> <strong>{update.review_revisions}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Shop Drw (F):</span> <strong>{update.shop_drawing_final}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Cutting Plan:</span> <strong>{update.cutting_plan}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Finishes List:</span> <strong>{update.finishes_list}%</strong></div>
                                    <div className={styles.breakdownItem}><span style={{ color: '#8b5cf6' }}>Purchase:</span></div>
                                    <div className={styles.breakdownItem}><span>MRF Status:</span> <strong>{update.mrf_status}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Raw Materials:</span> <strong>{update.raw_materials}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Long Lead Mat:</span> <strong>{update.long_lead_materials}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Accessories:</span> <strong>{update.finishes_accessories}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Mat Delivery:</span> <strong>{update.material_delivery}%</strong></div>
                                    <div className={styles.breakdownItem}><span style={{ color: '#f59e0b' }}>Factory:</span></div>
                                    <div className={styles.breakdownItem}><span>Production (O):</span> <strong>{update.production}%</strong></div>
                                    <div className={styles.breakdownItem}><span style={{ color: '#06b6d4' }}>Site:</span></div>
                                    <div className={styles.breakdownItem}><span>Measurement:</span> <strong>{update.site_measurement}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Marking:</span> <strong>{update.site_marking}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Installation:</span> <strong>{update.site_installation}%</strong></div>
                                    <div className={styles.breakdownItem}><span>Site Work (O):</span> <strong>{update.site_work}%</strong></div>
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
