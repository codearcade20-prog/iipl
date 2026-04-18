import React from 'react';
import { Button } from './ui/Button';
import html2pdf from 'html2pdf.js';

const VendorPrintTemplate = ({ vendor, onClose }) => {
    if (!vendor) return null;

    const handlePrint = () => {
        const element = document.getElementById('vendor-print-area');
        const opt = {
            margin:       0.5,
            filename:     `${(vendor.vendor_company || vendor.vendor_name).replace(/[^a-zA-Z0-9]/g, '_')}_Details.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2 },
            jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(element).save();
    };

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.7)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            padding: '20px'
        }}>
            <div style={{
                background: '#fff',
                width: '100%',
                maxWidth: '600px',
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
                maxHeight: '90vh',
                overflowY: 'auto'
            }} className="print-modal-container">
                {/* Print area */}
                <div id="vendor-print-area" style={{ padding: '40px' }} className="print-area">
                    <div style={{ textAlign: 'center', marginBottom: '30px', borderBottom: '2px solid #e2e8f0', paddingBottom: '20px' }}>
                        <h2 style={{ margin: '0 0 10px 0', color: '#1e293b', fontSize: '1.5rem' }}>Vendor Details</h2>
                        <h3 style={{ margin: 0, color: '#64748b', fontWeight: 500 }}>{vendor.vendor_company || vendor.vendor_name}</h3>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
                        <div>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0', textTransform: 'uppercase', fontWeight: 600 }}>Vendor Name</p>
                            <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>{vendor.vendor_name || '-'}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0', textTransform: 'uppercase', fontWeight: 600 }}>Vendor Company</p>
                            <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>{vendor.vendor_company || '-'}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0', textTransform: 'uppercase', fontWeight: 600 }}>Phone Number</p>
                            <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>{vendor.phone || '-'}</p>
                        </div>
                        <div>
                            <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0', textTransform: 'uppercase', fontWeight: 600 }}>Vendor Type</p>
                            <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>
                                {vendor.vendor_type === 'both' ? 'Both (Payment & Invoice)' : 
                                 vendor.vendor_type === 'payment_request' ? 'Payment Request Only' : 
                                 vendor.vendor_type === 'invoice' ? 'Invoice Only' : vendor.vendor_type}
                            </p>
                        </div>
                    </div>

                    <div style={{ marginBottom: '30px', background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
                        <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0', textTransform: 'uppercase', fontWeight: 600 }}>Address</p>
                        <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{vendor.address || '-'}</p>
                    </div>

                    <div style={{ marginBottom: '30px' }}>
                        <h4 style={{ color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>Tax Information</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0', textTransform: 'uppercase', fontWeight: 600 }}>GST Number</p>
                                <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>{vendor.gst_no || '-'}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0', textTransform: 'uppercase', fontWeight: 600 }}>PAN Number</p>
                                <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>{vendor.pan_no || '-'}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0', textTransform: 'uppercase', fontWeight: 600 }}>Aadhaar Number</p>
                                <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>{vendor.aadhaar_no || '-'}</p>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 style={{ color: '#334155', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>Bank Details</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                            <div>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0', textTransform: 'uppercase', fontWeight: 600 }}>Account Holder</p>
                                <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>{vendor.account_holder || '-'}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0', textTransform: 'uppercase', fontWeight: 600 }}>Account Number</p>
                                <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500, fontFamily: 'monospace', letterSpacing: '1px' }}>{vendor.account_number || '-'}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0', textTransform: 'uppercase', fontWeight: 600 }}>Bank Name</p>
                                <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>{vendor.bank_name || '-'}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0', textTransform: 'uppercase', fontWeight: 600 }}>Bank Branch</p>
                                <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500 }}>{vendor.bank_branch || '-'}</p>
                            </div>
                            <div>
                                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0 0 5px 0', textTransform: 'uppercase', fontWeight: 600 }}>IFSC Code</p>
                                <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 500, fontFamily: 'monospace' }}>{vendor.ifsc_code || '-'}</p>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Non-printing action bar */}
                <div className="no-print" style={{ 
                    padding: '20px', 
                    background: '#f8fafc', 
                    borderTop: '1px solid #e2e8f0', 
                    display: 'flex', 
                    justifyContent: 'flex-end', 
                    gap: '10px',
                    borderBottomLeftRadius: '12px',
                    borderBottomRightRadius: '12px'
                }}>
                    <Button variant="secondary" onClick={onClose}>Close</Button>
                    <Button variant="primary" onClick={handlePrint}>Export PDF</Button>
                </div>
            </div>
            <style>
                {`
                @media print {
                    body * {
                        visibility: hidden;
                    }
                    .print-area, .print-area * {
                        visibility: visible;
                    }
                    .print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        padding: 0 !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    .print-modal-container {
                        box-shadow: none !important;
                        max-height: none !important;
                        overflow: visible !important;
                    }
                }
                `}
            </style>
        </div>
    );
};

export default VendorPrintTemplate;
