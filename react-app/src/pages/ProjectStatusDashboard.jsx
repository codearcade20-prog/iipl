import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    LayoutDashboard, 
    CheckCircle2, 
    Clock, 
    AlertTriangle, 
    TrendingUp, 
    Calendar, 
    User, 
    Search, 
    Filter, 
    History, 
    ChevronRight,
    ArrowUpRight,
    ArrowDownRight,
    Download,
    X,
    Link as LinkIcon
} from 'lucide-react';
import styles from './ProjectStatusDashboard.module.css';
import LoadingScreen from '../components/LoadingScreen';

const ProjectStatusDashboard = () => {
    const [loading, setLoading] = useState(true);
    const [projects, setProjects] = useState([]);
    const [statusData, setStatusData] = useState([]); // Master reality
    const [updates, setUpdates] = useState([]); // History for speed/logs
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isMasterView, setIsMasterView] = useState(false); // Toggle to show the Big Matrix
    const [activePopover, setActivePopover] = useState(null); 

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const { data: projData, error: projError } = await supabase.from('projects').select('*');
            if (projError) throw projError;

            // 1. Fetch Current Master Status (Reality)
            const { data: masterData, error: masterError } = await supabase.from('project_current_status').select('*');
            if (masterError) throw masterError;

            // 2. Fetch History (for Velocity/Trends/Logs)
            const { data: updateData, error: updateError } = await supabase
                .from('project_status_updates')
                .select('*')
                .order('status_date', { ascending: true });
            if (updateError) throw updateError;

            setProjects(projData || []);
            setStatusData(masterData || []);
            setUpdates(updateData || []);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const processProjectData = () => {
        const today = new Date();
        
        return projects.map(project => {
            const projectStatus = statusData.find(s => s.project_id === project.id) || {};
            const projectUpdates = updates.filter(u => u.project_id === project.id);
            const latestUpdate = projectUpdates[projectUpdates.length - 1]; // Last log entry
            const firstUpdate = projectUpdates[0];
            
            // 1. Calculate Current Progress from the MASTER table (The Truth)
            const currentProgress = projectStatus ? parseFloat(projectStatus.completion_percentage || 0) : 0;
            
            // 2. MRF Effective Status (Capped by Design Approval for MD validation)
            const mrfStatus = projectStatus ? parseFloat(projectStatus.mrf_status || 0) : 0;
            const mrfApproval = projectStatus ? parseFloat(projectStatus.mrf_approval || 0) : 0;
            const effectiveMRF = Math.min(mrfStatus, mrfApproval);
            
            // 3. Calculate Work Velocity (Average % progress gained per day)
            let speed = 0;
            
            // Try calculating from Update History first (Short-term velocity)
            if (projectUpdates.length > 1) {
                const daysDiff = (new Date(latestUpdate.status_date) - new Date(firstUpdate.status_date)) / (1000 * 60 * 60 * 24);
                if (daysDiff > 1) {
                    speed = (currentProgress - parseFloat(firstUpdate.completion_percentage)) / daysDiff;
                }
            }
            
            // If history speed is zero (e.g. updates all on same day or no history), 
            // fallback to Project Start Date (Long-term velocity)
            if (speed <= 0 && project.start_date && currentProgress > 0) {
                const daysSinceStart = (today - new Date(project.start_date)) / (1000 * 60 * 60 * 24);
                const effectiveDays = Math.max(daysSinceStart, 1);
                speed = currentProgress / effectiveDays;
            }

            // 3. Project Expected Completion Date
            // Logic: Current Date + (Remaining Work / Daily Speed)
            let expectedDate = null;
            if (speed > 0 && currentProgress < 100) {
                const remainingProgress = 100 - currentProgress;
                const daysToComplete = remainingProgress / speed;
                expectedDate = new Date(latestUpdate ? latestUpdate.status_date : project.start_date);
                expectedDate.setDate(expectedDate.getDate() + daysToComplete);
            }

            // Status Logic
            let status = 'On Track';
            let statusColor = 'green';
            
            if (currentProgress === 100) {
                status = 'Completed';
                statusColor = 'blue';
            } else if (project.end_date) {
                const deadline = new Date(project.end_date);
                
                // CRITICAL FIX: If today is past deadline and project is not done, it is DELAYED
                if (today > deadline) {
                    status = 'Delayed';
                    statusColor = 'red';
                }
                // OR if predicted date is past deadline
                else if (expectedDate && expectedDate > deadline) {
                    status = 'Delayed';
                    statusColor = 'red';
                } 
                // OR if no update for 5 days
                else if (latestUpdate) {
                    const daysSinceUpdate = (today - new Date(latestUpdate.status_date)) / (1000 * 60 * 60 * 24);
                    if (daysSinceUpdate > 5) {
                        status = 'At Risk';
                        statusColor = 'yellow';
                    }
                }
            }

            // Delay Calculation
            let delayDays = 0;
            if (expectedDate && project.end_date) {
                const deadline = new Date(project.end_date);
                if (expectedDate > deadline) {
                    delayDays = Math.ceil((expectedDate - deadline) / (1000 * 60 * 60 * 24));
                }
            }

            return {
                ...project,
                ...projectStatus, // Spread in the sub-categories (site_pooja, etc)
                currentProgress,
                effectiveMRF,
                mrfApproval,
                speed: speed.toFixed(2),
                expectedDate,
                delayDays,
                status,
                statusColor,
                lastUpdate: latestUpdate,
                history: projectUpdates.reverse()
            };
        });
    };

    const processedProjects = processProjectData();
    const filteredProjects = processedProjects.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             (p.coordinator && p.coordinator.toLowerCase().includes(searchTerm.toLowerCase())) ||
                             (p.designer && p.designer.toLowerCase().includes(searchTerm.toLowerCase())) ||
                             (p.site_engineer && p.site_engineer.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesFilter = filterStatus === 'All' || p.status === filterStatus;
        return matchesSearch && matchesFilter;
    });

    const stats = {
        total: processedProjects.length,
        completed: processedProjects.filter(p => p.status === 'Completed').length,
        ongoing: processedProjects.filter(p => p.status === 'On Track').length,
        delayed: processedProjects.filter(p => p.status === 'Delayed').length,
        atRisk: processedProjects.filter(p => p.status === 'At Risk').length
    };

    const openProjectDetails = (project) => {
        setSelectedProject(project);
        setIsModalOpen(true);
    };

    const handlePrint = () => {
        const style = document.createElement('style');
        style.id = 'print-dashboard-override';
        style.innerHTML = `
            @page { size: landscape; margin: 10mm; }
            @media print {
                /* Aggressively hide EVERYTHING first */
                body * { 
                    visibility: hidden !important; 
                }
                
                /* Specifically show our container and all its children */
                #project-status-dashboard-actual, 
                #project-status-dashboard-actual * { 
                    visibility: visible !important; 
                }
                
                /* Reset parents so they don't block visibility or layout */
                html, body, #root, #root > *, [class*="wrapper"], [class*="content"] {
                    visibility: visible !important;
                    display: block !important;
                    overflow: visible !important;
                    height: auto !important;
                    min-height: 0 !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    border: none !important;
                }

                /* Position the dashboard at the very top */
                #project-status-dashboard-actual { 
                    position: absolute !important; 
                    left: 0 !important; 
                    top: 0 !important; 
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 20px !important;
                }

                /* Hide UI elements we definitely don't want in the report */
                [class*="headerActions"], 
                [class*="controlsBar"], 
                [class*="detailsBtn"],
                [class*="viewBtn"] {
                    display: none !important;
                }

                /* Ensure table fits and is visible */
                table { margin-top: 10px !important; width: 100% !important; }
            }
        `;
        document.head.appendChild(style);
        window.print();
        
        // Cleanup
        setTimeout(() => {
            const el = document.getElementById('print-dashboard-override');
            if (el) document.head.removeChild(el);
        }, 1000);
    };

    if (loading) return <LoadingScreen message="Loading project dashboard..." />;

    return (
        <div id="project-status-dashboard-actual" className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerTitles}>
                    <h1 className={styles.title}>Project Status Dashboard</h1>
                    <p className={styles.subtitle}>Real-time performance metrics and predictive analytics</p>
                </div>
                <div className={styles.headerActions}>
                    <button 
                        className={styles.viewBtn} 
                        onClick={() => setIsMasterView(!isMasterView)}
                        style={{ marginRight: '10px', background: isMasterView ? '#3b82f6' : '#fff', color: isMasterView ? '#fff' : '#334155' }}
                    >
                        {isMasterView ? <LayoutDashboard size={18} /> : <TrendingUp size={18} />} 
                        {isMasterView ? ' Standard View' : ' Master View'}
                    </button>
                    <button className={styles.exportBtn} onClick={handlePrint}>
                        <Download size={18} /> Export Report
                    </button>
                </div>
            </header>

            {/* Stats Overview */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#f1f5f9', color: '#64748b' }}>
                        <LayoutDashboard size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Total Projects</span>
                        <span className={styles.statValue}>{stats.total}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#f0fdf4', color: '#16a34a' }}>
                        <CheckCircle2 size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Completed</span>
                        <span className={styles.statValue}>{stats.completed}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#eff6ff', color: '#3b82f6' }}>
                        <TrendingUp size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Ongoing</span>
                        <span className={styles.statValue}>{stats.ongoing}</span>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={styles.statIcon} style={{ background: '#fef2f2', color: '#ef4444' }}>
                        <AlertTriangle size={24} />
                    </div>
                    <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Delayed</span>
                        <span className={styles.statValue}>{stats.delayed}</span>
                    </div>
                </div>
            </div>

            {/* Alerts Section */}
            {(stats.delayed > 0 || stats.atRisk > 0) && (
                <div className={styles.alertsSection}>
                    <h2 className={styles.sectionTitle}>Critical Alerts</h2>
                    <div className={styles.alertList}>
                        {stats.delayed > 0 && (
                            <div className={`${styles.alertItem} ${styles.alertDelayed}`}>
                                <AlertTriangle size={18} />
                                <span><strong>{stats.delayed} Projects are delayed:</strong> Immediate intervention required to meet deadlines.</span>
                            </div>
                        )}
                        {stats.atRisk > 0 && (
                            <div className={`${styles.alertItem} ${styles.alertRisk}`}>
                                <Clock size={18} />
                                <span><strong>{stats.atRisk} Projects are at risk:</strong> Slow progress or lack of updates detected.</span>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Filters & Controls */}
            <div className={styles.controlsBar}>
                <div className={styles.searchBox}>
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Search project or coordinator..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className={styles.filterBox}>
                    <Filter size={18} />
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="All">All Statuses</option>
                        <option value="On Track">On Track</option>
                        <option value="At Risk">At Risk</option>
                        <option value="Delayed">Delayed</option>
                        <option value="Completed">Completed</option>
                    </select>
                </div>
            </div>

            {/* CONDITIONAL VIEW RENDER */}
            {isMasterView ? (
                <div className={styles.tableCard}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr style={{ background: '#f8fafc' }}>
                                    <th style={{ width: '25%' }}>Project Name</th>
                                    <th style={{ textAlign: 'center' }}>Planning</th>
                                    <th style={{ textAlign: 'center' }}>Design</th>
                                    <th style={{ textAlign: 'center' }}>Purchase</th>
                                    <th style={{ textAlign: 'center' }}>Factory</th>
                                    <th style={{ textAlign: 'center' }}>Site</th>
                                    <th style={{ textAlign: 'center', background: '#eff6ff' }}>OVERALL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProjects.map(project => (
                                    <tr key={project.id} className={styles.matrixRow} onClick={() => openProjectDetails(project)} style={{ cursor: 'pointer' }}>
                                        <td>
                                            <div style={{ fontWeight: '600', color: '#1e293b' }}>{project.name}</div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{project.code || 'NO CODE'}</div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className={styles.matrixVal}>{project.planning_kickstart || 0}%</div>
                                            <div className={styles.matrixBar}><div style={{ width: `${project.planning_kickstart || 0}%`, background: '#3b82f6' }}></div></div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className={styles.matrixVal}>{project.shop_drawing || project.design_percentage || 0}%</div>
                                            <div className={styles.matrixBar}><div style={{ width: `${project.shop_drawing || 0}%`, background: '#10b981' }}></div></div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className={styles.matrixVal}>
                                                {project.effectiveMRF}% 
                                                <span style={{ fontSize: '0.65rem', color: '#94a3b8', display: 'block' }}>Appr: {project.mrfApproval}%</span>
                                            </div>
                                            <div className={styles.matrixBar}><div style={{ width: `${project.effectiveMRF || 0}%`, background: '#8b5cf6' }}></div></div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className={styles.matrixVal}>{project.production || 0}%</div>
                                            <div className={styles.matrixBar}><div style={{ width: `${project.production || 0}%`, background: '#f59e0b' }}></div></div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <div className={styles.matrixVal}>{project.site_work || 0}%</div>
                                            <div className={styles.matrixBar}><div style={{ width: `${project.site_work || 0}%`, background: '#06b6d4' }}></div></div>
                                        </td>
                                        <td style={{ textAlign: 'center', background: '#f8fafc', fontWeight: 'bold', color: '#1e293b' }}>
                                            {project.currentProgress}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className={styles.tableCard}>
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Project Details</th>
                                    <th>Schedule</th>
                                    <th>Progress</th>
                                    <th>Performance</th>
                                    <th>Status</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProjects.map(project => (
                                    <tr key={project.id} className={styles.tableRow}>
                                        <td data-label="Project Details">
                                            <div className={styles.projectNameCell}>
                                                <span className={styles.pName}>{project.name}</span>
                                                <span className={styles.pCoordinator}><User size={12} /> {project.coordinator || 'Unassigned'}</span>
                                            </div>
                                        </td>
                                        <td data-label="Schedule">
                                            <div className={styles.pDates}>
                                                <span>Starts: {new Date(project.start_date).toLocaleDateString()}</span>
                                                <span>Ends: {new Date(project.end_date).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td data-label="Progress">
                                            <div className={styles.progressCell}>
                                                <div className={styles.progressBarBg}>
                                                    <div 
                                                        className={styles.progressBarFill} 
                                                        style={{ 
                                                            width: `${project.currentProgress}%`,
                                                            background: project.statusColor === 'red' ? '#ef4444' : 
                                                                        project.statusColor === 'yellow' ? '#f59e0b' : '#3b82f6'
                                                        }}
                                                    ></div>
                                                </div>
                                                <span className={styles.progressText}>{project.currentProgress}%</span>
                                            </div>
                                        </td>
                                        <td data-label="Performance">
                                            <div className={styles.predictionCell}>
                                                <div className={styles.speedBadge}>
                                                    <TrendingUp size={12} /> {project.speed}% / day
                                                </div>
                                                <div className={styles.expectedDate}>
                                                    Exp. completion: {project.expectedDate ? project.expectedDate.toLocaleDateString() : 'N/A'}
                                                </div>
                                                {project.delayDays > 0 && (
                                                    <div className={styles.delayTag} style={{ color: '#ef4444', fontWeight: 'bold' }}>
                                                        🚨 {project.delayDays} Days Delay
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td data-label="Status">
                                            <span className={`${styles.statusBadge} ${styles[project.status.toLowerCase().replace(' ', '')]}`}>
                                                {project.status === 'On Track' && <CheckCircle2 size={12} />}
                                                {project.status}
                                            </span>
                                        </td>
                                        <td>
                                            <button className={styles.detailsBtn} onClick={() => openProjectDetails(project)}>
                                                <ChevronRight size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Project Detail Modal */}
            {isModalOpen && selectedProject && (
                <div className={styles.modalOverlay} onClick={() => setIsModalOpen(false)}>
                    <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <header className={styles.modalHeader}>
                            <div>
                                <h2 className={styles.modalTitle}>{selectedProject.name}</h2>
                                <p className={styles.modalSubtitle}>Update History & Detailed Performance</p>
                            </div>
                            <button className={styles.closeBtn} onClick={() => setIsModalOpen(false)}>
                                <X size={24} />
                            </button>
                        </header>

                        <div className={styles.modalGrid}>
                            <div className={styles.historyList}>
                                <h3 className={styles.historyTitle}><History size={18} /> Current Project Status</h3>
                                <div className={styles.historyCard}>
                                    <div className={styles.historyBody}>
                                        <div className={styles.historyProgress}>
                                            <div className={styles.hProgressLabel}>Current Overall Progress: <strong>{selectedProject.currentProgress}%</strong></div>
                                            <div className={styles.hProgressBar}><div style={{ width: `${selectedProject.currentProgress}%` }}></div></div>
                                        </div>
                                        <div className={styles.breakdownGrid}>
                                            {/* Group: Project Coordinators */}
                                            <div className={styles.breakdownItem} style={{ gridColumn: '1 / -1', borderBottom: '1px solid #eef2f6', marginBottom: '4px', paddingBottom: '4px' }}>
                                                <span style={{ color: '#3b82f6', fontSize: '0.75rem' }}>PROJECT COORDINATOR TEAM</span>
                                            </div>
                                            <div 
                                                className={`${styles.breakdownItem} ${styles.popoverContainer} ${styles.breakdownItemClickable}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActivePopover(activePopover === `plan-current` ? null : `plan-current`);
                                                }}
                                            >
                                                <span className={styles.labelLong}>Planning & Kick Start:</span>
                                                <span className={styles.labelShort}>Planning:</span>
                                                <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {selectedProject.planning_kickstart}% <ChevronRight size={14} style={{ transform: activePopover === `plan-current` ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                                </strong>

                                                {activePopover === `plan-current` && (
                                                    <div className={styles.popoverOverlay} onClick={e => e.stopPropagation()}>
                                                        <div className={styles.popoverTitle}>
                                                            <span>Planning Breakdown</span>
                                                            <button className={styles.popoverClose} onClick={() => setActivePopover(null)}><X size={14} /></button>
                                                        </div>
                                                        {[
                                                            { label: 'Site Pooja', short: 'Pooja', value: selectedProject.site_pooja },
                                                            { label: 'Office Documentation', short: 'Office Doc', value: selectedProject.office_documentation },
                                                            { label: 'Sample Arr. (Moodboard)', short: 'Moodboard', value: selectedProject.sample_moodboard }
                                                        ].map((item, idx) => (
                                                            <div key={idx} className={styles.popoverItem}>
                                                                <div className={styles.popoverLabel}>
                                                                    <span className={styles.labelLong}>{item.label}</span>
                                                                    <span className={styles.labelShort}>{item.short}</span>
                                                                    <span className={styles.popoverValue}>{item.value}%</span>
                                                                </div>
                                                                <div className={styles.pMiniBar}>
                                                                    <div className={styles.pMiniFill} style={{ width: `${item.value}%` }}></div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Group: Design Team */}
                                            <div className={styles.breakdownItem} style={{ gridColumn: '1 / -1', borderBottom: '1px solid #eef2f6', margin: '8px 0 4px', paddingBottom: '4px' }}>
                                                <span style={{ color: '#10b981', fontSize: '0.75rem' }}>DESIGN TEAM</span>
                                            </div>
                                            <div className={styles.breakdownItem}>
                                                <span className={styles.labelLong}>Shop Drawing (Initial):</span>
                                                <span className={styles.labelShort}>Shop Drw (I):</span>
                                                <strong>{selectedProject.shop_drawing}%</strong>
                                            </div>
                                            <div className={styles.breakdownItem}>
                                                <span className={styles.labelLong}>Line Drawing:</span>
                                                <span className={styles.labelShort}>Line Drw:</span>
                                                <strong>{selectedProject.line_drawing}%</strong>
                                            </div>
                                            <div className={styles.breakdownItem}>
                                                <span className={styles.labelLong}>Review & Revisions:</span>
                                                <span className={styles.labelShort}>Review:</span>
                                                <strong>{selectedProject.review_revisions}%</strong>
                                            </div>
                                            <div className={styles.breakdownItem}>
                                                <span className={styles.labelLong}>MRF Approval:</span>
                                                <span className={styles.labelShort}>MRF Appr:</span>
                                                <strong style={{ color: '#10b981' }}>{selectedProject.mrf_approval}%</strong>
                                            </div>
                                            <div className={styles.breakdownItem}>
                                                <span className={styles.labelLong}>Shop Drawing (Final):</span>
                                                <span className={styles.labelShort}>Shop Drw (F):</span>
                                                <strong>{selectedProject.shop_drawing_final}%</strong>
                                            </div>
                                            <div className={styles.breakdownItem}>
                                                <span className={styles.labelLong}>Cutting Plan:</span>
                                                <span className={styles.labelShort}>Cutting Plan:</span>
                                                <strong>{selectedProject.cutting_plan}%</strong>
                                            </div>
                                            <div className={styles.breakdownItem}>
                                                <span className={styles.labelLong}>Finishes List:</span>
                                                <span className={styles.labelShort}>Finishes:</span>
                                                <strong>{selectedProject.finishes_list}%</strong>
                                            </div>

                                            {/* Group: Purchase Team */}
                                            <div className={styles.breakdownItem} style={{ gridColumn: '1 / -1', borderBottom: '1px solid #eef2f6', margin: '8px 0 4px', paddingBottom: '4px' }}>
                                                <span style={{ color: '#8b5cf6', fontSize: '0.75rem' }}>PURCHASE TEAM</span>
                                            </div>
                                            <div className={styles.breakdownItem}>
                                                <span className={styles.labelLong}>MRF Status ({selectedProject.mrf_approval || 0}%):</span>
                                                <span className={styles.labelShort}>MRF ({selectedProject.mrf_approval || 0}%):</span>
                                                <strong style={{ color: selectedProject.mrf_status > selectedProject.mrf_approval ? '#ef4444' : 'inherit' }}>
                                                    {selectedProject.effectiveMRF}%
                                                </strong>
                                            </div>
                                            <div className={styles.breakdownItem}>
                                                <span className={styles.labelLong}>Raw Materials:</span>
                                                <span className={styles.labelShort}>Raw Mat:</span>
                                                <strong>{selectedProject.raw_materials}%</strong>
                                            </div>
                                            <div className={styles.breakdownItem}>
                                                <span className={styles.labelLong}>Long Lead Materials:</span>
                                                <span className={styles.labelShort}>Long Lead:</span>
                                                <strong>{selectedProject.long_lead_materials}%</strong>
                                            </div>
                                            <div className={styles.breakdownItem}>
                                                <span className={styles.labelLong}>Finishes & Accessories:</span>
                                                <span className={styles.labelShort}>Accessories:</span>
                                                <strong>{selectedProject.finishes_accessories}%</strong>
                                            </div>
                                            <div className={styles.breakdownItem}>
                                                <span className={styles.labelLong}>Material Delivery:</span>
                                                <span className={styles.labelShort}>Delivery:</span>
                                                <strong>{selectedProject.material_delivery}%</strong>
                                            </div>

                                            {/* Group: Factory */}
                                            <div className={styles.breakdownItem} style={{ gridColumn: '1 / -1', borderBottom: '1px solid #eef2f6', margin: '8px 0 4px', paddingBottom: '4px' }}>
                                                <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>FACTORY TEAM</span>
                                            </div>
                                            <div 
                                                className={`${styles.breakdownItem} ${styles.popoverContainer} ${styles.breakdownItemClickable}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActivePopover(activePopover === `prod-current` ? null : `prod-current`);
                                                }}
                                            >
                                                <span className={styles.labelLong}>Production Overall:</span>
                                                <span className={styles.labelShort}>Production:</span>
                                                <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {selectedProject.production}% <ChevronRight size={14} style={{ transform: activePopover === `prod-current` ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                                </strong>

                                                {activePopover === `prod-current` && (
                                                    <div className={styles.popoverOverlay} onClick={e => e.stopPropagation()}>
                                                        <div className={styles.popoverTitle}>
                                                            <span>Production Breakdown</span>
                                                            <button className={styles.popoverClose} onClick={() => setActivePopover(null)}><X size={14} /></button>
                                                        </div>
                                                        {[
                                                            { label: 'Cutting/Panelling', short: 'Cutting', value: selectedProject.cutting_panelling },
                                                            { label: 'Assembly', short: 'Assembly', value: selectedProject.assembly },
                                                            { label: 'Polishing', short: 'Polishing', value: selectedProject.polishing },
                                                            { label: 'Final Finishing', short: 'Finishing', value: selectedProject.final_finishing },
                                                            { label: 'Packing & Forwarding', short: 'Packing', value: selectedProject.packing_forwarding }
                                                        ].map((item, idx) => (
                                                            <div key={idx} className={styles.popoverItem}>
                                                                <div className={styles.popoverLabel}>
                                                                    <span className={styles.labelLong}>{item.label}</span>
                                                                    <span className={styles.labelShort}>{item.short}</span>
                                                                    <span className={styles.popoverValue}>{item.value}%</span>
                                                                </div>
                                                                <div className={styles.pMiniBar}>
                                                                    <div className={styles.pMiniFill} style={{ width: `${item.value}%` }}></div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Group: Site Engineers */}
                                            <div className={styles.breakdownItem} style={{ gridColumn: '1 / -1', borderBottom: '1px solid #eef2f6', margin: '8px 0 4px', paddingBottom: '4px' }}>
                                                <span style={{ color: '#06b6d4', fontSize: '0.75rem' }}>SITE ENGINEERS TEAM</span>
                                            </div>
                                            <div className={styles.breakdownItem}>
                                                <span className={styles.labelLong}>Site Measurement:</span>
                                                <span className={styles.labelShort}>Measurement:</span>
                                                <strong>{selectedProject.site_measurement}%</strong>
                                            </div>
                                            <div className={styles.breakdownItem}>
                                                <span className={styles.labelLong}>Site Marking:</span>
                                                <span className={styles.labelShort}>Marking:</span>
                                                <strong>{selectedProject.site_marking}%</strong>
                                            </div>
                                            <div className={styles.breakdownItem}>
                                                <span className={styles.labelLong}>Site Installation:</span>
                                                <span className={styles.labelShort}>Installation:</span>
                                                <strong>{selectedProject.site_installation}%</strong>
                                            </div>
                                            <div 
                                                className={`${styles.breakdownItem} ${styles.popoverContainer} ${styles.breakdownItemClickable}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setActivePopover(activePopover === `site-current` ? null : `site-current`);
                                                }}
                                            >
                                                <span className={styles.labelLong}>Site Work (Overall):</span>
                                                <span className={styles.labelShort}>Site Work:</span>
                                                <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                    {selectedProject.site_work}% <ChevronRight size={14} style={{ transform: activePopover === `site-current` ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                                </strong>

                                                {activePopover === `site-current` && (
                                                    <div className={styles.popoverOverlay} onClick={e => e.stopPropagation()}>
                                                        <div className={styles.popoverTitle}>
                                                            <span>Site Breakdown</span>
                                                            <button className={styles.popoverClose} onClick={() => setActivePopover(null)}><X size={14} /></button>
                                                        </div>
                                                        {[
                                                            { label: 'Civil Work', short: 'Civil', value: selectedProject.civil_work },
                                                            { label: 'False Ceiling', short: 'Ceiling', value: selectedProject.false_ceiling },
                                                            { label: 'Carpentry', short: 'Carpentry', value: selectedProject.carpentry_work },
                                                            { label: 'Painting', short: 'Painting', value: selectedProject.painting }
                                                        ].map((item, idx) => (
                                                            <div key={idx} className={styles.popoverItem}>
                                                                <div className={styles.popoverLabel}>
                                                                    <span className={styles.labelLong}>{item.label}</span>
                                                                    <span className={styles.labelShort}>{item.short}</span>
                                                                    <span className={styles.popoverValue}>{item.value}%</span>
                                                                </div>
                                                                <div className={styles.pMiniBar}>
                                                                    <div className={styles.pMiniFill} style={{ width: `${item.value}%` }}></div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {selectedProject.remarks && <p className={styles.hRemarks}>{selectedProject.remarks}</p>}
                                        {selectedProject.file_url && (
                                            <a href={selectedProject.file_url} target="_blank" rel="noreferrer" className={styles.hLink}>
                                                <LinkIcon size={14} /> View Latest Report Attachment
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className={styles.sidebarDetails}>
                                <div className={styles.detailCard}>
                                    <h4>Project Insight</h4>
                                    <div className={styles.insightStat}>
                                        <span>Coordinator</span>
                                        <strong>{selectedProject.coordinator || 'N/A'}</strong>
                                    </div>
                                    <div className={styles.insightStat}>
                                        <span>Designer</span>
                                        <strong>{selectedProject.designer || 'N/A'}</strong>
                                    </div>
                                    <div className={styles.insightStat}>
                                        <span>Site Engineer</span>
                                        <strong>{selectedProject.site_engineer || 'N/A'}</strong>
                                    </div>
                                    <div className={styles.insightStat}>
                                        <span>Current Progress</span>
                                        <strong>{selectedProject.currentProgress}%</strong>
                                    </div>
                                    <div className={styles.insightStat}>
                                        <span>Work Velocity</span>
                                        <strong>{selectedProject.speed}% / day</strong>
                                    </div>
                                    <div className={styles.insightStat}>
                                        <span>Expected End</span>
                                        <strong>{selectedProject.expectedDate ? selectedProject.expectedDate.toLocaleDateString() : 'N/A'}</strong>
                                    </div>
                                    {selectedProject.delayDays > 0 && (
                                        <div className={styles.insightStat} style={{ background: '#fef2f2', padding: '8px', borderRadius: '4px' }}>
                                            <span style={{ color: '#ef4444' }}>Delay Insight</span>
                                            <strong style={{ color: '#ef4444' }}>🚨 {selectedProject.delayDays} Days Delayed</strong>
                                        </div>
                                    )}
                                    <div className={styles.insightStat}>
                                        <span>Target Deadline</span>
                                        <strong>{new Date(selectedProject.end_date).toLocaleDateString()}</strong>
                                    </div>
                                </div>

                                <div className={styles.detailCard}>
                                    <h4 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '8px', marginBottom: '12px' }}>Team Responsibility</h4>
                                    <div className={styles.insightStat}>
                                        <span>Coordination</span>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>{selectedProject.coord_updated_by || 'No Updates'}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{selectedProject.coord_updated_at ? new Date(selectedProject.coord_updated_at).toLocaleDateString() : 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div className={styles.insightStat}>
                                        <span>Design Team</span>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>{selectedProject.design_updated_by || 'No Updates'}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{selectedProject.design_updated_at ? new Date(selectedProject.design_updated_at).toLocaleDateString() : 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div className={styles.insightStat}>
                                        <span>Purchase Team</span>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>{selectedProject.purchase_updated_by || 'No Updates'}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{selectedProject.purchase_updated_at ? new Date(selectedProject.purchase_updated_at).toLocaleDateString() : 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div className={styles.insightStat}>
                                        <span>Factory Team</span>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>{selectedProject.factory_updated_by || 'No Updates'}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{selectedProject.factory_updated_at ? new Date(selectedProject.factory_updated_at).toLocaleDateString() : 'N/A'}</div>
                                        </div>
                                    </div>
                                    <div className={styles.insightStat}>
                                        <span>Site Team</span>
                                        <div>
                                            <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>{selectedProject.site_updated_by || 'No Updates'}</div>
                                            <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{selectedProject.site_updated_at ? new Date(selectedProject.site_updated_at).toLocaleDateString() : 'N/A'}</div>
                                        </div>
                                    </div>
                                </div>

                                {selectedProject.status === 'Delayed' && (
                                    <div className={`${styles.detailCard} ${styles.riskCard}`}>
                                        <AlertTriangle size={24} />
                                        <h5>Delay Warning</h5>
                                        <p>Project is trending {selectedProject.delayDays} days behind schedule based on current speed.</p>
                                    </div>
                                )}
                                
                                {selectedProject.status === 'At Risk' && (
                                    <div className={`${styles.detailCard} ${styles.warnCard}`}>
                                        <Clock size={24} />
                                        <h5>Connectivity Risk</h5>
                                        <p>No status updates received in the last 5 days. Progress monitoring is compromised.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectStatusDashboard;
