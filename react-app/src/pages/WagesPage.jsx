import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useMessage } from '../context/MessageContext';
import { Button } from '../components/ui/Button';
import { LoadingOverlay } from '../components/ui';
import {
    Calendar,
    Users,
    ArrowLeft,
    Save,
    Clock,
    UserPlus,
    Trash2,
    Edit,
    ClipboardList,
    DollarSign,
    Briefcase
} from 'lucide-react';
import styles from './WagesPage.module.css';

const WagesPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { alert, confirm, toast } = useMessage();

    const [activeTab, setActiveTab] = useState('attendance');
    const [loading, setLoading] = useState(false);

    // Data States
    const [sites, setSites] = useState([]);
    const [siteEngineers, setSiteEngineers] = useState([]);
    const [labors, setLabors] = useState([]);

    // Filter States
    const [selectedSite, setSelectedSite] = useState('');
    const [selectedEngineer, setSelectedEngineer] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

    // Labor Management States
    const [laborModalOpen, setLaborModalOpen] = useState(false);
    const [editingLabor, setEditingLabor] = useState(null);
    const [laborForm, setLaborForm] = useState({
        name: '', phone: '', site_id: '', engineer_id: '', daily_rate: 0, status: 'Active'
    });

    // Site Engineer Management States
    const [engModalOpen, setEngModalOpen] = useState(false);
    const [editingEng, setEditingEng] = useState(null);
    const [engForm, setEngForm] = useState({
        name: '', phone: '', site_id: '', status: 'Active'
    });

    // Attendance Entry Table State
    const [attendanceEntry, setAttendanceEntry] = useState({});

    // Reports State
    const [reportWeek, setReportWeek] = useState(getWeekOfYear(new Date()));
    const [weeklyReports, setWeeklyReports] = useState([]);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [sitesRes, engRes, laborsRes] = await Promise.all([
                supabase.from('sites').select('*').order('name'),
                supabase.from('site_engineers').select('*, sites(name)').order('name'),
                supabase.from('labors').select('*, sites(name), site_engineers(name)')
            ]);

            if (sitesRes.error) throw sitesRes.error;
            if (engRes.error) throw engRes.error;
            if (laborsRes.error) throw laborsRes.error;

            setSites(sitesRes.data || []);
            setSiteEngineers(engRes.data || []);
            setLabors(laborsRes.data || []);

            if (sitesRes.data?.length > 0) setSelectedSite(sitesRes.data[0].id);

        } catch (error) {
            console.error('Error fetching data:', error);
            alert('Error loading data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- ATTENDANCE LOGIC ---

    const fetchAttendance = async () => {
        if (!selectedSite || !selectedDate) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('labor_attendance_wages')
                .select('*')
                .eq('site_id', selectedSite)
                .eq('work_date', selectedDate);

            if (error) throw error;

            const lookup = {};
            data.forEach(rec => {
                lookup[rec.labor_id] = {
                    status: rec.attendance,
                    wages: rec.wages_amount,
                    remarks: rec.remarks,
                    id: rec.id
                };
            });
            setAttendanceEntry(lookup);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'attendance') fetchAttendance();
    }, [selectedSite, selectedDate, activeTab]);

    const handleAttendanceChange = (laborId, field, value) => {
        setAttendanceEntry(prev => ({
            ...prev,
            [laborId]: {
                ...prev[laborId] || { status: 'Present', wages: labors.find(l => l.id === laborId)?.daily_rate || 0 },
                [field]: value
            }
        }));
    };

    const saveAttendance = async () => {
        setLoading(true);
        try {
            const updates = [];
            const filteredLabors = labors.filter(l =>
                l.status === 'Active' && l.site_id == selectedSite &&
                (!selectedEngineer || l.engineer_id === selectedEngineer)
            );

            for (const labor of filteredLabors) {
                const entry = attendanceEntry[labor.id] || { status: 'Present', wages: labor.daily_rate };
                const payload = {
                    labor_id: labor.id,
                    site_id: selectedSite,
                    engineer_id: labor.engineer_id || null,
                    work_date: selectedDate,
                    attendance: entry.status || 'Present',
                    wages_amount: parseFloat(entry.wages) || 0,
                    remarks: entry.remarks || '',
                    payment_week: getWeekOfYear(new Date(selectedDate))
                };
                if (entry.id) updates.push(supabase.from('labor_attendance_wages').update(payload).eq('id', entry.id));
                else updates.push(supabase.from('labor_attendance_wages').insert([payload]));
            }
            const results = await Promise.all(updates);
            if (results.some(r => r.error)) throw new Error('Some entries failed to save.');
            toast('Attendance saved!');
            fetchAttendance();
        } catch (error) { alert(error.message); }
        finally { setLoading(false); }
    };

    // --- LABOR CRUD ---

    const openLaborModal = (lab = null) => {
        if (lab) {
            setEditingLabor(lab.id);
            setLaborForm({
                name: lab.name, phone: lab.phone || '', site_id: lab.site_id || '',
                engineer_id: lab.engineer_id || '', daily_rate: lab.daily_rate || 0, status: lab.status || 'Active'
            });
        } else {
            setEditingLabor(null);
            setLaborForm({ name: '', phone: '', site_id: selectedSite, engineer_id: '', daily_rate: 0, status: 'Active' });
        }
        setLaborModalOpen(true);
    };

    const saveLabor = async () => {
        if (!laborForm.name) return alert('Name is required');
        setLoading(true);
        try {
            const payload = { ...laborForm };
            if (!payload.site_id) payload.site_id = null;
            if (!payload.engineer_id) payload.engineer_id = null;

            if (editingLabor) await supabase.from('labors').update(payload).eq('id', editingLabor);
            else await supabase.from('labors').insert([payload]);

            setLaborModalOpen(false);
            fetchInitialData();
            toast('Labor saved!');
        } catch (error) { alert(error.message); }
        finally { setLoading(false); }
    };

    // --- SITE ENGINEER CRUD ---

    const openEngModal = (eng = null) => {
        if (eng) {
            setEditingEng(eng.id);
            setEngForm({ name: eng.name, phone: eng.phone || '', site_id: eng.site_id || '', status: eng.status || 'Active' });
        } else {
            setEditingEng(null);
            setEngForm({ name: '', phone: '', site_id: selectedSite, status: 'Active' });
        }
        setEngModalOpen(true);
    };

    const saveEng = async () => {
        if (!engForm.name) return alert('Name is required');
        setLoading(true);
        try {
            const payload = { ...engForm };
            if (!payload.site_id) payload.site_id = null;
            if (editingEng) await supabase.from('site_engineers').update(payload).eq('id', editingEng);
            else await supabase.from('site_engineers').insert([payload]);
            setEngModalOpen(false);
            fetchInitialData();
            toast('Site Engineer saved!');
        } catch (error) { alert(error.message); }
        finally { setLoading(false); }
    };

    const deleteItem = async (table, id) => {
        if (!await confirm(`Delete this ${table.slice(0, -1).replace('_', ' ')}?`)) return;
        setLoading(true);
        try {
            await supabase.from(table).delete().eq('id', id);
            fetchInitialData();
            toast('Deleted.');
        } catch (error) { alert(error.message); }
        finally { setLoading(false); }
    };

    // --- REPORTS ---

    const fetchWeeklyReport = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('labor_attendance_wages')
                .select('*, labors(name, phone)')
                .eq('payment_week', reportWeek);
            if (error) throw error;
            const grouped = {};
            data.forEach(rec => {
                const lid = rec.labor_id;
                if (!grouped[lid]) {
                    grouped[lid] = { name: rec.labors?.name || 'Unknown', phone: rec.labors?.phone || '-', total_wages: 0, days_present: 0, records: [], status: 'Paid' };
                }
                grouped[lid].total_wages += parseFloat(rec.wages_amount) || 0;
                if (rec.attendance !== 'Absent') grouped[lid].days_present += (rec.attendance === 'Half Day' ? 0.5 : 1);
                grouped[lid].records.push(rec);
                if (rec.payment_status === 'Pending') grouped[lid].status = 'Pending';
            });
            setWeeklyReports(Object.values(grouped));
        } catch (error) { console.error(error); }
        finally { setLoading(false); }
    };

    useEffect(() => { if (activeTab === 'reports') fetchWeeklyReport(); }, [reportWeek, activeTab]);

    const markAsPaid = async (report) => {
        if (!await confirm(`Mark all records for ${report.name} as PAID for ${reportWeek}?`)) return;
        setLoading(true);
        try {
            const ids = report.records.map(r => r.id);
            const { error } = await supabase
                .from('labor_attendance_wages')
                .update({ payment_status: 'Paid' })
                .in('id', ids);
            if (error) throw error;
            toast('Marked as Paid!');
            fetchWeeklyReport();
        } catch (error) { alert(error.message); }
        finally { setLoading(false); }
    };

    function getWeekOfYear(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 4 - (d.getDay() || 7));
        const yearStart = new Date(d.getFullYear(), 0, 1);
        const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
        return `${d.getFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
    };

    // --- RENDERERS ---

    const renderAttendance = () => {
        const filteredLabors = labors.filter(l =>
            l.status === 'Active' && l.site_id == selectedSite && (!selectedEngineer || l.engineer_id === selectedEngineer)
        );
        return (
            <div className={styles.card}>
                <div className={styles.formGrid}>
                    <div className={styles.formGroup}><label className={styles.label}>Site</label><select className={styles.input} value={selectedSite} onChange={e => setSelectedSite(e.target.value)}><option value="">-- Select Site --</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    <div className={styles.formGroup}><label className={styles.label}>Engineer Filter</label><select className={styles.input} value={selectedEngineer} onChange={e => setSelectedEngineer(e.target.value)}><option value="">-- All --</option>{siteEngineers.filter(e => e.site_id == selectedSite).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                    <div className={styles.formGroup}><label className={styles.label}>Date</label><input type="date" className={styles.input} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div>
                </div>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead><tr><th>Labor</th><th>Attendance</th><th>Wage</th><th>Remarks</th></tr></thead>
                        <tbody>
                            {filteredLabors.map(l => {
                                const entry = attendanceEntry[l.id] || { status: 'Present', wages: l.daily_rate };
                                return (
                                    <tr key={l.id}>
                                        <td><strong>{l.name}</strong><br /><small>{l.phone}</small></td>
                                        <td>
                                            <div className={styles.attendanceBtns}>
                                                {['Present', 'Half Day', 'Absent'].map(st => (
                                                    <button key={st} className={`${styles.attnBtn} ${st === 'Present' ? styles.btnP : st === 'Half Day' ? styles.btnH : styles.btnA} ${entry.status === st ? (st === 'Present' ? styles.activeP : st === 'Half Day' ? styles.activeH : styles.activeA) : ''}`} onClick={() => handleAttendanceChange(l.id, 'status', st)}>{st[0]}</button>
                                                ))}
                                            </div>
                                        </td>
                                        <td><input type="number" className={styles.input} style={{ width: '80px' }} value={entry.wages} onChange={e => handleAttendanceChange(l.id, 'wages', e.target.value)} disabled={entry.status === 'Absent'} /></td>
                                        <td><input type="text" className={styles.input} value={entry.remarks || ''} onChange={e => handleAttendanceChange(l.id, 'remarks', e.target.value)} /></td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredLabors.length > 0 && <div className={styles.actions}><Button onClick={saveAttendance}><Save size={18} style={{ marginRight: 8 }} /> Save Daily Log</Button></div>}
            </div>
        );
    };

    const renderEngineers = () => (
        <div className={styles.card}>
            <div className={styles.header}><h3 className={styles.title} style={{ fontSize: '1.1rem' }}>Site Engineers Registry</h3><Button onClick={() => openEngModal()}><UserPlus size={18} style={{ marginRight: 8 }} /> Add Engineer</Button></div>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead><tr><th>Name</th><th>Phone</th><th>Site</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        {siteEngineers.map(e => (
                            <tr key={e.id}><td><strong>{e.name}</strong></td><td>{e.phone}</td><td>{e.sites?.name}</td><td><span className={`${styles.badge} ${e.status === 'Active' ? styles.badgePaid : styles.badgePending}`}>{e.status}</span></td><td><button onClick={() => openEngModal(e)} className={styles.attnBtn}><Edit size={14} /></button><button onClick={() => deleteItem('site_engineers', e.id)} className={`${styles.attnBtn} ${styles.btnA}`}><Trash2 size={14} /></button></td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderLaborsList = () => (
        <div className={styles.card}>
            <div className={styles.header}><h3 className={styles.title} style={{ fontSize: '1.1rem' }}>Labor Personnel</h3><Button onClick={() => openLaborModal()}><UserPlus size={18} style={{ marginRight: 8 }} /> Add Labor</Button></div>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead><tr><th>Name</th><th>Phone</th><th>Site</th><th>Engineer</th><th>Rate</th><th>Status</th><th>Actions</th></tr></thead>
                    <tbody>
                        {labors.map(l => (
                            <tr key={l.id}><td><strong>{l.name}</strong></td><td>{l.phone}</td><td>{l.sites?.name}</td><td>{l.site_engineers?.name || '-'}</td><td>₹{l.daily_rate}</td><td><span className={`${styles.badge} ${l.status === 'Active' ? styles.badgePaid : styles.badgePending}`}>{l.status}</span></td><td><button onClick={() => openLaborModal(l)} className={styles.attnBtn}><Edit size={14} /></button><button onClick={() => deleteItem('labors', l.id)} className={`${styles.attnBtn} ${styles.btnA}`}><Trash2 size={14} /></button></td></tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderReports = () => (
        <div className={styles.card}>
            <div className={styles.formGrid}><div className={styles.formGroup}><label className={styles.label}>Select Week</label><input type="week" className={styles.input} value={reportWeek} onChange={e => setReportWeek(e.target.value)} /></div></div>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead><tr><th>Labor Name</th><th>Days Worked</th><th>Total Wages</th><th>Status</th><th>Action</th></tr></thead>
                    <tbody>
                        {weeklyReports.map((r, i) => (
                            <tr key={i}>
                                <td><strong>{r.name}</strong><br /><small>{r.phone}</small></td>
                                <td>{r.days_present} days</td>
                                <td style={{ fontWeight: 700 }}>₹{r.total_wages.toLocaleString()}</td>
                                <td><span className={`${styles.badge} ${r.status === 'Paid' ? styles.badgePaid : styles.badgePending}`}>{r.status}</span></td>
                                <td>{r.status !== 'Paid' && <Button size="sm" variant="outline" onClick={() => markAsPaid(r)}>Mark Paid</Button>}</td>
                            </tr>
                        ))}
                        {weeklyReports.length === 0 && <tr><td colSpan="5" style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>No payment records found.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className={styles.container}>
            {loading && <LoadingOverlay message="Processing..." />}
            <header className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}><button onClick={() => navigate('/')} className={styles.attnBtn}><ArrowLeft size={20} /></button><h1 className={styles.title}>Labor Wages Module</h1></div>
            </header>

            <div className={styles.tabs}>
                <div className={`${styles.tab} ${activeTab === 'attendance' ? styles.activeTab : ''}`} onClick={() => setActiveTab('attendance')}><ClipboardList size={18} style={{ marginRight: 6 }} /> Daily Log</div>
                <div className={`${styles.tab} ${activeTab === 'reports' ? styles.activeTab : ''}`} onClick={() => setActiveTab('reports')}><DollarSign size={18} style={{ marginRight: 6 }} /> Weekly Payments</div>
                <div className={`${styles.tab} ${activeTab === 'engineers' ? styles.activeTab : ''}`} onClick={() => setActiveTab('engineers')}><Briefcase size={18} style={{ marginRight: 6 }} /> Site Engineers</div>
                <div className={`${styles.tab} ${activeTab === 'labors' ? styles.activeTab : ''}`} onClick={() => setActiveTab('labors')}><Users size={18} style={{ marginRight: 6 }} /> Labors</div>
            </div>

            {activeTab === 'attendance' && renderAttendance()}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'engineers' && renderEngineers()}
            {activeTab === 'labors' && renderLaborsList()}

            {laborModalOpen && (
                <div className={styles.modalOverlay}><div className={styles.modal}><h3>{editingLabor ? 'Edit' : 'New'} Labor</h3><br />
                    <div className={styles.formGroup}><label className={styles.label}>Name</label><input className={styles.input} value={laborForm.name} onChange={e => setLaborForm({ ...laborForm, name: e.target.value })} /></div>
                    <div className={styles.formGroup}><label className={styles.label}>Phone</label><input className={styles.input} value={laborForm.phone} onChange={e => setLaborForm({ ...laborForm, phone: e.target.value })} /></div>
                    <div className={styles.formGroup}><label className={styles.label}>Daily Rate</label><input type="number" className={styles.input} value={laborForm.daily_rate} onChange={e => setLaborForm({ ...laborForm, daily_rate: e.target.value })} /></div>
                    <div className={styles.formGroup}><label className={styles.label}>Site</label><select className={styles.input} value={laborForm.site_id} onChange={e => setLaborForm({ ...laborForm, site_id: e.target.value })}><option value="">-- Choose --</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    <div className={styles.formGroup}><label className={styles.label}>Engineer</label><select className={styles.input} value={laborForm.engineer_id} onChange={e => setLaborForm({ ...laborForm, engineer_id: e.target.value })}><option value="">-- Choose --</option>{siteEngineers.filter(e => e.site_id == laborForm.site_id).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></div>
                    <div className={styles.modalActions}><Button variant="secondary" onClick={() => setLaborModalOpen(false)}>Cancel</Button><Button onClick={saveLabor}>Save</Button></div>
                </div></div>
            )}

            {engModalOpen && (
                <div className={styles.modalOverlay}><div className={styles.modal}><h3>{editingEng ? 'Edit' : 'New'} Site Engineer</h3><br />
                    <div className={styles.formGroup}><label className={styles.label}>Name</label><input className={styles.input} value={engForm.name} onChange={e => setEngForm({ ...engForm, name: e.target.value })} /></div>
                    <div className={styles.formGroup}><label className={styles.label}>Phone</label><input className={styles.input} value={engForm.phone} onChange={e => setEngForm({ ...engForm, phone: e.target.value })} /></div>
                    <div className={styles.formGroup}><label className={styles.label}>Assigned Site</label><select className={styles.input} value={engForm.site_id} onChange={e => setEngForm({ ...engForm, site_id: e.target.value })}><option value="">-- Choose --</option>{sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                    <div className={styles.modalActions}><Button variant="secondary" onClick={() => setEngModalOpen(false)}>Cancel</Button><Button onClick={saveEng}>Save</Button></div>
                </div></div>
            )}
        </div>
    );
};

export default WagesPage;
