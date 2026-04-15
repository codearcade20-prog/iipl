import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useMessage } from '../context/MessageContext';
import { Clock, CheckSquare, Save, AlertTriangle } from 'lucide-react';
import LoadingScreen from '../components/LoadingScreen';
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

    // Initial Fetch (Projects)
    useEffect(() => {
        const fetchProjects = async () => {
            try {
                setLoading(true);
                const { data, error } = await supabase.from('projects').select('id, name, start_date').order('name');
                if (error) throw error;
                setProjects(data || []);
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
                        <span className={styles.timerLabel}><Clock size={14} style={{verticalAlign: 'middle', marginRight: 4}}/> Time Elapsed</span>
                        <div className={`${styles.timerValue} ${getTimerColorClass()}`}>
                            {elapsedDays} <span style={{fontSize: '1rem', fontWeight: 'normal'}}>Days</span>
                        </div>
                        {elapsedDays > 11 && (
                            <div style={{color:'#f87171', fontSize:'0.8rem', marginTop:'0.25rem', fontWeight:'bold'}}>
                                <AlertTriangle size={12} /> Overdue Focus Required
                            </div>
                        )}
                    </div>
                )}
            </header>

            <div className={styles.card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
                    <select 
                        className={styles.projectSelect} 
                        value={selectedProject} 
                        onChange={e => setSelectedProject(e.target.value)}
                        style={{ marginBottom: 0 }}
                    >
                        <option value="">-- Select Project --</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>

                    {selectedProject && (
                        <div className={styles.overallProgressWidget}>
                            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Overall Progress</span>
                            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>{calculateOverallProgress()}%</div>
                        </div>
                    )}
                </div>

                {selectedProject && (
                    <div className={styles.workflowContainer}>
                        {/* Phase 1 */}
                        <div className={styles.stepContainer}>
                            <div className={styles.stepHeader}>
                                <h3 className={styles.stepTitle}>Step 1: Concept & Initial Development</h3>
                                <div className={styles.stepProgressContainer}>
                                    <div className={styles.stepProgressBarContainer}>
                                        <div className={styles.stepProgressBar} style={{ width: `${calculateStepScore(workflow.step_1_concept).percentage}%` }} />
                                    </div>
                                    <span className={styles.stepProgress}>{calculateStepScore(workflow.step_1_concept).percentage}% ({calculateStepScore(workflow.step_1_concept).completed}/{calculateStepScore(workflow.step_1_concept).total})</span>
                                </div>
                            </div>
                            <div className={styles.taskList}>
                                {[
                                    { key: 'delegation', label: 'Delegation of tasks' },
                                    { key: 'line_drawing', label: 'Line drawing preparation' },
                                    { key: 'architect_meeting', label: 'Architect & client meeting' },
                                    { key: 'site_visit', label: 'Site visit' },
                                    { key: 'site_marking', label: 'Site marking' },
                                    { key: 'sample_mockup', label: 'Sample & mockup preparation' },
                                    { key: 'mood_board', label: 'Mood board preparation' }
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
                                <h3 className={styles.stepTitle}>Step 2: Design Development</h3>
                                <div className={styles.stepProgressContainer}>
                                    <div className={styles.stepProgressBarContainer}>
                                        <div className={styles.stepProgressBar} style={{ width: `${calculateStepScore(workflow.step_2_development).percentage}%` }} />
                                    </div>
                                    <span className={styles.stepProgress}>{calculateStepScore(workflow.step_2_development).percentage}% ({calculateStepScore(workflow.step_2_development).completed}/{calculateStepScore(workflow.step_2_development).total})</span>
                                </div>
                            </div>
                            <div className={styles.taskList}>
                                {[
                                    { key: 'shop_drawing', label: 'Shop drawing creation' },
                                    { key: 'planning', label: 'Planning' },
                                    { key: 'revisions', label: 'Revisions based on feedback' },
                                    { key: 'final_approval', label: 'Final drawing approval' }
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
                                <h3 className={styles.stepTitle}>Step 3: Material Request Process</h3>
                                <div className={styles.stepProgressContainer}>
                                    <div className={styles.stepProgressBarContainer}>
                                        <div className={styles.stepProgressBar} style={{ width: `${calculateStepScore(workflow.step_3_material).percentage}%` }} />
                                    </div>
                                    <span className={styles.stepProgress}>{calculateStepScore(workflow.step_3_material).percentage}% ({calculateStepScore(workflow.step_3_material).completed}/{calculateStepScore(workflow.step_3_material).total})</span>
                                </div>
                            </div>
                            <div className={styles.taskList}>
                                {[
                                    { key: 'mrf_long_lead', label: 'MRF for long lead items' },
                                    { key: 'mrf_regular', label: 'MRF for regular items' }
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
                                <h3 className={styles.stepTitle}>Step 4: Production Preparation</h3>
                                <div className={styles.stepProgressContainer}>
                                    <div className={styles.stepProgressBarContainer}>
                                        <div className={styles.stepProgressBar} style={{ width: `${calculateStepScore(workflow.step_4_production).percentage}%` }} />
                                    </div>
                                    <span className={styles.stepProgress}>{calculateStepScore(workflow.step_4_production).percentage}% ({calculateStepScore(workflow.step_4_production).completed}/{calculateStepScore(workflow.step_4_production).total})</span>
                                </div>
                            </div>
                            <div className={styles.taskList}>
                                {[
                                    { key: 'cutting_list', label: 'Cutting list preparation' },
                                    { key: 'factory_visit', label: 'Factory visit' },
                                    { key: 'review_validation', label: 'Review and validation' }
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
                                <h3 className={styles.stepTitle}>Step 5: Pre-Installation Coordination</h3>
                                <div className={styles.stepProgressContainer}>
                                    <div className={styles.stepProgressBarContainer}>
                                        <div className={styles.stepProgressBar} style={{ width: `${calculateStepScore(workflow.step_5_installation).percentage}%` }} />
                                    </div>
                                    <span className={styles.stepProgress}>{calculateStepScore(workflow.step_5_installation).percentage}% ({calculateStepScore(workflow.step_5_installation).completed}/{calculateStepScore(workflow.step_5_installation).total})</span>
                                </div>
                            </div>
                            <div className={styles.taskList}>
                                {[
                                    { key: 'knowledge_transfer', label: 'Knowledge transfer about installation' },
                                    { key: 'site_visit', label: 'Site visit for execution readiness' }
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
            </div>
        </div>
    );
};

export default DesignTeamWorkflow;
