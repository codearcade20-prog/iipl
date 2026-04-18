import React, { useState, useEffect, useMemo } from 'react';
import ReactDOM from 'react-dom';
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
    Search,
    Check,
    Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import styles from './WagesPage.module.css';

const TimePicker = ({ value, onChange, className }) => {
    // Expected value format: "HH:mm" or empty string
    const [h24, m] = (value || "00:00").split(':').map(val => val || '00');

    const hour24 = parseInt(h24, 10);
    const period = hour24 >= 12 ? 'PM' : 'AM';
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;

    const [tempHour, setTempHour] = React.useState(hour12.toString());
    const [tempMin, setTempMin] = React.useState(m);

    React.useEffect(() => {
        let h = parseInt(h24, 10) % 12;
        if (h === 0) h = 12;
        setTempHour(h.toString());
        setTempMin(m);
    }, [value]);

    const handleTimeChange = (h12, min, p) => {
        let h24_new = parseInt(h12, 10) || 0;
        let m_new = parseInt(min, 10) || 0;

        if (p === 'PM' && h24_new < 12) h24_new += 12;
        if (p === 'AM' && h24_new === 12) h24_new = 0;

        const formattedH24 = h24_new.toString().padStart(2, '0');
        const formattedMin = m_new.toString().padStart(2, '0');
        onChange(`${formattedH24}:${formattedMin}`);
    };

    const flushHour = () => {
        let val = parseInt(tempHour, 10);
        if (isNaN(val) || val < 1) val = 12;
        if (val > 12) val = 12;
        setTempHour(val.toString());
        handleTimeChange(val, tempMin, period);
    };

    const flushMin = () => {
        let val = parseInt(tempMin, 10);
        if (isNaN(val) || val < 0) val = 0;
        if (val > 59) val = 59;
        const formatted = val.toString().padStart(2, '0');
        setTempMin(formatted);
        handleTimeChange(tempHour, formatted, period);
    };

    return (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <input
                type="number"
                min="1"
                max="12"
                className={className}
                style={{ width: '45px', padding: '8px 4px', textAlign: 'center' }}
                value={tempHour}
                onChange={e => setTempHour(e.target.value)}
                onBlur={flushHour}
                onKeyDown={e => { if (e.key === 'Enter') flushHour(); }}
            />
            <span style={{ fontWeight: 'bold' }}>:</span>
            <input
                type="number"
                min="0"
                max="59"
                className={className}
                style={{ width: '45px', padding: '8px 4px', textAlign: 'center' }}
                value={tempMin}
                onChange={e => setTempMin(e.target.value)}
                onBlur={flushMin}
                onKeyDown={e => { if (e.key === 'Enter') flushMin(); }}
            />
            <select
                className={className}
                style={{ width: '65px', padding: '8px 4px', textAlign: 'center', cursor: 'pointer' }}
                value={period}
                onChange={(e) => handleTimeChange(tempHour, tempMin, e.target.value)}
            >
                <option value="AM">AM</option>
                <option value="PM">PM</option>
            </select>
        </div>
    );
};

const SearchableSelect = ({ value, onChange, options, placeholder, disabled }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const dropdownRef = React.useRef(null);

    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

    React.useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                // Also check if clicking inside the portaled menu
                if (!event.target.closest(`.${styles.dropdownMenu}`)) {
                    setIsOpen(false);
                }
            }
        };
        const handleScroll = () => {
            if (isOpen) {
                if (dropdownRef.current) {
                    const rect = dropdownRef.current.getBoundingClientRect();
                    setDropdownPos({
                        top: rect.bottom + window.scrollY + 4,
                        left: rect.left + window.scrollX,
                        width: rect.width
                    });
                }
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        window.addEventListener('scroll', handleScroll, true);
        window.addEventListener('resize', handleScroll);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('resize', handleScroll);
        };
    }, [isOpen]);

    const handleOpen = () => {
        if (disabled) return;
        if (dropdownRef.current) {
            const rect = dropdownRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
        setIsOpen(!isOpen);
    };

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(search.toLowerCase())
    );

    const selectedLabel = options.find(opt => opt.value === value)?.label || placeholder;

    return (
        <div className={styles.searchableContainer} ref={dropdownRef}>
            <div 
                className={`${styles.dropdownTrigger} ${disabled ? styles.disabled : ''}`}
                onClick={handleOpen}
            >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedLabel}
                </div>
            </div>
            
            {isOpen && ReactDOM.createPortal(
                <div className={styles.dropdownMenu} style={{ position: 'absolute', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 99999 }}>
                    <div className={styles.searchBox}>
                        <Search size={14} color="#94a3b8" />
                        <input 
                            autoFocus
                            placeholder="Type to search..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className={styles.optionsList}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(opt => (
                                <div 
                                    key={opt.value}
                                    className={`${styles.optionItem} ${opt.value === value ? styles.selectedOption : ''}`}
                                    onClick={() => {
                                        onChange({ target: { value: opt.value } });
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    {opt.label}
                                </div>
                            ))
                        ) : (
                            <div className={styles.noResults}>No matches found.</div>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

const WagesPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { alert, confirm, toast } = useMessage();

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const customRound = (val) => {
        if (!val || isNaN(val)) return 0;
        return Math.round(val);
    };

    const getPhotoUrl = (url) => {
        if (!url) return null;
        
        // 1. If it's a local/uploaded Supabase URL, return as is
        if (url.includes('.supabase.co')) return url;

        // 2. If it's a Google Drive link, convert to direct thumbnail
        if (url.includes('drive.google.com')) {
            let fileId = '';
            if (url.includes('/d/')) fileId = url.split('/d/')[1]?.split('/')[0];
            else if (url.includes('id=')) fileId = url.split('id=')[1]?.split('&')[0];
            
            // lh3.googleusercontent.com is cookie-less and bypasses most anti-tracking blocks
            if (fileId) return `https://lh3.googleusercontent.com/d/${fileId}=w400`;
        }
        
        return url;
    };

    const [activeTab, setActiveTab] = useState('attendance');
    const [loading, setLoading] = useState(false);
    const [isInitialLoad, setIsInitialLoad] = useState(true);
    const [guideModalOpen, setGuideModalOpen] = useState(false);

    // Data States
    const [sites, setSites] = useState([]);
    const [subcontractors, setSubcontractors] = useState([]);
    const [labors, setLabors] = useState([]);

    // Filter States
    const [selectedSite, setSelectedSite] = useState('');
    const [selectedSubcontractor, setSelectedSubcontractor] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedCategory, setSelectedCategory] = useState('Direct wages');
    const [searchSub, setSearchSub] = useState('');
    const [searchLabor, setSearchLabor] = useState('');
    const [hideCompleted, setHideCompleted] = useState(true);

    // Labor Management States
    const [laborModalOpen, setLaborModalOpen] = useState(false);
    const [editingLabor, setEditingLabor] = useState(null);
    const [laborForm, setLaborForm] = useState({
        name: '', phone: '', subcontractor_id: '', role: '', designation: '', daily_rate: 0, status: 'Active', photo_url: ''
    });
    const [selectedLaborFile, setSelectedLaborFile] = useState(null);
    const [uploadingLaborPhoto, setUploadingLaborPhoto] = useState(false);

    // Subcontractor Management States
    const [subModalOpen, setSubModalOpen] = useState(false);
    const [editingSub, setEditingSub] = useState(null);
    const [subForm, setSubForm] = useState({
        name: '', phone: '', site_id: '', status: 'Active'
    });

    // Attendance Entry Table State
    const [attendanceEntry, setAttendanceEntry] = useState({});

    // Reports State
    const [reportStartDate, setReportStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 7)).toISOString().split('T')[0]);
    const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [weeklyReports, setWeeklyReports] = useState([]);
    const [rawReportData, setRawReportData] = useState([]);
    const [summaryView, setSummaryView] = useState('all');
    const [completedLaborIds, setCompletedLaborIds] = useState(new Set());
    const [searchLaborReport, setSearchLaborReport] = useState('');
    const [searchSiteReport, setSearchSiteReport] = useState('All');
    const [searchCategoryReport, setSearchCategoryReport] = useState('All');
    const [searchSubcontractorReport, setSearchSubcontractorReport] = useState('All');
    const [showRawData, setShowRawData] = useState(false);
    const [searchPaymentLabor, setSearchPaymentLabor] = useState('');


    // Correction Modal States
    const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
    const [correctionLabor, setCorrectionLabor] = useState(null);
    const [correctionRecords, setCorrectionRecords] = useState([]);
    const [isSavingCorrection, setIsSavingCorrection] = useState(false);
    const [hoveredLabor, setHoveredLabor] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [showPermissionGuide, setShowPermissionGuide] = useState(false);

    useEffect(() => {
        window.scrollTo(0, 0);
        
        const hasSeen = localStorage.getItem('iipl_photo_permission_v1');
        if (!hasSeen) {
            // Show guide after a small delay for a smooth entrance
            const timer = setTimeout(() => setShowPermissionGuide(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const dismissPermissionGuide = () => {
        localStorage.setItem('iipl_photo_permission_v1', 'true');
        setShowPermissionGuide(false);
    };

    const fetchInitialData = async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        try {
            const [sitesRes, subRes, laborsRes] = await Promise.all([
                supabase.from('sites').select('id, name').order('name'),
                supabase.from('subcontractors').select('id, name, phone, status').order('name'),
                supabase.from('labors').select('*, subcontractors(name)').order('name')
            ]);

            if (sitesRes.error) throw sitesRes.error;
            if (subRes.error) throw subRes.error;
            if (laborsRes.error) throw laborsRes.error;

            const siteData = sitesRes.data || [];
            setSites(siteData);
            setSubcontractors(subRes.data || []);
            setLabors(laborsRes.data || []);

            // Auto-select first site if none selected
            if (siteData.length > 0 && !selectedSite) {
                setSelectedSite(siteData[0].id);
            }
        } catch (error) {
            console.error('Fetch Initial Data Error:', error);
            alert('Error loading data. Please check your connection.');
        } finally {
            if (!isSilent) setLoading(false);
            setIsInitialLoad(false);
        }
    };

    useEffect(() => {
        fetchInitialData();
    }, []);

    // --- ATTENDANCE LOGIC ---

    const fetchAttendance = async () => {
        if (!selectedSite || !selectedDate) return;
        // Don't trigger another overlay if we are still in initial load
        if (isInitialLoad) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('labor_attendance_wages')
                .select('id, labor_id, site_id, time_in, time_out, attendance_value, calculated_attendance_value, wages_amount, raw_wages_amount, remarks, payment_status, subcontractor_id, wage_category')
                .eq('work_date', selectedDate);

            if (error) throw error;

            const lookup = {};
            const completed = new Set();

            data.forEach(rec => {
                // Determine if this worker is "completed" for the DAY across ANY site/category
                // to avoid double entries or to hide them from pending list once done.
                if (rec.time_in && rec.time_out) {
                    completed.add(rec.labor_id);
                }

                // Only populate the entry for the current selected site AND category
                if (rec.site_id == selectedSite && rec.wage_category === selectedCategory) {
                    const laborObj = labors.find(l => l.id === rec.labor_id);
                    const dailyRate = laborObj?.daily_rate || 0;
                    lookup[rec.labor_id] = {
                        time_in: rec.time_in || '',
                        time_out: rec.time_out || '',
                        calc_attn_val: rec.calculated_attendance_value != null ? rec.calculated_attendance_value : calculateAttendanceValue(rec.time_in, rec.time_out),
                        attn_val: rec.attendance_value || 0,
                        actual_wages: rec.raw_wages_amount != null ? rec.raw_wages_amount : parseFloat(((rec.attendance_value || 0) * dailyRate).toFixed(2)),
                        wages: rec.wages_amount,
                        remarks: rec.remarks,
                        id: rec.id
                    };
                }
            });
            setAttendanceEntry(lookup);
            setCompletedLaborIds(completed);
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
    }, [selectedSite, selectedDate, selectedCategory, activeTab, isInitialLoad]);

    const calculateAttendanceValue = (timeIn, timeOut) => {
        if (!timeIn || !timeOut) return 0;
        const [h1, m1] = timeIn.split(':').map(Number);
        const [h2, m2] = timeOut.split(':').map(Number);
        const t1 = h1 + m1 / 60;
        let t2 = h2 + m2 / 60;
        
        // Handle midnight crossing
        if (t2 < t1) t2 += 24;
        if (t2 === t1) return 0;

        const slabs = [
            // Morning Shift: 6:00 AM – 9:30 AM (3.5 hours, Pay = ₹500/₹1000 = 0.5 units)
            { s: 6, e: 9.5, r: 0.5 / 3.5 },
            // Day Shift: 9:30 AM – 6:00 PM (8.5 hours, Pay = ₹1000/₹1000 = 1.0 unit)
            { s: 9.5, e: 18, r: 1 / 8.5 },
            // Night Shift: 6:00 PM – 2:00 AM (8 hours, Pay = ₹1000/₹1000 = 1.0 unit)
            { s: 18, e: 26, r: 1 / 8 }
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
                const newVal = calculateAttendanceValue(updated.time_in, updated.time_out);
                updated.calc_attn_val = newVal;
                updated.attn_val = newVal;

                // Auto-calculate wages based on attendance value
                const dailyRate = labors.find(l => l.id === laborId)?.daily_rate || 0;
                updated.actual_wages = parseFloat((updated.attn_val * dailyRate).toFixed(2));
                updated.wages = customRound(updated.actual_wages);
            } else if (field === 'attn_val') {
                updated.attn_val = parseFloat(value) || 0;
                // Auto-calculate wages based on manual attendance value
                const dailyRate = labors.find(l => l.id === laborId)?.daily_rate || 0;
                updated.actual_wages = parseFloat((updated.attn_val * dailyRate).toFixed(2));
                updated.wages = customRound(updated.actual_wages);
            }

            return { ...prev, [laborId]: updated };
        });
    };

    const saveAttendance = async () => {
        setLoading(true);
        try {
            const updates = [];
            const filteredLabors = labors.filter(l =>
                l.status === 'Active' &&
                (!selectedSubcontractor || l.subcontractor_id === selectedSubcontractor)
            );

            for (const labor of filteredLabors) {
                const entry = attendanceEntry[labor.id] || { time_in: '', time_out: '', attn_val: 0, wages: 0 };

                // Save if at least time_in or time_out is provided
                if (!entry.time_in && !entry.time_out) continue;

                const payload = {
                    labor_id: labor.id,
                    site_id: selectedSite,
                    subcontractor_id: labor.subcontractor_id || null,
                    work_date: selectedDate,
                    time_in: entry.time_in || null,
                    time_out: entry.time_out || null,
                    attendance_value: entry.attn_val || 0,
                    calculated_attendance_value: entry.calc_attn_val !== undefined ? entry.calc_attn_val : calculateAttendanceValue(entry.time_in, entry.time_out),
                    wages_amount: parseFloat(entry.wages) || 0,
                    raw_wages_amount: parseFloat(entry.actual_wages) || 0,
                    remarks: entry.remarks || '',
                    wage_category: selectedCategory,
                    payment_week: selectedDate
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
                name: lab.name, phone: lab.phone || '',
                subcontractor_id: lab.subcontractor_id || '',
                role: lab.role || '',
                designation: lab.designation || '',
                daily_rate: lab.daily_rate || 0,
                status: lab.status || 'Active',
                photo_url: lab.photo_url || ''
            });
        } else {
            setEditingLabor(null);
            setLaborForm({ name: '', phone: '', subcontractor_id: '', role: '', designation: '', daily_rate: 0, status: 'Active', photo_url: '' });
        }
        setSelectedLaborFile(null);
        setLaborModalOpen(true);
    };

    const saveLabor = async () => {
        if (!laborForm.name) return alert('Name is required');
        setLoading(true);
        try {
            let photoUrl = laborForm.photo_url;

            // Handle File Upload if selected
            if (selectedLaborFile) {
                setUploadingLaborPhoto(true);
                const fileExt = selectedLaborFile.name.split('.').pop();
                const fileName = `${laborForm.name.replace(/\s+/g, '_')}_${Date.now()}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('labors')
                    .upload(filePath, selectedLaborFile, { upsert: true });

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('labors')
                    .getPublicUrl(filePath);
                
                photoUrl = publicUrl;
            }

            const payload = { ...laborForm, photo_url: photoUrl };
            if (!payload.subcontractor_id) payload.subcontractor_id = null;

            if (editingLabor) await supabase.from('labors').update(payload).eq('id', editingLabor);
            else await supabase.from('labors').insert([payload]);

            setLaborModalOpen(false);
            fetchInitialData(true);
            toast('Labor saved!');
        } catch (error) { 
            console.error('Save Labor Error:', error);
            alert('Save failed: ' + error.message); 
        } finally { 
            setLoading(false); 
            setUploadingLaborPhoto(false);
        }
    };

    // --- SUBCONTRACTOR CRUD ---

    const openSubModal = (sub = null) => {
        if (sub) {
            setEditingSub(sub.id);
            setSubForm({ name: sub.name, phone: sub.phone || '', status: sub.status || 'Active' });
        } else {
            setEditingSub(null);
            setSubForm({ name: '', phone: '', status: 'Active' });
        }
        setSubModalOpen(true);
    };

    const saveSub = async () => {
        if (!subForm.name) return alert('Name is required');
        setLoading(true);
        try {
            const payload = { ...subForm };

            if (editingSub) await supabase.from('subcontractors').update(payload).eq('id', editingSub);
            else await supabase.from('subcontractors').insert([payload]);
            setSubModalOpen(false);
            fetchInitialData(true);
            toast('Subcontractor saved!');
        } catch (error) { alert(error.message); }
        finally { setLoading(false); }
    };

    const deleteItem = async (table, id) => {
        if (!await confirm(`Delete this ${table.slice(0, -1).replace('_', ' ')}?`)) return;

        // Check for associated labors before deleting subcontractor
        if (table === 'subcontractors') {
            const hasLabors = labors.some(l => l.subcontractor_id === id);
            if (hasLabors) {
                return alert('Cannot delete this subcontractor because they have registered labors. Please re-assign or delete associated labors first.');
            }
        }

        setLoading(true);
        try {
            const { error } = await supabase.from(table).delete().eq('id', id);
            if (error) throw error;
            fetchInitialData(true);
            toast('Deleted.');
        } catch (error) {
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- REPORTS ---

    const fetchWeeklyReport = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('labor_attendance_wages')
                .select('*, labors(name, phone), sites(name), subcontractors(name)')
                .gte('work_date', reportStartDate)
                .lte('work_date', reportEndDate);
            if (error) throw error;

            setRawReportData(data || []);

            const grouped = {};
            data.forEach(rec => {
                const lid = rec.labor_id;
                if (!grouped[lid]) {
                    grouped[lid] = { labor_id: lid, name: rec.labors?.name || 'Unknown', phone: rec.labors?.phone || '-', total_wages: 0, days_present: 0, records: [], status: 'Paid' };
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
        if ((activeTab === 'reports' || activeTab === 'summary') && reportStartDate && reportEndDate && !isInitialLoad) {
            fetchWeeklyReport();
        }
    }, [reportStartDate, reportEndDate, activeTab, isInitialLoad]);

    const markAsPaid = async (report) => {
        if (!await confirm(`Mark all records for ${report.name} as PAID for the selected period?`)) return;
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
        if (!await confirm(`Are you sure you want to DELETE all attendance records for ${report.name} in the selected period? This action cannot be undone.`)) return;
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
        // Obsolete but kept for retro-compatibility
        return date.toISOString().split('T')[0];
    };


    const openCorrectionModal = (report) => {
        setCorrectionLabor(report);
        // Transform records into an editable format
        const editable = report.records.map(r => {
            const laborObj = labors.find(l => l.id === r.labor_id);
            const dailyRate = laborObj?.daily_rate || 0;
            return {
                ...r,
                new_site_id: r.site_id,
                new_time_in: r.time_in ? r.time_in.substring(0, 5) : '',
                new_time_out: r.time_out ? r.time_out.substring(0, 5) : '',
                new_attn_val: r.attendance_value || 0,
                new_actual_wages: parseFloat((r.attendance_value * dailyRate).toFixed(2)),
                new_wages: r.wages_amount || 0,
                new_remarks: r.remarks || '',
                new_category: r.wage_category || 'Direct wages'
            };
        });
        setCorrectionRecords(editable);
        setCorrectionModalOpen(true);
    };

    const handleCorrectionChange = (idx, field, value) => {
        setCorrectionRecords(prev => {
            const updated = [...prev];
            const record = updated[idx];
            updated[idx] = { ...record, [field]: value };

            if (field === 'new_time_in' || field === 'new_time_out') {
                updated[idx].new_attn_val = calculateAttendanceValue(updated[idx].new_time_in, updated[idx].new_time_out);
                
                const laborObj = labors.find(l => l.id === record.labor_id);
                const dailyRate = laborObj?.daily_rate || 0;
                
                updated[idx].new_actual_wages = parseFloat((updated[idx].new_attn_val * dailyRate).toFixed(2));
                updated[idx].new_wages = customRound(updated[idx].new_actual_wages);
            } else if (field === 'new_attn_val') {
                updated[idx].new_attn_val = parseFloat(value) || 0;
                
                const laborObj = labors.find(l => l.id === record.labor_id);
                const dailyRate = laborObj?.daily_rate || 0;
                
                updated[idx].new_actual_wages = parseFloat((updated[idx].new_attn_val * dailyRate).toFixed(2));
                updated[idx].new_wages = customRound(updated[idx].new_actual_wages);
            }
            return updated;
        });
    };

    const saveCorrections = async () => {
        setIsSavingCorrection(true);
        try {
            const updates = correctionRecords.map(r =>
                supabase.from('labor_attendance_wages').update({
                    time_in: r.new_time_in,
                    time_out: r.new_time_out,
                    attendance_value: r.new_attn_val,
                    calculated_attendance_value: calculateAttendanceValue(r.new_time_in, r.new_time_out),
                    wages_amount: parseFloat(r.new_wages) || 0,
                    raw_wages_amount: parseFloat(r.new_actual_wages) || 0,
                    remarks: r.new_remarks,
                    wage_category: r.new_category,
                    site_id: r.new_site_id
                }).eq('id', r.id)
            );
            const results = await Promise.all(updates);
            if (results.some(r => r.error)) throw new Error('Some corrections failed to save.');
            toast('Corrections saved!');
            setCorrectionModalOpen(false);
            fetchWeeklyReport();
        } catch (error) {
            alert(error.message);
        } finally {
            setIsSavingCorrection(false);
        }
    };

    const deleteCorrectionRecord = async (recordId) => {
        if (!await confirm("Are you sure you want to delete this specific daily log?")) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('labor_attendance_wages').delete().eq('id', recordId);
            if (error) throw error;
            toast('Daily log deleted.');
            setCorrectionRecords(prev => prev.filter(r => r.id !== recordId));
            fetchWeeklyReport();
        } catch (error) { alert(error.message); }
        finally { setLoading(false); }
    };

    // --- RENDERERS ---

    const renderAttendance = () => {
        let filteredLabors = labors.filter(l =>
            l.status === 'Active' && 
            (selectedSubcontractor === 'ALL' || !selectedSubcontractor || l.subcontractor_id === selectedSubcontractor)
        );

        if (hideCompleted) {
            filteredLabors = filteredLabors.filter(l => !completedLaborIds.has(l.id));
        }

        const isSiteSelected = selectedSite !== '';
        const isSubSelected = selectedSubcontractor !== '';
        const isCategorySelected = selectedCategory !== '';

        if (!isSiteSelected || !isSubSelected || !isCategorySelected) {
            return (
                <div className={styles.card}>
                    {renderFilterBar(isSiteSelected, isSubSelected, isCategorySelected)}
                    <div className={styles.welcomeState}>
                        <div className={styles.welcomeCircle}>
                            <Briefcase size={36} color="#2563eb" />
                        </div>
                        <h2 className={styles.welcomeTitle}>Prepare Attendance Sheet</h2>
                        <p className={styles.welcomeText}>Follow the 4 steps above to initialize the worker registry for today.</p>
                    </div>
                </div>
            );
        }

        return (
            <div className={styles.card}>
                {renderFilterBar(true, true, true)}
                <div className={styles.tableSlideIn}>
                    <div className={styles.tableHeader}>
                        <div className={styles.tableTitle}>
                            <div style={{ background: '#eff6ff', color: '#2563eb', padding: '10px', borderRadius: '12px' }}>
                                <ClipboardList size={22} />
                            </div>
                            <div>
                                <div className={styles.strong} style={{ fontSize: '1.25rem' }}>{sites.find(s => s.id == selectedSite)?.name}</div>
                                <div className={styles.muted}>{selectedSubcontractor === 'ALL' ? 'All Partners' : subcontractors.find(s => s.id == selectedSubcontractor)?.name} • {selectedCategory}</div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.tableContainer}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ paddingLeft: '24px' }}>Worker Details</th>
                                    <th>Attendance Hours</th>
                                    <th style={{ textAlign: 'center' }}>Units (Calc / Edit)</th>
                                    <th>Raw Wage</th>
                                    <th>Rounded Wage</th>
                                    <th style={{ paddingRight: '24px' }}>Remarks</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLabors.map(l => {
                                    const entry = attendanceEntry[l.id] || { time_in: '', time_out: '', attn_val: 0, wages: 0 };
                                    return (
                                        <tr key={l.id}>
                                            <td style={{ paddingLeft: '24px' }}>
                                                <div 
                                                    className={styles.strong} 
                                                    style={{ cursor: 'pointer', display: 'inline-block' }}
                                                    onMouseEnter={(e) => {
                                                        setHoveredLabor(l);
                                                        setMousePos({ x: e.clientX, y: e.clientY });
                                                    }}
                                                    onMouseMove={(e) => {
                                                        setMousePos({ x: e.clientX, y: e.clientY });
                                                    }}
                                                    onMouseLeave={() => setHoveredLabor(null)}
                                                    onTouchStart={(e) => {
                                                        // For mobile: Toggle preview on tap
                                                        if (hoveredLabor?.id === l.id) setHoveredLabor(null);
                                                        else {
                                                            setHoveredLabor(l);
                                                            const touch = e.touches[0];
                                                            setMousePos({ x: touch.clientX, y: touch.clientY });
                                                        }
                                                    }}
                                                >
                                                    {l.name}
                                                </div>
                                                <div className={styles.muted} style={{ fontSize: '0.75rem' }}>Rate: ₹{l.daily_rate}</div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                                    <TimePicker className={styles.compactInput} value={entry.time_in || ''} onChange={val => handleAttendanceChange(l.id, 'time_in', val)} />
                                                    <span className={styles.muted}>→</span>
                                                    <TimePicker className={styles.compactInput} value={entry.time_out || ''} onChange={val => handleAttendanceChange(l.id, 'time_out', val)} />
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                                    <span style={{ color: '#64748b', fontSize: '0.85rem' }} title="Calculated Units">
                                                        {(entry.calc_attn_val !== undefined ? entry.calc_attn_val : calculateAttendanceValue(entry.time_in, entry.time_out)).toFixed(2)}
                                                    </span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        className={styles.minimalInput}
                                                        style={{ width: '60px', padding: '6px', textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f1f5f9', borderRadius: '4px' }}
                                                        value={entry.attn_val}
                                                        onChange={(e) => handleAttendanceChange(l.id, 'attn_val', e.target.value)}
                                                        title="Final Edited Units"
                                                    />
                                                </div>
                                            </td>
                                            <td>
                                                <div className={styles.wageValue}>
                                                    <span className={styles.currency}>₹</span>
                                                    <input type="number" readOnly className={styles.minimalInput} style={{ width: '70px', color: '#94a3b8' }} value={entry.actual_wages || 0} />
                                                </div>
                                            </td>
                                            <td>
                                                <div className={styles.wageValue}>
                                                    <span className={styles.currency} style={{ color: '#0f172a' }}>₹</span>
                                                    <input type="number" className={styles.minimalInput} style={{ width: '80px', fontWeight: 800, color: '#0f172a' }} value={entry.wages} onChange={e => handleAttendanceChange(l.id, 'wages', e.target.value)} />
                                                </div>
                                            </td>
                                            <td style={{ paddingRight: '24px' }}>
                                                <input type="text" className={styles.minimalInput} style={{ width: '100%' }} placeholder="Remarks..." value={entry.remarks || ''} onChange={e => handleAttendanceChange(l.id, 'remarks', e.target.value)} />
                                            </td>
                                        </tr>
                                    );
                                })}
                                {filteredLabors.length === 0 && (
                                    <tr>
                                        <td colSpan="6">
                                            <div className={styles.emptyIllustration} style={{ padding: '60px' }}>
                                                <div className={styles.welcomeCircle} style={{ opacity: 0.5 }}>
                                                    <Users size={32} color="#94a3b8" />
                                                </div>
                                                <p className={styles.muted}>No matching workers found for this selection.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    {filteredLabors.length > 0 && (
                        <div className={styles.actions} style={{ marginTop: '24px' }}>
                            <Button onClick={saveAttendance} className={styles.saveBtn} style={{ padding: '12px 32px', borderRadius: '12px' }}>
                                <Save size={18} style={{ marginRight: 8 }} /> Save Daily Log
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderFilterBar = (isSiteSelected, isSubSelected, isCategorySelected) => (
        <div className={styles.selectionStepper}>
            {/* Step 1: Site */}
            <div className={`${styles.step} ${!isSiteSelected ? styles.activeStep : styles.completedStep}`}>
                <div className={styles.stepHeader}>
                    <span className={styles.stepLabel}>Step 01 • Project Site</span>
                    {isSiteSelected && <Check size={14} color="#10b981" strokeWidth={3} />}
                </div>
                <SearchableSelect 
                    placeholder="Select Project Site..."
                    value={selectedSite} 
                    onChange={e => setSelectedSite(e.target.value)}
                    options={sites.map(s => ({ value: s.id, label: s.name }))}
                />
            </div>

            {/* Step 2: Subcontractor */}
            <div className={`${styles.step} ${!isSiteSelected ? styles.disabledStep : (!isSubSelected ? styles.activeStep : styles.completedStep)}`}>
                <div className={styles.stepHeader}>
                    <span className={styles.stepLabel}>Step 02 • Subcontractor</span>
                    {isSubSelected && <Check size={14} color="#10b981" strokeWidth={3} />}
                </div>
                <SearchableSelect 
                    disabled={!isSiteSelected}
                    placeholder="Select Partner..."
                    value={selectedSubcontractor} 
                    onChange={e => setSelectedSubcontractor(e.target.value)}
                    options={[
                        { value: 'ALL', label: 'All Subcontractors' },
                        ...subcontractors.map(e => ({ value: e.id, label: e.name }))
                    ]}
                />
            </div>

            {/* Step 3: Category */}
            <div className={`${styles.step} ${!isSubSelected ? styles.disabledStep : (!isCategorySelected ? styles.activeStep : styles.completedStep)}`}>
                <div className={styles.stepHeader}>
                    <span className={styles.stepLabel}>Step 03 • Wage Category</span>
                    {isCategorySelected && <Check size={14} color="#10b981" strokeWidth={3} />}
                </div>
                <SearchableSelect 
                    disabled={!isSubSelected}
                    placeholder="Choose Category..."
                    value={selectedCategory} 
                    onChange={e => setSelectedCategory(e.target.value)}
                    options={['Direct wages', 'NMR wages', 'Snag wages', 'Third party subvendor work', 'weekly payment agst order'].map(cat => ({ 
                        value: cat, label: cat 
                    }))}
                />
            </div>

            {/* Step 4: Date */}
            <div className={`${styles.step} ${!isCategorySelected ? styles.disabledStep : styles.activeStep}`}>
                <div className={styles.stepHeader}>
                    <span className={styles.stepLabel}>Step 04 • Work Date</span>
                    <button
                        onClick={() => setHideCompleted(!hideCompleted)}
                        className={`${styles.pendingToggle} ${hideCompleted ? styles.pendingActive : ''}`}
                        disabled={!isCategorySelected}
                    >
                        {hideCompleted ? '🔥 Pending' : 'All'}
                    </button>
                </div>
                <input 
                    type="date" 
                    className={`${styles.stepInput} ${styles.filterDate}`}
                    value={selectedDate} 
                    onChange={e => setSelectedDate(e.target.value)}
                    disabled={!isCategorySelected}
                />
            </div>
        </div>
    );

    const renderSubcontractors = () => {
        const filtered = subcontractors.filter(e =>
            e.name?.toLowerCase().includes(searchSub.toLowerCase()) ||
            e.phone?.toLowerCase().includes(searchSub.toLowerCase())
        );

        return (
            <div className={styles.card}>
                <div className={styles.header}>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flex: 1 }}>
                        <h3 className={styles.title} style={{ fontSize: '1.25rem', margin: 0 }}>Subcontractors Registry</h3>
                        <div style={{ position: 'relative', flex: 0.6 }}>
                            <input
                                type="text"
                                className={styles.input}
                                placeholder="Search by name, phone or site..."
                                value={searchSub}
                                onChange={e => setSearchSub(e.target.value)}
                                style={{ paddingLeft: '35px' }}
                            />
                            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                        </div>
                    </div>
                    <Button onClick={() => openSubModal()}>
                        <UserPlus size={18} style={{ marginRight: 8 }} /> Add Subcontractor
                    </Button>
                </div>
                <div className={styles.tableContainer}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Subcontractor Name</th>
                                <th>Contact Info</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(e => (
                                <tr key={e.id}>
                                    <td><span className={styles.strong}>{e.name}</span></td>
                                    <td>{e.phone}</td>
                                    <td>
                                        <span className={`${styles.badge} ${e.status === 'Active' ? styles.badgePaid : styles.badgePending}`}>
                                            {e.status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button onClick={() => openSubModal(e)} className={styles.attnBtn} title="Edit"><Edit size={16} /></button>
                                            <button onClick={() => deleteItem('subcontractors', e.id)} className={`${styles.attnBtn} ${styles.btnA}`} title="Delete"><Trash2 size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>No subcontractors matched your search.</td>
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
                                <th>Role / Designation</th>
                                <th>Assigned Subcontractor</th>
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
                                        <div className={styles.strong}>{l.role || '-'}</div>
                                        <div className={styles.muted} style={{ fontSize: '0.8rem' }}>{l.designation || '-'}</div>
                                    </td>
                                    <td>
                                        <div className={styles.strong}>{l.subcontractors?.name || 'Unassigned'}</div>
                                    </td>
                                    <td><span className={styles.price}>₹{l.daily_rate}</span></td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                            <span className={`${styles.badge} ${l.status === 'Active' ? styles.badgePaid : styles.badgePending}`}>
                                                {l.status}
                                            </span>
                                            {l.photo_url && (
                                                <a 
                                                    href={l.photo_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className={styles.attnBtn}
                                                    title="View Photos"
                                                    style={{ padding: '4px 8px', fontSize: '0.7rem' }}
                                                >
                                                    🖼️ Photos
                                                </a>
                                            )}
                                        </div>
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

    const renderReports = () => {
        const filteredReports = weeklyReports.filter(r => 
            r.name.toLowerCase().includes(searchPaymentLabor.toLowerCase()) || 
            r.phone?.toLowerCase().includes(searchPaymentLabor.toLowerCase())
        );

        return (
        <div className={styles.card}>
            <div className={styles.header} style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', borderRadius: '12px 12px 0 0', padding: '20px' }}>
                <div className={styles.filterMenuBar} style={{ margin: 0, width: '100%', maxWidth: '800px' }}>
                    <div className={styles.filterMenuItem}>
                        <label className={styles.filterMenuItemLabel}>Search Labor</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type="text"
                                className={styles.filterMenuInput}
                                placeholder="Type name or phone..."
                                value={searchPaymentLabor}
                                onChange={e => setSearchPaymentLabor(e.target.value)}
                                style={{ paddingLeft: '24px' }}
                            />
                            <Search size={14} style={{ position: 'absolute', left: '2px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                        </div>
                    </div>
                    <div className={styles.filterMenuDivider}></div>
                    <div className={styles.filterMenuItem}>
                        <label className={styles.filterMenuItemLabel}>Period Selection</label>
                        <div className={styles.dateFilterGroup}>
                            <input type="date" className={styles.filterDateInput} value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} />
                            <span className={styles.muted} style={{ fontSize: '0.8rem', padding: '0 4px' }}>to</span>
                            <input type="date" className={styles.filterDateInput} value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} />
                        </div>
                    </div>
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
                        {filteredReports.map((r, i) => {
                            const laborObj = labors.find(l => l.id === r.labor_id);
                            return (
                            <tr key={i}>
                                <td>
                                    <div 
                                        className={styles.strong}
                                        style={{ cursor: 'pointer', display: 'inline-block' }}
                                        onMouseEnter={(e) => {
                                            if (laborObj) {
                                                setHoveredLabor(laborObj);
                                                setMousePos({ x: e.clientX, y: e.clientY });
                                            }
                                        }}
                                        onMouseMove={(e) => {
                                            setMousePos({ x: e.clientX, y: e.clientY });
                                        }}
                                        onMouseLeave={() => setHoveredLabor(null)}
                                        onTouchStart={(e) => {
                                            if (hoveredLabor?.id === laborObj?.id) setHoveredLabor(null);
                                            else if (laborObj) {
                                                setHoveredLabor(laborObj);
                                                const touch = e.touches[0];
                                                setMousePos({ x: touch.clientX, y: touch.clientY });
                                            }
                                        }}
                                    >
                                        {r.name}
                                    </div>
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
                                        <Button size="sm" variant="outline" onClick={() => openCorrectionModal(r)}>
                                            <Edit size={14} style={{ marginRight: 4 }} /> Correction
                                        </Button>
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
                            );
                        })}
                        {filteredReports.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: 48 }}>
                                    <div className={styles.muted}>No payment records found for your search.</div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
        );
    };
    // Format Time to 12h (AM/PM)
    const formatTime12h = (time24) => {
        if (!time24) return '---';
        const [h24, m] = time24.split(':');
        const hour24 = parseInt(h24, 10);
        const period = hour24 >= 12 ? 'PM' : 'AM';
        let hour12 = hour24 % 12;
        if (hour12 === 0) hour12 = 12;
        return `${hour12.toString().padStart(2, '0')}:${m.substring(0, 2)} ${period}`;
    };

    const renderSummary = () => {
        const filteredData = rawReportData.filter(r => {
            const matchesLabor = !searchLaborReport || r.labors?.name?.toLowerCase().includes(searchLaborReport.toLowerCase());
            const matchesCategory = searchCategoryReport === 'All' || r.wage_category === searchCategoryReport;
            const matchesSub = searchSubcontractorReport === 'All' || r.subcontractor_id === searchSubcontractorReport;
            const matchesSite = searchSiteReport === 'All' || r.site_id == searchSiteReport;
            return matchesLabor && matchesCategory && matchesSub && matchesSite;
        }).sort((a, b) => new Date(a.work_date) - new Date(b.work_date));

        const totalAmount = filteredData.reduce((sum, r) => sum + (parseFloat(r.wages_amount) || 0), 0);

        const printSummary = () => {
            const printContent = document.getElementById('printable-analytics');
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
                        <title>Wages Analytics Report</title>
                        <style>
                            @page { size: landscape; margin: 10mm; }
                            body { font-family: 'Outfit', sans-serif; padding: 10px; color: #0f172a; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                            th, td { border: 1px solid #e2e8f0; padding: 8px; font-size: 11px; }
                            th { background: #f8fafc; text-align: left; font-weight: 700; text-transform: uppercase; color: #64748b; }
                            h2 { text-align: center; margin-bottom: 5px; }
                            .total-row { font-weight: 800; background: #f1f5f9; }
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

        const uniqueLabors = [...new Set(filteredData.map(r => r.labor_id))];
        const isSingleLabor = uniqueLabors.length === 1;
        const matchedLaborObj = isSingleLabor ? labors.find(l => l.id === uniqueLabors[0]) : null;

        const printLaborStatement = (laborObj) => {
            if (!laborObj) return;
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
                        <title>Labor Statement: ${laborObj.name}</title>
                        <style>
                            @page { size: portrait; margin: 15mm; }
                            body { font-family: 'Outfit', sans-serif; padding: 10px; color: #0f172a; margin: 0; }
                            .header { display: flex; align-items: flex-start; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; margin-top: 10px; }
                            .company-info h1 { margin: 0 0 5px 0; color: #1e3a8a; font-size: 26px; }
                            .company-info p { margin: 0; color: #64748b; font-size: 14px; }
                            .labor-info { display: flex; align-items: center; gap: 20px; background: #f8fafc; padding: 15px; border-radius: 12px; margin-bottom: 20px; }
                            .labor-photo { width: 100px; height: 100px; object-fit: cover; border-radius: 8px; border: 2px solid #cbd5e1; }
                            .labor-details h2 { margin: 0 0 8px 0; color: #0f172a; }
                            .labor-details p { margin: 0 0 4px 0; font-size: 14px; color: #475569; }
                            .statement-meta { text-align: right; margin-bottom: 20px; font-size: 14px; color: #475569; }
                            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
                            th, td { border: 1px solid #e2e8f0; padding: 10px; }
                            th { background: #f1f5f9; text-align: left; font-weight: 700; color: #475569; }
                            .total-row td { font-weight: 800; background: #eff6ff; font-size: 14px; color: #1e3a8a; }
                            .signatures { display: flex; justify-content: space-between; margin-top: 60px; padding-top: 20px; }
                            .sig-box { text-align: center; border-top: 1px solid #cbd5e1; width: 220px; padding-top: 10px; font-weight: 600; color: #475569; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <div class="company-info">
                                <h1>Innovative Interiors Pvt Ltd</h1>
                                <p>Official Labor Payment Statement</p>
                            </div>
                            <div style="text-align: right;">
                                <h2 style="margin:0; color:#0f172a;">STATEMENT</h2>
                                <p style="margin:5px 0 0 0; color:#64748b; font-size:12px;">Generated: ${new Date().toLocaleDateString('en-IN')}</p>
                            </div>
                        </div>

                        <div class="statement-meta">
                            <strong>Statement Period:</strong> ${new Date(reportStartDate).toLocaleDateString('en-GB')} to ${new Date(reportEndDate).toLocaleDateString('en-GB')}<br/>
                        </div>

                        <div class="labor-info">
                            ${laborObj.photo_url ? `<img src="${getPhotoUrl(laborObj.photo_url)}" class="labor-photo" alt="Photo" />` : `<div class="labor-photo" style="background:#e2e8f0; display:flex; align-items:center; justify-content:center; color:#94a3b8; font-size:12px; text-align:center;">No Photo</div>`}
                            <div class="labor-details">
                                <h2>${laborObj.name}</h2>
                                <p><strong>Contact:</strong> ${laborObj.phone || 'N/A'}</p>
                                <p><strong>Subcontractor/Team:</strong> ${laborObj.subcontractors?.name || 'Independent'}</p>
                                <p><strong>Role / Designation:</strong> ${laborObj.role || '-'} / ${laborObj.designation || '-'}</p>
                                <p><strong>Daily Rate:</strong> ₹${laborObj.daily_rate}</p>
                            </div>
                        </div>

                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 40px;">#</th>
                                    <th>Date</th>
                                    <th>Site / Project</th>
                                    <th>Time In</th>
                                    <th>Time Out</th>
                                    <th style="text-align: center;">Units</th>
                                    <th style="text-align: right;">Amount (₹)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${filteredData.map((r, i) => `
                                    <tr>
                                        <td>${i + 1}</td>
                                        <td>${new Date(r.work_date).toLocaleDateString('en-GB')}</td>
                                        <td><strong>${r.sites?.name || '-'}</strong></td>
                                        <td>${formatTime12h(r.time_in)}</td>
                                        <td>${formatTime12h(r.time_out)}</td>
                                        <td style="text-align: center;">${r.attendance_value}</td>
                                        <td style="text-align: right;">₹${parseFloat(r.wages_amount).toLocaleString('en-IN')}</td>
                                    </tr>
                                `).join('')}
                                <tr class="total-row">
                                    <td colspan="6" style="text-align: right; text-transform: uppercase;">Total Payable Amount:</td>
                                    <td style="text-align: right;">₹${filteredData.reduce((sum, r) => sum + (parseFloat(r.wages_amount) || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div class="signatures">
                            <div class="sig-box">Labor Signature / Fingerprint</div>
                            <div class="sig-box">Authorized Manager</div>
                        </div>

                        <script>
                            window.onload = function() { 
                                setTimeout(() => {
                                    window.print(); 
                                    setTimeout(() => { window.frameElement.remove(); }, 500); 
                                }, 500);
                            };
                        </script>
                    </body>
                </html>
            `);
            doc.close();
        };

        const exportToExcel = () => {
            const exportData = filteredData.map((r, i) => {
                const row = {
                    '#': i + 1,
                    'Date': new Date(r.work_date).toLocaleDateString('en-GB'),
                    'Site / Project': r.sites?.name || '-',
                    'Labor Name': r.labors?.name || '-',
                    'Category': r.wage_category,
                    'Time In': formatTime12h(r.time_in),
                    'Time Out': formatTime12h(r.time_out),
                    'Remarks': r.remarks || '---',
                };
                if (showRawData) {
                    row['Calc Attn Val'] = r.calculated_attendance_value !== undefined && r.calculated_attendance_value !== null ? parseFloat(r.calculated_attendance_value).toFixed(3) : calculateAttendanceValue(r.time_in, r.time_out).toFixed(3);
                }
                row['Attn Val'] = r.attendance_value;
                if (showRawData) {
                    row['Raw Wages'] = (r.raw_wages_amount !== undefined && r.raw_wages_amount !== null ? parseFloat(r.raw_wages_amount) : (parseFloat(r.attendance_value) || 0) * (r.labors?.daily_rate || 0));
                }
                row['Wages Amount'] = parseFloat(r.wages_amount) || 0;
                return row;
            });

            const totalRow = {
                '#': '', 'Date': '', 'Site / Project': '', 'Labor Name': '', 'Category': '', 'Time In': '', 'Time Out': '', 'Remarks': 'TOTAL',
            };
            if (showRawData) totalRow['Calc Attn Val'] = '';
            totalRow['Attn Val'] = '';
            if (showRawData) totalRow['Raw Wages'] = '';
            totalRow['Wages Amount'] = totalAmount;

            exportData.push(totalRow);

            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, "Wages_Analytics");
            XLSX.writeFile(workbook, `Wages_Analytics_${new Date().toLocaleDateString('en-GB').replace(/\//g, '-')}.xlsx`);
        };

        return (
            <div className={styles.card}>
                <div className={styles.header} style={{ flexDirection: 'column', alignItems: 'stretch', gap: '20px' }}>
                    <div className={styles.filterMenuBar}>
                        <div className={styles.filterMenuItem}>
                            <label className={styles.filterMenuItemLabel}>Search Labor</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type="text"
                                    className={styles.filterMenuInput}
                                    placeholder="Type name..."
                                    value={searchLaborReport}
                                    onChange={e => setSearchLaborReport(e.target.value)}
                                    style={{ paddingLeft: '24px' }}
                                />
                                <Search size={14} style={{ position: 'absolute', left: '2px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                            </div>
                        </div>
                        <div className={styles.filterMenuDivider}></div>
                        
                        <div className={styles.filterMenuItem}>
                            <label className={styles.filterMenuItemLabel}>Site Filter</label>
                            <SearchableSelect 
                                placeholder="All Sites"
                                value={searchSiteReport}
                                onChange={e => setSearchSiteReport(e.target.value)}
                                options={[
                                    { value: 'All', label: 'All Sites' },
                                    ...sites.map(s => ({ value: s.id, label: s.name }))
                                ]}
                            />
                        </div>
                        <div className={styles.filterMenuDivider}></div>

                        <div className={styles.filterMenuItem}>
                            <label className={styles.filterMenuItemLabel}>Category Filter</label>
                            <SearchableSelect 
                                placeholder="All Categories"
                                value={searchCategoryReport}
                                onChange={e => setSearchCategoryReport(e.target.value)}
                                options={[
                                    { value: 'All', label: 'All Categories' },
                                    ...['Direct wages', 'NMR wages', 'Snag wages', 'Third party subvendor work', 'weekly payment agst order'].map(cat => ({ 
                                        value: cat, label: cat 
                                    }))
                                ]}
                            />
                        </div>
                        <div className={styles.filterMenuDivider}></div>

                        <div className={styles.filterMenuItem}>
                            <label className={styles.filterMenuItemLabel}>Subvendor Filter</label>
                            <SearchableSelect 
                                placeholder="All Subvendors"
                                value={searchSubcontractorReport}
                                onChange={e => setSearchSubcontractorReport(e.target.value)}
                                options={[
                                    { value: 'All', label: 'All Subvendors' },
                                    ...subcontractors.map(s => ({ value: s.id, label: s.name }))
                                ]}
                            />
                        </div>
                        <div className={styles.filterMenuDivider}></div>

                        <div className={styles.filterMenuItem} style={{ flex: '1.5', minWidth: '220px' }}>
                            <label className={styles.filterMenuItemLabel}>Date Range</label>
                            <div className={styles.dateFilterGroup}>
                                <input type="date" className={styles.filterDateInput} value={reportStartDate} onChange={e => setReportStartDate(e.target.value)} />
                                <span className={styles.muted} style={{ fontSize: '0.8rem', padding: '0 4px' }}>to</span>
                                <input type="date" className={styles.filterDateInput} value={reportEndDate} onChange={e => setReportEndDate(e.target.value)} />
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', flexWrap: 'wrap' }}>
                        {isSingleLabor && matchedLaborObj && (
                            <Button onClick={() => printLaborStatement(matchedLaborObj)} style={{ background: '#0f172a', color: 'white', borderColor: '#0f172a' }}>
                                <Printer size={16} style={{ marginRight: 8 }} /> Print Labor Statement (Bill)
                            </Button>
                        )}
                        <Button onClick={exportToExcel} style={{ background: '#10b981', color: 'white', borderColor: '#10b981' }}>
                            <Download size={16} style={{ marginRight: 8 }} /> Export Excel
                        </Button>
                        <Button onClick={printSummary} variant="outline" size="sm">
                            <Printer size={16} style={{ marginRight: 8 }} /> Print Analytics (All)
                        </Button>
                    </div>
                </div>

                <div id="printable-analytics">
                    <div className={styles.tableContainer} style={{ marginTop: '20px' }}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th style={{ width: '40px' }}>#</th>
                                    <th>DATE</th>
                                    <th>SITE / PROJECT</th>
                                    <th>LABOR NAME</th>
                                    <th>CATEGORY</th>
                                    <th>TIME IN</th>
                                    <th>TIME OUT</th>
                                    <th>REMARKS</th>
                                    {showRawData && <th style={{ textAlign: 'center', color: '#8b5cf6' }}>CALC ATTN VAL</th>}
                                    <th style={{ textAlign: 'center' }}>ATTN VAL</th>
                                    {showRawData && <th style={{ textAlign: 'right', color: '#8b5cf6' }}>RAW WAGES</th>}
                                    <th style={{ textAlign: 'right' }}>WAGES AMOUNT</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((r, i) => (
                                    <tr key={r.id}>
                                        <td>{i + 1}</td>
                                        <td>{new Date(r.work_date).toLocaleDateString('en-GB')}</td>
                                        <td><span className={styles.strong}>{r.sites?.name || '-'}</span></td>
                                        <td><span className={styles.strong}>{r.labors?.name || '-'}</span></td>
                                        <td>
                                            <span className={styles.badge} style={{ background: '#f1f5f9', color: '#475569', fontSize: '10px' }}>
                                                {r.wage_category}
                                            </span>
                                        </td>
                                        <td style={{ fontWeight: 600, color: '#2563eb' }}>{formatTime12h(r.time_in)}</td>
                                        <td style={{ fontWeight: 600, color: '#2563eb' }}>{formatTime12h(r.time_out)}</td>
                                        <td style={{ fontSize: '0.85rem' }}>{r.remarks || '---'}</td>
                                        {showRawData && <td style={{ textAlign: 'center', color: '#8b5cf6', fontWeight: 600 }}>{r.calculated_attendance_value !== undefined && r.calculated_attendance_value !== null ? parseFloat(r.calculated_attendance_value).toFixed(3) : calculateAttendanceValue(r.time_in, r.time_out).toFixed(3)}</td>}
                                        <td style={{ textAlign: 'center' }}>{r.attendance_value}</td>
                                        {showRawData && <td style={{ textAlign: 'right', color: '#8b5cf6', fontWeight: 600 }}>₹{(r.raw_wages_amount !== undefined && r.raw_wages_amount !== null ? parseFloat(r.raw_wages_amount) : (parseFloat(r.attendance_value) || 0) * (r.labors?.daily_rate || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>}
                                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{parseFloat(r.wages_amount).toLocaleString('en-IN')}</td>
                                    </tr>
                                ))}
                                <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                                    <td colSpan={showRawData ? 11 : 9} style={{ textAlign: 'right', textTransform: 'uppercase' }}>Page Total</td>
                                    <td style={{ textAlign: 'right', color: '#0f172a' }}>₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
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
                    <button 
                        onClick={() => setGuideModalOpen(true)}
                        style={{
                            marginTop: '8px',
                            background: '#eff6ff',
                            border: '1px solid #bfdbfe',
                            color: '#1d4ed8',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            transition: 'all 0.2s ease',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#dbeafe'; }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#eff6ff'; }}
                    >
                        📖 Guide & Notes
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', flexWrap: 'wrap', gap: '16px' }}>
                <div className={styles.tabs} style={{ marginBottom: 0 }}>
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
                        <Briefcase size={18} /> Subcontractors
                    </div>
                    <div className={`${styles.tab} ${activeTab === 'labors' ? styles.activeTab : ''}`} onClick={() => setActiveTab('labors')}>
                        <Users size={18} /> Labors
                    </div>
                </div>
                
                {activeTab === 'summary' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600, color: '#475569', fontSize: '0.9rem', background: 'white', padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <input 
                            type="checkbox" 
                            checked={showRawData} 
                            onChange={e => setShowRawData(e.target.checked)} 
                            style={{ width: '16px', height: '16px', accentColor: '#2563eb', cursor: 'pointer' }}
                        />
                        Show Raw Data (Calc Units & Raw Wages)
                    </label>
                )}
            </div>

            <div className={styles.content}>
                {activeTab === 'attendance' && renderAttendance()}
                {activeTab === 'reports' && renderReports()}
                {activeTab === 'summary' && renderSummary()}
                {activeTab === 'engineers' && renderSubcontractors()}
                {activeTab === 'labors' && renderLaborsList()}
                {/* --- CORRECTION MODAL --- */}
                {correctionModalOpen && (
                    <div className={styles.modalOverlay}>
                        <div className={styles.modal} style={{ maxWidth: '900px' }}>
                            <div className={styles.modalHeader}>
                                <h3>Daily Logs Correction: {correctionLabor?.name}</h3>
                                <p className={styles.muted}>Review and edit daily logs for the selected period</p>
                            </div>
                            <div className={styles.tableContainer} style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                <table className={styles.table}>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>Site / Project</th>
                                            <th>Category</th>
                                            <th>Hours (In - Out)</th>
                                            <th style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>Units (Calc / Edit)</th>
                                            <th style={{ whiteSpace: 'nowrap' }}>Actual (₹)</th>
                                            <th style={{ whiteSpace: 'nowrap' }}>Rounded (₹)</th>
                                            <th>Remarks</th>
                                            <th style={{ textAlign: 'right' }}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {correctionRecords.map((r, idx) => (
                                            <tr key={r.id}>
                                                <td><div className={styles.strong}>{formatDate(r.work_date)}</div></td>
                                                <td>
                                                    <div style={{ minWidth: '180px' }}>
                                                        <SearchableSelect 
                                                            placeholder="Select Site..."
                                                            value={r.new_site_id || ''}
                                                            onChange={e => handleCorrectionChange(idx, 'new_site_id', e.target.value)}
                                                            options={sites.map(s => ({ value: s.id, label: s.name }))}
                                                        />
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ minWidth: '180px' }}>
                                                        <SearchableSelect 
                                                            placeholder="Select Category..."
                                                            value={r.new_category}
                                                            onChange={e => handleCorrectionChange(idx, 'new_category', e.target.value)}
                                                            options={['Direct wages', 'NMR wages', 'Snag wages', 'Third party subvendor work', 'weekly payment agst order'].map(cat => ({ value: cat, label: cat }))}
                                                        />
                                                    </div>
                                                </td>
                                                <td>
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <TimePicker className={styles.input} value={r.new_time_in} onChange={val => handleCorrectionChange(idx, 'new_time_in', val)} />
                                                        <span>to</span>
                                                        <TimePicker className={styles.input} value={r.new_time_out} onChange={val => handleCorrectionChange(idx, 'new_time_out', val)} />
                                                    </div>
                                                </td>
                                                <td style={{ textAlign: 'center' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                                        <span style={{ color: '#64748b', fontSize: '0.85rem' }} title="Calculated Units">
                                                            {calculateAttendanceValue(r.new_time_in, r.new_time_out).toFixed(2)}
                                                        </span>
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            min="0"
                                                            className={styles.input}
                                                            style={{ width: '60px', padding: '6px', textAlign: 'center', fontWeight: 'bold' }}
                                                            value={r.new_attn_val}
                                                            onChange={(e) => handleCorrectionChange(idx, 'new_attn_val', e.target.value)}
                                                            title="Final Edited Units"
                                                        />
                                                    </div>
                                                </td>
                                                <td>
                                                    <input type="number" readOnly className={styles.input} style={{ width: '90px', background: '#f8fafc', color: '#64748b' }} value={r.new_actual_wages} />
                                                </td>
                                                <td>
                                                    <input type="number" className={styles.input} style={{ width: '100px', fontWeight: 700 }} value={r.new_wages} onChange={e => handleCorrectionChange(idx, 'new_wages', e.target.value)} />
                                                </td>
                                                <td>
                                                    <input type="text" className={styles.input} style={{ width: '100%' }} value={r.new_remarks} onChange={e => handleCorrectionChange(idx, 'new_remarks', e.target.value)} />
                                                </td>
                                                <td style={{ textAlign: 'right' }}>
                                                    <button 
                                                        onClick={() => deleteCorrectionRecord(r.id)} 
                                                        className={`${styles.attnBtn} ${styles.btnA}`} 
                                                        title="Delete Day Log"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className={styles.modalActions}>
                                <Button variant="outline" onClick={() => setCorrectionModalOpen(false)}>Cancel</Button>
                                <Button onClick={saveCorrections} disabled={isSavingCorrection}>
                                    {isSavingCorrection ? 'Saving...' : 'Update All Logs'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Subcontractor Modal */}
            {subModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modal}>
                        <div className={styles.modalHeader}>
                            <h3>{editingSub ? 'Edit Subcontractor' : 'New Subcontractor'}</h3>
                        </div>
                        <div className={styles.formGrid} style={{ gridTemplateColumns: '1fr', padding: 0, background: 'none' }}>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Subcontractor Name</label>
                                <input className={styles.input} value={subForm.name} onChange={e => setSubForm({ ...subForm, name: e.target.value })} placeholder="Full name" />
                            </div>
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Phone Number</label>
                                <input className={styles.input} value={subForm.phone} onChange={e => setSubForm({ ...subForm, phone: e.target.value })} placeholder="Phone" />
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <Button variant="outline" onClick={() => setSubModalOpen(false)}>Cancel</Button>
                            <Button onClick={saveSub}>Save Subcontractor</Button>
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
                            <div className={styles.formGroup}>
                                <label className={styles.label}>Subcontractor</label>
                                <select className={styles.input} value={laborForm.subcontractor_id} onChange={e => setLaborForm({ ...laborForm, subcontractor_id: e.target.value })}>
                                    <option value="">-- Select Subcontractor --</option>
                                    {subcontractors.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>
                            <div className={styles.formGrid} style={{ padding: 0, background: 'none', gridGap: '16px' }}>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Role</label>
                                    <input className={styles.input} placeholder="e.g. Mason, Helper" value={laborForm.role} onChange={e => setLaborForm({ ...laborForm, role: e.target.value })} />
                                </div>
                                <div className={styles.formGroup}>
                                    <label className={styles.label}>Designation</label>
                                    <input className={styles.input} placeholder="e.g. Senior, Junior" value={laborForm.designation} onChange={e => setLaborForm({ ...laborForm, designation: e.target.value })} />
                                </div>
                            </div>
                            <div className={styles.formGroup} style={{ marginTop: '12px' }}>
                                <label className={styles.label}>Labor Photo (Upload or URL)</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <input 
                                        type="file" 
                                        accept="image/*"
                                        id="laborPhotoInput"
                                        style={{ display: 'none' }}
                                        onChange={(e) => setSelectedLaborFile(e.target.files[0])}
                                    />
                                    <Button 
                                        variant="secondary" 
                                        style={{ flexShrink: 0, padding: '8px 12px', fontSize: '13px' }}
                                        onClick={() => document.getElementById('laborPhotoInput').click()}
                                    >
                                        {selectedLaborFile ? 'Change Photo' : 'Browse Photo'}
                                    </Button>
                                    <input 
                                        className={styles.input} 
                                        placeholder="Or paste Drive URL link here" 
                                        value={selectedLaborFile ? selectedLaborFile.name : laborForm.photo_url} 
                                        onChange={e => setLaborForm({ ...laborForm, photo_url: e.target.value })} 
                                        readOnly={!!selectedLaborFile}
                                    />
                                </div>
                                {selectedLaborFile && (
                                    <div style={{ fontSize: '12px', color: '#2563eb', marginTop: '4px', fontWeight: 600 }}>
                                        ✓ Ready to upload: {selectedLaborFile.name}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <Button variant="outline" onClick={() => setLaborModalOpen(false)}>Cancel</Button>
                            <Button onClick={saveLabor}>Confirm Save</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Guide Modal */}
            {guideModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setGuideModalOpen(false)}>
                    <div className={styles.modal} style={{ maxWidth: '700px', cursor: 'default' }} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader} style={{ background: '#eff6ff', padding: '20px', borderRadius: '16px 16px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #bfdbfe' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ background: '#2563eb', color: 'white', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                                    <ClipboardList size={24} />
                                </div>
                                <h3 style={{ margin: 0, color: '#1e3a8a', fontSize: '1.4rem' }}>Wages Module Guide</h3>
                            </div>
                            <button onClick={() => setGuideModalOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.5rem', lineHeight: '1' }}>&times;</button>
                        </div>
                        <div style={{ padding: '24px', maxHeight: '60vh', overflowY: 'auto', fontSize: '0.95rem', color: '#334155', lineHeight: '1.6' }}>
                            
                            <h4 style={{ color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>📌 Labour Attendance Calculation Logic</h4>
                            
                            <h5 style={{ color: '#2563eb', marginBottom: '8px' }}>Time Slabs & Hourly Rates:</h5>
                            <p style={{ fontSize: '0.85rem', marginBottom: '12px', color: '#64748b' }}>Rates are calculated as <em>Multipliers</em> of the Daily Wage Rate.</p>
                            <ul style={{ listStyleType: 'none', paddingLeft: '12px', marginBottom: '16px' }}>
                                <li style={{ marginBottom: '4px' }}><strong>Morning Shift (6:00 AM – 9:30 AM):</strong> 3.5 hrs &rarr; <span style={{ color: '#ea580c', fontWeight: 600 }}>0.1428</span> / hr</li>
                                <li style={{ marginBottom: '4px' }}><strong>Day Shift (9:30 AM – 6:00 PM):</strong> 8.5 hrs &rarr; <span style={{ color: '#ea580c', fontWeight: 600 }}>0.1176</span> / hr</li>
                                <li style={{ marginBottom: '4px' }}><strong>Night Shift (6:00 PM – 2:00 AM):</strong> 8.0 hrs &rarr; <span style={{ color: '#ea580c', fontWeight: 600 }}>0.1250</span> / hr</li>
                            </ul>

                            <h5 style={{ color: '#2563eb', marginBottom: '8px' }}>Calculation Steps:</h5>
                            <ol style={{ paddingLeft: '24px', marginBottom: '20px' }}>
                                <li>The system splits your Time In/Out into the above hourly slabs.</li>
                                <li>Hours in each slab are multiplied by their specific rate (pro-rata).</li>
                                <li>The sum gives the <strong>Attendance Value (Units)</strong>.</li>
                                <li>Final Wage = Attendance Value &times; Daily Wage Rate.</li>
                            </ol>

                            <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', borderLeft: '4px solid #10b981', marginBottom: '24px' }}>
                                <h5 style={{ margin: '0 0 8px 0', color: '#047857' }}>✅ Example Calculation</h5>
                                <p style={{ margin: '4px 0' }}><strong>Time:</strong> 7:00 AM – 7:00 PM (12 hrs total)</p>
                                <p style={{ margin: '4px 0', paddingLeft: '12px', color: '#475569', fontSize: '0.9rem' }}>
                                    &bull; 7:00 AM to 9:30 AM (2.5 hrs) &times; 0.1428 = 0.357<br />
                                    &bull; 9:30 AM to 6:00 PM (8.5 hrs) &times; 0.1176 = 1.000<br />
                                    &bull; 6:00 PM to 7:00 PM (1.0 hrs) &times; 0.1250 = 0.125
                                </p>
                                <p style={{ margin: '8px 0 4px 0' }}><strong>Sum of Units</strong> = 0.357 + 1.000 + 0.125 = <strong>1.482</strong></p>
                                <p style={{ margin: '4px 0' }}><strong>If Daily Rate</strong> = ₹1000</p>
                                <p style={{ margin: '8px 0 0 0', fontWeight: 'bold', fontSize: '1.1rem' }}>Final Wage = 1.482 &times; 1000 = ₹1482</p>
                            </div>

                            <h4 style={{ color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>2. Wages Calculation & Rounding</h4>
                            <p>Daily wages are computed by multiplying the <strong>Attendance Unit</strong> by the worker's <strong>Daily Wage Rate</strong>. The system rounds to the nearest whole rupee to ensure simple accounting.</p>
                            <ul style={{ listStyleType: 'decimal', paddingLeft: '20px', marginBottom: '20px' }}>
                                <li><strong style={{ color: '#ea580c' }}>Raw Wage:</strong> Attendance Unit &times; Daily Rate</li>
                                <li><strong style={{ color: '#16a34a' }}>Rounded Wage Final:</strong> Automatically rounded to the nearest Rupee.</li>
                            </ul>
                            
                            <div style={{ background: '#f0fdf4', padding: '12px', borderRadius: '8px', borderLeft: '4px solid #22c55e', marginBottom: '8px' }}>
                                <strong>Rounding Rule:</strong><br/>
                                Standard mathematical rounding is applied. For example, ₹1482.14 becomes <strong>₹1482</strong>.
                            </div>
                            
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px', marginBottom: '24px', fontSize: '0.9rem', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ background: '#e2e8f0' }}>
                                        <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1' }}>Daily Rate (₹)</th>
                                        <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1' }}>Unit</th>
                                        <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1' }}>Raw Wage</th>
                                        <th style={{ padding: '8px', borderBottom: '1px solid #cbd5e1' }}>Rounded Final</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>₹800</td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>0.5</td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>₹400</td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#16a34a' }}>₹400</td>
                                    </tr>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>₹650</td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>1.0</td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>₹650</td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#16a34a' }}>₹650</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>₹1000</td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>1.482</td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>₹1482.14</td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#0ea5e9' }}>₹1482</td>
                                    </tr>
                                    <tr style={{ background: '#f8fafc' }}>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>₹500</td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>0.75</td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0' }}>₹375</td>
                                        <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', fontWeight: 'bold', color: '#0ea5e9' }}>₹375</td>
                                    </tr>
                                    <tr>
                                        <td style={{ padding: '8px' }}>₹600</td>
                                        <td style={{ padding: '8px' }}>0.333</td>
                                        <td style={{ padding: '8px' }}>₹199.80</td>
                                        <td style={{ padding: '8px', fontWeight: 'bold', color: '#0ea5e9' }}>₹200</td>
                                    </tr>
                                </tbody>
                            </table>

                            <h4 style={{ color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '6px', marginBottom: '12px' }}>3. How to Record Daily Logs</h4>
                            <p style={{ marginBottom: '8px' }}>Step-by-step workflow for the <strong>Attendance Tab</strong>:</p>
                            <ol style={{ paddingLeft: '20px', marginBottom: '0' }}>
                                <li>Select the <strong>Project Site</strong>, <strong>Subcontractor</strong>, and <strong>Wage Category</strong> at the top bar.</li>
                                <li>Select the appropriate <strong>Date</strong> for logging.</li>
                                <li>For every active labor listed below, input their Time In and Time Out. The system auto-calculates units & limits.</li>
                                <li>Add any optional text to the 'Remarks' field.</li>
                                <li>Once all fields are prepared, hit the <strong>Save Daily Attendance</strong> button at the bottom. The laborers will vanish from the entry list for that date.</li>
                            </ol>

                        </div>
                        <div className={styles.modalActions} style={{ padding: '16px 24px', background: '#f8fafc', borderRadius: '0 0 16px 16px', borderTop: '1px solid #e2e8f0' }}>
                            <Button onClick={() => setGuideModalOpen(false)}>Close Guide</Button>
                        </div>
                    </div>
                </div>
            )}

            {hoveredLabor && hoveredLabor.photo_url && (
                <div 
                    style={{
                        position: 'fixed',
                        left: mousePos.x + 20,
                        top: mousePos.y - 120,
                        zIndex: 9999,
                        background: 'white',
                        padding: '10px',
                        borderRadius: '20px',
                        boxShadow: '0 25px 60px rgba(0,0,0,0.4)',
                        border: '3px solid #3b82f6',
                        pointerEvents: 'none',
                        animation: 'fadeIn 0.2s ease-out',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center'
                    }}
                >
                    <div style={{ 
                        width: '200px', 
                        height: '200px', 
                        borderRadius: '12px', 
                        background: '#f1f5f9', 
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative'
                    }}>
                        <img 
                            src={getPhotoUrl(hoveredLabor.photo_url)} 
                            alt={hoveredLabor.name} 
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                            referrerPolicy="no-referrer"
                            onError={(e) => { 
                                // Use an inline SVG instead of an external placeholder to avoid "Local Network Access" prompts
                                e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%2364748b'%3EPhoto Unavailable%3C/text%3E%3C/svg%3E";
                            }}
                        />
                    </div>
                    <div style={{ marginTop: '10px', textAlign: 'center' }}>
                        <div style={{ fontWeight: 800, fontSize: '14px', color: '#1e3a8a' }}>{hoveredLabor.name}</div>
                        <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                            {hoveredLabor.photo_url.includes('drive.google') ? '⚠️ Check Drive Permissions' : 'Supabase Storage'}
                        </div>
                    </div>
                    <style>{`
                        @keyframes fadeIn {
                            from { opacity: 0; transform: scale(0.9); }
                            to { opacity: 1; transform: scale(1); }
                        }
                    `}</style>
                </div>
            )}

            {/* Professional Permission Guide Modal */}
            {showPermissionGuide && (
                <div className={styles.modalOverlay} style={{ zIndex: 2000 }}>
                    <div className={styles.modal} style={{ maxWidth: '450px', textAlign: 'center', padding: '40px 30px' }}>
                        <div style={{ 
                            width: '70px', 
                            height: '70px', 
                            background: '#eff6ff', 
                            borderRadius: '20px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            margin: '0 auto 24px auto'
                        }}>
                            <Users size={32} color="#2563eb" />
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '12px' }}>
                            Worker Photo Previews
                        </h3>
                        <p style={{ color: '#64748b', lineHeight: '1.6', fontSize: '0.95rem', marginBottom: '24px' }}>
                            We have enabled <strong>instant photo previews</strong> for the attendance log. 
                            To see worker photos smoothly:
                        </p>
                        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', textAlign: 'left', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
                                <div style={{ minWidth: '24px', height: '24px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>1</div>
                                <div style={{ fontSize: '0.85rem', color: '#334155' }}>If your browser asks for <strong>"Permission to load"</strong> or <strong>"Access devices"</strong>, please click <strong>ALLOW</strong>.</div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ minWidth: '24px', height: '24px', background: '#3b82f6', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>2</div>
                                <div style={{ fontSize: '0.85rem', color: '#334155' }}>Any "Browse Photo" button will automatically ask for camera/file access when clicked.</div>
                            </div>
                        </div>
                        <Button onClick={dismissPermissionGuide} style={{ width: '100%', padding: '14px', borderRadius: '12px' }}>
                            I Understand, Proceed
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WagesPage;
