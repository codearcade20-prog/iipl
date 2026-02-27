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
    Briefcase,
    BarChart2,
    Printer,
    Search
} from 'lucide-react';
import styles from './WagesPage.module.css';

const WagesPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { alert, confirm, toast } = useMessage();

    const [activeTab, setActiveTab] = useState('attendance');
    const [loading, setLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Data States
    const [sites, setSites] = useState([]);
    const [siteEngineers, setSiteEngineers] = useState([]);
    const [labors, setLabors] = useState([]);

    // Filter States
    const [selectedSite, setSelectedSite] = useState('');
    const [selectedEngineer, setSelectedEngineer] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [searchEng, setSearchEng] = useState('');
    const [searchLabor, setSearchLabor] = useState('');

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
    const [rawReportData, setRawReportData] = useState([]);
    const [summaryView, setSummaryView] = useState('all');

    useEffect(() => {
        const loadInitialData = async () => {
            setIsInitialLoad(true);
            try {
                const [sitesRes, engRes, laborsRes] = await Promise.all([
                    supabase.from('sites').select('id, name').order('name'),
                    supabase.from('site_engineers').select('id, name, phone, site_id, status').order('name'),
                    supabase.from('labors').select('id, name, phone, site_id, engineer_id, daily_rate, status')
                ]);

                if (sitesRes.error) throw sitesRes.error;

                const siteData = sitesRes.data || [];
                setSites(siteData);
                setSiteEngineers(engRes.data || []);
                setLabors(laborsRes.data || []);

                // Auto-select first site and fetch its attendance IMMEDIATELY to avoid sequential loaders
                if (siteData.length > 0) {
                    const firstSiteId = siteData[0].id;
                    setSelectedSite(firstSiteId);
                }
            } catch (error) {
                console.error('Initial Load Error:', error);
                alert('Connection unstable. Please refresh or check your internet.');
            } finally {
                setIsInitialLoad(false);
            }
        };

        loadInitialData();
    }, []);

    const fetchInitialData = async () => {
        // Shared fetcher for smaller updates (e.g. after CRUD)
        try {
            const [sitesRes, engRes, laborsRes] = await Promise.all([
                supabase.from('sites').select('*').order('name'),
                supabase.from('site_engineers').select('*, sites(name)').order('name'),
                supabase.from('labors').select('*, sites(name), site_engineers(name)')
            ]);
            setSites(sitesRes.data || []);
            setSiteEngineers(engRes.data || []);
            setLabors(laborsRes.data || []);
        } catch (e) { console.error(e); }
    };

    // --- ATTENDANCE LOGIC ---

    const fetchAttendance = async () => {
        if (!selectedSite || !selectedDate) return;
        // Don't trigger another overlay if we are still in initial load
        if (isInitialLoad) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('labor_attendance_wages')
                .select('id, labor_id, time_in, time_out, attendance_value, wages_amount, remarks, payment_status')
                .eq('site_id', selectedSite)
                .eq('work_date', selectedDate);

            if (error) throw error;

            const lookup = {};
            data.forEach(rec => {
                lookup[rec.labor_id] = {
                    time_in: rec.time_in || '',
                    time_out: rec.time_out || '',
                    attn_val: rec.attendance_value || 0,
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
        // Trigger fetch only after initial setup is complete to avoid race conditions
        if (!isInitialLoad && activeTab === 'attendance' && selectedSite) {
            fetchAttendance();
        }
    }, [selectedSite, selectedDate, activeTab, isInitialLoad]);

    const calculateAttendanceValue = (timeIn, timeOut) => {
        if (!timeIn || !timeOut) return 0;
        const [h1, m1] = timeIn.split(':').map(Number);
        const [h2, m2] = timeOut.split(':').map(Number);
        const t1 = h1 + m1 / 60;
        const t2 = h2 + m2 / 60;
        if (t2 <= t1) return 0;

        const slabs = [
            { s: 6.5, e: 9.5, r: 0.142 },
            { s: 9.5, e: 18.5, r: 0.111 },
            { s: 18.5, e: 24.0, r: 0.142 }
        ];

        let val = 0;
        slabs.forEach(slab => {
            const overlapS = Math.max(t1, slab.s);
            const overlapE = Math.min(t2, slab.e);
            if (overlapE > overlapS) val += (overlapE - overlapS) * slab.r;
        });
        return parseFloat(val.toFixed(3));
    };

    const handleAttendanceChange = (laborId, field, value) => {
        setAttendanceEntry(prev => {
            const current = prev[laborId] || {
                time_in: '',
                time_out: '',
                wages: labors.find(l => l.id === laborId)?.daily_rate || 0,
                attn_val: 0
            };

            const updated = { ...current, [field]: value };

            // Re-calculate attendance value if times change
            if (field === 'time_in' || field === 'time_out') {
                updated.attn_val = calculateAttendanceValue(updated.time_in, updated.time_out);

                // Auto-calculate wages based on attendance value
                const dailyRate = labors.find(l => l.id === laborId)?.daily_rate || 0;
                updated.wages = (updated.attn_val * dailyRate).toFixed(2);
            }

            return { ...prev, [laborId]: updated };
        });
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
                const entry = attendanceEntry[labor.id] || { time_in: '', time_out: '', attn_val: 0, wages: 0 };

                // Only save if time_in and time_out are provided
                if (!entry.time_in || !entry.time_out) continue;

                const payload = {
                    labor_id: labor.id,
                    site_id: selectedSite,
                    engineer_id: labor.engineer_id || null,
                    work_date: selectedDate,
                    time_in: entry.time_in,
                    time_out: entry.time_out,
                    attendance_value: entry.attn_val,
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
                .select('*, labors(name, phone), sites(name), site_engineers(name)')
                .eq('payment_week', reportWeek);
            if (error) throw error;

            setRawReportData(data || []);

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

    useEffect(() => {
        if ((activeTab === 'reports' || activeTab === 'summary') && reportWeek && !isInitialLoad) {
            fetchWeeklyReport();
        }
    }, [reportWeek, activeTab, isInitialLoad]);

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

    const deleteWeeklyRecords = async (report) => {
        if (!await confirm(`Are you sure you want to DELETE all attendance records for ${report.name} in week ${reportWeek}? This action cannot be undone.`)) return;
        setLoading(true);
        try {
            const ids = report.records.map(r => r.id);
            const { error } = await supabase
                .from('labor_attendance_wages')
                .delete()
                .in('id', ids);
            if (error) throw error;
            toast('Records deleted successfully!');
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
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Project Site</label>
                        <select className={styles.input} value={selectedSite} onChange={e => setSelectedSite(e.target.value)}>
                            <option value="">-- Select Site --</option>
                            {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Site Engineer</label>
                        <select className={styles.input} value={selectedEngineer} onChange={e => setSelectedEngineer(e.target.value)}>
                            <option value="">-- All Engineers --</option>
                            {siteEngineers.filter(e => e.site_id == selectedSite).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                        </select>
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Select Date</label>
                        <input type="date" className={styles.input} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} />
                    </div>
                </div>

                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Labor Detail</th>
                                <th>Working Hours (In - Out)</th>
                                <th style={{ textAlign: 'center' }}>Attn. Value</th>
                                <th>Calculated Wage</th>
                                <th>Remarks</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLabors.map(l => {
                                const entry = attendanceEntry[l.id] || { time_in: '', time_out: '', attn_val: 0, wages: 0 };
                                return (
                                    <tr key={l.id}>
                                        <td>
                                            <div className={styles.strong}>{l.name}</div>
                                            <div className={styles.muted}>Daily Rate: ₹{l.daily_rate}</div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <input type="time" className={styles.input} style={{ width: '130px', padding: '8px 12px', fontSize: '0.9rem' }} value={entry.time_in || ''} onChange={e => handleAttendanceChange(l.id, 'time_in', e.target.value)} />
                                                <span className={styles.muted}>to</span>
                                                <input type="time" className={styles.input} style={{ width: '130px', padding: '8px 12px', fontSize: '0.9rem' }} value={entry.time_out || ''} onChange={e => handleAttendanceChange(l.id, 'time_out', e.target.value)} />
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span style={{ fontWeight: 800, color: '#2563eb', background: '#eff6ff', padding: '4px 12px', borderRadius: '6px' }}>{entry.attn_val}</span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span className={styles.strong}>₹</span>
                                                <input type="number" className={styles.input} style={{ width: '100px', fontWeight: 700 }} value={entry.wages} onChange={e => handleAttendanceChange(l.id, 'wages', e.target.value)} />
                                            </div>
                                        </td>
                                        <td>
                                            <input type="text" className={styles.input} style={{ width: '100%' }} placeholder="Add note..." value={entry.remarks || ''} onChange={e => handleAttendanceChange(l.id, 'remarks', e.target.value)} />
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
                {filteredLabors.length > 0 && (
                    <div className={styles.actions}>
                        <Button onClick={saveAttendance} className={styles.saveBtn}>
                            <Save size={18} style={{ marginRight: 8 }} /> Confirm & Save Daily Log
                        </Button>
                    </div>
                )}
            </div>
        );
    };

    const renderEngineers = () => {
        const filtered = siteEngineers.filter(e =>
            e.name?.toLowerCase().includes(searchEng.toLowerCase()) ||
            e.phone?.toLowerCase().includes(searchEng.toLowerCase()) ||
            e.sites?.name?.toLowerCase().includes(searchEng.toLowerCase())
        );

        return (
            <div className={styles.card}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                        <h3 className={styles.title} style={{ fontSize: '1.25rem', margin: 0 }}>Site Engineers Registry</h3>
                        <div style={{ position: 'relative', flex: 0.6 }}>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="Search by name, phone or site..."
                                value={searchEng}
                                onChange={e => setSearchEng(e.target.value)}
                                style={{ paddingLeft: '35px' }}
                            />
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        </div>
                    </div>
                    <Button onClick={() => openEngModal()}>
                        <UserPlus size={18} style={{ marginRight: 8 }} /> Add Engineer
                    </Button>
                </div>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Engineer Name</th>
                                <th>Contact Info</th>
                                <th>Assigned Site</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(e => (
                                <tr key={e.id}>
                                    <td><span className={styles.strong}>{e.name}</span></td>
                                    <td>{e.phone}</td>
                                    <td><span className={styles.muted}>{e.sites?.name}</span></td>
                                    <td>
                                        <span className={`${styles.badge} ${e.status === 'Active' ? styles.badgePaid : styles.badgePending}`}>
                                            {e.status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => openEngModal(e)} className={styles.attnBtn} title="Edit"><Edit size={16} /></button>
                                            <button onClick={() => deleteItem('site_engineers', e.id)} className={`${styles.attnBtn} ${styles.btnA}`} title="Delete"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No engineers matched your search.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderLaborsList = () => {
        const filtered = labors.filter(l =>
            l.name?.toLowerCase().includes(searchLabor.toLowerCase()) ||
            l.phone?.toLowerCase().includes(searchLabor.toLowerCase()) ||
            l.sites?.name?.toLowerCase().includes(searchLabor.toLowerCase())
        );

        return (
            <div className={styles.card}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                        <h3 className={styles.title} style={{ fontSize: '1.25rem', margin: 0 }}>Labor Personnel Directory</h3>
                        <div style={{ position: 'relative', flex: 0.6 }}>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="Search by name, phone or site..."
                                value={searchLabor}
                                onChange={e => setSearchLabor(e.target.value)}
                                style={{ paddingLeft: '35px' }}
                            />
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        </div>
                    </div>
                    <Button onClick={() => openLaborModal()}>
                        <UserPlus size={18} style={{ marginRight: 8 }} /> Add Labor
                    </Button>
                </div>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Labor Name</th>
                                <th>Contact</th>
                                <th>Site / Engineer</th>
                                <th>Daily Rate</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(l => (
                                <tr key={l.id}>
                                    <td><span className={styles.strong}>{l.name}</span></td>
                                    <td>{l.phone}</td>
                                    <td>
                                        <div className={styles.muted}>{l.sites?.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Eng: {l.site_engineers?.name || 'Unassigned'}</div>
                                    </td>
                                    <td><span className={styles.price}>₹{l.daily_rate}</span></td>
                                    <td>
                                        <span className={`${styles.badge} ${l.status === 'Active' ? styles.badgePaid : styles.badgePending}`}>
                                            {l.status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => openLaborModal(l)} className={styles.attnBtn} title="Edit"><Edit size={16} /></button>
                                            <button onClick={() => deleteItem('labors', l.id)} className={`${styles.attnBtn} ${styles.btnA}`} title="Delete"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No labors matched your search.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderReports = () => (
        <div className={styles.card}>
            <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Select Payment Week</label>
                    <input type="week" className={styles.input} style={{ maxWidth: '250px' }} value={reportWeek} onChange={e => setReportWeek(e.target.value)} />
                </div>
            </div>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Labor Name / Contact</th>
                            <th>Days Worked</th>
                            <th>Weekly Wages</th>
                            <th>Payment Status</th>
                            <th style={{ textAlign: 'right' }}>Management</th>
                        </tr>
                    </thead>
                    <tbody>
                        {weeklyReports.map((r, i) => (
                            <tr key={i}>
                                <td>
                                    <div className={styles.strong}>{r.name}</div>
                                    <div className={styles.muted}>{r.phone}</div>
                                </td>
                                <td>
                                    <span style={{ fontWeight: 600 }}>{r.days_present}</span> <span className={styles.muted}>days</span>
                                </td>
                                <td>
                                    <span className={styles.price} style={{ fontSize: '1.1rem', color: '#0f172a' }}>
                                        ₹{parseFloat(r.total_wages).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </span>
                                </td>
                                <td>
                                    <span className={`${styles.badge} ${r.status === 'Paid' ? styles.badgePaid : styles.badgePending}`}>
                                        <DollarSign size={12} style={{ marginRight: 4 }} /> {r.status}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                        {r.status !== 'Paid' && (
                                            <Button size="sm" onClick={() => markAsPaid(r)}>
                                                Confirm Payment
                                            </Button>
                                        )}
                                        <button className={`${styles.attnBtn} ${styles.btnA}`} onClick={() => deleteWeeklyRecords(r)} title="Delete Records">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {weeklyReports.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: 48 }}>
                                    <div className={styles.muted}>No payment records found for the selected week.</div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const renderSummary = () => {
        const bySite = {};
        const byEngineer = {};
        const byLabor = {};

        rawReportData.forEach(r => {
            const wage = parseFloat(r.wages_amount) || 0;
            const days = (r.attendance !== 'Absent') ? (r.attendance === 'Half Day' ? 0.5 : 1) : 0;

            const siteName = r.sites?.name || 'Unassigned Site';
            if (!bySite[siteName]) bySite[siteName] = { wage: 0, days: 0 };
            bySite[siteName].wage += wage;
            bySite[siteName].days += days;

            const engName = r.site_engineers?.name || 'Unassigned Engineer';
            if (!byEngineer[engName]) byEngineer[engName] = { wage: 0, days: 0 };
            byEngineer[engName].wage += wage;
            byEngineer[engName].days += days;

            const labName = r.labors?.name || 'Unknown Labor';
            if (!byLabor[labName]) byLabor[labName] = { wage: 0, days: 0, phone: r.labors?.phone || '-' };
            byLabor[labName].wage += wage;
            byLabor[labName].days += days;
        });

        const printSummary = (orientation = 'portrait') => {
            const printContent = document.getElementById('printable-summary');
            if (!printContent) return;

            const iframe = document.createElement('iframe');
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(`
                <html>
                    <head>
                        <title>Wages Report</title>
                        <style>
                            @page { size: ${orientation}; margin: 15mm; }
                            body { font-family: 'Outfit', sans-serif; padding: 20px; color: #0f172a; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
                            th, td { border: 1px solid #e2e8f0; padding: 12px; font-size: 13px; }
                            th { background: #f8fafc; text-align: left; font-weight: 700; text-transform: uppercase; color: #64748b; }
                            h2 { text-align: center; margin-bottom: 5px; }
                            h3 { text-align: center; color: #64748b; margin-bottom: 20px; }
                            .section-title { font-size: 16px; font-weight: 700; margin: 24px 0 12px 0; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; }
                        </style>
                    </head>
                    <body>
                        ${printContent.innerHTML}
                        <script>
                            window.onload = function() { window.print(); setTimeout(() => { window.frameElement.remove(); }, 100); };
                        </script>
                    </body>
                </html>
            `);
            doc.close();
        };

        return (
            <div className={styles.card}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                        <div className={styles.formGroup}>
                            <label className={styles.label}>Analysis Period</label>
                            <input type="week" className={styles.input} value={reportWeek} onChange={e => setReportWeek(e.target.value)} />
                        </div>
                        <div className={styles.tabs} style={{ margin: 0 }}>
                            <button onClick={() => setSummaryView('site')} className={`${styles.tab} ${summaryView === 'site' ? styles.activeTab : ''}`}>Site Wise</button>
                            <button onClick={() => setSummaryView('eng')} className={`${styles.tab} ${summaryView === 'eng' ? styles.activeTab : ''}`}>Engineer Wise</button>
                            <button onClick={() => setSummaryView('labor')} className={`${styles.tab} ${summaryView === 'labor' ? styles.activeTab : ''}`}>Labor Wise</button>
                            <button onClick={() => setSummaryView('all')} className={`${styles.tab} ${summaryView === 'all' ? styles.activeTab : ''}`}>View All</button>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <Button onClick={() => printSummary('portrait')} variant="outline" size="sm">
                            <Printer size={16} /> Portrait
                        </Button>
                        <Button onClick={() => printSummary('landscape')} variant="outline" size="sm">
                            <Printer size={16} /> Landscape
                        </Button>
                    </div>
                </div>

                <div id="printable-summary">
                    <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                        <h2 className={styles.strong} style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Innovative Interiors Pvt Ltd</h2>
                        <h3 className={styles.muted} style={{ fontSize: '1.1rem' }}>Wages {summaryView === 'all' ? 'Analytics' : (summaryView === 'site' ? 'Site Wise' : (summaryView === 'eng' ? 'Engineer Wise' : 'Labor Wise'))} Report</h3>
                        <div className={styles.strong} style={{ color: '#2563eb' }}>Week: {reportWeek}</div>
                    </div>

                    {(summaryView === 'all' || summaryView === 'site') && (
                        <div style={{ marginBottom: '48px' }}>
                            <div className={styles.label} style={{ marginBottom: '16px', fontSize: '1rem' }}>Project Site Summary</div>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Project Site</th>
                                        <th style={{ textAlign: 'center' }}>Total Labors</th>
                                        <th style={{ textAlign: 'right' }}>Total Wages</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(bySite).map(([name, data], i) => (
                                        <tr key={i}>
                                            <td className={styles.strong}>{name}</td>
                                            <td style={{ textAlign: 'center' }}>{data.days}</td>
                                            <td style={{ textAlign: 'right' }} className={styles.price}>₹{data.wage.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {(summaryView === 'all' || summaryView === 'eng') && (
                        <div style={{ marginBottom: '48px' }}>
                            <div className={styles.label} style={{ marginBottom: '16px', fontSize: '1rem' }}>Site Engineer Summary</div>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Engineer Name</th>
                                        <th style={{ textAlign: 'center' }}>Total Labors</th>
                                        <th style={{ textAlign: 'right' }}>Total Wages</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(byEngineer).map(([name, data], i) => (
                                        <tr key={i}>
                                            <td className={styles.strong}>{name}</td>
                                            <td style={{ textAlign: 'center' }}>{data.days}</td>
                                            <td style={{ textAlign: 'right' }} className={styles.price}>₹{data.wage.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {(summaryView === 'all' || summaryView === 'labor') && (
                        <div>
                            <div className={styles.label} style={{ marginBottom: '16px', fontSize: '1rem' }}>Labor Wage Summary</div>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Labor Name</th>
                                        <th style={{ textAlign: 'center' }}>Days Worked</th>
                                        <th style={{ textAlign: 'right' }}>Total Earnings</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(byLabor).map(([name, data], i) => (
                                        <tr key={i}>
                                            <td>
                                                <div className={styles.strong}>{name}</div>
                                                <div className={styles.muted} style={{ fontSize: '0.75rem' }}>{data.phone}</div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{data.days}</td>
                                            <td style={{ textAlign: 'right' }} className={styles.price}>₹{data.wage.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className={styles.container}>
            {(loading || isInitialLoad) && <LoadingOverlay message={isInitialLoad ? "Synchronizing Personnel Registry..." : "Fetching Worker Logs..."} />}
            <div className={styles.header}>
                <div>
                    <button onClick={() => navigate('/')} className={styles.attnBtn} style={{ background: 'none', border: 'none', color: '#64748b', marginBottom: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', padding: 0 }}>
                        <ArrowLeft size={16} /> Home
                    </button>
                    <h1 className={styles.title}>Wages & Personnel</h1>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div className={styles.muted}>Innovative Interiors Pvt Ltd</div>
                    <div className={styles.strong} style={{ color: '#2563eb' }}>{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
                </div>
            </div>

            <div className={styles.tabs}>
                <div className={`${styles.tab} ${activeTab === 'attendance' ? styles.activeTab : ''}`} onClick={() => setActiveTab('attendance')}>
                    <ClipboardList size={18} /> Attendance
                </div>
                <div className={`${styles.tab} ${activeTab === 'reports' ? styles.activeTab : ''}`} onClick={() => setActiveTab('reports')}>
                    <DollarSign size={18} /> Payments
                </div>
                <div className={`${styles.tab} ${activeTab === 'summary' ? styles.activeTab : ''}`} onClick={() => setActiveTab('summary')}>
                    <BarChart2 size={18} /> Analytics
                </div>
                <div className={`${styles.tab} ${activeTab === 'engineers' ? styles.activeTab : ''}`} onClick={() => setActiveTab('engineers')}>
                    <Briefcase size={18} /> Engineers
                </div>
                <div className={`${styles.tab} ${activeTab === 'labors' ? styles.activeTab : ''}`} onClick={() => setActiveTab('labors')}>
                    <Users size={18} /> Labors
                </div>
            </div>

            <div className={styles.content}>
                {activeTab === 'attendance' && renderAttendance()}
                {activeTab === 'reports' && renderReports()}
                {activeTab === 'summary' && renderSummary()}
                {activeTab === 'engineers' && renderEngineers()}
                {activeTab === 'labors' && renderLaborsList()}
            </div>

            {/* Engineer Modal */}
            {engModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h3>{editingEng ? 'Edit Site Engineer' : 'New Site Engineer'}</h3>
                        </div>
                        <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr', padding: 0, background: 'none' }}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Engineer Name</label>
                                <input className={styles.input} value={engForm.name} onChange={e => setEngForm({ ...engForm, name: e.target.value })} placeholder="Full name" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Phone Number</label>
                                <input className={styles.input} value={engForm.phone} onChange={e => setEngForm({ ...engForm, phone: e.target.value })} placeholder="Phone" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Assigned Site</label>
                                <select className={styles.input} value={engForm.site_id} onChange={e => setEngForm({ ...engForm, site_id: e.target.value })}>
                                    <option value="">-- Select Project Site --</option>
                                    {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <Button variant="outline" onClick={() => setEngModalOpen(false)}>Cancel</Button>
                            <Button onClick={saveEng}>Save Engineer</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Labor Modal */}
            {laborModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h3>{editingLabor ? 'Edit Labor Profile' : 'New Labor Registration'}</h3>
                        </div>
                        <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr', padding: 0, background: 'none' }}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Full Name</label>
                                <input className={styles.input} value={laborForm.name} onChange={e => setLaborForm({ ...laborForm, name: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Phone</label>
                                <input className={styles.input} value={laborForm.phone} onChange={e => setLaborForm({ ...laborForm, phone: e.target.value })} />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Daily Wage Rate (₹)</label>
                                <input type="number" className={styles.input} value={laborForm.daily_rate} onChange={e => setLaborForm({ ...laborForm, daily_rate: e.target.value })} />
                            </div>
                            <div className={styles.formGrid} style={{ padding: 0, gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'none' }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Project Site</label>
                                    <select className={styles.input} value={laborForm.site_id} onChange={e => setLaborForm({ ...laborForm, site_id: e.target.value })}>
                                        <option value="">-- Site --</option>
                                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Engineer</label>
                                    <select className={styles.input} value={laborForm.engineer_id} onChange={e => setLaborForm({ ...laborForm, engineer_id: e.target.value })}>
                                        <option value="">-- Engineer --</option>
                                        {siteEngineers.filter(e => e.site_id == laborForm.site_id).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <Button variant="outline" onClick={() => setLaborModalOpen(false)}>Cancel</Button>
                            <Button onClick={saveLabor}>Confirm Save</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WagesPage;
