import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Save, Printer, ArrowLeft, Loader2, Check, Download, Clock } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMessage } from '../context/MessageContext';
import SearchableSelect from '../components/ui/SearchableSelect';
import styles from './SubVendorChecklist.module.css';

const SubVendorChecklist = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const checklistId = searchParams.get('id');
    const { toast, alert } = useMessage();
    const [loading, setLoading] = useState(false);
    const [projects, setProjects] = useState([]);
    const [vendors, setVendors] = useState([]);
    const [form, setForm] = useState({
        project_id: '',
        vendor_id: '',
        project_name: '',
        location: '',
        nature_of_work: '',
        vendor_company_name: '',
        vendor_name: '',
        address: '',
        phone_no: '',
        aadhaar_no: '',
        pan_no: '',
        gst_no: '',
        billing_address: '',

        // Bank Details
        bank_account_name: '',
        bank_account_number: '',
        bank_ifsc_code: '',
        bank_branch: '',
        bank_name: '',

        // Budget Details
        material_budget: '',
        labour_budget: '',
        total_budget: 0,
        final_material_amount: '',
        final_labour_amount: '',
        total_value: 0,

        // Purchase Details
        purchase_details: {
            "Material Purchase": { vendor: false, iipl: false },
            "Office Purchase (PO No & Date)": { vendor: false, iipl: false },
            "Site Purchase": { vendor: false, iipl: false },
            "Inter Change in Site": { vendor: false, iipl: false },
            "Factory Stock": { vendor: false, iipl: false },
            "Loading &Unloading of Material": { vendor: false, iipl: false },
            "Shifting of Material": { vendor: false, iipl: false },
            "Accommodation for labour": { vendor: false, iipl: false },
            "Food expenses": { vendor: false, iipl: false },
            "Transport charges": { vendor: false, iipl: false },
            "Scaffolding and other service provided": { vendor: false, iipl: false },
            "Tools and Machine": { vendor: false, iipl: false }
        },

        // Payment Terms
        payment_terms: {
            "advance_pct": "",
            "ra_bill_upto": "85%",
            "final_bill_approval": "MD",
            "work_done_other_vendor": "",
            "housekeeping_deduction": "YES/NO",
            "retention_5": "YES/NO"
        },

        // Terms and conditions
        terms_and_conditions: [
            "Work to be executed as per approved drawings",
            "No extra work without written approval",
            "Quality to be approved by site engineer",
            "Running Bill Should be Certified by site engineer",
            "All debits will be recovered from vendor bills",
            "Vendor responsible for labour safety",
            "If Any deduction recommended by Site In-charge",
            "Sub Vendor is not permitted to take any work directly from the project client or any other vendor work in the same project"
        ]
    });

    const [showFinalAmounts, setShowFinalAmounts] = useState(false);

    const fetchData = useCallback(async () => {
        setLoading(true);
        console.log("SubVendorChecklist: Fetching data...");
        try {
            // 1. Fetch Projects (Prioritize 'sites' table as requested)
            let projectList = [];
            const { data: sData, error: sErr } = await supabase.from('sites').select('id, name, location').order('name');

            if (sData && sData.length > 0) {
                projectList = sData;
                console.log("Sites loaded as primary projects:", sData.length);
            } else {
                if (sErr) console.warn("Supabase 'sites' table fetch failed, trying 'projects' table:", sErr.message);
                // Fallback to 'projects' table
                const { data: pData, error: pErr } = await supabase.from('projects').select('id, name, location').order('name');
                if (pErr) console.error("Supabase 'projects' table also failed:", pErr.message);
                if (pData) projectList = pData;
            }
            setProjects(projectList);
            console.log("Total projects/sites loaded:", projectList.length);

            // 2. Fetch Vendors
            const { data: vData, error: vErr } = await supabase.from('vendors').select('*').order('vendor_name', { ascending: true });
            if (vErr) {
                console.error("Supabase vendors table fetch failed:", vErr.message);
                toast("Failed to load vendors.");
            } else {
                setVendors(vData || []);
                console.log("Vendors loaded:", (vData || []).length);
                if (vData && vData.length === 0) console.warn("Vendors table returned zero rows.");
            }
        } catch (err) {
            console.error("Critical fetch error:", err);
            toast("An unexpected error occurred while loading data.");
        } finally {
            setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Load record if ID is provided
    useEffect(() => {
        const loadRecord = async () => {
            if (!checklistId) return;
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('sub_vendor_checklists')
                    .select('*')
                    .eq('id', checklistId)
                    .single();

                if (error) throw error;
                if (data) setForm(data);
            } catch (err) {
                console.error('Error loading record:', err);
                toast('Failed to load record');
            } finally {
                setLoading(false);
            }
        };
        loadRecord();
    }, [checklistId]);

    const handleProjectChange = (id) => {
        const p = projects.find(x => x.id == id);
        if (p) {
            setForm(prev => ({
                ...prev,
                project_id: id,
                project_name: p.name,
                location: p.location || ''
            }));
        } else {
            setForm(prev => ({ ...prev, project_id: '', project_name: '', location: '' }));
        }
    };

    const handleVendorChange = (id) => {
        const v = vendors.find(x => x.id == id);
        if (v) {
            setForm(prev => ({
                ...prev,
                vendor_id: id,
                vendor_company_name: v.vendor_company || '',
                vendor_name: v.vendor_name || '',
                address: v.address || '',
                phone_no: v.phone || '',
                aadhaar_no: v.aadhaar_no || '',
                pan_no: v.pan_no || '',
                gst_no: v.gst_no || '',
                billing_address: v.billing_address || '',
                bank_account_name: v.account_holder || '',
                bank_account_number: v.account_number || '',
                bank_ifsc_code: v.ifsc_code || '',
                bank_branch: v.bank_branch || '',
                bank_name: v.bank_name || ''
            }));
        } else {
            setForm(prev => ({
                ...prev,
                vendor_id: '', vendor_company_name: '', vendor_name: '', address: '',
                phone_no: '', aadhaar_no: '', pan_no: '', gst_no: '', billing_address: '',
                bank_account_name: '', bank_account_number: '', bank_ifsc_code: '', bank_branch: '', bank_name: ''
            }));
        }
    };

    const handleBudgetChange = (field, value) => {
        setForm(prev => {
            const val = value === '' ? '' : parseFloat(value);
            const updated = { ...prev, [field]: val };
            
            // For calculations, treat empty string as 0
            const m_budget = parseFloat(updated.material_budget) || 0;
            const l_budget = parseFloat(updated.labour_budget) || 0;
            const f_m_amount = parseFloat(updated.final_material_amount) || 0;
            const f_l_amount = parseFloat(updated.final_labour_amount) || 0;
            
            updated.total_budget = m_budget + l_budget;
            updated.total_value = f_m_amount + f_l_amount;
            return updated;
        });
    };

    const handlePurchaseToggle = (item, type) => {
        setForm(prev => ({
            ...prev,
            purchase_details: {
                ...prev.purchase_details,
                [item]: {
                    ...prev.purchase_details[item],
                    [type]: !prev.purchase_details[item][type]
                }
            }
        }));
    };

    const handlePaymentTermChange = (field, value) => {
        setForm(prev => ({
            ...prev,
            payment_terms: {
                ...prev.payment_terms,
                [field]: value
            }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const checklistData = {
                ...form,
                updated_at: new Date().toISOString()
            };

            let query;
            if (checklistId) {
                query = supabase.from('sub_vendor_checklists').update(checklistData).eq('id', checklistId);
            } else {
                query = supabase.from('sub_vendor_checklists').insert([checklistData]);
            }

            const { error } = await query;
            if (error) throw error;
            toast("Sub Vendor Checklist saved successfully!");
            if (!checklistId) navigate('/sub-vendor-checklist/history');
        } catch (err) {
            console.error("Save error:", err);
            alert("Failed to save checklist: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading && projects.length === 0) return (
        <div className={styles.loadingScreen}>
            <div className={styles.loadingCard}>
                <Loader2 className={styles.loadingSpinner} size={64} />
                <h2 className={styles.loadingText}>IIPL-QS Engine</h2>
                <p className={styles.loadingSubtext}>Preparing Sub Vendor Checklist...</p>
            </div>
        </div>
    );

    return (
        <div className={`${styles.container} printable-content`}>
            <header className={styles.header}>
                <div className={`${styles.topActions} ${styles.noPrint}`}>
                    <div style={{ flex: 1 }} />
                    <div className={styles.actions}>
                        <button className={`${styles.actionBtn} ${styles.historyBtn}`} onClick={() => navigate('/sub-vendor-checklist/history')}>
                            <Clock size={18} /> HISTORY
                        </button>
                        <button className={`${styles.actionBtn} ${styles.printBtn}`} onClick={handlePrint}>
                            <Printer size={18} /> PRINT
                        </button>
                        <button className={`${styles.actionBtn} ${styles.saveBtn}`} onClick={handleSubmit} disabled={loading}>
                            {loading ? <Loader2 className={`${styles.loadingSpinner} animate-spin`} size={18} /> : <Save size={18} />} SAVE
                        </button>
                        <button className={styles.backBtn} onClick={() => navigate(-1)}>
                            <ArrowLeft size={18} /> BACK
                        </button>
                    </div>
                </div>
                <h1 className={styles.title}>Sub Vendor Checklist</h1>
                <p className={styles.subtitle}>Comprehensive project & vendor agreement record</p>
            </header>

            <form onSubmit={handleSubmit} className={styles.checklist}>
                {/* 1. PROJECT DETAILS */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>1. PROJECT DETAILS</div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Select Project (Autofill)</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <SearchableSelect
                                    options={projects.map(p => p.name)}
                                    value={form.project_name}
                                    onChange={(name) => {
                                        const p = projects.find(x => x.name === name);
                                        if (p) handleProjectChange(p.id);
                                    }}
                                    placeholder={loading ? "Loading projects..." : projects.length === 0 ? "No projects found" : "--- Choose Existing Project ---"}
                                />
                            </div>
                            <span className={styles.printValue}>{form.project_name}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Location</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                            </div>
                            <span className={styles.printValue}>{form.location}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Nature of Work</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.nature_of_work} onChange={(e) => setForm({ ...form, nature_of_work: e.target.value })} />
                            </div>
                            <span className={styles.printValue}>{form.nature_of_work}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Select Vendor (Autofill)</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <SearchableSelect
                                    options={vendors.map(v => `${v.vendor_name || 'Unnamed Vendor'} ${v.vendor_company ? `(${v.vendor_company})` : ''}`)}
                                    value={form.vendor_name ? `${form.vendor_name} ${form.vendor_company_name ? `(${form.vendor_company_name})` : ''}` : ''}
                                    onChange={(fullName) => {
                                        const v = vendors.find(v => `${v.vendor_name || 'Unnamed Vendor'} ${v.vendor_company ? `(${v.vendor_company})` : ''}` === fullName);
                                        if (v) handleVendorChange(v.id);
                                    }}
                                    placeholder={loading ? "Loading vendors..." : vendors.length === 0 ? "No vendors found" : "--- Choose Existing Vendor ---"}
                                />
                            </div>
                            <span className={styles.printValue}>{form.vendor_name} {form.vendor_company_name ? `(${form.vendor_company_name})` : ''}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Vendor Company Name</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.vendor_company_name} onChange={(e) => setForm({ ...form, vendor_company_name: e.target.value })} />
                            </div>
                            <span className={styles.printValue}>{form.vendor_company_name}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Vendor Name</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.vendor_name} onChange={(e) => setForm({ ...form, vendor_name: e.target.value })} />
                            </div>
                            <span className={styles.printValue}>{form.vendor_name}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Address</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                            </div>
                            <span className={styles.printValue}>{form.address}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Phone No</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.phone_no} onChange={(e) => setForm({ ...form, phone_no: e.target.value })} />
                            </div>
                            <span className={styles.printValue}>{form.phone_no}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Aadhaar No</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.aadhaar_no} onChange={(e) => setForm({ ...form, aadhaar_no: e.target.value })} />
                            </div>
                            <span className={styles.printValue}>{form.aadhaar_no}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>PAN No</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.pan_no} onChange={(e) => setForm({ ...form, pan_no: e.target.value })} />
                            </div>
                            <span className={styles.printValue}>{form.pan_no}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>GST No</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.gst_no} onChange={(e) => setForm({ ...form, gst_no: e.target.value })} />
                            </div>
                            <span className={styles.printValue}>{form.gst_no}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Billing Address</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.billing_address} onChange={(e) => setForm({ ...form, billing_address: e.target.value })} />
                            </div>
                            <span className={styles.printValue}>{form.billing_address}</span>
                        </div>
                    </div>
                </div>

                {/* 2. BANK DETAILS */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>2. BANK DETAILS</div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Account Name</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.bank_account_name} onChange={(e) => setForm({ ...form, bank_account_name: e.target.value })} />
                            </div>
                            <span className={styles.printValue}>{form.bank_account_name}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Account Number</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.bank_account_number} onChange={(e) => setForm({ ...form, bank_account_number: e.target.value })} />
                            </div>
                            <span className={styles.printValue}>{form.bank_account_number}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>IFSC Code</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.bank_ifsc_code} onChange={(e) => setForm({ ...form, bank_ifsc_code: e.target.value })} />
                            </div>
                            <span className={styles.printValue}>{form.bank_ifsc_code}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Branch</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.bank_branch} onChange={(e) => setForm({ ...form, bank_branch: e.target.value })} />
                            </div>
                            <span className={styles.printValue}>{form.bank_branch}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Bank Name</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.bank_name} onChange={(e) => setForm({ ...form, bank_name: e.target.value })} />
                            </div>
                            <span className={styles.printValue}>{form.bank_name}</span>
                        </div>
                    </div>
                </div>

                {/* 3. BUDGET DETAILS */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>3. BUDGET DETAILS</div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Material Budget</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="number" className={styles.input} value={form.material_budget} onChange={(e) => handleBudgetChange('material_budget', e.target.value)} />
                            </div>
                            <span className={styles.printValue}>{form.material_budget}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Labour Budget</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="number" className={styles.input} value={form.labour_budget} onChange={(e) => handleBudgetChange('labour_budget', e.target.value)} />
                            </div>
                            <span className={styles.printValue}>{form.labour_budget}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Total Budget</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="number" className={styles.input} value={form.total_budget} readOnly style={{ backgroundColor: '#f1f5f9' }} />
                            </div>
                            <span className={styles.printValue}><strong>{form.total_budget}</strong></span>
                        </div>
                    </div>
                    <div className={styles.noPrint} style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#f8fafc' }}>
                        <input 
                            type="checkbox" 
                            id="showFinalAmounts" 
                            checked={showFinalAmounts} 
                            onChange={(e) => setShowFinalAmounts(e.target.checked)}
                            style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                        />
                        <label htmlFor="showFinalAmounts" style={{ fontSize: '0.875rem', fontWeight: '600', color: '#475569', cursor: 'pointer' }}>
                            Show Final budget details
                        </label>
                    </div>

                    {showFinalAmounts && (
                        <>
                            <div className={styles.gridRow}>
                                <div className={styles.label}>Final Material Amount</div>
                                <div className={styles.value}>
                                    <div className={styles.inputWrapper}>
                                        <input type="number" className={styles.input} value={form.final_material_amount} onChange={(e) => handleBudgetChange('final_material_amount', e.target.value)} />
                                    </div>
                                    <span className={styles.printValue}>{form.final_material_amount}</span>
                                </div>
                            </div>
                            <div className={styles.gridRow}>
                                <div className={styles.label}>Final Labour Amount</div>
                                <div className={styles.value}>
                                    <div className={styles.inputWrapper}>
                                        <input type="number" className={styles.input} value={form.final_labour_amount} onChange={(e) => handleBudgetChange('final_labour_amount', e.target.value)} />
                                    </div>
                                    <span className={styles.printValue}>{form.final_labour_amount}</span>
                                </div>
                            </div>
                            <div className={styles.gridRow}>
                                <div className={styles.label}>Total Value</div>
                                <div className={styles.value}>
                                    <div className={styles.inputWrapper}>
                                        <input type="number" className={styles.input} value={form.total_value} readOnly style={{ backgroundColor: '#f1f5f9' }} />
                                    </div>
                                    <span className={styles.printValue}><strong>{form.total_value}</strong></span>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* 4. PURCHASE DETAILS */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>4. PURCHASE DETAILS</div>
                    <table className={styles.purchaseTable}>
                        <thead>
                            <tr>
                                <th>DESCRIPTION</th>
                                <th className={styles.centered}>VENDOR SCOPE</th>
                                <th className={styles.centered}>IIPL SCOPE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {Object.keys(form.purchase_details).map((item, idx) => (
                                <tr key={idx}>
                                    <td key={idx}>
                                        <div style={{ padding: '0.5rem', borderBottom: '1px solid #f1f5f9' }}>{idx + 1}. {item}</div>
                                    </td>
                                    <td className={styles.centered}>
                                        <div className={styles.inputWrapper}>
                                            <input
                                                type="checkbox"
                                                className={styles.toggleInput}
                                                checked={form.purchase_details[item].vendor}
                                                onChange={() => handlePurchaseToggle(item, 'vendor')}
                                            />
                                        </div>
                                        <span className={styles.printValue}>{form.purchase_details[item].vendor ? 'YES' : 'NO'}</span>
                                    </td>
                                    <td className={styles.centered}>
                                        <div className={styles.inputWrapper}>
                                            <input
                                                type="checkbox"
                                                className={styles.toggleInput}
                                                checked={form.purchase_details[item].iipl}
                                                onChange={() => handlePurchaseToggle(item, 'iipl')}
                                            />
                                        </div>
                                        <span className={styles.printValue}>{form.purchase_details[item].iipl ? 'YES' : 'NO'}</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* 5. PAYMENT TERMS */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>5. PAYMENT TERMS</div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Advance %</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.payment_terms.advance_pct} onChange={(e) => handlePaymentTermChange('advance_pct', e.target.value)} />
                            </div>
                            <span className={styles.printValue}>{form.payment_terms.advance_pct}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>BALANCE Running Bill (RA) upto(85%) Work done</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.payment_terms.ra_bill_upto} onChange={(e) => handlePaymentTermChange('ra_bill_upto', e.target.value)} />
                            </div>
                            <span className={styles.printValue}>{form.payment_terms.ra_bill_upto}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Final bill Payment Process Approved by MD</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.payment_terms.final_bill_approval} onChange={(e) => handlePaymentTermChange('final_bill_approval', e.target.value)} />
                            </div>
                            <span className={styles.printValue}>{form.payment_terms.final_bill_approval}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Work done by other vendor</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <input type="text" className={styles.input} value={form.payment_terms.work_done_other_vendor} onChange={(e) => handlePaymentTermChange('work_done_other_vendor', e.target.value)} />
                            </div>
                            <span className={styles.printValue}>{form.payment_terms.work_done_other_vendor}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Housekeeping Deduction (2%)</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <select className={styles.select} value={form.payment_terms.housekeeping_deduction} onChange={(e) => handlePaymentTermChange('housekeeping_deduction', e.target.value)}>
                                    <option value="YES/NO">SELECT YES/NO</option>
                                    <option value="YES">YES</option>
                                    <option value="NO">NO</option>
                                </select>
                            </div>
                            <span className={styles.printValue}>{form.payment_terms.housekeeping_deduction}</span>
                        </div>
                    </div>
                    <div className={styles.gridRow}>
                        <div className={styles.label}>Retention (5%)</div>
                        <div className={styles.value}>
                            <div className={styles.inputWrapper}>
                                <select className={styles.select} value={form.payment_terms.retention_5} onChange={(e) => handlePaymentTermChange('retention_5', e.target.value)}>
                                    <option value="YES/NO">SELECT YES/NO</option>
                                    <option value="YES">YES</option>
                                    <option value="NO">NO</option>
                                </select>
                            </div>
                            <span className={styles.printValue}>{form.payment_terms.retention_5}</span>
                        </div>
                    </div>
                </div>

                {/* 6. TERMS AND CONDITIONS */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>6. TERMS AND CONDITIONS</div>
                    <ul className={styles.termsList}>
                        {form.terms_and_conditions.map((term, idx) => (
                            <li key={idx} className={styles.termItem}>{term}</li>
                        ))}
                    </ul>
                </div>

                {/* Signatures */}
                <div className={styles.signaturesGrid}>
                    <div className={styles.sigBox}>PROJECT COORDINATOR</div>
                    <div className={styles.sigBox}>PURCHASE TEAM</div>
                    <div className={styles.sigBox}>QS TEAM</div>
                    <div className={styles.sigBox}>PROJECT INCHARGE</div>
                </div>

                <div className={styles.bottomSignatures}>
                    <div className={styles.sigBox}>GM</div>
                    <div className={styles.sigBox}>CEO</div>
                    <div className={styles.sigBox}>MD</div>
                </div>
            </form>
        </div>
    );
};

export default SubVendorChecklist;
