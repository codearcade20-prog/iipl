import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Calendar, LayoutDashboard, Percent, Link as LinkIcon, MessageSquare, User, Clock, CheckCircle, Trash2, Save, AlertCircle, History, Send, CheckCircle2, TrendingUp, ChevronRight, Eye, X } from 'lucide-react';
import { useMessage } from '../context/MessageContext';
import LoadingScreen from '../components/LoadingScreen';
import styles from './ProjectStatusUpdate.module.css';

const ProjectStatusUpdate = () => {
    const { user } = useAuth();
    const { alert, confirm, toast } = useMessage();
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [updates, setUpdates] = useState([]);
    const [initialMasterStatus, setInitialMasterStatus] = useState(null); // Reference point for regression check
    const [viewingUpdate, setViewingUpdate] = useState(null); // For history detail view
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
        mrf_approval: '',
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
            'shop_drawing', 'line_drawing', 'review_revisions', 'mrf_approval', 'shop_drawing_final', 'cutting_plan',
            'finishes_list', 'finishes_accessories', 'mrf_status', 'raw_materials', 'long_lead_materials',
            'material_delivery', 'site_installation'
        ];
        
        // Sum the 15 manual main fields
        const manualSum = manualMainFields.reduce((acc, field) => acc + (parseFloat(form[field]) || 0), 0);
        
        // Add the 3 calculated averages (Planning, Production, Site Work)
        const totalSum = manualSum + planningAvg + siteWorkAvg + productionAvg;
        const totalAvg = totalSum / 18; // Now dividing by 18 main categories

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
        form.shop_drawing, form.line_drawing, form.review_revisions, form.mrf_approval, form.shop_drawing_final, form.cutting_plan,
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
            // READ from the Master Table (Absolute Reality)
            const { data, error } = await supabase
                .from('project_current_status')
                .select('*')
                .eq('project_id', projectId)
                .single();

            if (data) {
                setInitialMasterStatus(data);
                // Pre-fill form with the master state (no more regressions)
                setForm(prev => ({
                    ...prev,
                    ...data,
                    remarks: '', // Keep remarks empty for new activities
                    file_url: '' // Keep file_url empty for new entry
                }));
                toast("Fetched master progress for this project.");
            } else {
                setInitialMasterStatus(null);
                // If no master status yet, we start fresh
                setForm(prev => ({
                    ...prev,
                    project_id: projectId,
                    completion_percentage: 0,
                    planning_kickstart: 0, site_pooja: 0, office_documentation: 0,
                    site_measurement: 0, site_marking: 0, sample_moodboard: 0,
                    shop_drawing: 0, line_drawing: 0, review_revisions: 0, mrf_approval: 0, shop_drawing_final: 0, cutting_plan: 0,
                    finishes_list: 0, finishes_accessories: 0, mrf_status: 0, raw_materials: 0, long_lead_materials: 0,
                    production: 0, cutting_panelling: 0, assembly: 0, polishing: 0, final_finishing: 0, packing_forwarding: 0,
                    material_delivery: 0, site_installation: 0, site_work: 0,
                    civil_work: 0, false_ceiling: 0, carpentry_work: 0, painting: 0,
                    remarks: '', file_url: ''
                }));
            }
        } catch (error) {
            console.error("Error fetching master status:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleProjectChange = (projectId) => {
        setForm(prev => ({ ...prev, project_id: projectId }));
        if (projectId) {
            fetchLatestProjectStatus(projectId);
        }
    };

    const handlePercentageChange = (field, value) => {
        setForm(prev => {
            let val = value === '' ? '' : parseFloat(value);
            if (val !== '' && val > 100) val = 100;
            if (val !== '' && val < 0) val = 0;

            // 1. MRF Status (Purchase) capped by MRF Approval (Design)
            if (field === 'mrf_status') {
                const limit = parseFloat(prev.mrf_approval) || 0;
                if (val !== '' && val > limit) val = limit;
            }

            // 2. Cutting Plan (Design) capped by Shop Drawing Final (Design)
            if (field === 'cutting_plan') {
                const limit = parseFloat(prev.shop_drawing_final) || 0;
                if (val !== '' && val > limit) val = limit;
            }

            // 3. Factory Sub-fields capped by Cutting Plan (Design)
            const factoryFields = ['cutting_panelling', 'assembly', 'polishing', 'final_finishing', 'packing_forwarding'];
            if (factoryFields.includes(field)) {
                const limit = parseFloat(prev.cutting_plan) || 0;
                if (val !== '' && val > limit) val = limit;
            }

            // 4. Site Installation capped by Material Delivery
            if (field === 'site_installation') {
                const limit = parseFloat(prev.material_delivery) || 0;
                if (val !== '' && val > limit) val = limit;
            }

            return { ...prev, [field]: val === '' ? '' : val.toString() };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 1. REGRESSION VALIDATION (No-Decrease Rule)
        if (initialMasterStatus) {
            const fieldsToValidate = [
                'completion_percentage', 'planning_kickstart', 'site_pooja', 'office_documentation',
                'site_measurement', 'site_marking', 'sample_moodboard', 'shop_drawing',
                'line_drawing', 'review_revisions', 'mrf_approval', 'shop_drawing_final', 'cutting_plan',
                'finishes_list', 'finishes_accessories', 'mrf_status', 'raw_materials',
                'long_lead_materials', 'production', 'cutting_panelling', 'assembly',
                'polishing', 'final_finishing', 'packing_forwarding', 'material_delivery',
                'site_installation', 'site_work', 'civil_work', 'false_ceiling',
                'carpentry_work', 'painting'
            ];

            const isAdmin = user?.team_role === 'admin';
            let regressionFound = false;
            let regressionField = '';
            let oldVal = 0;
            let newVal = 0;

            for (const field of fieldsToValidate) {
                const curNew = parseFloat(form[field]) || 0;
                const curOld = parseFloat(initialMasterStatus[field]) || 0;
                
                if (curNew < curOld) {
                    regressionFound = true;
                    regressionField = field.replace(/_/g, ' ').toUpperCase();
                    oldVal = curOld;
                    newVal = curNew;
                    break;
                }
            }

            if (regressionFound) {
                if (isAdmin) {
                    const confirmBypass = await confirm(
                        `Administrative Override: You are decreasing "${regressionField}" from ${oldVal}% to ${newVal}%. \n\nStandard users are blocked from decreasing progress. Are you sure this is a necessary correction?`,
                        { title: "Bypass Validation", okText: "Yes, Override", cancelText: "Cancel" }
                    );
                    if (!confirmBypass) {
                        setLoading(false);
                        return;
                    }
                } else {
                    alert(`Invalid Entry: "${regressionField}" cannot be decreased from ${oldVal}% to ${newVal}%. Progress must only go forward.`);
                    setLoading(false);
                    return;
                }
            }
        }

        // 2. LOGICAL DEPENDENCY VALIDATIONS (Hard Gates)
        const v = (f) => parseFloat(form[f]) || 0;

        // MRF Purchase Gate
        if (v('mrf_status') > v('mrf_approval')) {
            alert(`Dependency Error: MRF Purchase (${v('mrf_status')}%) cannot exceed Design Approval (${v('mrf_approval')}%).`);
            setLoading(false); return;
        }

        // Design to Production Gate
        if (v('cutting_plan') > v('shop_drawing_final')) {
            alert(`Dependency Error: Cutting Plan (${v('cutting_plan')}%) cannot progress beyond Final Shop Drawings (${v('shop_drawing_final')}%).`);
            setLoading(false); return;
        }

        // Factory Gate
        if (v('cutting_panelling') > v('cutting_plan')) {
            alert(`Dependency Error: Factory Production cannot start/exceed the Cutting Plan attainment (${v('cutting_plan')}%).`);
            setLoading(false); return;
        }

        // Site Logistics Gate
        if (v('site_installation') > v('material_delivery')) {
            alert(`Dependency Error: Site Installation (${v('site_installation')}%) cannot exceed Material Delivery (${v('material_delivery')}%).`);
            setLoading(false); return;
        }

        if (!form.project_id) {
            toast("Please select a project");
            return;
        }

        const percentageFields = [
            'planning_kickstart', 'site_pooja', 'office_documentation', 
            'site_measurement', 'site_marking', 'sample_moodboard',
            'shop_drawing', 'line_drawing', 'review_revisions', 'mrf_approval', 'shop_drawing_final', 'cutting_plan',
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
            const role = user?.team_role || 'admin';
            const username = user?.username || 'System';
            const now = new Date().toISOString();

            const updatePayload = {
                project_id: form.project_id,
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
                mrf_approval: parseFloat(form.mrf_approval) || 0,
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
                last_updated_by: username,
                updated_at: now
            };

            // INTELLIGENT TEAM TAGGING: Only update the metadata for the user's specific section
            if (role === 'coordinator' || role === 'admin') {
                updatePayload.coord_updated_by = username;
                updatePayload.coord_updated_at = now;
            }
            if (role === 'design' || role === 'admin') {
                updatePayload.design_updated_by = username;
                updatePayload.design_updated_at = now;
            }
            if (role === 'purchase' || role === 'admin') {
                updatePayload.purchase_updated_by = username;
                updatePayload.purchase_updated_at = now;
            }
            if (role === 'factory' || role === 'admin') {
                updatePayload.factory_updated_by = username;
                updatePayload.factory_updated_at = now;
            }
            if (role === 'site_engineers' || role === 'admin') {
                updatePayload.site_updated_by = username;
                updatePayload.site_updated_at = now;
            }

            // 1. UPDATE Master Reality (UPSERT)
            const { error: masterError } = await supabase
                .from('project_current_status')
                .upsert([updatePayload]);
            
            if (masterError) throw masterError;

            // 2. INSERT into History Log (for Audit/MD feed)
            const { error: historyError } = await supabase
                .from('project_status_updates')
                .insert([{
                    ...updatePayload,
                    status_date: currentDate,
                    username: username
                }]);

            if (historyError) throw historyError;
            
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
                mrf_approval: '',
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
                                    <span className={styles.labelLong}>MRF Approval (%)</span>
                                    <span className={styles.labelShort}>MRF Appr. (%)</span>
                                </label>
                                <input type="number" className={styles.input} value={form.mrf_approval} onChange={(e) => handlePercentageChange('mrf_approval', e.target.value)} placeholder="0-100" min="0" max="100" />
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
                                    <span className={styles.labelLong}>MRF Approval (Locked) (%)</span>
                                    <span className={styles.labelShort}>Approval (%)</span>
                                </label>
                                <input type="number" className={`${styles.input} ${styles.readOnlyHighlight}`} value={form.mrf_approval || 0} readOnly placeholder="0-100" />
                            </div>
                            <div className={styles.fieldGroup}>
                                <label className={styles.label}>
                                    <span className={styles.labelLong}>MRF Status ({form.mrf_approval || 0}% Approved)</span>
                                    <span className={styles.labelShort}>MRF ({form.mrf_approval || 0}% Appr.)</span>
                                </label>
                                <input 
                                    type="number" 
                                    className={styles.input} 
                                    value={form.mrf_status} 
                                    onChange={(e) => handlePercentageChange('mrf_status', e.target.value)} 
                                    placeholder={`Approved Limit: ${form.mrf_approval || 0}%`} 
                                    min="0" 
                                    max={form.mrf_approval || 0} 
                                />
                                <span style={{ fontSize: '0.7rem', color: '#6366f1', marginTop: '4px', fontWeight: '500' }}>
                                    Design has approved {form.mrf_approval || 0}%. Enter a value between 0-{form.mrf_approval || 0}.
                                </span>
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

                    {(user?.team_role === 'admin' || user?.team_role === 'coordinator' || !user?.team_role) && (
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
                    )}

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
                <div className={styles.tableWrapper}>
                    <table className={styles.historyTable}>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Project Name</th>
                                {(user?.team_role === 'admin' || user?.team_role === 'coordinator' || !user?.team_role) && <th>Overall</th>}
                                <th>Updated By</th>
                                <th>Remarks</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {updates.length > 0 ? updates.map(update => (
                                <tr key={update.id}>
                                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(update.status_date).toLocaleDateString()}</td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{update.projects?.name}</div>
                                    </td>
                                    {(user?.team_role === 'admin' || user?.team_role === 'coordinator' || !user?.team_role) && (
                                        <td>
                                            <div className={styles.tableProgress}>
                                                <div className={styles.pBar}><div style={{ width: `${update.completion_percentage}%` }}></div></div>
                                                <span>{update.completion_percentage}%</span>
                                            </div>
                                        </td>
                                    )}
                                    <td>
                                        <div style={{ textTransform: 'capitalize', fontSize: '0.85rem' }}>{update.username || 'System'}</div>
                                    </td>
                                    <td>
                                        <div className={styles.remarksCell} title={update.remarks}>
                                            {update.remarks || '-'}
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.actionGroup}>
                                            <button className={styles.viewBtn} onClick={() => setViewingUpdate(update)} title="View Details">
                                                <Eye size={16} />
                                            </button>
                                            {user?.team_role === 'admin' && (
                                                <button className={styles.deleteBtn} onClick={() => handleDelete(update.id)} title="Delete Record">
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} style={{ textAlign: 'center', padding: '2rem' }}>No status updates found</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* History Detail Modal */}
            {viewingUpdate && (
                <div className={styles.modalOverlay} onClick={() => setViewingUpdate(null)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <header className={styles.modalHeader}>
                            <div>
                                <h2 className={styles.modalTitle}>{viewingUpdate.projects?.name}</h2>
                                <p className={styles.modalSubtitle}>History Record: {new Date(viewingUpdate.status_date).toLocaleDateString()}</p>
                            </div>
                            <button className={styles.closeBtn} onClick={() => setViewingUpdate(null)}>
                                <X size={24} />
                            </button>
                        </header>
                        <div className={styles.modalBody}>
                            <div className={styles.detailTableWrapper}>
                                <table className={styles.detailTable}>
                                    <thead>
                                        <tr>
                                            <th>Field Description</th>
                                            <th>Value (%)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {/* Group: Coordinator */}
                                        <tr className={styles.groupHeaderRow}><td colSpan="2">PROJECT COORDINATOR TEAM</td></tr>
                                        <tr><td>Planning & Kick Start (Overall)</td><td><strong>{viewingUpdate.planning_kickstart}%</strong></td></tr>
                                        <tr><td className={styles.indented}>— Site Pooja</td><td>{viewingUpdate.site_pooja}%</td></tr>
                                        <tr><td className={styles.indented}>— Office Documentation</td><td>{viewingUpdate.office_documentation}%</td></tr>
                                        <tr><td className={styles.indented}>— Sample Arr. (Moodboard)</td><td>{viewingUpdate.sample_moodboard}%</td></tr>
                                        
                                        {/* Group: Design */}
                                        <tr className={styles.groupHeaderRow}><td colSpan="2">DESIGN TEAM</td></tr>
                                        <tr><td>Shop Drawing (Initial)</td><td><strong>{viewingUpdate.shop_drawing}%</strong></td></tr>
                                        <tr><td>Line Drawing</td><td>{viewingUpdate.line_drawing}%</td></tr>
                                        <tr><td>Review & Revisions</td><td>{viewingUpdate.review_revisions}%</td></tr>
                                        <tr><td>MRF Approval (Design Side)</td><td><strong>{viewingUpdate.mrf_approval}%</strong></td></tr>
                                        <tr><td>Shop Drawing (Final)</td><td>{viewingUpdate.shop_drawing_final}%</td></tr>
                                        <tr><td>Cutting Plan</td><td>{viewingUpdate.cutting_plan}%</td></tr>
                                        <tr><td>Finishes List</td><td>{viewingUpdate.finishes_list}%</td></tr>

                                        {/* Group: Purchase */}
                                        <tr className={styles.groupHeaderRow}><td colSpan="2">PURCHASE TEAM</td></tr>
                                        <tr><td>MRF Status (Against Approval)</td><td><strong>{viewingUpdate.mrf_status}%</strong></td></tr>
                                        <tr><td>Raw Materials</td><td>{viewingUpdate.raw_materials}%</td></tr>
                                        <tr><td>Long Lead Materials</td><td>{viewingUpdate.long_lead_materials}%</td></tr>
                                        <tr><td>Finishes & Accessories</td><td>{viewingUpdate.finishes_accessories}%</td></tr>
                                        <tr><td>Material Delivery</td><td>{viewingUpdate.material_delivery}%</td></tr>

                                        {/* Group: Factory */}
                                        <tr className={styles.groupHeaderRow}><td colSpan="2">FACTORY TEAM</td></tr>
                                        <tr><td>Production Overall</td><td><strong>{viewingUpdate.production}%</strong></td></tr>
                                        <tr><td className={styles.indented}>— Cutting/Panelling</td><td>{viewingUpdate.cutting_panelling}%</td></tr>
                                        <tr><td className={styles.indented}>— Assembly</td><td>{viewingUpdate.assembly}%</td></tr>
                                        <tr><td className={styles.indented}>— Polishing</td><td>{viewingUpdate.polishing}%</td></tr>
                                        <tr><td className={styles.indented}>— Final Finishing</td><td>{viewingUpdate.final_finishing}%</td></tr>
                                        <tr><td className={styles.indented}>— Packing & Forwarding</td><td>{viewingUpdate.packing_forwarding}%</td></tr>

                                        {/* Group: Site */}
                                        <tr className={styles.groupHeaderRow}><td colSpan="2">SITE ENGINEERS TEAM</td></tr>
                                        <tr><td>Site Measurement</td><td>{viewingUpdate.site_measurement}%</td></tr>
                                        <tr><td>Site Marking</td><td>{viewingUpdate.site_marking}%</td></tr>
                                        <tr><td>Site Installation</td><td>{viewingUpdate.site_installation}%</td></tr>
                                        <tr><td>Site Work Overall</td><td><strong>{viewingUpdate.site_work}%</strong></td></tr>
                                        <tr><td className={styles.indented}>— Civil Work</td><td>{viewingUpdate.civil_work}%</td></tr>
                                        <tr><td className={styles.indented}>— False Ceiling</td><td>{viewingUpdate.false_ceiling}%</td></tr>
                                        <tr><td className={styles.indented}>— Carpentry Work</td><td>{viewingUpdate.carpentry_work}%</td></tr>
                                        <tr><td className={styles.indented}>— Painting</td><td>{viewingUpdate.painting}%</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            
                            {viewingUpdate.remarks && (
                                <div className={styles.modalRemarks}>
                                    <strong>Remarks:</strong>
                                    <p>{viewingUpdate.remarks}</p>
                                </div>
                            )}

                            {viewingUpdate.file_url && (
                                <a href={viewingUpdate.file_url} target="_blank" rel="noreferrer" className={styles.modalAttachment}>
                                    <LinkIcon size={16} /> View Achievement Attachment
                                </a>
                            )}

                            <div className={styles.modalFooterInfo}>
                                <span>Updated by: <strong>{viewingUpdate.username}</strong></span>
                                <span>Time: {new Date(viewingUpdate.updated_at).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectStatusUpdate;
