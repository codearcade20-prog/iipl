import React from 'react';
import styles from './PrintModal.module.css';
import { useMessage } from '../context/MessageContext';
import { Button } from './ui/Button';

const PrintModal = ({ isOpen, onClose, onConfirm }) => {
    if (!isOpen) return null;

    const handleOrientationSelect = (orientation) => {
        // Inject dynamic style for print orientation
        const style = document.createElement('style');
        style.innerHTML = `
            @page { 
                size: ${orientation === 'landscape' ? 'landscape' : 'portrait'}; 
                margin: 15mm;
            }
            @media print {
                html, body {
                    height: auto !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    overflow: visible !important;
                }
                body * {
                    visibility: hidden !important;
                }
                .printable-content, .printable-content * {
                    visibility: visible !important;
                }
                .printable-content {
                    position: absolute !important;
                    left: 0 !important;
                    top: 0 !important;
                    width: 100% !important;
                    margin: 0 !important;
                    padding: 0 !important;
                    box-shadow: none !important;
                    border: none !important;
                }
            }
        `;
        document.head.appendChild(style);

        onConfirm();

        // Remove style after printing to not affect other prints
        setTimeout(() => {
            document.head.removeChild(style);
        }, 1000);
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <h3>Print Configuration</h3>
                <p>Choose document orientation for printing:</p>
                <div className={styles.options}>
                    <Button onClick={() => handleOrientationSelect('portrait')}>Portrait</Button>
                    <Button variant="secondary" onClick={() => handleOrientationSelect('landscape')}>Landscape</Button>
                </div>
                <div style={{ marginTop: '20px' }}>
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                </div>
            </div>
        </div>
    );
};

export default PrintModal;
