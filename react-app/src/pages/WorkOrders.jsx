import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Folder, Upload, FolderPlus, FileText, LogIn, LogOut, Loader2, RefreshCw, ChevronRight, ArrowLeft } from 'lucide-react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';
import styles from './WorkOrders.module.css';

const CLIENT_ID = '831948232788-3dta87lou09jqn7on4o9pplsgt3a2ie6.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.readonly';

const DriveManager = () => {
    const [token, setToken] = useState(localStorage.getItem('google_drive_token') || null);
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Navigation state
    const [currentFolderId, setCurrentFolderId] = useState('root');
    const [folderStack, setFolderStack] = useState([{ id: 'root', name: 'My Drive' }]);
    
    // Upload state
    const fileInputRef = useRef(null);
    const [isUploading, setIsUploading] = useState(false);

    const login = useGoogleLogin({
        scope: SCOPES,
        onSuccess: (codeResponse) => {
            const accessToken = codeResponse.access_token;
            setToken(accessToken);
            localStorage.setItem('google_drive_token', accessToken);
            fetchFiles(accessToken, currentFolderId);
        },
        onError: (error) => console.log('Login Failed:', error)
    });

    const logout = () => {
        setToken(null);
        setFiles([]);
        localStorage.removeItem('google_drive_token');
        setFolderStack([{ id: 'root', name: 'My Drive' }]);
        setCurrentFolderId('root');
    };

    const fetchFiles = async (accessToken, folderId = 'root') => {
        setLoading(true);
        try {
            const response = await fetch(
                `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,iconLink,webViewLink)&orderBy=folder,name`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` },
                }
            );
            
            if (response.status === 401) {
                logout();
                return;
            }

            const data = await response.json();
            if (data.files) {
                setFiles(data.files);
            }
        } catch (error) {
            console.error('Error fetching files:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchFiles(token, currentFolderId);
        }
    }, [token, currentFolderId]);

    // Navigate to a folder
    const handleFolderClick = (e, file) => {
        e.preventDefault();
        setFolderStack(prev => [...prev, { id: file.id, name: file.name }]);
        setCurrentFolderId(file.id);
    };

    // Navigate back
    const handleBackClick = () => {
        if (folderStack.length > 1) {
            const newStack = [...folderStack];
            newStack.pop();
            setFolderStack(newStack);
            setCurrentFolderId(newStack[newStack.length - 1].id);
        }
    };

    // Create a new folder
    const handleCreateFolder = async () => {
        const folderName = prompt('Enter new folder name:');
        if (!folderName) return;

        setLoading(true);
        try {
            const response = await fetch('https://www.googleapis.com/drive/v3/files', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name: folderName,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [currentFolderId]
                })
            });
            if (response.ok) {
                fetchFiles(token, currentFolderId);
            }
        } catch (error) {
            console.error('Error creating folder:', error);
        } finally {
            setLoading(false);
        }
    };

    // Upload a file
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const metadata = {
                name: file.name,
                parents: [currentFolderId]
            };

            const boundary = '-------314159265358979323846';
            const delimiter = "\\r\\n--" + boundary + "\\r\\n";
            const close_delim = "\\r\\n--" + boundary + "--";

            const reader = new FileReader();
            reader.readAsArrayBuffer(file);
            reader.onload = async () => {
                const fileContent = reader.result;
                let body = delimiter +
                    'Content-Type: application/json; charset=UTF-8\\r\\n\\r\\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    'Content-Type: ' + file.type + '\\r\\n\\r\\n';

                const blob = new Blob([body, new Uint8Array(fileContent), close_delim]);

                const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': `multipart/related; boundary=${boundary}`
                    },
                    body: blob
                });
                
                if(response.ok) {
                    fetchFiles(token, currentFolderId);
                } else {
                    alert('Upload failed. Try reconnecting.');
                }
                setIsUploading(false);
            };
        } catch (error) {
            console.error('Upload error:', error);
            setIsUploading(false);
        }
        
        // Reset input
        e.target.value = null;
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <Link to="/">
                        <Button variant="secondary">← Back</Button>
                    </Link>
                    <h1 className={styles.title}>Drive Module</h1>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    {token ? (
                        <>
                            <Button variant="outline" onClick={() => fetchFiles(token, currentFolderId)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
                            </Button>
                            <Button variant="outline" onClick={handleCreateFolder} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <FolderPlus size={16} /> New Folder
                            </Button>
                            <Button variant="primary" onClick={() => fileInputRef.current.click()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }} disabled={isUploading}>
                                {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />} 
                                {isUploading ? 'Uploading...' : 'Upload File'}
                            </Button>
                            <input type="file" ref={fileInputRef} onChange={handleFileUpload} style={{ display: 'none' }} />
                            
                            <Button variant="danger" onClick={logout} style={{ marginLeft: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <LogOut size={16} /> Disconnect
                            </Button>
                        </>
                    ) : (
                        <Button variant="primary" onClick={() => login()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#4285F4', color: 'white', border: 'none' }}>
                            <LogIn size={16} /> Sign in with Google Drive
                        </Button>
                    )}
                </div>
            </div>

            <div className={styles.pathBar} style={{ display: 'flex', alignItems: 'center', padding: '0.5rem 1rem', backgroundColor: '#f3f4f6', borderRadius: '4px', marginBottom: '1rem' }}>
                {folderStack.length > 1 && (
                    <Button variant="secondary" onClick={handleBackClick} style={{ marginRight: '1rem', padding: '0.25rem 0.5rem' }}>
                        <ArrowLeft size={16} /> Back
                    </Button>
                )}
                <span style={{ fontWeight: 500, color: '#4b5563', display: 'flex', alignItems: 'center' }}>
                    {folderStack.map((folder, index) => (
                        <React.Fragment key={folder.id}>
                            <span style={{ color: index === folderStack.length - 1 ? '#111827' : '#6b7280' }}>
                                {folder.name}
                            </span>
                            {index < folderStack.length - 1 && <ChevronRight size={16} style={{ margin: '0 0.25rem' }} />}
                        </React.Fragment>
                    ))}
                </span>
            </div>

            <div className={styles.content} style={{ backgroundColor: '#fff', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', minHeight: '400px', position: 'relative' }}>
                {!token ? (
                    <div style={{ textAlign: 'center', padding: '5rem 0', color: '#6b7280' }}>
                        <img src="https://upload.wikimedia.org/wikipedia/commons/d/da/Google_Drive_logo.png" alt="Google Drive" style={{ width: '64px', marginBottom: '1rem', opacity: 0.8 }} />
                        <h3>Connect your Google Drive</h3>
                        <p style={{ maxWidth: '400px', margin: '0 auto' }}>Please sign in to access your files, create folders, and upload directly from this dashboard.</p>
                    </div>
                ) : loading && files.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '5rem 0', color: '#6b7280' }}>
                        <Loader2 size={40} className="animate-spin" style={{ marginBottom: '1rem' }} />
                        <p>Loading files...</p>
                    </div>
                ) : files.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '5rem 0', color: '#6b7280' }}>
                        <Folder size={48} style={{ margin: '0 auto 1rem', opacity: 0.5 }} />
                        <h3>This folder is empty</h3>
                        <p>Create a folder or upload a file to get started.</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                        {files.map(file => {
                            const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
                            return (
                                <div 
                                    key={file.id} 
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', border: '1px solid #e5e7eb', borderRadius: '8px', backgroundColor: '#fff', transition: 'all 0.2s', ':hover': { backgroundColor: '#f9fafb', borderColor: '#d1d5db' } }}
                                >
                                    <a 
                                        href={isFolder ? '#' : file.webViewLink} 
                                        target={isFolder ? '_self' : '_blank'} 
                                        rel="noopener noreferrer"
                                        onClick={(e) => isFolder ? handleFolderClick(e, file) : null}
                                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}
                                    >
                                        {isFolder ? (
                                            <Folder size={24} color="#3b82f6" style={{ flexShrink: 0 }} />
                                        ) : (
                                            <img src={file.iconLink} alt="" style={{ width: '20px', height: '20px', flexShrink: 0 }} />
                                        )}
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.9rem', fontWeight: 500 }}>
                                            {file.name}
                                        </span>
                                    </a>
                                </div>
                            );
                        })}
                    </div>
                )}
                
                {loading && files.length > 0 && (
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,255,255,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Loader2 size={40} className="animate-spin" color="#3b82f6" />
                    </div>
                )}
            </div>
        </div>
    );
};

// Wrapper provider
const WorkOrders = () => {
    return (
        <GoogleOAuthProvider clientId={CLIENT_ID}>
            <DriveManager />
        </GoogleOAuthProvider>
    );
};

export default WorkOrders;
