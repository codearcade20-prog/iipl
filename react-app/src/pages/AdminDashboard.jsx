import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Input, LoadingOverlay } from '../components/ui';
import { Shield } from 'lucide-react';
import styles from './AdminDashboard.module.css';
import TemplateModal from '../components/TemplateModal';
import { useMessage } from '../context/MessageContext';
import { formatDate } from '../utils';

const AdminDashboard = () => {
    const { logout } = useAuth();
    const { alert, confirm, prompt, toast } = useMessage();
    // Auth State
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [authError, setAuthError] = useState(false);

    // Navigation State
    const [currentView, setCurrentView] = useState('history');

    // --- VENDORS STATE ---
    const [vendors, setVendors] = useState([]);
    // eslint-disable-next-line
    const [loadingVendors, setLoadingVendors] = useState(false);
    const [vendorModalOpen, setVendorModalOpen] = useState(false);
    const [editingVendorId, setEditingVendorId] = useState(null);
    const [vendorForm, setVendorForm] = useState({
        name: '', holderName: '', pan: '', phone: '', address: '', acc: '', bank: '', ifsc: '', vendorType: 'both'
    });

    // --- HISTORY STATE ---
    const [history, setHistory] = useState([]);
    // eslint-disable-next-line
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [statusFilter, setStatusFilter] = useState('All');
    const [openStatusDropdown, setOpenStatusDropdown] = useState(null);
    const [vendorSearch, setVendorSearch] = useState('');
    const [dateSearch, setDateSearch] = useState('');

    const [projectSearch, setProjectSearch] = useState('');

    // --- HISTORY EDIT STATE ---
    const [editHistoryModalOpen, setEditHistoryModalOpen] = useState(false);
    const [editingHistoryItem, setEditingHistoryItem] = useState(null);

    // --- BIN STATE ---
    const [binItems, setBinItems] = useState([]);
    const [loadingBin, setLoadingBin] = useState(false);

    // --- USERS STATE ---
    const [appUsers, setAppUsers] = useState([]);
    const [userModalOpen, setUserModalOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState(null);
    const [userForm, setUserForm] = useState({
        username: '',
        password: '',
        is_admin: false,
        permissions: []
    });

    // --- SITES STATE ---
    const [sites, setSites] = useState([]);
    const [loadingSites, setLoadingSites] = useState(false);
    const [siteModalOpen, setSiteModalOpen] = useState(false);
    const [editingSiteId, setEditingSiteId] = useState(null);
    const [siteForm, setSiteForm] = useState({ name: '', location: '', client: '' });
    const [siteSearch, setSiteSearch] = useState('');
    const [viewItem, setViewItem] = useState(null);
    // --- SETTINGS STATE ---
    const [gmSignature, setGmSignature] = useState('');
    const [uploading, setUploading] = useState(false);

    // --- GLOBAL LOADING STATE ---
    const [saving, setSaving] = useState(false);

    // --- AUTH ---
    const handleLogin = () => {
        if (password === 'boss207') {
            setIsAuthenticated(true);
            setAuthError(false);
        } else {
            setAuthError(true);
        }
    };

    // --- EFFECTS ---
    useEffect(() => {
        if (isAuthenticated) {
            if (currentView === 'vendors') fetchVendors();
            else if (currentView === 'sites') fetchSites();
            else if (currentView === 'bin') fetchBin();
            else if (currentView === 'users') fetchUsers();
            else if (currentView === 'settings') fetchSettings();
            else fetchHistory();
        }
    }, [isAuthenticated, currentView]);

    // --- VENDOR ACTIONS ---
    const fetchVendors = async () => {
        setLoadingVendors(true);
        try {
            const { data, error } = await supabase.from('vendors').select('*').order('vendor_name', { ascending: true });
            if (error) throw error;
            setVendors(data || []);
        } catch (e) { await alert(e.message); }
        finally { setLoadingVendors(false); }
    };

    const openVendorModal = (v = null) => {
        if (v) {
            setEditingVendorId(v.id);
            setVendorForm({
                name: v.vendor_name, holderName: v.account_holder, pan: v.pan_no, phone: v.phone,
                address: v.address, acc: v.account_number, bank: v.bank_name, ifsc: v.ifsc_code,
                vendorType: v.vendor_type || 'both'
            });
        } else {
            setEditingVendorId(null);
            setVendorForm({ name: '', holderName: '', pan: '', phone: '', address: '', acc: '', bank: '', ifsc: '', vendorType: 'both' });
        }
        setVendorModalOpen(true);
    };

    const saveVendor = async () => {
        const payload = {
            vendor_name: vendorForm.name, account_holder: vendorForm.holderName, pan_no: vendorForm.pan,
            phone: vendorForm.phone, address: vendorForm.address, account_number: vendorForm.acc,
            bank_name: vendorForm.bank, ifsc_code: vendorForm.ifsc.toUpperCase(),
            vendor_type: vendorForm.vendorType
        };
        setSaving(true);
        try {
            if (editingVendorId) await supabase.from('vendors').update(payload).eq('id', editingVendorId);
            else await supabase.from('vendors').insert([payload]);
            setVendorModalOpen(false);
            fetchVendors();
            toast(`Vendor ${editingVendorId ? 'updated' : 'added'} successfully!`);
        } catch (e) { await alert(e.message); }
        finally { setSaving(false); }
    };

    const deleteVendor = async (id) => {
        if (await confirm('Delete this vendor?')) {
            setSaving(true);
            try {
                await supabase.from('vendors').delete().eq('id', id);
                fetchVendors();
                toast('Vendor deleted successfully!');
            } catch (e) { await alert(e.message); }
            finally { setSaving(false); }
        }
    };

    // --- SITE ACTIONS ---
    const fetchSites = async () => {
        setLoadingSites(true);
        try {
            const { data, error } = await supabase.from('sites').select('*').order('name', { ascending: true });
            if (error) {
                console.error('Fetch sites error:', error);
                throw error;
            }
            setSites(data || []);
        } catch (e) {
            await alert('Error fetching sites: ' + (e.message || 'Unknown error'));
        } finally { setLoadingSites(false); }
    };

    const openSiteModal = (s = null) => {
        if (s) {
            setEditingSiteId(s.id);
            setSiteForm({ name: s.name, location: s.location || '', client: s.client || '' });
        } else {
            setEditingSiteId(null);
            setSiteForm({ name: '', location: '', client: '' });
        }
        setSiteModalOpen(true);
    };

    const saveSite = async () => {
        if (!siteForm.name.trim()) {
            await alert('Site Name is required');
            return;
        }

        const payload = {
            name: siteForm.name.trim(),
            location: siteForm.location.trim(),
            client: siteForm.client.trim()
        };

        setSaving(true);
        try {
            if (editingSiteId) {
                const { error } = await supabase.from('sites').update(payload).eq('id', editingSiteId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from('sites').insert([payload]);
                if (error) throw error;
            }
            setSiteModalOpen(false);
            fetchSites();
            toast('Site saved successfully');
        } catch (e) {
            console.error('Save site error:', e);
            await alert('Error saving site: ' + (e.message || 'Make sure the "sites" table has "location" and "client" columns.'));
        } finally { setSaving(false); }
    };

    const deleteSite = async (id) => {
        if (await confirm('Are you sure you want to delete this site?')) {
            setSaving(true);
            try {
                const { error } = await supabase.from('sites').delete().eq('id', id);
                if (error) throw error;
                fetchSites();
                toast('Site deleted successfully!');
            } catch (e) {
                await alert('Error deleting site: ' + e.message);
            } finally { setSaving(false); }
        }
    };

    // --- HISTORY ACTIONS ---
    const fetchHistory = async () => {
        setLoadingHistory(true);
        try {
            const { data, error } = await supabase.from('payment_history').select('*').order('created_at', { ascending: false });
            if (error) throw error;
            setHistory(data || []);
        } catch (e) {
            console.error(e);
        } finally { setLoadingHistory(false); }
    };

    const updateStatus = async (id, newStatus) => {
        const item = history.find(h => h.id === id);
        if (!item) return;

        let payload = { status: newStatus };

        if (newStatus === 'Paid') {
            const splits = Array.isArray(item.payment_splits) ? item.payment_splits : [];
            const currentTotalPaid = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
            const totalAmount = parseFloat(item.amount) || 0;
            const remaining = totalAmount - currentTotalPaid;

            if (remaining > 0) {
                const choice = await confirm(`Remaining balance: ₹${remaining.toLocaleString('en-IN')}.\n\nClick OK for FULL payment (Record remaining ₹${remaining.toLocaleString('en-IN')} and mark as Paid)\nClick CANCEL for PARTIAL payment (Record a custom amount and keep as Partial)`);

                if (choice) {
                    // Full payment
                    const dateStr = await prompt("Enter Final Payment Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
                    if (!dateStr) return; // Cancelled

                    const finalSplit = { amount: remaining, date: dateStr };
                    payload.payment_splits = [...splits, finalSplit];
                    payload.paid_amount = totalAmount;
                    payload.remaining_amount = 0;
                    payload.paid_date = dateStr;
                    payload.status = 'Paid';
                } else {
                    // Another partial payment
                    const amountInput = await prompt(`Current Balance: ₹${remaining.toLocaleString('en-IN')}\nEnter additional amount paid now (must be LESS than ₹${remaining.toLocaleString('en-IN')}):`);
                    if (amountInput === null) return; // Cancelled

                    const additionalPaid = parseFloat(amountInput) || 0;
                    if (additionalPaid <= 0 || additionalPaid >= remaining) {
                        await alert(`Please enter a valid amount strictly less than ₹${remaining.toLocaleString('en-IN')}. For full settlement, use the Full payment option.`);
                        return;
                    }

                    const dateStr = await prompt("Enter Payment Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
                    if (!dateStr) return; // Cancelled

                    const newSplit = { amount: additionalPaid, date: dateStr };
                    payload.payment_splits = [...splits, newSplit];
                    payload.paid_amount = currentTotalPaid + additionalPaid;
                    payload.remaining_amount = totalAmount - (currentTotalPaid + additionalPaid);
                    payload.paid_date = dateStr;
                    payload.status = 'Partial'; // Keep as partial
                }

            } else {
                // Already fully paid by splits
                payload.paid_amount = totalAmount;
                payload.remaining_amount = 0;
                payload.paid_date = item.paid_date || new Date().toISOString().split('T')[0];
            }
        } else if (newStatus === 'Partial') {
            const splits = Array.isArray(item.payment_splits) ? item.payment_splits : [];
            const currentTotalPaid = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
            const totalAmount = parseFloat(item.amount) || 0;
            const remaining = totalAmount - currentTotalPaid;

            if (remaining <= 0) {
                await alert("This record is already fully paid. Please change status to 'Paid'.");
                return;
            }

            const amountInput = await prompt(`Total Amount: ₹${totalAmount.toLocaleString('en-IN')}\nRemaining: ₹${remaining.toLocaleString('en-IN')}\nEnter additional amount paid now (less than ₹${remaining.toLocaleString('en-IN')}):`);
            if (amountInput === null) return; // Cancelled

            const additionalPaid = parseFloat(amountInput) || 0;
            if (additionalPaid <= 0 || additionalPaid >= remaining) {
                await alert(`Please enter a valid amount strictly less than the remaining ₹${remaining.toLocaleString('en-IN')}. For full settlement, set status to 'Paid'.`);
                return;
            }

            const dateStr = await prompt("Enter Payment Date (YYYY-MM-DD):", new Date().toISOString().split('T')[0]);
            if (!dateStr) return; // Cancelled

            const newSplit = { amount: additionalPaid, date: dateStr };
            const updatedSplits = [...splits, newSplit];
            const newTotalPaid = currentTotalPaid + additionalPaid;

            payload.payment_splits = updatedSplits;
            payload.paid_amount = newTotalPaid;
            payload.remaining_amount = totalAmount - newTotalPaid;
            payload.paid_date = dateStr;
        }

        setSaving(true);
        try {
            const { error } = await supabase.from('payment_history').update(payload).eq('id', id);
            if (error) throw error;

            setHistory(history.map(h =>
                h.id === id ? { ...h, ...payload } : h
            ));
            toast('Status updated successfully!');
        } catch (e) { await alert(e.message); }
        finally { setSaving(false); }
    };

    const deleteHistory = async (id) => {
        if (await confirm('Delete this record? It will be moved to the Bin.')) {
            try {
                // 1. Fetch item to backup
                const item = history.find(h => h.id === id);
                if (!item) return;

                // 2. Insert into Recycle Bin
                const { error: binError } = await supabase.from('recycle_bin').insert({
                    original_table: 'payment_history',
                    data: item
                });
                if (binError) {
                    // Start: If table doesn't exist, alerts user
                    console.error("Recycle Bin Error:", binError);
                    await alert("Error saving to Bin. Is the 'recycle_bin' table created? Deletion aborted.");
                    return;
                }

                // 3. Delete from actual table
                setSaving(true);
                await supabase.from('payment_history').delete().eq('id', id);
                setHistory(history.filter(h => h.id !== id));
                toast('Record moved to Recycle Bin.');
            } catch (e) { await alert(e.message); }
            finally { setSaving(false); }
        }
    };

    const clearAllHistory = async () => {
        if (!history.length) return;

        // Password Check
        const pwd = await prompt("Enter Admin Password to Clear All History:");
        if (pwd === null) return;
        if (pwd !== 'sakthi207') {
            await alert("Incorrect Password!");
            return;
        }

        if (await confirm('⚠ WARNING: You are about to clear ALL history records.\nThey will be moved to the Bin.\n\nProceed?')) {
            try {
                // 1. Backup all to Bin
                const backupData = history.map(h => ({
                    original_table: 'payment_history',
                    data: h
                }));

                const { error: binError } = await supabase.from('recycle_bin').insert(backupData);
                if (binError) {
                    console.error("Recycle Bin Error:", binError);
                    await alert("Error saving to Bin. Operations aborted. Please check DB schema.");
                    return;
                }

                // 2. Delete all records currently in state
                setSaving(true);
                const { error } = await supabase
                    .from('payment_history')
                    .delete()
                    .in('id', history.map(h => h.id));

                if (error) throw error;
                setHistory([]);
                toast('All history records moved to Bin.');
            } catch (e) {
                console.error(e);
                await alert('Error clearing history: ' + e.message);
            } finally { setSaving(false); }
        }
    };


    const openEditHistoryModal = (item) => {
        setEditingHistoryItem({ ...item });
        setEditHistoryModalOpen(true);
    };

    const saveHistoryEdit = async () => {
        if (!editingHistoryItem) return;

        setSaving(true);
        try {
            const { error } = await supabase
                .from('payment_history')
                .update({
                    vendor_name: editingHistoryItem.vendor_name,
                    project: editingHistoryItem.project,
                    amount: parseFloat(editingHistoryItem.amount),
                    date: editingHistoryItem.date,
                    wo_date: editingHistoryItem.wo_date,
                    invoice_no: editingHistoryItem.invoice_no,
                    bill_status: editingHistoryItem.bill_status,
                    paid_amount: parseFloat(editingHistoryItem.paid_amount) || 0,
                    remaining_amount: parseFloat(editingHistoryItem.remaining_amount) || 0
                })
                .eq('id', editingHistoryItem.id);

            if (error) throw error;

            setHistory(history.map(h =>
                h.id === editingHistoryItem.id ? { ...h, ...editingHistoryItem, amount: parseFloat(editingHistoryItem.amount) } : h
            ));

            setEditHistoryModalOpen(false);
            toast("Record updated successfully!");
        } catch (e) {
            await alert("Error updating record: " + e.message);
        } finally { setSaving(false); }
    };

    // --- BIN ACTIONS ---
    const fetchBin = async () => {
        setLoadingBin(true);
        try {
            const { data, error } = await supabase.from('recycle_bin').select('*').order('deleted_at', { ascending: false });
            if (error) throw error;
            setBinItems(data || []);
        } catch (e) {
            console.error(e);
            // alert('Could not fetch Bin items (Check if table exists)');
        } finally { setLoadingBin(false); }
    };

    const restoreFromBin = async (binId, originalData) => {
        try {
            // 1. Insert back to original table
            // Remove the ID to create a new one, or keep same ID? Keeping same ID is better for consistency if not reused
            // But if Supabase generates IDs, might conflict if we don't handle it. Let's try upsert or insert.
            const { error: restoreError } = await supabase.from('payment_history').insert([originalData]);
            if (restoreError) throw restoreError;

            // 2. Delete from Bin
            setSaving(true);
            await supabase.from('recycle_bin').delete().eq('id', binId);

            // 3. Update State
            setBinItems(binItems.filter(b => b.id !== binId));
            toast('Record restored successfully!');
        } catch (e) {
            await alert("Error restoring: " + e.message);
        } finally { setSaving(false); }
    };

    const permanentDelete = async (binId) => {
        if (await confirm("Permanently delete this record? This cannot be undone.")) {
            setSaving(true);
            try {
                await supabase.from('recycle_bin').delete().eq('id', binId);
                setBinItems(binItems.filter(b => b.id !== binId));
                toast('Record deleted permanently.');
            } catch (e) {
                await alert("Error deleting: " + e.message);
            } finally { setSaving(false); }
        }
    };

    // --- USER MANAGEMENT ACTIONS ---
    const fetchUsers = async () => {
        setSaving(true);
        try {
            const { data, error } = await supabase.from('app_users').select('*').order('username', { ascending: true });
            if (error) throw error;
            setAppUsers(data || []);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const openUserModal = (u = null) => {
        if (u) {
            setEditingUserId(u.id);
            setUserForm({
                username: u.username,
                password: u.password,
                is_admin: u.is_admin,
                permissions: u.permissions || []
            });
        } else {
            setEditingUserId(null);
            setUserForm({ username: '', password: '', is_admin: false, permissions: [] });
        }
        setUserModalOpen(true);
    };

    const togglePermission = (perm) => {
        const newPerms = userForm.permissions.includes(perm)
            ? userForm.permissions.filter(p => p !== perm)
            : [...userForm.permissions, perm];
        setUserForm({ ...userForm, permissions: newPerms });
    };

    const saveAppUser = async () => {
        setSaving(true);
        try {
            if (editingUserId) {
                await supabase.from('app_users').update(userForm).eq('id', editingUserId);
            } else {
                await supabase.from('app_users').insert([userForm]);
            }
            setUserModalOpen(false);
            fetchUsers();
            toast(`User account ${editingUserId ? 'updated' : 'created'} successfully!`);
        } catch (e) { await alert(e.message); }
        finally { setSaving(false); }
    };

    const deleteAppUser = async (id) => {
        if (await confirm('Delete this user?')) {
            setSaving(true);
            try {
                await supabase.from('app_users').delete().eq('id', id);
                fetchUsers();
                toast('User deleted successfully!');
            } catch (e) { await alert(e.message); }
            finally { setSaving(false); }
        }
    };

    // --- SETTINGS ACTIONS ---
    const fetchSettings = async () => {
        setSaving(true);
        try {
            const { data, error } = await supabase
                .from('app_settings')
                .select('*')
                .eq('setting_key', 'gm_signature_url')
                .single();
            if (error && error.code !== 'PGRST116') throw error;
            if (data) setGmSignature(data.setting_value);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const handleSignatureUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `gm_signature_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            // 1. Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('signatures')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('signatures')
                .getPublicUrl(filePath);

            // 3. Update app_settings table
            const { error: dbError } = await supabase
                .from('app_settings')
                .upsert({ setting_key: 'gm_signature_url', setting_value: publicUrl }, { onConflict: 'setting_key' });

            if (dbError) throw dbError;

            setGmSignature(publicUrl);
            toast('Signature uploaded successfully!');
        } catch (e) {
            await alert('Upload failed: ' + e.message);
        } finally {
            setUploading(false);
        }
    };

    // Filter Logic for History
    const filteredHistory = useMemo(() => {
        return history.filter(item => {
            // Status filter
            if (statusFilter !== 'All' && item.status !== statusFilter) return false;

            // Vendor name filter (case insensitive)
            if (vendorSearch && !item.vendor_name?.toLowerCase().includes(vendorSearch.toLowerCase())) return false;

            // Date filter
            if (dateSearch && item.date !== dateSearch) return false;

            // Project/site filter (case insensitive)
            if (projectSearch && !item.project?.toLowerCase().includes(projectSearch.toLowerCase())) return false;

            return true;
        });
    }, [history, statusFilter, vendorSearch, dateSearch, projectSearch]);

    const totalAmount = useMemo(() => {
        return filteredHistory.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    }, [filteredHistory]);

    // Clearance List (Only Paid) with filters
    const clearanceList = useMemo(() => {
        return history.filter(h => {
            if (h.status !== 'Paid') return false;

            // Vendor name filter
            if (vendorSearch && !h.vendor_name?.toLowerCase().includes(vendorSearch.toLowerCase())) return false;

            // Date filter - Use Paid Date for filtering if available, else standard Date
            if (dateSearch && (h.paid_date !== dateSearch && h.date !== dateSearch)) return false;

            // Project filter
            if (projectSearch && !h.project?.toLowerCase().includes(projectSearch.toLowerCase())) return false;

            return true;
        });
    }, [history, vendorSearch, dateSearch, projectSearch]);

    const clearanceTotal = useMemo(() => {
        return clearanceList.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
    }, [clearanceList]);

    // Move to Advances Modal State
    const [showMoveModal, setShowMoveModal] = useState(false);
    const [moveData, setMoveData] = useState({
        item: null,
        date: '',
        mode: 'M1',
        splits: []
    });

    const openMoveModal = async (item) => {
        const workOrderNo = item.wo_no || item.invoice_no;
        if (!workOrderNo) {
            await alert("No Work Order Number associated with this record.");
            return;
        }

        let initialSplits = Array.isArray(item.payment_splits) ? [...item.payment_splits] : [];
        if (initialSplits.length === 0) {
            initialSplits = [{ amount: item.amount, date: item.paid_date || item.date || new Date().toISOString().split('T')[0] }];
        }

        setMoveData({
            item: item,
            date: item.paid_date || new Date().toISOString().split('T')[0],
            mode: 'M1',
            splits: initialSplits
        });
        setShowMoveModal(true);
    };

    const confirmMoveToAdvances = async () => {
        const { item, mode, splits } = moveData;
        const workOrderNo = item.wo_no || item.invoice_no;

        const totalToMove = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);
        if (totalToMove > (parseFloat(item.amount) + 0.01)) { // Allow minor floating point diff
            if (!await confirm(`Total split amount (₹${totalToMove.toLocaleString('en-IN')}) exceeds record amount (₹${parseFloat(item.amount).toLocaleString('en-IN')}). Proceed?`)) return;
        }

        setSaving(true);
        try {
            // Check if WO exists
            const { data: woData, error: woError } = await supabase
                .from('work_orders')
                .select('id')
                .eq('wo_no', workOrderNo)
                .single();

            if (woError || !woData) {
                await alert(`Work Order Number "${workOrderNo}" not registered!`);
                return;
            }

            const advancesToInsert = splits.map(split => ({
                work_order_id: woData.id,
                amount: parseFloat(split.amount),
                date: split.date,
                payment_mode: mode
            }));

            // Insert each split as a separate advance
            const { error: advError } = await supabase
                .from('advances')
                .insert(advancesToInsert);

            if (advError) throw advError;

            // Mark as moved in history
            const { error: histUpdateErr } = await supabase.from('payment_history').update({ is_moved: true }).eq('id', item.id);
            if (!histUpdateErr) {
                setHistory(prev => prev.filter(h => h.id !== item.id));
            }
            toast(`Successfully moved ${splits.length} split(s) directly to Advances!`);
            setShowMoveModal(false);
        } catch (e) {
            console.error(e);
            toast('Error moving to advances: ' + e.message);
        } finally { setSaving(false); }
    };

    // Vendor search filter
    const [vendorNameSearch, setVendorNameSearch] = useState('');
    const filteredVendors = useMemo(() => {
        return vendors.filter(v =>
            !vendorNameSearch || v.vendor_name?.toLowerCase().includes(vendorNameSearch.toLowerCase())
        );
    }, [vendors, vendorNameSearch]);

    const filteredSites = useMemo(() => {
        return sites.filter(s =>
            !siteSearch ||
            s.name?.toLowerCase().includes(siteSearch.toLowerCase()) ||
            s.location?.toLowerCase().includes(siteSearch.toLowerCase()) ||
            s.client?.toLowerCase().includes(siteSearch.toLowerCase())
        );
    }, [sites, siteSearch]);


    if (!isAuthenticated) {
        return (
            <div className={styles.authOverlay}>
                <div className={styles.loginCard}>
                    <h2 className={styles.loginTitle}>Admin Login</h2>
                    <Input type="password" placeholder="Enter Password" value={password}
                        onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleLogin()} />
                    <div style={{ marginTop: '20px' }}>
                        <Button onClick={handleLogin} style={{ width: '100%' }}>Login</Button>
                    </div>
                    {authError && <p style={{ color: 'var(--danger)', marginTop: '10px' }}>Wrong Password!</p>}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {(loadingVendors || loadingHistory || loadingBin || loadingSites || saving) && <LoadingOverlay message={saving ? "Saving Changes..." : "Fetching Data..."} />}
            {/* Navbar */}
            <div className={styles.topBar}>
                <div className={styles.titleSection}>
                    <h2 className={styles.pageTitle}>Admin Dashboard</h2>
                    <div className={styles.navGroup}>
                        <button
                            className={`${styles.navButton} ${currentView === 'history' ? styles.navButtonActive : ''}`}
                            onClick={() => setCurrentView('history')}
                        >History</button>
                        <button
                            className={`${styles.navButton} ${currentView === 'clearance' ? styles.navButtonActive : ''}`}
                            onClick={() => setCurrentView('clearance')}
                        >Clearance List</button>
                        <button
                            className={`${styles.navButton} ${currentView === 'vendors' ? styles.navButtonActive : ''}`}
                            onClick={() => setCurrentView('vendors')}
                        >Vendors</button>
                        <button
                            className={`${styles.navButton} ${currentView === 'sites' ? styles.navButtonActive : ''}`}
                            onClick={() => setCurrentView('sites')}
                        >Sites</button>
                        <button
                            className={`${styles.navButton} ${currentView === 'bin' ? styles.navButtonActive : ''}`}
                            onClick={() => setCurrentView('bin')}
                        >Recycle Bin</button>
                        <button
                            className={`${styles.navButton} ${currentView === 'users' ? styles.navButtonActive : ''}`}
                            onClick={() => setCurrentView('users')}
                        >Users</button>
                        <button
                            className={`${styles.navButton} ${currentView === 'settings' ? styles.navButtonActive : ''}`}
                            onClick={() => setCurrentView('settings')}
                        >Settings</button>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Link to="/"><Button variant="secondary">Home</Button></Link>
                    <Button variant="danger" onClick={logout}>Logout</Button>
                </div>
            </div>

            <div className="px-6">
                {/* --- HISTORY VIEW --- */}
                {currentView === 'history' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Payment & Invoice History</h3>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button
                                    onClick={fetchHistory}
                                    title="Refresh Data"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '40px',
                                        height: '40px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        background: 'white',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        color: '#64748b'
                                    }}
                                    onMouseOver={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155' }}
                                    onMouseOut={(e) => { e.currentTarget.style.background = 'white'; e.currentTarget.style.color = '#64748b' }}
                                >
                                    🔄
                                </button>
                                <button
                                    onClick={clearAllHistory}
                                    title="Clear All History"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '40px',
                                        height: '40px',
                                        border: '1px solid #fecaca',
                                        borderRadius: '8px',
                                        background: '#fee2e2',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        color: '#b91c1c'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.background = '#fecaca'}
                                    onMouseOut={(e) => e.currentTarget.style.background = '#fee2e2'}
                                >
                                    🗑️
                                </button>
                                <select
                                    className={styles.statusSelect}
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    style={{
                                        padding: '8px 12px',
                                        minWidth: '150px',
                                        height: '40px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '8px',
                                        background: 'white',
                                        fontWeight: 500
                                    }}
                                >
                                    <option value="All">All Statuses</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Approved">Approved</option>
                                    <option value="Partial">Partial</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Rejected">Rejected</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ padding: '20px 30px', background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <input
                                    type="text"
                                    placeholder="Search by vendor name..."
                                    value={vendorSearch}
                                    onChange={(e) => setVendorSearch(e.target.value)}
                                    style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.9rem' }}
                                />
                                <input
                                    type="date"
                                    placeholder="Filter by date"
                                    value={dateSearch}
                                    onChange={(e) => setDateSearch(e.target.value)}
                                    style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.9rem' }}
                                />
                                <input
                                    type="text"
                                    placeholder="Search by project/site..."
                                    value={projectSearch}
                                    onChange={(e) => setProjectSearch(e.target.value)}
                                    style={{ padding: '8px 12px', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '0.9rem' }}
                                />
                            </div>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        <th>Type</th>
                                        <th>Vendor</th>
                                        <th>Project</th>
                                        <th style={{ textAlign: 'right' }}>Total Amount</th>
                                        <th style={{ textAlign: 'right' }}>Paid</th>
                                        <th style={{ textAlign: 'right' }}>Remaining</th>
                                        <th>Status</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredHistory.map(item => (
                                        <tr key={item.id}>
                                            <td>{item.date}</td>
                                            <td>
                                                <span className={`${styles.badge} ${item.type === 'invoice' ? styles.badgeInvoice : styles.badgePayment}`}>
                                                    {item.type === 'invoice' ? 'INVOICE' : 'PAYMENT'}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 500 }}>{item.vendor_name}</td>
                                            <td>{item.project}</td>
                                            <td style={{ textAlign: 'right', fontWeight: 700 }}>₹{item.amount?.toLocaleString('en-IN')}</td>
                                            <td style={{ textAlign: 'right', color: 'green', fontWeight: 600 }}>
                                                ₹{(item.status === 'Paid' ? item.amount : (item.paid_amount || 0)).toLocaleString('en-IN')}
                                            </td>
                                            <td style={{ textAlign: 'right', color: (item.remaining_amount > 0 ? 'red' : 'inherit'), fontWeight: 600 }}>
                                                ₹{(item.remaining_amount ?? (item.status === 'Paid' ? 0 : item.amount))?.toLocaleString('en-IN')}
                                            </td>

                                            <td>
                                                <div style={{ position: 'relative' }}>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenStatusDropdown(openStatusDropdown === item.id ? null : item.id);
                                                        }}
                                                        className={`${styles.statusSelect} ${styles['status' + (item.status || 'Pending')]}`}
                                                        style={{
                                                            width: '100%',
                                                            textAlign: 'left',
                                                            cursor: 'pointer',
                                                            padding: '6px 12px',
                                                            border: '1px solid #e2e8f0',
                                                            borderRadius: '6px',
                                                            display: 'flex',
                                                            justifyContent: 'space-between',
                                                            alignItems: 'center',
                                                            fontSize: '0.9rem'
                                                        }}
                                                    >
                                                        <span>{item.status || 'Pending'}</span>
                                                        <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>▼</span>
                                                    </button>

                                                    {openStatusDropdown === item.id && (
                                                        <>
                                                            <div
                                                                style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                                                                onClick={() => setOpenStatusDropdown(null)}
                                                            />
                                                            <div style={{
                                                                position: 'absolute',
                                                                top: 'calc(100% + 4px)',
                                                                left: 0,
                                                                zIndex: 50,
                                                                background: 'white',
                                                                border: '1px solid #e2e8f0',
                                                                borderRadius: '8px',
                                                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                                                                minWidth: '140px',
                                                                overflow: 'hidden',
                                                                padding: '4px'
                                                            }}>
                                                                {['Pending', 'Approved', 'Partial', 'Paid', 'Rejected'].map(statusOption => (
                                                                    <button
                                                                        key={statusOption}
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            updateStatus(item.id, statusOption);
                                                                            setOpenStatusDropdown(null);
                                                                        }}
                                                                        style={{
                                                                            display: 'block',
                                                                            width: '100%',
                                                                            textAlign: 'left',
                                                                            padding: '8px 12px',
                                                                            background: item.status === statusOption ? '#f1f5f9' : 'transparent',
                                                                            border: 'none',
                                                                            borderRadius: '6px',
                                                                            cursor: 'pointer',
                                                                            fontSize: '0.9rem',
                                                                            color: '#334155',
                                                                            fontWeight: item.status === statusOption ? 600 : 400
                                                                        }}
                                                                        onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                                                                        onMouseOut={(e) => e.currentTarget.style.background = item.status === statusOption ? '#f1f5f9' : 'transparent'}
                                                                    >
                                                                        {statusOption}
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        </>
                                                    )}
                                                </div>
                                                {item.paid_date && <div style={{ fontSize: '0.7rem', color: 'green', marginTop: '2px' }}>Paid: {item.paid_date}</div>}
                                            </td>
                                            <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                                                <button
                                                    onClick={() => setViewItem(item)}
                                                    className={styles.actionBtn}
                                                    title="View Template"
                                                    style={{ fontSize: '1.2rem' }}
                                                >
                                                    👁️
                                                </button>
                                                <button
                                                    onClick={() => openEditHistoryModal(item)}
                                                    className={styles.actionBtn}
                                                    title="Edit Record"
                                                    style={{ fontSize: '1.2rem' }}
                                                >
                                                    ✏️
                                                </button>
                                                <button onClick={() => deleteHistory(item.id)} className={styles.actionBtn}>🗑️</button>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredHistory.length === 0 && (
                                        <tr><td colSpan="9" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>No records found matching filter.</td></tr>
                                    )}
                                </tbody>
                                {filteredHistory.length > 0 && (
                                    <tfoot style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold', padding: '15px' }}>Total Amount:</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: 'var(--primary-dark)', padding: '15px' }}>
                                                ₹{totalAmount.toLocaleString('en-IN')}
                                            </td>
                                            <td colSpan="4"></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}

                {/* --- CLEARANCE LIST VIEW --- */}
                {currentView === 'clearance' && (
                    <div className={styles.card} style={{ borderColor: 'var(--accent)' }}>
                        <div className={styles.cardHeader} style={{ background: '#f0fdf4' }}>
                            <h3 className={styles.cardTitle} style={{ color: 'var(--accent)' }}>Clearance List (Paid Items)</h3>
                            <div style={{ fontWeight: 'bold', color: 'var(--accent)' }}>
                                Total Paid: ₹{clearanceTotal.toLocaleString('en-IN')}
                            </div>
                        </div>
                        <div style={{ padding: '20px 30px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                                <input
                                    type="text"
                                    placeholder="Search by vendor name..."
                                    value={vendorSearch}
                                    onChange={(e) => setVendorSearch(e.target.value)}
                                    style={{ padding: '8px 12px', border: '1px solid #dcfce7', borderRadius: '8px', fontSize: '0.9rem' }}
                                />
                                <input
                                    type="date"
                                    placeholder="Filter by date"
                                    value={dateSearch}
                                    onChange={(e) => setDateSearch(e.target.value)}
                                    style={{ padding: '8px 12px', border: '1px solid #dcfce7', borderRadius: '8px', fontSize: '0.9rem' }}
                                />
                                <input
                                    type="text"
                                    placeholder="Search by project/site..."
                                    value={projectSearch}
                                    onChange={(e) => setProjectSearch(e.target.value)}
                                    style={{ padding: '8px 12px', border: '1px solid #dcfce7', borderRadius: '8px', fontSize: '0.9rem' }}
                                />
                            </div>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Paid Date</th>
                                        <th>Type</th>
                                        <th>Vendor</th>
                                        <th>Details</th>
                                        <th style={{ textAlign: 'right' }}>Amount Paid</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clearanceList.map(item => (
                                        <tr key={item.id}>
                                            <td style={{ fontWeight: 600 }}>{item.paid_date || item.date}</td>
                                            <td style={{ textTransform: 'uppercase', fontSize: '0.8rem' }}>{item.type?.replace('_', ' ')}</td>
                                            <td style={{ fontWeight: 600 }}>{item.vendor_name}</td>
                                            <td style={{ color: 'var(--text-muted)' }}>
                                                {item.project} <br />
                                                <span style={{ fontSize: '0.8rem' }}>
                                                    <strong>WO:</strong> {item.wo_no || item.invoice_no || '-'}
                                                </span>
                                            </td>
                                            <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>₹{item.amount?.toLocaleString('en-IN')}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className={`${styles.badge} ${styles.badgePaid}`}>PAID</span>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                {!item.is_moved && (
                                                    <button
                                                        onClick={() => openMoveModal(item)}
                                                        className={styles.actionBtn}
                                                        title="Move to Vendor Advances"
                                                        style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}
                                                    >
                                                        Move ➡️
                                                    </button>
                                                )}
                                                {item.is_moved && (
                                                    <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600 }}>Moved ✅</span>
                                                )}
                                                <button
                                                    onClick={() => setViewItem(item)}
                                                    className={styles.actionBtn}
                                                    title="View Template"
                                                    style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                                >
                                                    👁️
                                                </button>
                                                <button
                                                    onClick={() => deleteHistory(item.id)}
                                                    className={styles.actionBtn}
                                                    title="Delete Record"
                                                    style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem' }}
                                                >
                                                    🗑️
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {clearanceList.length === 0 && (
                                        <tr><td colSpan="7" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>No paid items in clearance list yet.</td></tr>
                                    )}
                                </tbody>
                                {clearanceList.length > 0 && (
                                    <tfoot style={{ background: '#f0fdf4', borderTop: '2px solid #bbf7d0' }}>
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'right', fontWeight: 'bold', padding: '15px', color: '#166534' }}>Total Clearance Amount:</td>
                                            <td style={{ textAlign: 'right', fontWeight: 'bold', fontSize: '1.1rem', color: '#15803d', padding: '15px' }}>
                                                ₹{clearanceTotal.toLocaleString('en-IN')}
                                            </td>
                                            <td colSpan="2"></td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </div>
                )}

                {/* --- VENDORS VIEW --- */}
                {currentView === 'vendors' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Manage Vendors</h3>
                            <Button onClick={() => openVendorModal()}>+ Add Vendor</Button>
                        </div>
                        <div style={{ padding: '20px 30px', background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                            <input
                                type="text"
                                placeholder="Search vendors by name..."
                                value={vendorNameSearch}
                                onChange={(e) => setVendorNameSearch(e.target.value)}
                                style={{ width: '100%', padding: '10px 15px', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '0.95rem', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                            />
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Type</th>
                                        <th>Bank</th>
                                        <th>Account</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredVendors.map(v => (
                                        <tr key={v.id}>
                                            <td style={{ fontWeight: 500 }}>{v.vendor_name}</td>
                                            <td>
                                                <span className={`${styles.badge} ${v.vendor_type === 'payment_request' ? styles.badgePayment : v.vendor_type === 'invoice' ? styles.badgeInvoice : styles.badgeBoth}`}>
                                                    {v.vendor_type === 'payment_request' ? 'Payment' : v.vendor_type === 'invoice' ? 'Invoice' : 'Both'}
                                                </span>
                                            </td>
                                            <td>{v.bank_name}</td>
                                            <td style={{ fontFamily: 'monospace' }}>{v.account_number}</td>
                                            <td>
                                                <div className={styles.actions}>
                                                    <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => openVendorModal(v)}>Edit</Button>
                                                    <Button variant="danger" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => deleteVendor(v.id)}>Del</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- RECYCLE BIN VIEW --- */}
                {currentView === 'bin' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader} style={{ background: '#f1f5f9' }}>
                            <h3 className={styles.cardTitle} style={{ color: '#475569' }}>Recycle Bin (Deleted Records)</h3>
                            <button className={styles.refreshBtn} onClick={fetchBin}>Refresh Bin</button>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Deleted At</th>
                                        <th>Original Vendor</th>
                                        <th>Amount</th>
                                        <th>Details</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {binItems.map(bin => {
                                        // Safe access to data
                                        const original = bin.data || {};
                                        return (
                                            <tr key={bin.id}>
                                                <td style={{ fontSize: '0.85rem', color: '#64748b' }}>
                                                    {new Date(bin.deleted_at).toLocaleString()}
                                                </td>
                                                <td style={{ fontWeight: 500 }}>{original.vendor_name || 'Unknown'}</td>
                                                <td style={{ fontWeight: 600 }}>₹{original.amount}</td>
                                                <td style={{ fontSize: '0.85rem' }}>
                                                    {original.project}<br />
                                                    <span style={{ color: '#64748b' }}>WO: {original.wo_no || original.invoice_no}</span>
                                                </td>
                                                <td>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            onClick={() => restoreFromBin(bin.id, original)}
                                                            style={{ background: '#22c55e', color: 'white', padding: '4px 10px', fontSize: '0.8rem' }}
                                                        >
                                                            Recycle ♻️
                                                        </Button>
                                                        <Button
                                                            onClick={() => permanentDelete(bin.id)}
                                                            style={{ background: '#ef4444', color: 'white', padding: '4px 10px', fontSize: '0.8rem' }}
                                                        >
                                                            Delete Forever
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {binItems.length === 0 && (
                                        <tr><td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Bin is empty.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- USERS VIEW --- */}
                {currentView === 'users' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>App User Management</h3>
                            <Button onClick={() => openUserModal()}>+ Add User</Button>
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Username</th>
                                        <th>Type</th>
                                        <th>Permissions</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {appUsers.map(u => (
                                        <tr key={u.id}>
                                            <td style={{ fontWeight: 600 }}>{u.username}</td>
                                            <td>
                                                <span className={`${styles.badge} ${u.is_admin ? styles.badgeInvoice : styles.badgeBoth}`}>
                                                    {u.is_admin ? 'Admin' : 'Operator'}
                                                </span>
                                            </td>
                                            <td style={{ fontSize: '0.8rem' }}>
                                                {u.is_admin ? 'ALL' : (u.permissions?.join(', ') || 'None')}
                                            </td>
                                            <td>
                                                <div className="flex gap-2">
                                                    <Button variant="secondary" onClick={() => openUserModal(u)}>Edit</Button>
                                                    <Button variant="danger" onClick={() => deleteAppUser(u.id)}>Del</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {appUsers.length === 0 && (
                                        <tr><td colSpan="4" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>No users found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- SITES VIEW --- */}
                {currentView === 'sites' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>Master Site Management</h3>
                            <Button onClick={() => openSiteModal()}>+ Add New Site</Button>
                        </div>
                        <div style={{ padding: '20px 30px', background: '#f8fafc', borderBottom: '1px solid var(--border-color)' }}>
                            <input
                                type="text"
                                placeholder="Search sites by name, location or client..."
                                value={siteSearch}
                                onChange={(e) => setSiteSearch(e.target.value)}
                                style={{ width: '100%', padding: '10px 15px', border: '1px solid var(--border-color)', borderRadius: '10px', fontSize: '0.95rem', background: 'white', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}
                            />
                        </div>
                        <div className={styles.tableWrapper}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Site Name</th>
                                        <th>Location</th>
                                        <th>Client</th>
                                        <th style={{ textAlign: 'center' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredSites.map(s => (
                                        <tr key={s.id}>
                                            <td style={{ fontWeight: 600 }}>{s.name}</td>
                                            <td>{s.location || '-'}</td>
                                            <td>{s.client || '-'}</td>
                                            <td style={{ textAlign: 'center' }}>
                                                <div className={styles.actions} style={{ justifyContent: 'center' }}>
                                                    <Link to={`/vendor-dashboard?site=${encodeURIComponent(s.name)}`}>
                                                        <Button variant="outline" style={{ padding: '4px 8px', fontSize: '0.8rem', marginRight: '6px', borderColor: 'var(--primary)', color: 'var(--primary)' }}>View</Button>
                                                    </Link>
                                                    <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.8rem' }} onClick={() => openSiteModal(s)}>Edit</Button>
                                                    <Button variant="danger" style={{ padding: '4px 8px', fontSize: '0.8rem', marginLeft: '6px' }} onClick={() => deleteSite(s.id)}>Del</Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredSites.length === 0 && (
                                        <tr>
                                            <td colSpan="4" style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                                                {siteSearch ? 'No sites matching your search.' : 'No sites found. Add your first site using the button above.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* --- SETTINGS VIEW --- */}
                {currentView === 'settings' && (
                    <div className={styles.card}>
                        <div className={styles.cardHeader}>
                            <h3 className={styles.cardTitle}>System Settings</h3>
                        </div>
                        <div style={{ padding: '30px' }}>
                            <div style={{ maxWidth: '500px' }}>
                                <h4 style={{ marginBottom: '15px' }}>General Manager Digital Signature</h4>
                                <div style={{
                                    border: '2px dashed #e2e8f0',
                                    borderRadius: '12px',
                                    padding: '30px',
                                    textAlign: 'center',
                                    background: '#f8fafc'
                                }}>
                                    {gmSignature ? (
                                        <div style={{ marginBottom: '20px' }}>
                                            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '10px' }}>Current Signature:</p>
                                            <img
                                                src={gmSignature}
                                                alt="GM Signature"
                                                style={{ maxHeight: '100px', maxWidth: '100%', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white' }}
                                            />
                                        </div>
                                    ) : (
                                        <div style={{ marginBottom: '20px', color: '#94a3b8' }}>
                                            <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🖋️</div>
                                            <p>No signature uploaded yet</p>
                                        </div>
                                    )}

                                    <label className={styles.refreshBtn} style={{ cursor: 'pointer', display: 'inline-flex', justifyContent: 'center', width: 'auto' }}>
                                        {uploading ? '⌛ Uploading...' : '📁 Choose Signature Image'}
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleSignatureUpload}
                                            disabled={uploading}
                                            style={{ display: 'none' }}
                                        />
                                    </label>
                                    <p style={{ marginTop: '10px', fontSize: '0.75rem', color: '#64748b' }}>
                                        Recommended format: PNG with transparent background.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Vendor Modal */}
            {vendorModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h3 className={styles.modalTitle}>{editingVendorId ? 'Edit Vendor' : 'Add Vendor'}</h3>
                        <div className="flex flex-col gap-3">
                            <Input placeholder="Vendor Name" value={vendorForm.name} onChange={e => setVendorForm({ ...vendorForm, name: e.target.value })} />
                            <Input placeholder="Account Holder Name" value={vendorForm.holderName} onChange={e => setVendorForm({ ...vendorForm, holderName: e.target.value })} />
                            <div style={{ marginBottom: '12px' }}>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '0.9rem' }}>Vendor Type</label>
                                <select
                                    className={styles.statusSelect}
                                    value={vendorForm.vendorType}
                                    onChange={e => setVendorForm({ ...vendorForm, vendorType: e.target.value })}
                                    style={{ width: '100%', padding: '10px' }}
                                >
                                    <option value="both">Both (Payment Request & Invoice)</option>
                                    <option value="payment_request">Payment Request Only</option>
                                    <option value="invoice">Invoice Only</option>
                                </select>
                            </div>
                            <div className={styles.formGrid}>
                                <Input placeholder="PAN Number" value={vendorForm.pan} onChange={e => setVendorForm({ ...vendorForm, pan: e.target.value })} />
                                <Input placeholder="Phone Number" value={vendorForm.phone} onChange={e => setVendorForm({ ...vendorForm, phone: e.target.value })} />
                            </div>
                            <Input placeholder="Address" multiline={true} rows={3} value={vendorForm.address} onChange={e => setVendorForm({ ...vendorForm, address: e.target.value })} />
                            <Input placeholder="Account Number" value={vendorForm.acc} onChange={e => setVendorForm({ ...vendorForm, acc: e.target.value })} />
                            <div className={styles.formGrid}>
                                <Input placeholder="Bank Name" value={vendorForm.bank} onChange={e => setVendorForm({ ...vendorForm, bank: e.target.value })} />
                                <Input placeholder="IFSC Code" value={vendorForm.ifsc} onChange={e => setVendorForm({ ...vendorForm, ifsc: e.target.value })} />
                            </div>
                        </div>
                        <div className={styles.modalActions}>
                            <Button variant="secondary" onClick={() => setVendorModalOpen(false)}>Cancel</Button>
                            <Button onClick={saveVendor}>Save Vendor</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Move to Advances Modal */}
            {showMoveModal && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ maxWidth: '500px' }}>
                        <h3 className={styles.modalTitle}>Move to Advances</h3>
                        <div style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', marginBottom: '20px' }}>
                            <div className="flex justify-between items-center mb-1">
                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Work Order:</span>
                                <span style={{ fontWeight: 600 }}>{moveData.item?.wo_no || moveData.item?.invoice_no}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Record Amount:</span>
                                <span style={{ fontWeight: 600 }}>₹{parseFloat(moveData.item?.amount || 0).toLocaleString('en-IN')}</span>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <div>
                                <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, fontSize: '0.9rem' }}>Payment Mode (Applied to all splits)</label>
                                <select
                                    value={moveData.mode}
                                    onChange={e => setMoveData({ ...moveData, mode: e.target.value })}
                                    style={{ width: '100%', padding: '10px', border: '1px solid #e2e8f0', borderRadius: '6px', background: 'white' }}
                                >
                                    <option value="M1">M1</option>
                                    <option value="M2">M2</option>
                                    <option value="M3">M3</option>
                                    <option value="M4">M4</option>
                                    <option value="M5">M5</option>
                                </select>
                            </div>

                            <div style={{ marginTop: '5px' }}>
                                <label style={{ display: 'block', marginBottom: '10px', fontWeight: 600, fontSize: '0.9rem' }}>Payment Splits (Editable)</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' }}>
                                    {moveData.splits.map((split, index) => (
                                        <div key={index} style={{ display: 'flex', gap: '8px', alignItems: 'center', background: 'white', padding: '8px', borderRadius: '6px', border: '1px solid #f1f5f9' }}>
                                            <div style={{ flex: 1 }}>
                                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Amount</span>
                                                <input
                                                    type="text"
                                                    inputMode="decimal"
                                                    value={split.amount}
                                                    onChange={e => {
                                                        const newSplits = [...moveData.splits];
                                                        newSplits[index] = { ...newSplits[index], amount: e.target.value };
                                                        setMoveData({ ...moveData, splits: newSplits });
                                                    }}
                                                    style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                                                />
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <span style={{ fontSize: '0.7rem', color: '#94a3b8', display: 'block', marginBottom: '2px' }}>Date</span>
                                                <input
                                                    type="date"
                                                    value={split.date}
                                                    onChange={e => {
                                                        const newSplits = [...moveData.splits];
                                                        newSplits[index] = { ...newSplits[index], date: e.target.value };
                                                        setMoveData({ ...moveData, splits: newSplits });
                                                    }}
                                                    style={{ width: '100%', padding: '6px', border: '1px solid #e2e8f0', borderRadius: '4px' }}
                                                />
                                            </div>
                                            <Button
                                                variant="danger"
                                                style={{ padding: '8px', marginTop: '16px' }}
                                                onClick={() => {
                                                    const newSplits = moveData.splits.filter((_, i) => i !== index);
                                                    setMoveData({ ...moveData, splits: newSplits });
                                                }}
                                            >
                                                ×
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        variant="outline"
                                        style={{ fontSize: '0.8rem', padding: '6px' }}
                                        onClick={() => {
                                            setMoveData({
                                                ...moveData,
                                                splits: [...moveData.splits, { amount: 0, date: new Date().toISOString().split('T')[0] }]
                                            });
                                        }}
                                    >
                                        + Add Split
                                    </Button>
                                </div>
                                <div style={{ marginTop: '10px', fontSize: '0.85rem', textAlign: 'right', fontWeight: 600 }}>
                                    Total: ₹{moveData.splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0).toLocaleString('en-IN')}
                                </div>
                            </div>

                            <div className={styles.modalActions}>
                                <Button variant="secondary" onClick={() => setShowMoveModal(false)}>Cancel</Button>
                                <Button onClick={confirmMoveToAdvances}>Confirm Move</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit History Modal */}
            {editHistoryModalOpen && editingHistoryItem && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ width: '500px' }}>
                        <div className={styles.modalHeader}>
                            <h3>Edit History Record</h3>
                            <button onClick={() => setEditHistoryModalOpen(false)} className={styles.closeBtn}>×</button>
                        </div>
                        <div className={styles.modalBody}>
                            <Input
                                label="Vendor Name"
                                value={editingHistoryItem.vendor_name}
                                onChange={e => setEditingHistoryItem({ ...editingHistoryItem, vendor_name: e.target.value })}
                            />
                            <Input
                                label="Project"
                                value={editingHistoryItem.project}
                                onChange={e => setEditingHistoryItem({ ...editingHistoryItem, project: e.target.value })}
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Date"
                                    type="date"
                                    value={editingHistoryItem.date}
                                    onChange={e => setEditingHistoryItem({ ...editingHistoryItem, date: e.target.value })}
                                />
                                <Input
                                    label="Total Amount"
                                    type="text"
                                    inputMode="decimal"
                                    value={editingHistoryItem.amount}
                                    onChange={e => setEditingHistoryItem({ ...editingHistoryItem, amount: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <Input
                                    label="Paid Amount"
                                    type="text"
                                    inputMode="decimal"
                                    value={editingHistoryItem.paid_amount || 0}
                                    onChange={e => setEditingHistoryItem({ ...editingHistoryItem, paid_amount: e.target.value })}
                                />
                                <Input
                                    label="Remaining Amount"
                                    type="text"
                                    inputMode="decimal"
                                    value={editingHistoryItem.remaining_amount ?? (editingHistoryItem.amount - (editingHistoryItem.paid_amount || 0))}
                                    onChange={e => setEditingHistoryItem({ ...editingHistoryItem, remaining_amount: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <Input
                                    label="WO / Invoice No"
                                    value={editingHistoryItem.invoice_no || ''}
                                    onChange={e => setEditingHistoryItem({ ...editingHistoryItem, invoice_no: e.target.value })}
                                />
                                <Input
                                    label="Work Order Date"
                                    type="date"
                                    value={editingHistoryItem.wo_date || ''}
                                    onChange={e => setEditingHistoryItem({ ...editingHistoryItem, wo_date: e.target.value })}
                                />
                                <div />
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <Button variant="secondary" onClick={() => setEditHistoryModalOpen(false)}>Cancel</Button>
                            <Button onClick={saveHistoryEdit}>Save Changes</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* User Management Modal */}
            {userModalOpen && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent} style={{ maxWidth: '650px' }}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>{editingUserId ? 'Edit User' : 'Add New User'}</h3>
                            <button onClick={() => setUserModalOpen(false)} className={styles.closeBtn}>×</button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGrid}>
                                <Input
                                    label="Username"
                                    placeholder="Enter username"
                                    value={userForm.username}
                                    onChange={e => setUserForm({ ...userForm, username: e.target.value })}
                                />
                                <Input
                                    label="Password"
                                    type="password"
                                    placeholder="Enter password"
                                    value={userForm.password}
                                    onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                />
                            </div>

                            <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                                        checked={userForm.is_admin}
                                        onChange={e => setUserForm({ ...userForm, is_admin: e.target.checked })}
                                    />
                                    <div>
                                        <div style={{ fontWeight: 700, color: '#1e293b' }}>Admin Access</div>
                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Grant all permissions and full system access</div>
                                    </div>
                                </label>
                            </div>

                            {!userForm.is_admin && (
                                <div style={{ marginTop: '24px' }}>
                                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#475569', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Shield size={16} /> Module Permissions
                                    </h4>
                                    <div className={styles.permissionGrid}>
                                        {[
                                            { id: 'invoice', label: 'Invoice Generator' },
                                            { id: 'payment', label: 'Payment Request' },
                                            { id: 'history', label: 'Payment History' },
                                            { id: 'workorders', label: 'Work Orders' },
                                            { id: 'admin', label: 'Admin Control' },
                                            { id: 'vendor', label: 'Vendor Dashboard' },
                                            { id: 'overview', label: 'Project Overview' },
                                            { id: 'bill', label: 'Bill Preparation' },
                                            { id: 'gm', label: 'General Manager' },
                                            { id: 'approved_payments', label: 'Approved Payments' }
                                        ].map(mod => (
                                            <div
                                                key={mod.id}
                                                className={`${styles.permissionCard} ${userForm.permissions.includes(mod.id) ? styles.active : ''}`}
                                                onClick={() => togglePermission(mod.id)}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={userForm.permissions.includes(mod.id)}
                                                    onChange={(e) => { e.stopPropagation(); togglePermission(mod.id); }}
                                                />
                                                <span>{mod.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className={styles.modalFooter}>
                            <Button variant="secondary" onClick={() => setUserModalOpen(false)}>Cancel</Button>
                            <Button onClick={saveAppUser} style={{ padding: '10px 24px' }}>Save User Account</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Site Modal */}
            {siteModalOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                    <div style={{ background: 'white', padding: 30, borderRadius: 16, width: 450 }}>
                        <h3 className={styles.cardTitle} style={{ marginBottom: 20 }}>{editingSiteId ? 'Edit Site' : 'Add New Site'}</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
                            <Input label="Site Name" value={siteForm.name} onChange={e => setSiteForm({ ...siteForm, name: e.target.value })} placeholder="e.g. Khazana Pondy" />
                            <Input label="Location" value={siteForm.location} onChange={e => setSiteForm({ ...siteForm, location: e.target.value })} placeholder="City / Area" />
                            <Input label="Client Name" value={siteForm.client} onChange={e => setSiteForm({ ...siteForm, client: e.target.value })} placeholder="Client Company" />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 25 }}>
                            <Button variant="secondary" onClick={() => setSiteModalOpen(false)}>Cancel</Button>
                            <Button onClick={saveSite}>Save Site</Button>
                        </div>
                    </div>
                </div>
            )}
            {viewItem && <TemplateModal record={viewItem} onClose={() => setViewItem(null)} />}
        </div>
    );
};

export default AdminDashboard;
