import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { LoadingOverlay, Input } from '../components/ui';
import { Button } from '../components/ui/Button';
import { MapPin, Camera, LogOut, CheckCircle, ShieldAlert, Building } from 'lucide-react';
import { useMessage } from '../context/MessageContext';

const LaborPortal = () => {
    const { toast, alert } = useMessage();
    const [loading, setLoading] = useState(false);
    const [labor, setLabor] = useState(null);
    const [todayRecord, setTodayRecord] = useState(null);
    
    // Site Selection
    const [sites, setSites] = useState([]);
    const [selectedSite, setSelectedSite] = useState('');
    
    // Auth State
    const [phone, setPhone] = useState('');
    const [pin, setPin] = useState('');
    
    // Camera State
    const [showCamera, setShowCamera] = useState(false);
    const [actionType, setActionType] = useState(''); // 'in' or 'out'
    const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
    const [pendingAction, setPendingAction] = useState(null);
    const [useFallback, setUseFallback] = useState(false);
    const [fallbackFile, setFallbackFile] = useState(null);
    
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [stream, setStream] = useState(null);
    const [location, setLocation] = useState(null);

    useEffect(() => {
        const savedSession = localStorage.getItem('labor_session');
        if (savedSession) {
            const laborData = JSON.parse(savedSession);
            setLabor(laborData);
            checkTodayAttendance(laborData.id);
        }
        
        // Fetch Sites
        supabase.from('sites').select('id, name').order('name').then(({data}) => {
            if(data) setSites(data);
        });
    }, []);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('labors')
                .select('*')
                .eq('phone', phone)
                .eq('login_pin', pin)
                .single();
                
            if (error || !data) throw new Error("Invalid Phone Number or PIN.");
            
            localStorage.setItem('labor_session', JSON.stringify(data));
            setLabor(data);
            checkTodayAttendance(data.id);
            toast("Login successful!");
        } catch (err) {
            await alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('labor_session');
        setLabor(null);
        setTodayRecord(null);
    };

    const checkTodayAttendance = async (laborId) => {
        setLoading(true);
        try {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase
                .from('labor_attendance_wages')
                .select('*')
                .eq('labor_id', laborId)
                .eq('work_date', today)
                .single();
            
            if (data) setTodayRecord(data);
        } catch (err) {
            console.error("Error fetching today's attendance", err);
        } finally {
            setLoading(false);
        }
    };

    const handleTimeAction = (type) => {
        if (type === 'in' && !selectedSite && !todayRecord) {
            alert("Please select your current site before timing in.");
            return;
        }

        if (navigator.permissions && navigator.permissions.query) {
            Promise.all([
                navigator.permissions.query({ name: 'camera' }).catch(() => ({ state: 'prompt' })),
                navigator.permissions.query({ name: 'geolocation' }).catch(() => ({ state: 'prompt' }))
            ]).then(results => {
                const cam = results[0].state;
                const geo = results[1].state;
                if (cam === 'granted' && geo === 'granted') {
                    startCamera(type);
                } else {
                    setPendingAction(type);
                    setShowPermissionPrompt(true);
                }
            }).catch(() => {
                setPendingAction(type);
                setShowPermissionPrompt(true);
            });
        } else {
            setPendingAction(type);
            setShowPermissionPrompt(true);
        }
    };

    const acceptPermissions = () => {
        setShowPermissionPrompt(false);
        if (pendingAction) startCamera(pendingAction);
    };

    const fetchLocation = () => {
        const getLoc = (options) => new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });

        const tryGetLocation = async () => {
            try {
                // Try high accuracy (GPS) first with a 10s timeout
                return await getLoc({ enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
            } catch (err) {
                console.warn("High accuracy location failed. Retrying with low accuracy...", err);
                // Fallback to low accuracy (Cell-tower/WiFi) which is much faster and reliable indoors
                return await getLoc({ enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 });
            }
        };

        tryGetLocation()
            .then(async (pos) => {
                const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                try {
                    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`);
                    const data = await res.json();
                    setLocation({ coords, address: data.display_name });
                } catch (e) {
                    setLocation({ coords, address: "Unknown Address (Coordinates Found)" });
                }
            })
            .catch((err) => {
                console.error("Final location error:", err);
                toast("Location access denied or unavailable. Please enable device GPS.");
                setLocation({ coords: null, address: "Location Unavailable" });
            });
    };

    const startCamera = async (type) => {
        setActionType(type);
        setShowCamera(true);
        setUseFallback(false);
        setFallbackFile(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: "user" } // Use front camera
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
            fetchLocation();
        } catch (err) {
            console.error("Camera error:", err);
            // Fallback to native file input
            setUseFallback(true);
            fetchLocation();
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        setStream(null);
        setShowCamera(false);
        setUseFallback(false);
        setFallbackFile(null);
    };

    const captureAndSubmit = async () => {
        if (!location) {
            await alert("Still fetching location... If it takes too long, ensure location services are enabled, or wait for the fallback.");
            return;
        }

        setLoading(true);
        try {
            let imageBlob = null;
            
            if (useFallback) {
                if (!fallbackFile) {
                    await alert("Please take a photo first!");
                    setLoading(false);
                    return;
                }
                imageBlob = fallbackFile;
            } else {
                // 1. Capture image from video
                const video = videoRef.current;
                const canvas = canvasRef.current;
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                
                imageBlob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
            }
            
            // 2. Upload to Supabase Storage
            const fileName = `selfie_${labor.id}_${Date.now()}.jpg`;
            const { error: uploadError } = await supabase.storage
                .from('attendance_selfies')
                .upload(fileName, imageBlob);
                
            if (uploadError) throw new Error("Image upload failed. Is the 'attendance_selfies' bucket created?");
            
            const { data: { publicUrl } } = supabase.storage
                .from('attendance_selfies')
                .getPublicUrl(fileName);

            // 3. Save to database
            const today = new Date().toISOString().split('T')[0];
            const timestamp = new Date().toISOString();
            
            let payload = {};
            if (actionType === 'in') {
                payload = {
                    labor_id: labor.id,
                    work_date: today,
                    site_id: selectedSite || (todayRecord ? todayRecord.site_id : null),
                    attendance: 'Present',
                    time_in_timestamp: timestamp,
                    time_in_photo_url: publicUrl,
                    time_in_coords: location.coords,
                    time_in_address: location.address
                };
                
                // Check if record exists
                if (todayRecord) {
                    const { error } = await supabase.from('labor_attendance_wages').update(payload).eq('id', todayRecord.id);
                    if (error) throw error;
                } else {
                    const { error } = await supabase.from('labor_attendance_wages').insert([payload]);
                    if (error) throw error;
                }
                toast("Time In logged successfully!");
            } else {
                payload = {
                    time_out_timestamp: timestamp,
                    time_out_photo_url: publicUrl,
                    time_out_coords: location.coords,
                    time_out_address: location.address
                };
                const { error } = await supabase.from('labor_attendance_wages').update(payload).eq('id', todayRecord.id);
                if (error) throw error;
                toast("Time Out logged successfully!");
            }

            stopCamera();
            checkTodayAttendance(labor.id);
        } catch (err) {
            await alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (!labor) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', padding: '20px' }}>
                {loading && <LoadingOverlay message="Logging in..." />}
                <div style={{ width: '100%', maxWidth: '400px', background: '#fff', padding: '30px', borderRadius: '16px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <div style={{ width: '60px', height: '60px', background: '#eff6ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                            <Camera size={28} color="#3b82f6" />
                        </div>
                        <h2 style={{ margin: 0, color: '#1e293b', fontSize: '1.5rem' }}>Labor Portal</h2>
                        <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.9rem' }}>Sign in to mark your attendance</p>
                    </div>
                    
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <Input 
                            label="Phone Number" 
                            type="tel" 
                            placeholder="Enter 10-digit number" 
                            value={phone} 
                            onChange={(e) => setPhone(e.target.value)} 
                            required 
                        />
                        <Input 
                            label="4-Digit PIN" 
                            type="password" 
                            placeholder="e.g. 1234" 
                            maxLength={4}
                            value={pin} 
                            onChange={(e) => setPin(e.target.value)} 
                            required 
                        />
                        <Button type="submit" style={{ marginTop: '8px', padding: '12px' }}>Login</Button>
                    </form>
                </div>
            </div>
        );
    }

    if (showCamera) {
        return (
            <div style={{ position: 'fixed', inset: 0, background: '#000', display: 'flex', flexDirection: 'column', zIndex: 9999 }}>
                {loading && <LoadingOverlay message="Processing..." />}
                <div style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fff' }}>
                    <h3 style={{ margin: 0 }}>Take a Selfie</h3>
                    <button onClick={stopCamera} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.2rem' }}>Cancel</button>
                </div>
                
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                    {useFallback ? (
                        <div style={{ textAlign: 'center', color: '#fff', padding: '20px' }}>
                            <Camera size={48} color="#64748b" style={{ marginBottom: '16px' }} />
                            <p style={{ marginBottom: '24px', color: '#cbd5e1' }}>Browser camera blocked.<br/>Tap below to open your phone's camera.</p>
                            <label style={{ 
                                display: 'inline-block', background: '#3b82f6', color: '#fff', 
                                padding: '12px 24px', borderRadius: '8px', fontSize: '1.1rem', cursor: 'pointer' 
                            }}>
                                {fallbackFile ? "Photo Attached ✓" : "Open Camera"}
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    capture="user" 
                                    style={{ display: 'none' }} 
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            setFallbackFile(e.target.files[0]);
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    ) : (
                        <>
                            <video ref={videoRef} autoPlay playsInline style={{ minWidth: '100%', minHeight: '100%', objectFit: 'cover' }} />
                            <canvas ref={canvasRef} style={{ display: 'none' }} />
                            {/* Camera Overlay UI */}
                            <div style={{ position: 'absolute', inset: '40px', border: '2px dashed rgba(255,255,255,0.5)', borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%', pointerEvents: 'none' }}></div>
                        </>
                    )}
                </div>

                <div style={{ padding: '30px', background: '#1e293b', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                    {location ? (
                        location.coords ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontSize: '0.9rem', textAlign: 'center' }}>
                                <MapPin size={16} /> {location.address || 'Location Found'}
                            </div>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444', fontSize: '0.9rem', textAlign: 'center' }}>
                                <MapPin size={16} /> Location Unavailable
                            </div>
                        )
                    ) : (
                        <div style={{ color: '#fbbf24', fontSize: '0.9rem' }}>Locating... Please wait</div>
                    )}
                    
                    <button 
                        onClick={captureAndSubmit}
                        disabled={!location || (useFallback && !fallbackFile)}
                        style={{ 
                            width: '70px', height: '70px', borderRadius: '50%', background: (location && (!useFallback || fallbackFile)) ? '#3b82f6' : '#94a3b8', 
                            border: '4px solid #fff', cursor: (location && (!useFallback || fallbackFile)) ? 'pointer' : 'not-allowed',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s'
                        }}
                    >
                        <Camera color="#fff" size={24} />
                    </button>
                    <p style={{ color: '#cbd5e1', margin: 0, fontSize: '0.9rem' }}>
                        {useFallback ? "Submit Attendance" : "Tap to capture and submit"}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '20px' }}>
            {loading && <LoadingOverlay message="Loading..." />}
            <div style={{ maxWidth: '400px', margin: '0 auto', background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                {/* Header */}
                <div style={{ background: '#3b82f6', padding: '24px 20px', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                        <p style={{ margin: '0 0 4px 0', opacity: 0.8, fontSize: '0.9rem' }}>Welcome back,</p>
                        <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 600 }}>{labor.name}</h2>
                        <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '0.85rem' }}>{labor.phone}</p>
                    </div>
                    <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '8px', borderRadius: '8px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                        <LogOut size={18} />
                    </button>
                </div>

                {/* Status Card */}
                <div style={{ padding: '24px 20px' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#1e293b', fontSize: '1.1rem' }}>Today's Attendance</h3>
                        
                        {!todayRecord ? (
                            <div style={{ padding: '16px', background: '#f1f5f9', borderRadius: '12px', textAlign: 'center', color: '#64748b' }}>
                                You have not clocked in today.
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px' }}>
                                    <CheckCircle color="#166534" size={20} />
                                    <div>
                                        <p style={{ margin: 0, color: '#166534', fontWeight: 600, fontSize: '0.9rem' }}>Timed In</p>
                                        <p style={{ margin: '4px 0 0 0', color: '#15803d', fontSize: '0.8rem' }}>
                                            {new Date(todayRecord.time_in_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                </div>
                                
                                {todayRecord.time_out_timestamp && (
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '12px' }}>
                                        <CheckCircle color="#1d4ed8" size={20} />
                                        <div>
                                            <p style={{ margin: 0, color: '#1d4ed8', fontWeight: 600, fontSize: '0.9rem' }}>Timed Out</p>
                                            <p style={{ margin: '4px 0 0 0', color: '#2563eb', fontSize: '0.8rem' }}>
                                                {new Date(todayRecord.time_out_timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Site Selection */}
                    {!todayRecord?.time_in_timestamp && (
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: '#64748b', marginBottom: '8px', fontWeight: 600 }}>
                                <Building size={16} /> Select Your Current Site
                            </label>
                            <select 
                                value={selectedSite}
                                onChange={(e) => setSelectedSite(e.target.value)}
                                style={{ width: '100%', padding: '14px', borderRadius: '12px', border: '1px solid #cbd5e1', fontSize: '1rem', background: '#f8fafc', color: '#1e293b' }}
                            >
                                <option value="">-- Choose Site --</option>
                                {sites.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <Button 
                            onClick={() => handleTimeAction('in')}
                            disabled={!!todayRecord?.time_in_timestamp}
                            style={{ 
                                padding: '16px', fontSize: '1.1rem', 
                                background: todayRecord?.time_in_timestamp ? '#e2e8f0' : '#10b981',
                                color: todayRecord?.time_in_timestamp ? '#94a3b8' : '#fff'
                            }}
                        >
                            TIME IN
                        </Button>
                        <Button 
                            variant="secondary"
                            onClick={() => handleTimeAction('out')}
                            disabled={!todayRecord?.time_in_timestamp || !!todayRecord?.time_out_timestamp}
                            style={{ 
                                padding: '16px', fontSize: '1.1rem',
                                background: (!todayRecord?.time_in_timestamp || !!todayRecord?.time_out_timestamp) ? '#e2e8f0' : '#f1f5f9',
                                color: (!todayRecord?.time_in_timestamp || !!todayRecord?.time_out_timestamp) ? '#94a3b8' : '#334155'
                            }}
                        >
                            TIME OUT
                        </Button>
                    </div>
                </div>
            </div>
            
            <div style={{ textAlign: 'center', marginTop: '24px', color: '#94a3b8', fontSize: '0.8rem' }}>
                Location & Camera access required<br/>Innovative Interiors Pvt Ltd
            </div>

            {/* User-Friendly Permission Pre-Prompt */}
            {showPermissionPrompt && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, padding: '20px' }}>
                    <div style={{ background: '#fff', padding: '30px', borderRadius: '20px', width: '100%', maxWidth: '380px', textAlign: 'center', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
                        <div style={{ width: '70px', height: '70px', background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#16a34a' }}>
                            <ShieldAlert size={36} />
                        </div>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.4rem', color: '#1e293b' }}>We Need Your Permission</h3>
                        <p style={{ margin: '0 0 24px 0', color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>
                            To log your attendance properly, we need access to your <b>Camera</b> (for a selfie) and <b>Location</b> (to verify you are on site).<br/><br/>
                            <b>Please ensure your phone's GPS / Location is turned ON.</b><br/><br/>
                            When prompted by your browser on the next step, please tap <b>"Allow"</b>.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                            <Button onClick={acceptPermissions} style={{ padding: '14px', fontSize: '1.05rem', borderRadius: '12px' }}>I Understand, Continue</Button>
                            <button onClick={() => setShowPermissionPrompt(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', padding: '10px', fontSize: '0.95rem', cursor: 'pointer' }}>Cancel</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LaborPortal;
