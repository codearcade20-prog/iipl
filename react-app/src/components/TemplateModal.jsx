import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import { LoadingOverlay } from './ui';
import styles from './TemplateModal.module.css';
import { numberToWords, formatDate } from '../utils';

const TemplateModal = ({ record, onClose, gmSignatureUrl }) => {
    const [vendor, setVendor] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (record?.vendor_name) {
            fetchVendorDetails();
        } else {
            setLoading(false);
        }
    }, [record]);

    const fetchVendorDetails = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('vendors')
                .select('*')
                .eq('vendor_name', record.vendor_name)
                .single();

            if (error) console.warn('Vendor details not found:', error.message);
            if (data) setVendor(data);
        } catch (err) {
            console.error('Error fetching vendor details:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!record) return null;

    const handlePrint = () => {
        window.print();
    };

    const getSigName = () => {
        if (!record.vendor_name) return '';
        const parts = record.vendor_name.split(' ');
        return parts[0] + (parts[1] ? ' ' + parts[1] : '');
    };

    const isInvoice = record.type === 'invoice';

    // Bank Detail Fallbacks
    const bankDetails = {
        accName: vendor?.account_holder || record.vendor_name,
        accNo: vendor?.account_number || '',
        ifsc: vendor?.ifsc_code || '',
        bank: vendor?.bank_name || '',
        pan: vendor?.pan_no || '',
        address: vendor?.address || '',
        phone: vendor?.phone || ''
    };

    const modalContent = (
        <div className={`${styles.modalOverlay} template-modal-print`} onClick={onClose}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <h3 className={styles.modalTitle}>
                        {isInvoice ? 'Invoice View' : 'Payment Request View'} - {record.vendor_name}
                    </h3>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button className={styles.printBtn} onClick={handlePrint} title="Print Document">🖨️ Print</button>
                        <button className={styles.closeBtn} onClick={onClose}>×</button>
                    </div>
                </div>

                <div className={styles.previewBody}>
                    {loading && <LoadingOverlay message="Loading details..." />}

                    {!loading && isInvoice && (
                        <div className={`${styles.invoicePaper} printable-content`}>
                            <div className={styles.panNo}>PAN NO: {bankDetails.pan}</div>
                            <div className={styles.borderBox}>
                                <div className={styles.headerTitle}>INVOICE</div>
                                <div className={styles.vendorDetails}>
                                    <div className={styles.previewVendorName}>{record.vendor_name}</div>
                                    <div style={{ whiteSpace: 'pre-wrap', fontWeight: 'bold' }}>{bankDetails.address}</div>
                                    <div style={{ fontWeight: 'bold' }}>{bankDetails.phone ? `Ph no: ${bankDetails.phone}` : ''}</div>
                                </div>

                                <div className={styles.infoGrid}>
                                    <div className={styles.infoItem} style={{ fontWeight: 'bold' }}>Invoice No: {record.invoice_no}</div>
                                    <div className={styles.infoItem} style={{ textAlign: 'right', fontWeight: 'bold' }}>{formatDate(record.date)}</div>
                                    <div className={styles.toSection} style={{ gridColumn: 'span 2' }}>TO</div>
                                    <div className={styles.clientName} style={{ gridColumn: 'span 2', paddingBottom: '10px' }}>
                                        Innovative Interiors Pvt Ltd,<br />
                                        No 7, V V Kovil Street,<br />
                                        Chinmaya Nagar,<br />
                                        Koyembedu, Chennai-92
                                    </div>
                                </div>

                                <div className={styles.projectName}>{record.project}</div>

                                <table className={styles.previewTable}>
                                    <thead>
                                        <tr>
                                            <th style={{ width: '50px' }}>S.No</th>
                                            <th className={styles.descCol}>Description</th>
                                            <th style={{ width: '80px' }}>Unit</th>
                                            <th className={styles.amountCol} style={{ textAlign: 'center' }}>Amount Rs.</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {record.items_data ? (
                                            record.items_data.map((item, i) => (
                                                <tr key={i}>
                                                    <td>{i + 1}</td>
                                                    <td className={styles.descCol}>{item.desc}</td>
                                                    <td>{item.unit}</td>
                                                    <td className={styles.amountCol}>{(parseFloat(item.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td>1</td>
                                                <td className={styles.descCol}>{record.invoice_no || 'Service'}</td>
                                                <td>LS</td>
                                                <td className={styles.amountCol}>{(parseFloat(record.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ fontWeight: 'bold' }}>
                                            <td colSpan="3" style={{ textAlign: 'center' }}>Total</td>
                                            <td className={styles.amountCol}>{(parseFloat(record.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                    </tfoot>
                                </table>

                                <div className={styles.wordsSection}>
                                    (RUPEES {numberToWords(Math.round(record.amount)).toUpperCase()} ONLY)
                                </div>

                                <div className={styles.invoiceFooterArea}>
                                    <div className={styles.bankDetails}>
                                        ACCOUNT HOLDER NAME - {bankDetails.accName}<br />
                                        ACCOUNT NUMBER - {bankDetails.accNo}<br />
                                        IFSC CODE - {bankDetails.ifsc}<br />
                                        BANK - {bankDetails.bank}
                                    </div>

                                    {gmSignatureUrl && (
                                        <div className={styles.gmInvoiceSigOverlay}>
                                            <img src={gmSignatureUrl} alt="GM Signature" className={styles.signatureImg} />
                                        </div>
                                    )}

                                    <div className={styles.footerSig}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', flexDirection: 'column', alignItems: 'flex-end' }}>
                                            <div>For {getSigName()}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!loading && !isInvoice && (
                        <div className={`${styles.invoicePaper} printable-content`} style={{ padding: '10mm' }}>
                            <table className={styles.gridTable}>
                                <tbody>
                                    <tr>
                                        <td colSpan="2" className={styles.headerRow}>SUB VENDOR PAYMENT REQUEST</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>PROJECT NAME</td>
                                        <td className={styles.valueCell}>{record.project}</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>SUB VENDOR NAME</td>
                                        <td className={styles.valueCell} style={{ fontWeight: 'bold' }}>{record.vendor_name}</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>NAME OF WORK</td>
                                        <td className={styles.valueCell}>{record.nature_of_work}</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>WO -NO</td>
                                        <td className={styles.valueCell}>{record.invoice_no}</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>WO-DATE</td>
                                        <td className={styles.valueCell}>{formatDate(record.wo_date)}</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>WO-VALUE</td>
                                        <td className={styles.valueCell}>{record.wo_value ? "Rs. " + parseFloat(record.wo_value).toLocaleString('en-IN') : ""}</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>ACOUNT NUMBER</td>
                                        <td className={styles.valueCell}>{bankDetails.accNo}</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>BANK</td>
                                        <td className={styles.valueCell}>{bankDetails.bank}</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>IFSC</td>
                                        <td className={styles.valueCell}>{bankDetails.ifsc}</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>PAN NO</td>
                                        <td className={styles.valueCell}>{bankDetails.pan}</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell}>REQUEST DATE</td>
                                        <td className={styles.valueCell}>{formatDate(record.date)}</td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell} style={{ height: '55px' }}>BILL STATUS</td>
                                        <td className={styles.valueCell} style={{ padding: 0, height: '55px' }}>
                                            <div className={styles.billStatusContainer}>
                                                <div className={styles.statusBox} style={{ flex: 1.5 }}>
                                                    {record.bill_status}
                                                </div>
                                                <div className={styles.statusBox} style={{ flex: 1, borderLeft: '1px solid #000', borderRight: '1px solid #000' }}>&nbsp;</div>
                                                <div className={styles.statusBox} style={{ flex: 1 }}>&nbsp;</div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className={styles.labelCell} style={{ height: '55px' }}>REQUEST AMOUNT</td>
                                        <td className={styles.valueCell} style={{ padding: 0, height: '55px' }}>
                                            <div className={styles.billStatusContainer}>
                                                <div className={styles.statusBox} style={{ flex: 1.5, fontSize: '14pt' }}>
                                                    <strong>{record.amount ? "Rs. " + parseFloat(record.amount).toLocaleString('en-IN') : ""}</strong>
                                                </div>
                                                <div className={styles.statusBox} style={{ flex: 1, borderLeft: '1px solid #000', borderRight: '1px solid #000' }}>&nbsp;</div>
                                                <div className={styles.statusBox} style={{ flex: 1 }}>&nbsp;</div>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <div className={styles.rupeesSection}>
                                <div className={styles.rupeesValue}>
                                    {record.amount ? "(RUPEES " + numberToWords(Math.round(record.amount)).toUpperCase() + " ONLY)" : ""}
                                </div>

                                {gmSignatureUrl && (
                                    <div className={styles.gmPaymentSigOverlay}>
                                        <img src={gmSignatureUrl} alt="GM Signature" className={styles.signatureImg} />
                                    </div>
                                )}
                            </div>

                            <div className={styles.footerGrid}>
                                <div className={styles.footerItem}>PREPARED</div>
                                <div className={styles.footerItem}>
                                    <div className={styles.signatureContainer}>
                                        <span style={{ fontSize: '10pt' }}>GM</span>
                                    </div>
                                </div>
                                <div className={styles.footerItem}>MD</div>
                                <div className={styles.footerItem}>ACCOUNTS</div>
                            </div>
                        </div>
                    )}


                </div>
            </div>
        </div>

    );

    return createPortal(modalContent, document.body);
};

export default TemplateModal;
