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
    const [updates, setUpdates] = useState([]);
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activePopover, setActivePopover] = useState(null); // Track which update's site work detail is open

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        setLoading(true);
        try {
            const { data: projData, error: projError } = await supabase.from('projects').select('*');
            if (projError) throw projError;

            const { data: updateData, error: updateError } = await supabase
                .from('project_status_updates')
                .select('*')
                .order('status_date', { ascending: true });
            if (updateError) throw updateError;

            setProjects(projData || []);
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
            const projectUpdates = updates.filter(u => u.project_id === project.id);
            const latestUpdate = projectUpdates[projectUpdates.length - 1];
            const firstUpdate = projectUpdates[0];
            
            // 1. Calculate Current Progress from the most recent update
            const currentProgress = latestUpdate ? parseFloat(latestUpdate.completion_percentage) : 0;
            
            // 2. Calculate Work Velocity (Average % progress gained per day)
            // Logic: Total progress gain / Total days elapsed
            let speed = 0;
            if (projectUpdates.length > 1) {
                // Calculation across multiple updates
                const daysDiff = (new Date(latestUpdate.status_date) - new Date(firstUpdate.status_date)) / (1000 * 60 * 60 * 24);
                if (daysDiff > 0) {
                    speed = (currentProgress - parseFloat(firstUpdate.completion_percentage)) / daysDiff;
                }
            } else if (latestUpdate && project.start_date) {
                // If only one update exists, calculate speed since project start
                const daysSinceStart = (new Date(latestUpdate.status_date) - new Date(project.start_date)) / (1000 * 60 * 60 * 24);
                if (daysSinceStart > 0) {
                    speed = currentProgress / daysSinceStart;
                }
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
                if (expectedDate && expectedDate > deadline) {
                    status = 'Delayed';
                    statusColor = 'red';
                } else if (latestUpdate) {
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
                currentProgress,
                speed: speed.toFixed(1),
                expectedDate,
                status,
                statusColor,
                delayDays,
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

    if (loading) return <LoadingScreen message="Loading project dashboard..." />;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerTitles}>
                    <h1 className={styles.title}>Project Status Dashboard</h1>
                    <p className={styles.subtitle}>Real-time performance metrics and predictive analytics</p>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.exportBtn} onClick={() => window.print()}>
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

            {/* Project Table */}
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
                                    <td>
                                        <div className={styles.projectNameCell}>
                                            <span className={styles.pName}>{project.name}</span>
                                            <span className={styles.pCoordinator}><User size={12} /> {project.coordinator || 'Unassigned'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={styles.pDates}>
                                            <span>Starts: {new Date(project.start_date).toLocaleDateString()}</span>
                                            <span>Ends: {new Date(project.end_date).toLocaleDateString()}</span>
                                        </div>
                                    </td>
                                    <td>
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
                                    <td>
                                        <div className={styles.predictionCell}>
                                            <div className={styles.speedBadge}>
                                                <TrendingUp size={12} /> {project.speed}% / day
                                            </div>
                                            <div className={styles.expectedDate}>
                                                Exp. completion: {project.expectedDate ? project.expectedDate.toLocaleDateString() : 'N/A'}
                                            </div>
                                            {project.delayDays > 0 && (
                                                <div className={styles.delayTag}>
                                                    <ArrowDownRight size={12} /> {project.delayDays} days delay
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td>
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
                                <h3 className={styles.historyTitle}><History size={18} /> Complete Update Log</h3>
                                {selectedProject.history.length > 0 ? selectedProject.history.map((h) => (
                                    <div key={h.id} className={styles.historyCard}>
                                        <div className={styles.historyHeader}>
                                            <span className={styles.historyUser}><User size={12} /> {h.username}</span>
                                            <span className={styles.historyDate}>{new Date(h.status_date).toLocaleDateString()}</span>
                                        </div>
                                        <div className={styles.historyBody}>
                                            <div className={styles.historyProgress}>
                                                <div className={styles.hProgressLabel}>Progress reached: <strong>{h.completion_percentage}%</strong></div>
                                                <div className={styles.hProgressBar}><div style={{ width: `${h.completion_percentage}%` }}></div></div>
                                            </div>
                                            <div className={styles.breakdownGrid}>
                                                <div className={styles.breakdownItem}>
                                                    <span className={styles.labelLong}>Planning & Kick Start:</span>
                                                    <span className={styles.labelShort}>Planning:</span>
                                                    <strong>{h.planning_kickstart}%</strong>
                                                </div>
                                                <div className={styles.breakdownItem}>
                                                    <span className={styles.labelLong}>Site Measurement:</span>
                                                    <span className={styles.labelShort}>Measurement:</span>
                                                    <strong>{h.site_measurement}%</strong>
                                                </div>
                                                <div className={styles.breakdownItem}>
                                                    <span className={styles.labelLong}>Site Marking:</span>
                                                    <span className={styles.labelShort}>Marking:</span>
                                                    <strong>{h.site_marking}%</strong>
                                                </div>
                                                <div className={styles.breakdownItem}>
                                                    <span className={styles.labelLong}>Sample Moodboard:</span>
                                                    <span className={styles.labelShort}>Moodboard:</span>
                                                    <strong>{h.sample_moodboard}%</strong>
                                                </div>
                                                <div className={styles.breakdownItem}>
                                                    <span className={styles.labelLong}>Shop Drawing (Initial):</span>
                                                    <span className={styles.labelShort}>Shop Drw (I):</span>
                                                    <strong>{h.shop_drawing}%</strong>
                                                </div>
                                                <div className={styles.breakdownItem}>
                                                    <span className={styles.labelLong}>Finishes List:</span>
                                                    <span className={styles.labelShort}>Finishes:</span>
                                                    <strong>{h.finishes_list}%</strong>
                                                </div>
                                                <div className={styles.breakdownItem}>
                                                    <span className={styles.labelLong}>Shop Drawing (Final):</span>
                                                    <span className={styles.labelShort}>Shop Drw (F):</span>
                                                    <strong>{h.shop_drawing_final}%</strong>
                                                </div>
                                                <div className={styles.breakdownItem}>
                                                    <span className={styles.labelLong}>MRF Status:</span>
                                                    <span className={styles.labelShort}>MRF Status:</span>
                                                    <strong>{h.mrf_status}%</strong>
                                                </div>
                                                <div className={styles.breakdownItem}>
                                                    <span className={styles.labelLong}>Production:</span>
                                                    <span className={styles.labelShort}>Production:</span>
                                                    <strong>{h.production}%</strong>
                                                </div>
                                                <div className={styles.breakdownItem}>
                                                    <span className={styles.labelLong}>Material Delivery:</span>
                                                    <span className={styles.labelShort}>Delivery:</span>
                                                    <strong>{h.material_delivery}%</strong>
                                                </div>
                                                <div className={styles.breakdownItem}>
                                                    <span className={styles.labelLong}>Site Installation:</span>
                                                    <span className={styles.labelShort}>Installation:</span>
                                                    <strong>{h.site_installation}%</strong>
                                                </div>
                                                <div 
                                                    className={`${styles.breakdownItem} ${styles.popoverContainer} ${styles.breakdownItemClickable}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActivePopover(activePopover === h.id ? null : h.id);
                                                    }}
                                                >
                                                    <span className={styles.labelLong}>Site Work (Overall):</span>
                                                    <span className={styles.labelShort}>Site Work:</span>
                                                    <strong style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        {h.site_work}% <ChevronRight size={14} style={{ transform: activePopover === h.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                                    </strong>

                                                    {activePopover === h.id && (
                                                        <div className={styles.popoverOverlay} onClick={e => e.stopPropagation()}>
                                                            <div className={styles.popoverTitle}>
                                                                <span>Site Breakdown</span>
                                                                <button className={styles.popoverClose} onClick={() => setActivePopover(null)}><X size={14} /></button>
                                                            </div>
                                                            {[
                                                                { label: 'Civil Work', short: 'Civil', value: h.civil_work },
                                                                { label: 'False Ceiling', short: 'Ceiling', value: h.false_ceiling },
                                                                { label: 'Carpentry', short: 'Carpentry', value: h.carpentry_work },
                                                                { label: 'Painting', short: 'Painting', value: h.painting }
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
                                            <p className={styles.hRemarks}>{h.remarks}</p>
                                            {h.file_url && (
                                                <a href={h.file_url} target="_blank" rel="noreferrer" className={styles.hLink}>
                                                    <LinkIcon size={14} /> View Report Attachment
                                                </a>
                                            )}
                                        </div>
                                    </div>
                                )) : (
                                    <p className={styles.noHistory}>No updates posted for this project yet.</p>
                                )}
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
                                    <div className={styles.insightStat}>
                                        <span>Target Deadline</span>
                                        <strong>{new Date(selectedProject.end_date).toLocaleDateString()}</strong>
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
