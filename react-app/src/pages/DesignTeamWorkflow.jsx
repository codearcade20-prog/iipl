import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useMessage } from '../context/MessageContext';
import { Clock, CheckSquare, Save, AlertTriangle, TableProperties, FileText, Printer, Search, Download } from 'lucide-react';
import LoadingScreen from '../components/LoadingScreen';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import styles from './DesignTeamWorkflow.module.css';

const DEFAULT_STATE = {
    step_1_concept: { delegation: 'pending', line_drawing: 'pending', architect_meeting: 'pending', site_visit: 'pending', site_marking: 'pending', sample_mockup: 'pending', mood_board: 'pending' },
    step_2_development: { shop_drawing: 'pending', planning: 'pending', revisions: 'pending', final_approval: 'pending' },
    step_3_material: { mrf_long_lead: 'pending', mrf_regular: 'pending' },
    step_4_production: { cutting_list: 'pending', factory_visit: 'pending', review_validation: 'pending' },
    step_5_installation: { knowledge_transfer: 'pending', site_visit: 'pending' }
};

const DesignTeamWorkflow = () => {
    const { user, hasPermission } = useAuth();
    const { toast, alert } = useMessage();
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState('');
    const [projectStartDate, setProjectStartDate] = useState(null);
    const [workflow, setWorkflow] = useState(JSON.parse(JSON.stringify(DEFAULT_STATE)));
    const [elapsedDays, setElapsedDays] = useState(0);

    const [viewMode, setViewMode] = useState('single');
    const [searchQuery, setSearchQuery] = useState('');
    const [allWorkflows, setAllWorkflows] = useState([]);
    const [masterViewMode, setMasterViewMode] = useState('summary');

    const FULL_FIELDS = [
        { group: 'step_1_concept', key: 'delegation', label: '1.1 Delegation' },
        { group: 'step_1_concept', key: 'line_drawing', label: '1.2 Line Drawing' },
        { group: 'step_1_concept', key: 'architect_meeting', label: '1.3 Arch. Meeting' },
        { group: 'step_1_concept', key: 'site_visit', label: '1.4 P1 Site Visit' },
        { group: 'step_1_concept', key: 'site_marking', label: '1.5 Site Marking' },
        { group: 'step_1_concept', key: 'sample_mockup', label: '1.6 Sample Mockup' },
        { group: 'step_1_concept', key: 'mood_board', label: '1.7 Mood Board' },
        { group: 'step_2_development', key: 'shop_drawing', label: '2.1 Shop Drawing' },
        { group: 'step_2_development', key: 'planning', label: '2.2 Planning' },
        { group: 'step_2_development', key: 'revisions', label: '2.3 Revisions' },
        { group: 'step_2_development', key: 'final_approval', label: '2.4 Final App.' },
        { group: 'step_3_material', key: 'mrf_long_lead', label: '3.1 MRF Long Lead' },
        { group: 'step_3_material', key: 'mrf_regular', label: '3.2 MRF Regular' },
        { group: 'step_4_production', key: 'cutting_list', label: '4.1 Cutting List' },
        { group: 'step_4_production', key: 'factory_visit', label: '4.2 Factory Visit' },
        { group: 'step_4_production', key: 'review_validation', label: '4.3 Review Val.' },
        { group: 'step_5_installation', key: 'knowledge_transfer', label: '5.1 Knowledge Tr.' },
        { group: 'step_5_installation', key: 'site_visit', label: '5.2 P5 Site Visit' }
    ];

    const fetchMasterData = async (projectsData) => {
        try {
            const { data, error } = await supabase.from('design_workflow').select('*');
            if (error) throw error;
            
            const enrichWorkflow = (workflowItem) => {
                const project = projectsData.find(p => p.id === workflowItem.project_id);
                let diffDays = 0;
                let start_date = null;
                if (project && project.start_date) {
                    start_date = project.start_date;
                    const start = new Date(project.start_date);
                    const now = new Date();
                    diffDays = Math.ceil(Math.abs(now - start) / (1000 * 60 * 60 * 24));
                }
                
                const calculateProgressForSteps = () => {
                    const steps = [
                        workflowItem.step_1_concept, workflowItem.step_2_development,
                        workflowItem.step_3_material, workflowItem.step_4_production,
                        workflowItem.step_5_installation
                    ];
                    let totalScore = 0; let totalKeys = 0;
                    steps.forEach(stepObj => {
                        if (!stepObj) return;
                        const keys = Object.keys(stepObj);
                        totalKeys += keys.length;
                        keys.forEach(k => {
                            if (stepObj[k] === true || stepObj[k] === 'completed') totalScore += 100;
                            else if (stepObj[k] === 'process') totalScore += 50;
                        });
                    });
                    return totalKeys ? Math.round(totalScore / totalKeys) : 0;
                };

                const calcStepProgress = (stepObj) => {
                    if (!stepObj) return 0;
                    const keys = Object.keys(stepObj);
                    let score = 0;
                    keys.forEach(k => {
                        if (stepObj[k] === true || stepObj[k] === 'completed') score += 100;
                        else if (stepObj[k] === 'process') score += 50;
                    });
                    return keys.length ? Math.round(score / keys.length) : 0;
                };

                return {
                    ...workflowItem,
                    project_name: project ? project.name : 'Unknown Project',
                    start_date: start_date,
                    elapsedDays: diffDays,
                    overallProgress: calculateProgressForSteps(),
                    p1: calcStepProgress(workflowItem.step_1_concept),
                    p2: calcStepProgress(workflowItem.step_2_development),
                    p3: calcStepProgress(workflowItem.step_3_material),
                    p4: calcStepProgress(workflowItem.step_4_production),
                    p5: calcStepProgress(workflowItem.step_5_installation)
                };
            };
            
            const processed = data ? data.map(enrichWorkflow) : [];
            setAllWorkflows(processed.sort((a,b) => b.overallProgress - a.overallProgress));
        } catch (error) {
            console.error("Error fetching master data:", error);
        }
    };

    // Initial Fetch (Projects)
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase.from('projects').select('id, name, start_date').order('name');
                if (error) throw error;
                setProjects(data || []);
                await fetchMasterData(data || []);
            } catch (err) {
                console.error("Error fetching projects:", err);
                alert("Failed to load projects.");
            } finally {
                setLoading(false);
            }
        };
        fetchProjects();
    }, [alert]);

    // Fetch Workflow on Project Change
    useEffect(() => {
        const fetchWorkflow = async () => {
            if (!selectedProject) {
                setWorkflow(JSON.parse(JSON.stringify(DEFAULT_STATE)));
                setProjectStartDate(null);
                setElapsedDays(0);
                return;
            }

            try {
                setLoading(true);
                // Get start date from selected project
                const p = projects.find(p => p.id === selectedProject);
                if (p && p.start_date) {
                    setProjectStartDate(p.start_date);
                    const start = new Date(p.start_date);
                    const now = new Date();
                    const diffTime = Math.abs(now - start);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    setElapsedDays(diffDays);
                } else {
                    setProjectStartDate(null);
                    setElapsedDays(0);
                }

                // Fetch workflow details
                const { data, error } = await supabase
                    .from('design_workflow')
                    .select('*')
                    .eq('project_id', selectedProject)
                    .single();

                if (data) {
                    const sanitizeStep = (stepObj, defaultStep) => {
                        const newObj = {};
                        for (let k in defaultStep) {
                            let val = stepObj ? stepObj[k] : null;
                            if (val === true) val = 'completed';
                            else if (val === false || !val) val = 'pending';
                            newObj[k] = val;
                        }
                        return newObj;
                    };

                    setWorkflow({
                        step_1_concept: sanitizeStep(data.step_1_concept, DEFAULT_STATE.step_1_concept),
                        step_2_development: sanitizeStep(data.step_2_development, DEFAULT_STATE.step_2_development),
                        step_3_material: sanitizeStep(data.step_3_material, DEFAULT_STATE.step_3_material),
                        step_4_production: sanitizeStep(data.step_4_production, DEFAULT_STATE.step_4_production),
                        step_5_installation: sanitizeStep(data.step_5_installation, DEFAULT_STATE.step_5_installation)
                    });
                } else if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
                     throw error;
                } else {
                     setWorkflow(JSON.parse(JSON.stringify(DEFAULT_STATE)));
                }

            } catch (error) {
                console.error("Error fetching workflow:", error);
                toast("Could not load previous workflow progress.");
                setWorkflow(JSON.parse(JSON.stringify(DEFAULT_STATE)));
            } finally {
                setLoading(false);
            }
        };

        fetchWorkflow();
    }, [selectedProject, projects, toast]);

    const handleStatusChange = (step, task, status) => {
        setWorkflow(prev => ({
            ...prev,
            [step]: {
                ...prev[step],
                [task]: status
            }
        }));
    };

    const handleSave = async () => {
        if (!selectedProject) {
            alert("Select a project first.");
            return;
        }

        try {
            setLoading(true);
            const { error } = await supabase
                .from('design_workflow')
                .upsert({
                    project_id: selectedProject,
                    step_1_concept: workflow.step_1_concept,
                    step_2_development: workflow.step_2_development,
                    step_3_material: workflow.step_3_material,
                    step_4_production: workflow.step_4_production,
                    step_5_installation: workflow.step_5_installation,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'project_id' });

            if (error) throw error;
            toast("Design workflow progress saved successfully! ✅");
        } catch (error) {
            console.error("Error saving workflow:", error);
            alert("Failed to save progress.");
        } finally {
            setLoading(false);
        }
    };

    const calculateStepScore = (stepObj) => {
        const keys = Object.keys(stepObj);
        let score = 0;
        keys.forEach(k => {
            if (stepObj[k] === 'completed') score += 100;
            else if (stepObj[k] === 'process') score += 50;
        });
        return {
            percentage: keys.length ? Math.round(score / keys.length) : 0,
            completed: keys.filter(k => stepObj[k] === 'completed').length,
            total: keys.length
        };
    };

    const calculateOverallProgress = () => {
        const steps = [
            workflow.step_1_concept, workflow.step_2_development,
            workflow.step_3_material, workflow.step_4_production,
            workflow.step_5_installation
        ];
        
        let totalScore = 0;
        let totalKeys = 0;
        
        steps.forEach(stepObj => {
            const keys = Object.keys(stepObj);
            totalKeys += keys.length;
            keys.forEach(k => {
                if (stepObj[k] === 'completed') totalScore += 100;
                else if (stepObj[k] === 'process') totalScore += 50;
            });
        });
        
        return totalKeys ? Math.round(totalScore / totalKeys) : 0;
    };

    const getTimerColorClass = () => {
        if (elapsedDays <= 7) return styles.timerGreen;
        if (elapsedDays <= 11) return styles.timerYellow;
        return styles.timerRed;
    };

    const handleExportPDF = () => {
        const isFull = masterViewMode === 'full';
        const doc = new jsPDF(isFull ? 'l' : 'l', 'mm', isFull ? 'a3' : 'a4');
        doc.setFontSize(16);
        doc.text(`Design Team Workflow Master View - ${isFull ? 'Full Fields' : 'Summary'}`, 14, 15);
        
        let tableColumn = [];
        let tableRows = [];
        const filteredWorkflows = allWorkflows.filter(w => w.project_name.toLowerCase().includes(searchQuery.toLowerCase()));

        const getStatusText = (status) => {
            if (status === 'completed' || status === true) return '100%';
            if (status === 'process') return '50%';
            return '0%';
        };

        if (isFull) {
            tableColumn = ["Project", "Start Date", "Days", ...FULL_FIELDS.map(f => f.label)];
            tableRows = filteredWorkflows.map(w => [
                w.project_name,
                w.start_date || 'N/A',
                `${w.elapsedDays}d`,
                ...FULL_FIELDS.map(f => w[f.group] ? getStatusText(w[f.group][f.key]) : 'P')
            ]);
        } else {
            tableColumn = ["Project Name", "Start Date", "Days", "Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Overall"];
            tableRows = filteredWorkflows.map(w => [
                w.project_name,
                w.start_date || 'N/A',
                `${w.elapsedDays}d`,
                `${w.p1}%`,
                `${w.p2}%`,
                `${w.p3}%`,
                `${w.p4}%`,
                `${w.p5}%`,
                `${w.overallProgress}%`
            ]);
        }

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 20,
            styles: { fontSize: isFull ? 7 : 10, cellPadding: 1 },
            headStyles: { fillColor: [37, 99, 235] },
            columnStyles: isFull ? { 0: { cellWidth: 30 } } : {}
        });

        doc.save(`design_workflow_${isFull ? 'full' : 'summary'}.pdf`);
        toast("Download started!");
    };

    if (loading && !projects.length) return <LoadingScreen message="Loading Design Module..." />;

    // Security Check: MD role should not access
    if (user?.team_role === 'md') {
        return (
            <div className={styles.container}>
                <h2>Access Denied</h2>
                <p>You do not have permission to view the Design Team Workflow module.</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>Design Team Workflow</h1>
                    <p className={styles.subtitle}>Track 11-Day Phase Progression</p>
                </div>
                {selectedProject && projectStartDate && (
                    <div className={styles.timerWidget}>
                        <span className={styles.timerLabel}><Clock size={12} style={{marginRight: 4}}/> Time Elapsed</span>
                        <div className={`${styles.timerValue} ${getTimerColorClass()}`}>
                            {elapsedDays} <span style={{fontSize: '0.9rem', fontWeight: 'bold', color: '#94a3b8'}}>Days</span>
                        </div>
                        {elapsedDays > 11 && (
                            <div style={{color:'#ef4444', fontSize:'0.7rem', marginTop:'0.25rem', fontWeight:'800', textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                                <AlertTriangle size={12} /> Overdue
                            </div>
                        )}
                    </div>
                )}
            </header>

            <main className={styles.content}>
                <div className={styles.card}>
                    <div className={`${styles.viewToggleContainer} printHide`}>
                        <button 
                            className={`${styles.viewToggleBtn} ${viewMode === 'single' ? styles.viewToggleBtnActive : ''}`}
                            onClick={() => setViewMode('single')}
                        >
                            <CheckSquare size={16} /> Detailed View
                        </button>
                        <button 
                            className={`${styles.viewToggleBtn} ${viewMode === 'master' ? styles.viewToggleBtnActive : ''}`}
                            onClick={() => {
                                setViewMode('master');
                                fetchMasterData(projects);
                            }}
                        >
                            <TableProperties size={16} /> Master View
                        </button>
                    </div>

                    {viewMode === 'single' && (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1.5rem' }}>
                            <select 
                                className={styles.projectSelect} 
                                value={selectedProject} 
                                onChange={e => setSelectedProject(e.target.value)}
                            >
                                <option value="">-- Select Project --</option>
                                {projects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>

                            {selectedProject && (
                                <div className={styles.overallProgressWidget}>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Overall Progress</span>
                                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#4f46e5', fontFamily: 'Outfit, sans-serif' }}>{calculateOverallProgress()}%</div>
                                </div>
                            )}
                        </div>

                        {selectedProject && (
                            <div className={styles.workflowContainer}>
                                {/* Phase 1 */}
                                <div className={styles.stepContainer}>
                                    <div className={styles.stepHeader}>
                                        <h3 className={styles.stepTitle}>Phase 1: Concept & Initial Development</h3>
                                        <div className={styles.stepProgressContainer}>
                                            <div className={styles.stepProgressBarContainer}>
                                                <div className={styles.stepProgressBar} style={{ width: `${calculateStepScore(workflow.step_1_concept).percentage}%` }} />
                                            </div>
                                            <span className={styles.stepProgress}>{calculateStepScore(workflow.step_1_concept).percentage}%</span>
                                        </div>
                                    </div>
                                    <div className={styles.taskList}>
                                        {[
                                            { key: 'delegation', label: '1.1 Delegation of tasks' },
                                            { key: 'line_drawing', label: '1.2 Line drawing preparation' },
                                            { key: 'architect_meeting', label: '1.3 Architect & client meeting' },
                                            { key: 'site_visit', label: '1.4 P1 Site visit' },
                                            { key: 'site_marking', label: '1.5 Site marking' },
                                            { key: 'sample_mockup', label: '1.6 Sample & mockup prep' },
                                            { key: 'mood_board', label: '1.7 Mood board preparation' }
                                        ].map(task => (
                                            <div key={task.key} className={styles.taskItem}>
                                                <span className={styles.taskLabel}>{task.label}</span>
                                                <select
                                                    className={`${styles.statusSelect} ${styles[`status_${workflow.step_1_concept[task.key]}`]}`}
                                                    value={workflow.step_1_concept[task.key]}
                                                    onChange={(e) => handleStatusChange('step_1_concept', task.key, e.target.value)}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="process">In Process</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Phase 2 */}
                                <div className={styles.stepContainer}>
                                    <div className={styles.stepHeader}>
                                        <h3 className={styles.stepTitle}>Phase 2: Design Development</h3>
                                        <div className={styles.stepProgressContainer}>
                                            <div className={styles.stepProgressBarContainer}>
                                                <div className={styles.stepProgressBar} style={{ width: `${calculateStepScore(workflow.step_2_development).percentage}%` }} />
                                            </div>
                                            <span className={styles.stepProgress}>{calculateStepScore(workflow.step_2_development).percentage}%</span>
                                        </div>
                                    </div>
                                    <div className={styles.taskList}>
                                        {[
                                            { key: 'shop_drawing', label: '2.1 Shop drawing creation' },
                                            { key: 'planning', label: '2.2 Planning' },
                                            { key: 'revisions', label: '2.3 Revisions based on feedback' },
                                            { key: 'final_approval', label: '2.4 Final drawing approval' }
                                        ].map(task => (
                                            <div key={task.key} className={styles.taskItem}>
                                                <span className={styles.taskLabel}>{task.label}</span>
                                                <select
                                                    className={`${styles.statusSelect} ${styles[`status_${workflow.step_2_development[task.key]}`]}`}
                                                    value={workflow.step_2_development[task.key]}
                                                    onChange={(e) => handleStatusChange('step_2_development', task.key, e.target.value)}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="process">In Process</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Phase 3 */}
                                <div className={styles.stepContainer}>
                                    <div className={styles.stepHeader}>
                                        <h3 className={styles.stepTitle}>Phase 3: Material Request Process</h3>
                                        <div className={styles.stepProgressContainer}>
                                            <div className={styles.stepProgressBarContainer}>
                                                <div className={styles.stepProgressBar} style={{ width: `${calculateStepScore(workflow.step_3_material).percentage}%` }} />
                                            </div>
                                            <span className={styles.stepProgress}>{calculateStepScore(workflow.step_3_material).percentage}%</span>
                                        </div>
                                    </div>
                                    <div className={styles.taskList}>
                                        {[
                                            { key: 'mrf_long_lead', label: '3.1 MRF for long lead items' },
                                            { key: 'mrf_regular', label: '3.2 MRF for regular items' }
                                        ].map(task => (
                                            <div key={task.key} className={styles.taskItem}>
                                                <span className={styles.taskLabel}>{task.label}</span>
                                                <select
                                                    className={`${styles.statusSelect} ${styles[`status_${workflow.step_3_material[task.key]}`]}`}
                                                    value={workflow.step_3_material[task.key]}
                                                    onChange={(e) => handleStatusChange('step_3_material', task.key, e.target.value)}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="process">In Process</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Phase 4 */}
                                <div className={styles.stepContainer}>
                                    <div className={styles.stepHeader}>
                                        <h3 className={styles.stepTitle}>Phase 4: Production Preparation</h3>
                                        <div className={styles.stepProgressContainer}>
                                            <div className={styles.stepProgressBarContainer}>
                                                <div className={styles.stepProgressBar} style={{ width: `${calculateStepScore(workflow.step_4_production).percentage}%` }} />
                                            </div>
                                            <span className={styles.stepProgress}>{calculateStepScore(workflow.step_4_production).percentage}%</span>
                                        </div>
                                    </div>
                                    <div className={styles.taskList}>
                                        {[
                                            { key: 'cutting_list', label: '4.1 Cutting list preparation' },
                                            { key: 'factory_visit', label: '4.2 Factory visit' },
                                            { key: 'review_validation', label: '4.3 Review and validation' }
                                        ].map(task => (
                                            <div key={task.key} className={styles.taskItem}>
                                                <span className={styles.taskLabel}>{task.label}</span>
                                                <select
                                                    className={`${styles.statusSelect} ${styles[`status_${workflow.step_4_production[task.key]}`]}`}
                                                    value={workflow.step_4_production[task.key]}
                                                    onChange={(e) => handleStatusChange('step_4_production', task.key, e.target.value)}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="process">In Process</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Phase 5 */}
                                <div className={styles.stepContainer}>
                                    <div className={styles.stepHeader}>
                                        <h3 className={styles.stepTitle}>Phase 5: Pre-Installation Coordination</h3>
                                        <div className={styles.stepProgressContainer}>
                                            <div className={styles.stepProgressBarContainer}>
                                                <div className={styles.stepProgressBar} style={{ width: `${calculateStepScore(workflow.step_5_installation).percentage}%` }} />
                                            </div>
                                            <span className={styles.stepProgress}>{calculateStepScore(workflow.step_5_installation).percentage}%</span>
                                        </div>
                                    </div>
                                    <div className={styles.taskList}>
                                        {[
                                            { key: 'knowledge_transfer', label: '5.1 Knowledge transfer' },
                                            { key: 'site_visit', label: '5.2 P5 Site visit' }
                                        ].map(task => (
                                            <div key={task.key} className={styles.taskItem}>
                                                <span className={styles.taskLabel}>{task.label}</span>
                                                <select
                                                    className={`${styles.statusSelect} ${styles[`status_${workflow.step_5_installation[task.key]}`]}`}
                                                    value={workflow.step_5_installation[task.key]}
                                                    onChange={(e) => handleStatusChange('step_5_installation', task.key, e.target.value)}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="process">In Process</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <button className={styles.saveBtn} onClick={handleSave} disabled={loading}>
                                    <Save size={20} />
                                    {loading ? 'Saving...' : 'Save Progress'}
                                </button>
                            </div>
                        )}
                      </>
                    )}

                    {viewMode === 'master' && (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }} className="printHide">
                            <div className={styles.searchBar}>
                                <Search size={20} color="#64748b" />
                                <input
                                    type="text"
                                    placeholder="Search by project name..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                                <select 
                                    value={masterViewMode} 
                                    onChange={(e) => setMasterViewMode(e.target.value)}
                                    style={{ padding: '0.6rem 1rem', borderRadius: '0.75rem', border: '1.5px solid #e2e8f0', fontSize: '0.875rem', fontWeight: 600, color: '#475569', background: '#f8fafc' }}
                                >
                                    <option value="summary">Summary View</option>
                                    <option value="full">Full Fields View</option>
                                </select>
                                <button 
                                    className={`${styles.viewToggleBtn} ${styles.printBtn}`} 
                                    onClick={handleExportPDF}
                                >
                                    <Download size={16} /> Export PDF
                                </button>
                            </div>
                        </div>

                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Project Name</th>
                                        <th>Start Date</th>
                                        <th>Days</th>
                                        {masterViewMode === 'summary' ? (
                                            <>
                                                <th>Phase 1</th>
                                                <th>Phase 2</th>
                                                <th>Phase 3</th>
                                                <th>Phase 4</th>
                                                <th>Phase 5</th>
                                                <th>Overall</th>
                                            </>
                                        ) : (
                                            FULL_FIELDS.map((f, i) => <th key={i} style={{ fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{f.label}</th>)
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {allWorkflows
                                        .filter(w => w.project_name.toLowerCase().includes(searchQuery.toLowerCase()))
                                        .map(w => (
                                        <tr key={w.project_id}>
                                            <td style={{ fontWeight: 700, color: '#0f172a' }}>{w.project_name}</td>
                                            <td style={{ color: '#64748b', fontWeight: 500 }}>{w.start_date || 'N/A'}</td>
                                            <td>
                                                <span style={{ 
                                                    color: w.elapsedDays > 11 ? '#ef4444' : (w.elapsedDays > 7 ? '#f59e0b' : '#10b981'),
                                                    fontWeight: '800',
                                                    fontFamily: 'Outfit, sans-serif'
                                                }}>
                                                    {w.elapsedDays}d
                                                </span>
                                            </td>
                                            {masterViewMode === 'summary' ? (
                                                <>
                                                    <td style={{ fontWeight: 700, color: '#475569' }}>{w.p1}%</td>
                                                    <td style={{ fontWeight: 700, color: '#475569' }}>{w.p2}%</td>
                                                    <td style={{ fontWeight: 700, color: '#475569' }}>{w.p3}%</td>
                                                    <td style={{ fontWeight: 700, color: '#475569' }}>{w.p4}%</td>
                                                    <td style={{ fontWeight: 700, color: '#475569' }}>{w.p5}%</td>
                                                    <td>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                            <div style={{ flex: 1, backgroundColor: '#f1f5f9', height: '8px', borderRadius: '999px' }}>
                                                                <div style={{ width: `${w.overallProgress}%`, background: 'linear-gradient(90deg, #4f46e5, #818cf8)', height: '100%', borderRadius: '999px' }}></div>
                                                            </div>
                                                            <span style={{ fontSize: '0.875rem', fontWeight: 800, color: '#4f46e5', minWidth: '40px' }}>{w.overallProgress}%</span>
                                                        </div>
                                                    </td>
                                                </>
                                            ) : (
                                                FULL_FIELDS.map((f, i) => {
                                                    const status = w[f.group] ? w[f.group][f.key] : 'pending';
                                                    let bgColor = '#f8fafc';
                                                    let color = '#94a3b8';
                                                    let text = '0%';
                                                    
                                                    if (status === 'completed' || status === true) {
                                                        bgColor = '#f0fdf4'; color = '#10b981'; text = '100%';
                                                    } else if (status === 'process') {
                                                        bgColor = '#fffbeb'; color = '#f59e0b'; text = '50%';
                                                    }
                                                    
                                                    return (
                                                        <td key={i}>
                                                            <span style={{
                                                                backgroundColor: bgColor,
                                                                color: color,
                                                                padding: '4px 8px',
                                                                borderRadius: '0.5rem',
                                                                fontSize: '0.65rem',
                                                                fontWeight: '800',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {text}
                                                            </span>
                                                        </td>
                                                    );
                                                })
                                            )}
                                        </tr>
                                    ))}
                                    {allWorkflows.length === 0 && (
                                        <tr>
                                            <td colSpan={masterViewMode === 'summary' ? 9 : 3 + FULL_FIELDS.length} style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8', fontStyle: 'italic' }}>No progression data found</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                      </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default DesignTeamWorkflow;
