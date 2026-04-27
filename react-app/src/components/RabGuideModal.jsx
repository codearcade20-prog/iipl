import React from 'react';

const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Training Guide: Work Order & Running Bill System</title>
    <!-- Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <!-- Icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Mermaid for Flowchart -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>
    <script>
        mermaid.initialize({ 
            startOnLoad: true,
            theme: 'base',
            themeVariables: {
                primaryColor: '#eff6ff',
                primaryTextColor: '#1e293b',
                primaryBorderColor: '#3b82f6',
                lineColor: '#94a3b8',
                secondaryColor: '#f1f5f9',
                tertiaryColor: '#ffffff'
            },
            flowchart: {
                curve: 'basis'
            }
        });
    </script>
    <style>
        :root {
            --primary: #0f172a;
            --secondary: #334155;
            --accent: #3b82f6;
            --bg: #f8fafc;
            --card-bg: #ffffff;
            --text: #1e293b;
            --text-light: #64748b;
        }

        body {
            font-family: 'Outfit', sans-serif;
            background-color: var(--bg);
            color: var(--text);
            margin: 0;
            padding: 0;
            line-height: 1.6;
            overflow-x: hidden;
        }

        .presentation-container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 50px 20px;
        }

        .slide {
            background: var(--card-bg);
            border-radius: 24px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.04);
            margin-bottom: 60px;
            padding: 60px;
            position: relative;
            overflow: hidden;
            border: 1px solid rgba(0,0,0,0.05);
            /* Scroll animation basis */
            opacity: 0;
            transform: translateY(40px);
            transition: all 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .slide.visible {
            opacity: 1;
            transform: translateY(0);
        }

        /* Ambient glowing background */
        .slide::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(59,130,246,0.03) 0%, rgba(255,255,255,0) 60%);
            pointer-events: none;
            z-index: 0;
        }

        .content-z {
            position: relative;
            z-index: 1;
        }

        .header {
            text-align: center;
            margin-bottom: 50px;
        }

        .company-name {
            color: var(--accent);
            font-weight: 700;
            letter-spacing: 3px;
            text-transform: uppercase;
            font-size: 1rem;
            margin-bottom: 15px;
            display: inline-block;
            background: #eff6ff;
            padding: 8px 16px;
            border-radius: 30px;
        }

        h1 {
            font-size: 3.5rem;
            color: var(--primary);
            margin: 0 0 15px 0;
            line-height: 1.1;
            letter-spacing: -1px;
        }

        .subtitle {
            font-size: 1.2rem;
            color: var(--text-light);
            font-weight: 400;
        }

        h2 {
            font-size: 2.2rem;
            color: var(--primary);
            margin-top: 0;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #f1f5f9;
            display: flex;
            align-items: center;
            gap: 15px;
        }

        h3 {
            font-size: 1.4rem;
            color: var(--secondary);
            margin-top: 0;
            margin-bottom: 15px;
        }

        h2 i {
            color: var(--accent);
            background: #eff6ff;
            width: 50px;
            height: 50px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 12px;
            font-size: 1.4rem;
        }

        .grid-2 {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
        }

        .grid-3 {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 30px;
        }

        .card {
            background: #f8fafc;
            border-radius: 16px;
            padding: 30px;
            border-left: 4px solid var(--accent);
            transition: transform 0.3s ease, box-shadow 0.3s ease;
            height: 100%;
            box-sizing: border-box;
        }

        .card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 25px rgba(0,0,0,0.05);
        }

        .card.dark {
            background: var(--primary);
            color: white;
            border-left-color: var(--accent);
        }

        .card.dark h3 {
            color: white;
        }

        .card.dark .text-light {
            color: #94a3b8;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            background: white;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0,0,0,0.03);
            border: 1px solid #f1f5f9;
        }

        th, td {
            padding: 16px 20px;
            text-align: left;
            border-bottom: 1px solid #f1f5f9;
        }

        th {
            background: #f8fafc;
            color: var(--secondary);
            font-weight: 600;
            text-transform: uppercase;
            font-size: 0.85rem;
            letter-spacing: 1px;
        }

        .highlight-row {
            background: #eff6ff;
            font-weight: 600;
            color: var(--primary);
        }

        .amount {
            font-family: monospace;
            font-size: 1.1rem;
            font-weight: 600;
        }

        .negative { color: #ef4444; }
        .positive { color: #10b981; }
        .total { color: var(--accent); font-size: 1.2rem; }

        .badges {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 15px;
        }

        .badge {
            display: inline-block;
            padding: 8px 16px;
            border-radius: 30px;
            font-size: 0.95rem;
            font-weight: 500;
            background: white;
            color: var(--text);
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 5px rgba(0,0,0,0.02);
        }

        .alert {
            background: #fff1f2;
            border-left: 4px solid #f43f5e;
            color: #be123c;
            padding: 20px;
            border-radius: 12px;
            display: flex;
            align-items: flex-start;
            gap: 15px;
            margin: 25px 0;
        }

        .alert i {
            font-size: 1.5rem;
            margin-top: 2px;
        }

        .info-box {
            background: #f0fdf4;
            border-left: 4px solid #22c55e;
            color: #166534;
            padding: 20px;
            border-radius: 12px;
            margin: 20px 0;
        }

        .workflow-diagram {
            background: white;
            padding: 40px;
            border-radius: 16px;
            border: 1px solid #e2e8f0;
            margin-top: 30px;
            text-align: center;
        }

        ul.styled-list {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        ul.styled-list li {
            position: relative;
            padding-left: 35px;
            margin-bottom: 15px;
            font-size: 1.05rem;
        }

        ul.styled-list li i {
            position: absolute;
            left: 0;
            top: 4px;
            color: var(--accent);
        }

        .step-indicator {
            display: inline-flex;
            width: 30px;
            height: 30px;
            background: var(--accent);
            color: white;
            border-radius: 50%;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 0.9rem;
            margin-right: 15px;
        }

        /* Responsive */
        @media (max-width: 992px) {
            .grid-2, .grid-3 { grid-template-columns: 1fr; }
            h1 { font-size: 2.5rem; }
            .slide { padding: 40px 30px; }
        }
        
        @media (max-width: 768px) {
            h1 { font-size: 2rem; }
            .slide { padding: 30px 20px; }
            table { display: block; overflow-x: auto; white-space: nowrap; }
        }
    </style>
</head>
<body>

<div class="presentation-container">
    
    <!-- HEADER -->
    <div class="header">
        <div class="company-name"><i class="fa-solid fa-building"></i> Innovative Interiors Pvt Ltd</div>
        <h1>Work Order & Running Bill System</h1>
        <div class="subtitle">Complete Training Guide for New Employees & Site Engineers</div>
    </div>

    <!-- SLIDE 1: INTRO & WORK ORDER -->
    <div class="slide content-z">
        <h2><i class="fa-solid fa-tools"></i> Quick Access - Tools</h2>
        <div class="grid-3" style="margin-bottom: 40px;">
            <a href="#" style="text-decoration: none;">
                <div class="card" style="cursor: pointer; text-align: center; padding: 40px;">
                    <i class="fa-solid fa-file-invoice-dollar" style="font-size: 3rem; color: var(--accent); margin-bottom: 15px;"></i>
                    <h3>RAB Generator</h3>
                    <p>Create Running Bills with work items, progress & payments</p>
                </div>
            </a>
        </div>

        <h2><i class="fa-solid fa-file-signature"></i> 1. The Foundation: Work Orders</h2>
        <div class="grid-2">
            <div>
                <h3>What is a Work Order (WO)?</h3>
                <p>A Work Order is an official document issued to a sub-vendor authorizing them to perform specific work at a project site.</p>
                
                <div class="info-box">
                    <strong>Critical Rule:</strong> The Work Order Value becomes the maximum reference value for all future billing.
                </div>

                <h3>Sub-Vendor Types</h3>
                <p>Sub-vendors perform specialized works such as:</p>
                <div class="badges">
                    <span class="badge">False Ceiling</span>
                    <span class="badge">Painting</span>
                    <span class="badge">Carpentry</span>
                    <span class="badge">Electrical</span>
                    <span class="badge">Lining Work</span>
                    <span class="badge">Glass Work</span>
                    <span class="badge">Flooring</span>
                </div>
            </div>
            
            <div>
                <h3>Work Order Example</h3>
                <table>
                    <tr>
                        <th>Item</th>
                        <th>Value</th>
                    </tr>
                    <tr>
                        <td>Project</td>
                        <td><strong>SRM West Mambalam</strong></td>
                    </tr>
                    <tr>
                        <td>Vendor</td>
                        <td>Electrical Contractor</td>
                    </tr>
                    <tr>
                        <td>Work</td>
                        <td>Electrical wiring</td>
                    </tr>
                    <tr class="highlight-row">
                        <td>WO Value</td>
                        <td class="amount">₹1,00,000</td>
                    </tr>
                </table>

                <div class="card" style="margin-top: 20px;">
                    <h3>Advance Payments</h3>
                    <p>Before or during work, we may provide advance payments to vendors to help them:</p>
                    <ul class="styled-list">
                        <li><i class="fa-solid fa-check"></i> Purchase materials</li>
                        <li><i class="fa-solid fa-check"></i> Mobilize labor</li>
                        <li><i class="fa-solid fa-check"></i> Start work quickly</li>
                    </ul>
                    <p><em>Advances are always adjusted later in Running Bills.</em></p>
                </div>
            </div>
        </div>
    </div>

    <!-- SLIDE 2: RAB BASICS -->
    <div class="slide content-z">
        <h2><i class="fa-solid fa-file-invoice-dollar"></i> 2. Running Bills (RAB) Explained</h2>
        <p style="font-size: 1.2rem; margin-bottom: 30px;">A <strong>Running Bill (RAB)</strong> is a progress-based payment bill raised by a sub-vendor during project execution. Instead of waiting until completion, we pay in stages based on work progress.</p>
        
        <div class="grid-3">
            <div class="card dark">
                <h3>Purpose of Running Bills</h3>
                <ul class="styled-list" style="margin-top: 20px;">
                    <li><i class="fa-solid fa-arrow-right" style="color: white;"></i> Pay vendors gradually</li>
                    <li><i class="fa-solid fa-arrow-right" style="color: white;"></i> Track project progress accurately</li>
                    <li><i class="fa-solid fa-arrow-right" style="color: white;"></i> Control project costs</li>
                    <li><i class="fa-solid fa-arrow-right" style="color: white;"></i> Adjust advances earlier given</li>
                </ul>
            </div>
            
            <div class="card">
                <h3>Payment Stages</h3>
                <ul class="styled-list">
                    <li><span class="step-indicator">0</span> <strong>Advance:</strong> Initial payment</li>
                    <li><span class="step-indicator">1</span> <strong>RAB-1:</strong> First progress payment</li>
                    <li><span class="step-indicator">2</span> <strong>RAB-2:</strong> Second progress payment</li>
                    <li><span class="step-indicator">3</span> <strong>RAB-3:</strong> Third progress payment</li>
                    <li><span class="step-indicator"><i class="fa-solid fa-flag-checkered" style="color: white; position:static;"></i></span> <strong>Final Bill:</strong> Settlement after work completion</li>
                </ul>
            </div>

            <div class="card">
                <h3>Certification Process</h3>
                <p>The billing process involves three departments:</p>
                <div style="margin-top: 15px;">
                    <strong>1. Site Engineer</strong><br>
                    <span style="color: var(--text-light); font-size: 0.9rem;">Measures completed work, confirms quantity</span>
                </div>
                <div style="margin-top: 15px;">
                    <strong>2. Project Team</strong><br>
                    <span style="color: var(--text-light); font-size: 0.9rem;">Reviews bill, cross-checks WO limits</span>
                </div>
                <div style="margin-top: 15px;">
                    <strong>3. Accounts Dept</strong><br>
                    <span style="color: var(--text-light); font-size: 0.9rem;">Adjusts advance, applies GST & calculates payable</span>
                </div>
            </div>
        </div>
    </div>

    <!-- SLIDE 3: CALCULATIONS -->
    <div class="slide content-z">
        <h2><i class="fa-solid fa-calculator"></i> 3. Work Measurement & Value Calculation</h2>
        <div class="grid-2">
            <div>
                <h3>Step 1: Work Measurement</h3>
                <p>Work completed is calculated based on exact quantity executed on site. The <strong>Rate always remains same</strong> as the Work Order rate.</p>
                <table>
                    <tr>
                        <th>Description</th>
                        <th>WO Qty</th>
                        <th>Completed Qty</th>
                        <th>Work %</th>
                    </tr>
                    <tr>
                        <td>Electrical Wiring</td>
                        <td>3500 SFT</td>
                        <td>1750 SFT</td>
                        <td><span style="color:var(--accent); font-weight:bold;">50%</span></td>
                    </tr>
                </table>
            </div>
            
            <div>
                <h3>Step 2: Bill Value & Advance Adjustment</h3>
                <p>Once certified value is calculated, previously paid advances are deducted first.</p>
                <table>
                    <tr>
                        <th>Description</th>
                        <th>Amount</th>
                    </tr>
                    <tr>
                        <td>Certified Bill Value (50% work)</td>
                        <td class="amount positive">₹50,000</td>
                    </tr>
                    <tr>
                        <td>Less Advance Paid</td>
                        <td class="amount negative">- ₹20,000</td>
                    </tr>
                    <tr class="highlight-row">
                        <td>Sub Total</td>
                        <td class="amount total">₹30,000</td>
                    </tr>
                </table>
            </div>
        </div>
    </div>

    <!-- SLIDE 4: GST & DEDUCTIONS -->
    <div class="slide content-z">
        <h2><i class="fa-solid fa-percent"></i> 4. GST, Deductions & Final Payment Calculation</h2>
        
        <div class="grid-2">
            <div>
                <div class="card">
                    <h3>1. GST (Goods & Services Tax)</h3>
                    <p>If the vendor is GST registered, standard <strong>18% GST</strong> is added to the subtotal.</p>
                    <div class="alert">
                        <i class="fa-solid fa-circle-exclamation"></i>
                        <div>
                            <strong>Crucial Rule for Cash Payments:</strong><br>
                            If site teams give cash to vendors for urgent work, <strong>GST must still be calculated on the certified bill value</strong>. Cash payments are deducted only afterwards.
                        </div>
                    </div>
                </div>

                <div class="card" style="margin-top: 20px;">
                    <h3>2. Project Deductions</h3>
                    <ul class="styled-list">
                        <li><i class="fa-solid fa-shield"></i> <strong>Retention (5%):</strong> Quality assurance deduction, released after project completion.</li>
                        <li><i class="fa-solid fa-broom"></i> <strong>Housekeeping (2%):</strong> Site maintenance charges (project dependent).</li>
                    </ul>
                </div>
            </div>

            <div>
                <h3>Master Payment Calculation Example</h3>
                <p>Given: WO Value = ₹1,00,000 | Work completed = 100%</p>
                <table>
                    <tr>
                        <th>Description</th>
                        <th style="text-align: right;">Amount</th>
                    </tr>
                    <tr>
                        <td>Certified Bill Value</td>
                        <td class="amount" style="text-align: right;">₹1,00,000</td>
                    </tr>
                    <tr>
                        <td>Less Advance</td>
                        <td class="amount negative" style="text-align: right;">- ₹20,000</td>
                    </tr>
                    <tr style="background: #f8fafc;">
                        <td><strong>Subtotal</strong></td>
                        <td class="amount" style="text-align: right;"><strong>₹80,000</strong></td>
                    </tr>
                    <tr>
                        <td>Add GST (18%)</td>
                        <td class="amount positive" style="text-align: right;">+ ₹14,400</td>
                    </tr>
                    <tr style="background: #f8fafc;">
                        <td><strong>Gross Subtotal</strong></td>
                        <td class="amount" style="text-align: right;"><strong>₹94,400</strong></td>
                    </tr>
                    <tr>
                        <td>Less Retention (5% of 94.4k)</td>
                        <td class="amount negative" style="text-align: right;">- ₹4,720</td>
                    </tr>
                    <tr>
                        <td>Less Housekeeping (2% of 94.4k)</td>
                        <td class="amount negative" style="text-align: right;">- ₹1,888</td>
                    </tr>
                    <tr class="highlight-row">
                        <td>FINAL PAYABLE AMOUNT</td>
                        <td class="amount total" style="text-align: right;">₹87,792</td>
                    </tr>
                </table>
            </div>
        </div>
    </div>

    <!-- SLIDE 5: RULES & FLOWCHART -->
    <div class="slide content-z">
        <h2><i class="fa-solid fa-clipboard-list"></i> 5. Key Rules & Process Flow</h2>
        
        <div class="grid-2">
            <div>
                <h3>Important Control Rule: The 120% Limit</h3>
                <p>Sometimes extra work occurs beyond the original scope (Variation). Company policy allows up to a <strong>20% increase</strong> on the WO value.</p>
                
                <table style="width: 100%; margin-top: 15px;">
                    <tr>
                        <td>Work Order Value</td>
                        <td class="amount">₹1,00,000</td>
                    </tr>
                    <tr>
                        <td>Allowed Variation (20%)</td>
                        <td class="amount">₹20,000</td>
                    </tr>
                    <tr class="highlight-row">
                        <td>Maximum Allowed Billing</td>
                        <td class="amount negative">₹1,20,000</td>
                    </tr>
                </table>
                <p style="color: #ef4444; font-weight: 500; margin-top: 10px;">
                    <i class="fa-solid fa-arrow-right"></i> If billing exceeds this limit, a NEW Work Order must be created!
                </p>

                <h3 style="margin-top: 40px;">Employee Checklist</h3>
                <ul class="styled-list">
                    <li><i class="fa-solid fa-check-double"></i> Quantity matches site measurement</li>
                    <li><i class="fa-solid fa-check-double"></i> Rates match Work Order exactly</li>
                    <li><i class="fa-solid fa-check-double"></i> Advance payments are fully adjusted</li>
                </ul>
            </div>

            <div class="workflow-diagram">
                <h3 style="margin-bottom: 20px;">Complete WO & Billing Workflow</h3>
                <div class="mermaid">
                    graph TD
                        A[Work Order Issued] --> B{Advance Required?}
                        style A fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff,rx:8px,ry:8px
                        
                        B -- Yes --> C[Pay Advance]
                        style C fill:#fef08a,stroke:#eab308,stroke-width:2px,color:#854d0e,rx:8px,ry:8px
                        
                        B -- No --> D[Vendor Executes Work]
                        C --> D
                        style D fill:#f1f5f9,stroke:#94a3b8,stroke-width:2px,rx:8px,ry:8px
                        
                        D --> E[Sub-Vendor Submits RAB]
                        E --> F[Site Engineer Measures & Certifies]
                        style F fill:#dcfce7,stroke:#22c55e,stroke-width:2px,color:#166534,rx:8px,ry:8px
                        
                        F --> G[Project Team Cross-checks WO Volume Limit]
                        G --> H[Accounts Dept Processing]
                        
                        H --> I[Adjust Advance]
                        I --> J[Apply GST 18%]
                        J --> K[Deduct Retention 5% & Housekeeping 2%]
                        
                        K --> L[Release RAB Payment]
                        style L fill:#3b82f6,stroke:#2563eb,stroke-width:2px,color:#fff,rx:8px,ry:8px
                        
                        L --> M{Is Work 100% Complete?}
                        M -- No --> D
                        M -- Yes --> N[Final Bill Settlement & Closure]
                        style N fill:#1e293b,stroke:#0f172a,stroke-width:2px,color:#fff,rx:8px,ry:8px
                </div>
            </div>
        </div>
    </div>

</div>

<!-- Scroll Animation Script -->
<script>
    document.addEventListener("DOMContentLoaded", () => {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1
        });

        document.querySelectorAll('.slide').forEach(slide => {
            observer.observe(slide);
        });
    });
</script>

</body>
</html>
`;

export default function RabGuideModal({ isOpen, onClose }) {
    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 99999,
            display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px'
        }} onClick={onClose}>
            <div style={{
                background: 'white', borderRadius: '24px', width: '100%', maxWidth: '1200px', height: '90vh',
                display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }} onClick={e => e.stopPropagation()}>
                <div style={{ padding: '20px 30px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                    <h3 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ background: '#eff6ff', color: '#3b82f6', padding: '8px 12px', borderRadius: '12px' }}>📘</span> 
                        Training Guide
                    </h3>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: '40px', height: '40px', borderRadius: '50%', fontSize: '20px', cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}>
                        ✕
                    </button>
                </div>
                <iframe srcDoc={htmlContent} style={{ width: '100%', height: '100%', border: 'none', flex: 1, backgroundColor: '#f8fafc' }} title="RAB Guide" />
            </div>
        </div>
    );
}
