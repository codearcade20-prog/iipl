const SUPABASE_URL = 'https://renymactqhgpbhvaodch.supabase.co';
const SUPABASE_KEY = 'sb_publishable_RUcPGtA9-mMjktvfwm-g2g_STwg2QSP';
// Access the global supabase object from the CDN
const supabaseGlobal = window.supabase;
const supabaseClient = supabaseGlobal.createClient(SUPABASE_URL, SUPABASE_KEY);

let rawData = [];
let vendorData = [];

// Fetch Data from Supabase
async function fetchData() {
    try {
        const { data: woData, error } = await supabaseClient
            .from('work_orders')
            .select(`
                *,
                sites (name),
                vendors (name),
                advances (*)
            `);

        if (error) throw error;

        // Transform Flat/Nested Data to Hierarchical rawData
        const siteMap = new Map();

        woData.forEach(wo => {
            const siteName = wo.sites.name;
            const vendorName = wo.vendors.name;

            if (!siteMap.has(siteName)) {
                siteMap.set(siteName, {
                    siteName: siteName,
                    vendors: []
                });
            }

            const siteEntry = siteMap.get(siteName);
            siteEntry.vendors.push({
                name: vendorName,
                woNo: wo.wo_no,
                woValue: parseFloat(wo.wo_value),
                pdfUrl: wo.wo_pdf_url,
                advances: wo.advances.map(a => ({
                    amount: parseFloat(a.amount),
                    date: a.date,
                    payment_mode: a.payment_mode
                }))
            });
        });

        rawData = Array.from(siteMap.values());
        vendorData = getVendorData();
        render();

    } catch (err) {
        console.error('Error fetching data:', err);
        alert('Failed to load data from database.');
    }
}

// Normalize Data for Vendor View (Client-side from rawData)
function getVendorData() {
    const vendorMap = new Map();

    rawData.forEach(site => {
        site.vendors.forEach(vendor => {
            if (!vendorMap.has(vendor.name)) {
                vendorMap.set(vendor.name, {
                    name: vendor.name,
                    sites: [],
                    totalWO: 0,
                    totalAdvance: 0
                });
            }
            const vData = vendorMap.get(vendor.name);
            const totalAdvance = vendor.advances.reduce((sum, adv) => sum + adv.amount, 0);

            vData.sites.push({
                siteName: site.siteName,
                woNo: vendor.woNo,
                woValue: vendor.woValue,
                pdfUrl: vendor.pdfUrl,
                advances: vendor.advances,
                totalAdvance: totalAdvance
            });
            vData.totalWO += vendor.woValue;
            vData.totalAdvance += totalAdvance;
        });
    });
    return Array.from(vendorMap.values());
}
let currentView = 'overview';
let editingState = null; // { originalSite, originalVendor, data: { ... } }
let detailId = null; // Store selected site name or vendor name
let pdfUrlToView = null;
let returnView = null;
const contentArea = document.getElementById('content-area');
const pageTitle = document.getElementById('page-title');
const navItems = document.querySelectorAll('.nav-item');

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
}

function switchView(view) {
    currentView = view;
    detailId = null; // Reset detail view on navigation
    navItems.forEach(item => item.classList.remove('active'));

    const activeNav = document.querySelector(`[onclick="switchView('${view}')"]`);
    if (activeNav) activeNav.classList.add('active');

    // Close sidebar on mobile if it's open
    if (window.innerWidth <= 768) {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar.classList.contains('open')) {
            toggleSidebar();
        }
    }

    // Toggle global search bar visibility
    const globalSearchBar = document.querySelector('.search-bar');
    if (globalSearchBar) {
        if (view === 'overview' || view === 'add_entry') {
            globalSearchBar.style.display = 'none';
        } else {
            globalSearchBar.style.display = 'block';
        }
    }

    render();
}

function handleSearch(query) {
    render(query.toLowerCase(), true);
}

// Navigation to Details
function viewSiteDetail(siteName) {
    currentView = 'site_detail';
    detailId = siteName;
    render();
}

function viewVendorDetail(vendorName) {
    currentView = 'vendor_detail';
    detailId = vendorName;
    render();
}

function viewPdf(url) {
    pdfUrlToView = url;
    returnView = currentView;
    currentView = 'pdf_viewer';
    render();
}

function goBack(toView) {
    if (toView === 'back_from_pdf') {
        currentView = returnView;
        pdfUrlToView = null;
        returnView = null;
    } else {
        currentView = toView;
        detailId = null;
    }
    render();
}

function render(searchQuery = '', isUpdate = false) {
    if (!isUpdate) contentArea.innerHTML = '';

    // Clear page title classes/state if needed

    if (currentView === 'overview') {
        pageTitle.innerText = 'Overview';
        renderOverview();
    } else if (currentView === 'sites') {
        pageTitle.innerText = 'All Sites';
        renderSitesSummary(searchQuery);
    } else if (currentView === 'vendors') {
        pageTitle.innerText = 'All Vendors';
        renderVendorsSummary(searchQuery);
    } else if (currentView === 'site_detail') {
        renderSiteDetail();
    } else if (currentView === 'vendor_detail') {
        renderVendorDetail();
    } else if (currentView === 'add_entry') {
        pageTitle.innerText = 'Add New Entry';
        renderAddEntry();
    } else if (currentView === 'admin_panel') {
        pageTitle.innerText = 'Admin Panel';
        renderAdminPanel(searchQuery);
    } else if (currentView === 'statements') {
        pageTitle.innerText = 'Statements';
        renderStatements();
    } else if (currentView === 'master_report') {
        pageTitle.innerText = 'Master Site Report';
        renderSiteMasterReport(searchQuery);
    } else if (currentView === 'pdf_viewer') {
        renderPdfViewer();
    }
}

function renderOverview() {
    const totalSites = rawData.length;
    const totalVendors = vendorData.length;
    const totalWOValue = vendorData.reduce((acc, v) => acc + v.totalWO, 0);
    const totalAdvance = vendorData.reduce((acc, v) => acc + v.totalAdvance, 0);

    const cards = `
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-icon bg-gradient-1"><i class="fa-solid fa-building"></i></div>
                <div class="stat-info">
                    <h3>Total Sites</h3>
                    <p>${totalSites}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon bg-gradient-2"><i class="fa-solid fa-users"></i></div>
                <div class="stat-info">
                    <h3>Total Unique Vendors</h3>
                    <p>${totalVendors}</p>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-icon bg-gradient-3"><i class="fa-solid fa-indian-rupee-sign"></i></div>
                <div class="stat-info">
                    <h3>Total WO Value</h3>
                    <p>${formatCurrency(totalWOValue)}</p>
                </div>
            </div>
        </div>
        
        <h2 style="margin-bottom: 1rem; font-weight: 600;">Recent Sites</h2>
        ${renderSitesListInternal(rawData.slice(0, 3))}
    `;
    contentArea.innerHTML = cards;
}

// Summary View for Sites (Clickable)
function renderSitesSummary(query) {
    const filteredSites = rawData.filter(site =>
        site.siteName.toLowerCase().includes(query) ||
        site.vendors.some(v => v.name.toLowerCase().includes(query))
    );

    if (filteredSites.length === 0) {
        contentArea.innerHTML = `<p class="subtitle">No sites found matching "${query}"</p>`;
        return;
    }

    contentArea.innerHTML = renderSitesListInternal(filteredSites);
}

function renderSitesListInternal(sites) {
    return `
        <div class="grid-container">
            ${sites.map(site => {
        const totalVal = site.vendors.reduce((acc, v) => acc + v.woValue, 0);
        const vendorCount = site.vendors.length;
        return `
                <div class="info-card" onclick="viewSiteDetail('${site.siteName}')">
                    <div class="card-header">
                        <span>${site.siteName}</span>
                        <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem;"></i>
                    </div>
                    <div class="card-body">
                         <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span class="list-item-sub">Total Value</span>
                            <span class="currency">${formatCurrency(totalVal)}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between;">
                            <span class="list-item-sub">Vendors Allocated</span>
                            <span style="font-weight: 600;">${vendorCount}</span>
                        </div>
                        <div class="tag" style="margin-top: 1rem; background: #eff6ff; color: #3b82f6;">Click for Details</div>
                    </div>
                </div>
            `}).join('')}
        </div>
    `;
}

// Site Detail View
// Site Detail View
function renderSiteDetail() {
    const site = rawData.find(s => s.siteName === detailId);
    if (!site) return;

    pageTitle.innerHTML = `<span style="font-size: 0.8em; color: var(--text-muted);">Site Details / </span> ${site.siteName}`;

    contentArea.innerHTML = `
        <div class="detail-header">
            <button class="back-btn" onclick="goBack('sites')">
                <i class="fa-solid fa-arrow-left"></i> Back to Sites
            </button>
        </div>

        <div class="grid-container">
             ${site.vendors.map(v => `
                <div class="info-card" style="cursor: default;">
                    <div class="card-header">
                        <span>${v.name}</span>
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                            ${v.pdfUrl ? `
                                <button onclick="viewPdf('${v.pdfUrl}')" class="pdf-btn" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">
                                    <i class="fa-solid fa-file-pdf"></i> PDF
                                </button>
                            ` : ''}
                            <i class="fa-solid fa-user"></i>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="list-item">
                            <span class="list-item-sub">Work Order No</span>
                            <span class="list-item-title">${v.woNo || 'N/A'}</span>
                        </div>
                         <div class="list-item">
                            <span class="list-item-sub">WO Value</span>
                            <span class="currency">${formatCurrency(v.woValue)}</span>
                        </div>
                         <div class="list-item">
                            <span class="list-item-sub">Total Paid</span>
                            <span class="currency" style="color: var(--primary);">${formatCurrency(v.advances.reduce((sum, a) => sum + a.amount, 0))}</span>
                        </div>

                        
                        <div style="margin-top: 1rem; border-top: 1px solid #e2e8f0; padding-top: 0.5rem;">
                            <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.5rem; font-weight: 600;">Payment History</div>
                            ${v.advances.length > 0 ? v.advances.map(a => `
                                <div style="display:flex; justify-content:space-between; font-size: 0.85rem; margin-bottom: 4px; padding: 4px; background: #f8fafc; border-radius: 4px;">
                                    <div>
                                        <span style="display:block; font-weight:500;">${a.date || 'N/A'}</span>
                                        <span style="font-size:0.7rem; color:#64748b;">${a.payment_mode || 'M1'}</span>
                                    </div>
                                    <span style="font-weight:600;">${formatCurrency(a.amount)}</span>
                                </div>
                            `).join('') : '<div style="font-size: 0.8rem; color: #94a3b8; font-style: italic;">No payments recorded</div>'}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}


// Summary View for Vendors (Clickable)
function renderVendorsSummary(query) {
    const filteredVendors = vendorData.filter(vendor =>
        vendor.name.toLowerCase().includes(query) ||
        vendor.sites.some(s => s.siteName.toLowerCase().includes(query))
    );

    if (filteredVendors.length === 0) {
        contentArea.innerHTML = `<p class="subtitle">No vendors found matching "${query}"</p>`;
        return;
    }

    contentArea.innerHTML = `
        <div class="grid-container">
            ${filteredVendors.map(vendor => `
                <div class="info-card" onclick="viewVendorDetail('${vendor.name}')">
                    <div class="card-header">
                        <span>${vendor.name}</span>
                        <i class="fa-solid fa-chevron-right" style="font-size: 0.8rem;"></i>
                    </div>
                    <div class="card-body">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                            <span class="list-item-sub">Total Projects Value</span>
                            <span class="currency">${formatCurrency(vendor.totalWO)}</span>
                        </div>
                         <div style="display: flex; justify-content: space-between;">
                            <span class="list-item-sub">Active Sites</span>
                            <span style="font-weight: 600;">${vendor.sites.length}</span>
                        </div>
                        <div class="tag" style="margin-top: 1rem;">Click for Details</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Vendor Detail View
// Vendor Detail View
function renderVendorDetail() {
    const vendor = vendorData.find(v => v.name === detailId);
    if (!vendor) return;

    pageTitle.innerHTML = `<span style="font-size: 0.8em; color: var(--text-muted);">Vendor Details / </span> ${vendor.name}`;

    contentArea.innerHTML = `
        <div class="detail-header">
            <button class="back-btn" onclick="goBack('vendors')">
                <i class="fa-solid fa-arrow-left"></i> Back to Vendors
            </button>
        </div>

        <div class="grid-container">
             ${vendor.sites.map(site => `
                <div class="info-card" style="cursor: default;">
                    <div class="card-header">
                        <span>${site.siteName}</span>
                         <div style="display:flex; gap:0.5rem; align-items:center;">
                            ${site.pdfUrl ? `
                                <button onclick="viewPdf('${site.pdfUrl}')" class="pdf-btn" style="padding: 0.25rem 0.75rem; font-size: 0.8rem;">
                                    <i class="fa-solid fa-file-pdf"></i> PDF
                                </button>
                            ` : ''}
                            <i class="fa-solid fa-building"></i>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="list-item">
                            <span class="list-item-sub">Work Order No</span>
                            <span class="list-item-title">${site.woNo || 'N/A'}</span>
                        </div>
                         <div class="list-item">
                            <span class="list-item-sub">WO Value</span>
                            <span class="currency">${formatCurrency(site.woValue)}</span>
                        </div>
                         <div class="list-item">
                            <span class="list-item-sub">Total Paid</span>
                            <span class="currency" style="color: var(--primary);">${formatCurrency(site.totalAdvance)}</span>
                        </div>

                        <div style="margin-top: 1rem; border-top: 1px solid #e2e8f0; padding-top: 0.5rem;">
                            <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 0.5rem; font-weight: 600;">Payment History</div>
                            ${site.advances.length > 0 ? site.advances.map(a => `
                                <div style="display:flex; justify-content:space-between; font-size: 0.85rem; margin-bottom: 4px; padding: 4px; background: #f8fafc; border-radius: 4px;">
                                    <div>
                                        <span style="display:block; font-weight:500;">${a.date || 'N/A'}</span>
                                        <span style="font-size:0.7rem; color:#64748b;">${a.payment_mode || 'M1'}</span>
                                    </div>
                                    <span style="font-weight:600;">${formatCurrency(a.amount)}</span>
                                </div>
                            `).join('') : '<div style="font-size: 0.8rem; color: #94a3b8; font-style: italic;">No payments recorded</div>'}
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function renderPdfViewer() {
    if (!pdfUrlToView) {
        goBack('back_from_pdf');
        return;
    }

    pageTitle.innerHTML = `<span style="font-size: 0.8em; color: var(--text-muted);">Document Viewer</span>`;

    contentArea.innerHTML = `
        <div class="detail-header">
            <button class="back-btn" onclick="goBack('back_from_pdf')">
                <i class="fa-solid fa-arrow-left"></i> Back
            </button>
        </div>
        <div class="pdf-viewer-container">
            <iframe src="${pdfUrlToView}" width="100%" height="100%" style="border:none;">
                This browser does not support PDFs. Please download the PDF to view it: <a href="${pdfUrlToView}">Download PDF</a>
            </iframe>
        </div>
    `;
}


// Add Entry Form View
// Add Entry Form View
function renderAddEntry() {
    // If Editing, pre-fill data
    let defaults = {
        siteName: '',
        vendorName: '',
        woNo: '',
        woValue: '',
        pdfUrl: '',
        advances: [{ amount: '', date: '', payment_mode: 'M1' }]
    };
    let title = 'New Work Order Entry';
    let btnText = 'Add Entry';

    if (editingState) {
        title = 'Edit Entry';
        btnText = 'Update Entry';
        defaults = {
            siteName: editingState.data.siteName,
            vendorName: editingState.data.name,
            woNo: editingState.data.woNo,
            woValue: editingState.data.woValue,
            pdfUrl: editingState.data.pdfUrl,
            advances: editingState.data.advances.length ? editingState.data.advances : [{ amount: '', date: '', payment_mode: 'M1' }]
        };
    }

    contentArea.innerHTML = `
        <div class="form-container">
            <h2 style="margin-bottom: 1.5rem; font-weight: 600;">${title}</h2>
            <form onsubmit="handleAddEntry(event)">
                <div class="form-group">
                    <label class="form-label">Site Name</label>
                    <input type="text" class="form-input" name="siteName" required list="siteOptions" 
                        placeholder="Select or type new site" value="${defaults.siteName}">
                    <datalist id="siteOptions">
                        ${rawData.map(s => `<option value="${s.siteName}">`).join('')}
                    </datalist>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Vendor Name</label>
                    <input type="text" class="form-input" name="vendorName" required list="vendorOptions" 
                        placeholder="Select or type new vendor" value="${defaults.vendorName}">
                     <datalist id="vendorOptions">
                        ${vendorData.map(v => `<option value="${v.name}">`).join('')}
                    </datalist>
                </div>

                <div class="form-group">
                    <label class="form-label">Work Order No</label>
                    <input type="text" class="form-input" name="woNo" placeholder="IIPL/WO/..." value="${defaults.woNo}">
                </div>

                <div class="form-group">
                    <label class="form-label">Work Order Value</label>
                    <input type="number" class="form-input" name="woValue" min="0" required placeholder="0" value="${defaults.woValue}">
                </div>

                <div class="form-group">
                    <label class="form-label">Work Order PDF</label>
                    <input type="file" class="form-input" id="woPdfFile" accept="application/pdf">
                    <input type="hidden" name="existingPdfUrl" value="${defaults.pdfUrl || ''}">
                    ${defaults.pdfUrl ? `<div style="margin-top:0.5rem; font-size:0.8rem;"><a href="${defaults.pdfUrl}" target="_blank" style="color:var(--primary);">View Current PDF</a></div>` : ''}
                </div>

                <div class="form-group">
                    <label class="form-label">Advance Payments</label>
                    <div id="advance-list" class="advance-list">
                        ${defaults.advances.map(adv => `
                            <div class="advance-item">
                                <input type="number" class="form-input" name="advanceAmount[]" placeholder="Amount" min="0" value="${adv.amount}">
                                <input type="date" class="form-input" name="advanceDate[]" style="width: 140px;" value="${adv.date}">
                                <select class="form-input" name="advanceMode[]" style="width: 140px;">
                                    <option value="M1" ${adv.payment_mode === 'M1' ? 'selected' : ''}>M1 (Account)</option>
                                    <option value="M2" ${adv.payment_mode === 'M2' ? 'selected' : ''}>M2 (Cash)</option>
                                    <option value="M3" ${adv.payment_mode === 'M3' ? 'selected' : ''}>M3 (Materials)</option>
                                    <option value="M4" ${adv.payment_mode === 'M4' ? 'selected' : ''}>M4 (Wages)</option>
                                    <option value="M5" ${adv.payment_mode === 'M5' ? 'selected' : ''}>M5 (Rent)</option>
                                </select>
                                <button type="button" class="remove-advance-btn" onclick="this.parentElement.remove()" title="Remove">
                                    <i class="fa-solid fa-times"></i>
                                </button>
                            </div>
                        `).join('')}
                    </div>
                    <button type="button" class="btn-secondary" onclick="addAdvanceField()">
                        <i class="fa-solid fa-plus"></i> Add Another Advance
                    </button>
                </div>

                <button type="submit" class="btn-primary">${btnText}</button>
                ${editingState ? `<button type="button" class="btn-secondary" style="width:100%; justify-content:center;" onclick="cancelEdit()">Cancel</button>` : ''}
            </form>
        </div>
    `;
}

function cancelEdit() {
    editingState = null;
    switchView('admin_panel');
}

function addAdvanceField() {
    const list = document.getElementById('advance-list');
    const div = document.createElement('div');
    div.className = 'advance-item';
    div.innerHTML = `
        <input type="number" class="form-input" name="advanceAmount[]" placeholder="Amount" min="0">
        <input type="date" class="form-input" name="advanceDate[]" style="width: 140px;">
         <select class="form-input" name="advanceMode[]" style="width: 140px;">
            <option value="M1">M1 (Account)</option>
            <option value="M2">M2 (Cash)</option>
            <option value="M3">M3 (Materials)</option>
            <option value="M4">M4 (Wages)</option>
            <option value="M5">M5 (Rent)</option>
        </select>
        <button type="button" class="remove-advance-btn" onclick="this.parentElement.remove()" title="Remove">
            <i class="fa-solid fa-times"></i>
        </button>
    `;
    list.appendChild(div);
}


// --- CRUD Operations with Supabase ---

async function handleAddEntry(event) {
    event.preventDefault();
    const form = event.target;

    // Extract Form Data
    const siteName = form.siteName.value.trim();
    const vendorName = form.vendorName.value.trim();
    const woNo = form.woNo.value.trim();
    const woValue = parseFloat(form.woValue.value) || 0;

    // Extract Advances
    const amountInputs = form.querySelectorAll('input[name="advanceAmount[]"]');
    const dateInputs = form.querySelectorAll('input[name="advanceDate[]"]');
    const newAdvances = [];
    amountInputs.forEach((input, index) => {
        const amount = parseFloat(input.value) || 0;
        const date = dateInputs[index].value || null;
        if (amount > 0) {
            newAdvances.push({ amount, date });
        }
    });

    // Handle PDF Upload
    const pdfFile = document.getElementById('woPdfFile').files[0];
    let finalPdfUrl = form.existingPdfUrl ? form.existingPdfUrl.value : null;

    if (pdfFile) {
        try {
            const fileName = `wo_${Date.now()}_${pdfFile.name.replace(/[^a-zA-Z0-9.]/g, '')}`;
            const { data: uploadData, error: uploadError } = await supabaseClient
                .storage
                .from('work-orders')
                .upload(fileName, pdfFile);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabaseClient
                .storage
                .from('work-orders')
                .getPublicUrl(fileName);

            finalPdfUrl = publicUrl;
        } catch (uploadErr) {
            console.error('Upload error:', uploadErr);
            alert('Failed to upload PDF. Entry will be saved without it.');
        }
    }

    try {
        if (editingState) {
            const { originalSite, originalVendor } = editingState;
            await handleUpdateEntry(originalSite, originalVendor, siteName, vendorName, woNo, woValue, finalPdfUrl, newAdvances);
        } else {
            await handleCreateEntry(siteName, vendorName, woNo, woValue, finalPdfUrl, newAdvances);
        }

        // Reset Form and State
        form.reset();
        document.getElementById('advance-list').innerHTML = `
            <div class="advance-item">
                <input type="number" class="form-input" name="advanceAmount[]" placeholder="Amount" min="0">
                <input type="date" class="form-input" name="advanceDate[]" style="width: 160px;">
            </div>
        `;
        editingState = null;

        await fetchData(); // Reload all data
        // Navigate
        if (currentView === 'admin_panel' || currentView === 'add_entry') {
            switchView('admin_panel');
        } else {
            viewSiteDetail(siteName);
        }
        alert('Saved successfully!');

    } catch (err) {
        console.error('Error saving entry:', err);
        alert('Error saving entry: ' + err.message);
    }
}

async function handleCreateEntry(siteName, vendorName, woNo, woValue, pdfUrl, advances) {
    // 1. Get or Create Site
    let siteId;
    const { data: existingSite } = await supabaseClient.from('sites').select('id').eq('name', siteName).single();
    if (existingSite) {
        siteId = existingSite.id;
    } else {
        const { data: newSite, error: sErr } = await supabaseClient.from('sites').insert({ name: siteName }).select().single();
        if (sErr) throw sErr;
        siteId = newSite.id;
    }

    // 2. Get or Create Vendor
    let vendorId;
    const { data: existingVendor } = await supabaseClient.from('vendors').select('id').eq('name', vendorName).single();
    if (existingVendor) {
        vendorId = existingVendor.id;
    } else {
        const { data: newVendor, error: vErr } = await supabaseClient.from('vendors').insert({ name: vendorName }).select().single();
        if (vErr) throw vErr;
        vendorId = newVendor.id;
    }

    // 3. Create Work Order
    const { data: wo, error: woErr } = await supabaseClient.from('work_orders').insert({
        site_id: siteId,
        vendor_id: vendorId,
        wo_no: woNo,
        wo_value: woValue,
        wo_pdf_url: pdfUrl
    }).select().single();

    if (woErr) throw woErr;

    // 4. Create Advances
    if (advances.length > 0) {
        const advancesToInsert = advances.map(a => ({
            work_order_id: wo.id,
            amount: a.amount,
            date: a.date
        }));
        const { error: advErr } = await supabaseClient.from('advances').insert(advancesToInsert);
        if (advErr) throw advErr;
    }
}

async function handleUpdateEntry(originalSite, originalVendor, siteName, vendorName, woNo, woValue, pdfUrl, advances) {
    // 1. Get IDs for Original Record to find the WO to update
    const { data: site } = await supabaseClient.from('sites').select('id').eq('name', originalSite).single();
    const { data: vendor } = await supabaseClient.from('vendors').select('id').eq('name', originalVendor).single();

    if (!site || !vendor) throw new Error("Original record not found in DB");

    // 2. Find WO
    const { data: wo } = await supabaseClient.from('work_orders')
        .select('id')
        .eq('site_id', site.id)
        .eq('vendor_id', vendor.id)
        .single();

    if (!wo) throw new Error("Work Order not found");

    // 3. Update WO details (including potentially new Site/Vendor IDs if names changed)
    let targetSiteId = site.id;
    if (siteName !== originalSite) {
        const { data: s } = await supabaseClient.from('sites').select('id').eq('name', siteName).single();
        if (s) targetSiteId = s.id;
        else {
            const { data: ns } = await supabaseClient.from('sites').insert({ name: siteName }).select().single();
            targetSiteId = ns.id;
        }
    }

    let targetVendorId = vendor.id;
    if (vendorName !== originalVendor) {
        const { data: v } = await supabaseClient.from('vendors').select('id').eq('name', vendorName).single();
        if (v) targetVendorId = v.id;
        else {
            const { data: nv } = await supabaseClient.from('vendors').insert({ name: vendorName }).select().single();
            targetVendorId = nv.id;
        }
    }

    await supabaseClient.from('work_orders').update({
        site_id: targetSiteId,
        vendor_id: targetVendorId,
        wo_no: woNo,
        wo_value: woValue,
        wo_pdf_url: pdfUrl
    }).eq('id', wo.id);

    // 4. Update Advances (Delete All + Re-insert)
    await supabaseClient.from('advances').delete().eq('work_order_id', wo.id);

    if (advances.length > 0) {
        const advancesToInsert = advances.map(a => ({
            work_order_id: wo.id,
            amount: a.amount,
            date: a.date
        }));
        await supabaseClient.from('advances').insert(advancesToInsert);
    }
}


// --- Statement View Logic ---

function renderStatements() {
    contentArea.innerHTML = `
        <div style="max-width: 600px; margin: 0 auto; text-align: center;">
            <div style="display: flex; gap: 1rem; justify-content: center; margin-bottom: 2rem;">
                <button class="btn-primary" onclick="switchView('master_report')" style="width: auto;">
                    <i class="fa-solid fa-table"></i> View Master Site Report
                </button>
            </div>
            
            <h2 style="margin-bottom: 2rem; font-weight: 600;">Generate Vendor Statement</h2>
            <div class="search-bar" style="width: 100%; margin-bottom: 2rem;">
                <i class="fa-solid fa-search"></i>
                <input type="text" placeholder="Search vendor name..." 
                    onkeyup="handleStatementSearch(this.value)" style="padding: 1rem 1rem 1rem 3rem;">
            </div>
            <div id="statement-search-results" class="grid-container" style="text-align: left;">
                <!-- Results will appear here -->
            </div>
        </div>
    `;
}

function renderSiteMasterReport(searchQuery = '') {
    const query = searchQuery.toLowerCase();

    // Filter rawData based on site name or vendor names
    const filteredData = rawData.filter(site =>
        site.siteName.toLowerCase().includes(query) ||
        site.vendors.some(v => v.name.toLowerCase().includes(query))
    );

    let rowsHtml = '';
    const dateStr = new Date().toLocaleDateString();

    filteredData.forEach((site, index) => {
        const siteVendors = site.vendors;
        if (siteVendors.length === 0) return;

        // Determine max advances to know how many rows to create
        let maxAdvances = 0;
        siteVendors.forEach(v => {
            if (v.advances.length > maxAdvances) maxAdvances = v.advances.length;
        });

        // Minimum 1 advance row if no advances
        if (maxAdvances === 0) maxAdvances = 1;

        // Total Rows for this Site = 3 (Name, WO No, WO Value) + maxAdvances
        const totalRows = 3 + maxAdvances;

        // --- Row 1: Vendor Name (Included with Site Name) ---
        let vendorNameCells = '';
        siteVendors.forEach((v, i) => {
            const colorClass = i % 2 === 0 ? 'bg-green-soft' : 'bg-yellow-soft';
            vendorNameCells += `<td class="${colorClass}" style="font-weight: 600;">${v.name}</td>`;
        });

        rowsHtml += `
            <tr>
                <td rowspan="${totalRows}" style="vertical-align: middle; text-align: center; font-weight: 600; background-color: #f8fafc;">${site.siteName}</td>
                <td style="font-weight: 500;">VENDOR NAME</td>
                ${vendorNameCells}
            </tr>
        `;

        // --- Row 2: Work Order No ---
        let woNoCells = '';
        siteVendors.forEach((v, i) => {
            woNoCells += `<td>${v.woNo || ''}</td>`;
        });
        rowsHtml += `
            <tr>
                <td style="font-weight: 500;">WORK ORDER NO</td>
                ${woNoCells}
            </tr>
        `;

        // --- Row 3: Work Order Value ---
        let woValueCells = '';
        siteVendors.forEach((v, i) => {
            woValueCells += `<td>${formatCurrency(v.woValue)}</td>`;
        });
        rowsHtml += `
            <tr>
                <td style="font-weight: 500;">WORK ORDER VALUE</td>
                ${woValueCells}
            </tr>
        `;

        // --- Advance Rows ---
        for (let advIdx = 0; advIdx < maxAdvances; advIdx++) {
            let advCells = '';
            siteVendors.forEach((v, i) => {
                const adv = v.advances[advIdx];
                if (adv) {
                    advCells += `<td>
                        <div>${formatCurrency(adv.amount)}</div>
                        <div style="font-size: 0.7rem; color: #64748b; margin-top: 2px;">${adv.date || ''}</div>
                    </td>`;
                } else {
                    advCells += `<td></td>`;
                }
            });

            rowsHtml += `
                <tr>
                    <td style="font-weight: 500;">ADVANCE ${maxAdvances > 1 ? (advIdx + 1) : ''}</td>
                    ${advCells}
                </tr>
             `;
        }
    });

    const tableBodyContent = rowsHtml || '<tr><td colspan="100%" style="text-align:center; padding: 2rem; color: #64748b;">No matching records found</td></tr>';

    // Partial re-render to maintain focus
    const existingTableBody = document.getElementById('master-table-body');
    if (existingTableBody && document.getElementById('master-search-input')) {
        existingTableBody.innerHTML = tableBodyContent;
        return;
    }

    contentArea.innerHTML = `
        <style>
            .master-table {
                width: 100%;
                border-collapse: collapse;
                border: 1px solid #000;
                font-size: 0.8rem;
                overflow-x: auto;
            }
            .master-table th, .master-table td {
                border: 1px solid #000;
                padding: 4px 8px;
            }
            .master-table th {
                background-color: #fca5a5; /* Light Red/Peach from image roughly */
                text-align: center;
                font-weight: 700;
                text-transform: uppercase;
            }
            .bg-green-soft { background-color: #86efac; } /* Green */
            .bg-yellow-soft { background-color: #fde047; } /* Yellow */
            
            @media print {
                .print-hide { display: none !important; }
                .sidebar { display: none !important; }
                .main-content { margin-left: 0 !important; padding: 0 !important; }
                body { background: white !important; }
                .master-table { font-size: 0.7rem; }
            }
        </style>
        
        <div class="print-hide" style="margin-bottom: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
             <div style="display: flex; justify-content: space-between; align-items: center;">
                 <button class="back-btn" onclick="switchView('statements')">
                    <i class="fa-solid fa-arrow-left"></i> Back
                </button>
                 <button class="btn-primary" style="width: auto;" onclick="window.print()">
                    <i class="fa-solid fa-print"></i> Print Report
                </button>
             </div>
             
             <div class="search-bar" style="width: 100%;">
                <i class="fa-solid fa-search"></i>
                <input type="text" id="master-search-input" placeholder="Search site or vendor name in report..." 
                    value="${searchQuery}"
                    onkeyup="handleSearch(this.value)" style="padding: 0.75rem 0.75rem 0.75rem 2.5rem;">
            </div>
        </div>

        <div style="overflow-x: auto;">
            <table class="master-table">
                <thead>
                    <tr>
                        <th style="width: 200px;">SITE NAMES</th>
                        <th colspan="100%">VENDOR DETAILS</th> 
                    </tr>
                </thead>
                <tbody id="master-table-body">
                    ${tableBodyContent}
                </tbody>
            </table>
        </div>
    `;
}

function handleStatementSearch(query) {
    const resultsContainer = document.getElementById('statement-search-results');
    if (!query) {
        resultsContainer.innerHTML = '';
        return;
    }

    const filteredVendors = vendorData.filter(v => v.name.toLowerCase().includes(query.toLowerCase()));

    if (filteredVendors.length === 0) {
        resultsContainer.innerHTML = '<p class="subtitle" style="text-align:center; width:100%;">No vendors found</p>';
        return;
    }

    resultsContainer.innerHTML = filteredVendors.map(v => `
        <div class="info-card" onclick="generateVendorStatement('${v.name}')">
            <div class="card-header">
                <span>${v.name}</span>
                <i class="fa-solid fa-file-invoice"></i>
            </div>
            <div class="card-body">
                <div style="display: flex; justify-content: space-between;">
                    <span class="list-item-sub">Total Projects</span>
                    <span style="font-weight: 600;">${v.sites.length}</span>
                </div>
            </div>
        </div>
        `).join('');
}

function generateVendorStatement(vendorName, viewType = 'detailed') {
    const vendor = vendorData.find(v => v.name === vendorName);
    if (!vendor) return;

    // Common Header Info
    const dateStr = new Date().toLocaleDateString();

    let contentHtml = '';

    if (viewType === 'detailed') {
        // --- DETAILED LEDGER VIEW (Current) ---
        let allTransactions = [];
        vendor.sites.forEach(site => {
            // WO Entry
            allTransactions.push({
                date: '---',
                desc: `Work Order: ${site.woNo || 'N/A'} (${site.siteName})`,
                type: 'CREDIT',
                amount: site.woValue,
                site: site.siteName
            });

            // Advances
            site.advances.forEach(adv => {
                allTransactions.push({
                    date: adv.date || 'N/A',
                    desc: `Advance Paid (${adv.payment_mode || 'M1'})`,
                    type: 'DEBIT',
                    amount: adv.amount,
                    site: site.siteName
                });
            });
        });

        // Calculate Totals
        let totalCredit = 0;
        let totalDebit = 0;
        const rows = allTransactions.map(t => {
            if (t.type === 'CREDIT') totalCredit += t.amount;
            if (t.type === 'DEBIT') totalDebit += t.amount;

            return `
                <tr>
                    <td>${t.date}</td>
                    <td>${t.site}</td>
                    <td>${t.desc}</td>
                    <td class="text-right">${t.type === 'CREDIT' ? formatCurrency(t.amount) : '-'}</td>
                    <td class="text-right">${t.type === 'DEBIT' ? formatCurrency(t.amount) : '-'}</td>
                </tr>
            `;
        }).join('');

        const balance = totalCredit - totalDebit;

        contentHtml = `
            <table class="excel-table">
                <thead>
                    <tr>
                        <th>Date</th>
                        <th>Site / Project</th>
                        <th>Description</th>
                        <th>Work Value (Credit)</th>
                        <th>Paid Amount (Debit)</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="3" class="text-right">Total</td>
                        <td class="text-right">${formatCurrency(totalCredit)}</td>
                        <td class="text-right">${formatCurrency(totalDebit)}</td>
                    </tr>
                    <tr>
                        <td colspan="4" class="text-right" style="font-size: 1.1rem; border-top:none;">Net Balance Payable</td>
                        <td class="text-right" style="font-size: 1.1rem; border-top:none;">${formatCurrency(balance)}</td>
                    </tr>
                </tfoot>
            </table>
        `;
    } else {
        // --- SIMPLE SUMMARY VIEW (New) ---
        let totalWO = 0;
        let totalPaid = 0;

        const rows = vendor.sites.map((site, index) => {
            const sitePaid = site.advances.reduce((sum, a) => sum + a.amount, 0);
            const siteBalance = site.woValue - sitePaid;

            totalWO += site.woValue;
            totalPaid += sitePaid;

            return `
                <tr>
                    <td>${index + 1}</td>
                    <td>
                        <div style="font-weight:600;">${site.siteName}</div>
                        <div style="font-size:0.8em; color:#64748b;">WO: ${site.woNo || 'N/A'}</div>
                    </td>
                    <td class="text-right">${formatCurrency(site.woValue)}</td>
                    <td class="text-right">${formatCurrency(sitePaid)}</td>
                    <td class="text-right" style="font-weight:600; color: ${siteBalance > 0 ? '#10b981' : '#ef4444'}">
                        ${formatCurrency(siteBalance)}
                    </td>
                </tr>
            `;
        }).join('');

        const totalBalance = totalWO - totalPaid;

        contentHtml = `
            <table class="excel-table">
                <thead>
                    <tr>
                        <th style="width: 50px;">#</th>
                        <th>Site / Project</th>
                        <th class="text-right">WO Value</th>
                        <th class="text-right">Total Paid</th>
                        <th class="text-right">Balance</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
                <tfoot>
                    <tr>
                        <td colspan="2" class="text-right">Grand Total</td>
                        <td class="text-right">${formatCurrency(totalWO)}</td>
                        <td class="text-right">${formatCurrency(totalPaid)}</td>
                        <td class="text-right" style="font-size: 1.1rem;">${formatCurrency(totalBalance)}</td>
                    </tr>
                </tfoot>
            </table>
        `;
    }

    contentArea.innerHTML = `
        <div class="print-hide" style="margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;">
            <button class="back-btn" onclick="renderStatements()">
                <i class="fa-solid fa-arrow-left"></i> Back
            </button>
            
            <div class="view-toggle">
                <button class="toggle-btn ${viewType === 'detailed' ? 'active' : ''}" onclick="generateVendorStatement('${vendorName}', 'detailed')">
                    Detailed Ledger
                </button>
                <button class="toggle-btn ${viewType === 'simple' ? 'active' : ''}" onclick="generateVendorStatement('${vendorName}', 'simple')">
                    Simple Summary
                </button>
            </div>

            <button class="btn-primary" style="width: auto;" onclick="window.print()">
                <i class="fa-solid fa-print"></i> Print PDF
            </button>
        </div>

        <div class="statement-container">
            <div class="statement-header">
                <h1>Vendor Statement</h1>
                <p style="color: #64748b; font-size: 0.9rem;">${viewType === 'detailed' ? 'Detailed Transaction Log' : 'Project-wise Summary'}</p>
            </div>

            <div class="statement-meta">
                <div class="meta-group">
                    <h3>Vendor Name</h3>
                    <p class="highlight">${vendor.name}</p>
                </div>
                <div class="meta-group" style="text-align: right;">
                    <h3>Date</h3>
                    <p>${dateStr}</p>
                </div>
            </div>

            ${contentHtml}

            <div style="margin-top: 4rem; display: flex; justify-content: space-between; padding-top: 2rem;">
                <div style="text-align: center;">
                    <div style="border-top: 1px solid #cbd5e1; width: 200px; margin-bottom: 0.5rem;"></div>
                    <span style="font-size: 0.8rem; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Authorized Signatory</span>
                </div>
                <div style="text-align: center;">
                    <div style="border-top: 1px solid #cbd5e1; width: 200px; margin-bottom: 0.5rem;"></div>
                    <span style="font-size: 0.8rem; text-transform: uppercase; color: #64748b; letter-spacing: 1px;">Vendor Signature</span>
                </div>
            </div>
        </div>
    `;
}


// Admin Panel Logic
function renderAdminPanel(searchQuery = '') {
    let rows = '';
    const query = searchQuery.toLowerCase();
    let hasRecords = false;

    // Use rawData directly to show all entries
    if (rawData.length === 0) {
        rows = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No records found</td></tr>';
    } else {
        rawData.forEach(site => {
            const siteMatches = site.siteName.toLowerCase().includes(query);

            site.vendors.forEach((vendor, vIndex) => {
                const vendorMatches = vendor.name.toLowerCase().includes(query);

                if (!query || siteMatches || vendorMatches) {
                    hasRecords = true;
                    const totalAdv = (vendor.advances || []).reduce((sum, a) => sum + (a.amount || 0), 0);
                    rows += `
                    <tr>
                        <td>${site.siteName}</td>
                        <td>${vendor.name}</td>
                        <td>${vendor.woNo || '-'}</td>
                        <td>${formatCurrency(vendor.woValue)}</td>
                        <td>${formatCurrency(totalAdv)}</td>
                        <td>
                            <button class="action-btn edit-btn" onclick="editEntry('${site.siteName}', '${vendor.name}')" title="Edit">
                                <i class="fa-solid fa-pen"></i>
                            </button>
                            <button class="action-btn delete-btn" onclick="deleteEntry('${site.siteName}', '${vendor.name}')" title="Delete">
                                <i class="fa-solid fa-trash"></i>
                            </button>
                        </td>
                    </tr>
                `;
                }
            });
        });

        if (!hasRecords) {
            rows = '<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No matching records found</td></tr>';
        }
    }

    const tableBodyContent = rows || '<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No matching records found</td></tr>';

    // Partial re-render to maintain focus for Admin Panel
    const existingTableBody = document.getElementById('admin-table-body');
    if (existingTableBody) {
        existingTableBody.innerHTML = tableBodyContent;
        return;
    }

    contentArea.innerHTML = `
        <h2 style="margin-bottom: 1.5rem; font-weight: 600; padding-left: 0.5rem;">System Records</h2>
        <div class="table-container">
            <table class="admin-table">
                <thead>
                    <tr>
                        <th>Site Name</th>
                        <th>Vendor Name</th>
                        <th>WO No</th>
                        <th>WO Value</th>
                        <th>Total Advance</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody id="admin-table-body">
                    ${tableBodyContent}
                </tbody>
            </table>
        </div>
        `;
}

async function deleteEntry(siteName, vendorName) {
    if (!confirm('Are you sure you want to PERMANENTLY delete this entry?')) return;

    try {
        const { data: site } = await supabaseClient.from('sites').select('id').eq('name', siteName).single();
        const { data: vendor } = await supabaseClient.from('vendors').select('id').eq('name', vendorName).single();

        if (site && vendor) {
            const { error } = await supabaseClient.from('work_orders')
                .delete()
                .eq('site_id', site.id)
                .eq('vendor_id', vendor.id);

            if (error) throw error;

            await fetchData(); // Reload
            alert('Entry deleted.');
        }
    } catch (err) {
        console.error(err);
        alert('Error deleting entry.');
    }
}

function editEntry(siteName, vendorName) {
    const site = rawData.find(s => s.siteName === siteName);
    if (!site) return;
    const vendor = site.vendors.find(v => v.name === vendorName);
    if (!vendor) return;

    editingState = {
        originalSite: siteName,
        originalVendor: vendorName,
        data: {
            siteName: siteName,
            ...vendor
        }
    };

    currentView = 'add_entry';
    // Re-use logic but update UI
    render(); // This calls renderAddEntry which now handles editingState
}

// Initial Data Load
if (typeof supabaseClient !== 'undefined') {
    fetchData();
} else {
    console.error("Supabase client not initialized");
    alert("System Error: Database connection failed.");
}

// Mobile Sidebar Toggle
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.querySelector('.sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('open');
}
