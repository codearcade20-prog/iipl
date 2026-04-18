import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Folder, Upload, FolderPlus, FileText, Trash2, Edit2, Download } from 'lucide-react';
import styles from './WorkOrders.module.css';

const WorkOrders = () => {
    const [files, setFiles] = useState([]);
    const [currentPath, setCurrentPath] = useState('Root');

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/">
                        <Button variant="secondary">← Back</Button>
                    </Link>
                    <h1 className={styles.title}>Drive Module</h1>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="outline" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <FolderPlus size={16} /> New Folder
                    </Button>
                    <Button variant="primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Upload size={16} /> Upload File
                    </Button>
                </div>
            </div>

            <div className={styles.pathBar}>
                <span>Current Path: {currentPath}</span>
            </div>

            <div className={styles.content} style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                {files.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: '#6b7280' }}>
                        <Folder size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <h3>Your drive is empty</h3>
                        <p>Create a folder or upload a file to get started.</p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '2rem', alignItems: 'center', backgroundColor: '#f9fafb', padding: '2rem', borderRadius: '8px', border: '1px dashed #d1d5db' }}>
                            <p style={{ fontWeight: 'bold', color: '#374151' }}>Developer Setup Required</p>
                            <span style={{ fontSize: '0.9rem' }}>To connect directly to Google Drive and perform CRUD operations, a Google Cloud setup is needed.</span>
                        </div>
                    </div>
                ) : (
                    <div>
                        {/* File list will render here */}
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkOrders;
