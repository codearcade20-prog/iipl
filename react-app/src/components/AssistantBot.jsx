import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, HelpCircle, BookOpen, Info, Zap, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './AssistantBot.module.css';

const AssistantBot = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const getContextualGreeting = () => {
        const path = window.location.hash.slice(1);
        if (path.includes('/wages')) return "Ready to manage site labor? I can help with attendance logs or wage analytics.";
        if (path.includes('/payroll')) return "Viewing payroll history? Want to export a specific month's summary?";
        if (path.includes('/hr')) return "Managing employees? You can update masters or export the directory to Excel.";
        if (path.includes('/master-register')) return "Need to update a Site or Vendor credential?";
        return "Hey! I'm your IIPL Smart Guide. What's on your mind today?";
    };

    const [messages, setMessages] = useState([
        { role: 'bot', content: getContextualGreeting(), type: 'text' }
    ]);

    // Permission Helper
    const hasAccess = (moduleName) => {
        if (!user) return false;
        if (user.is_admin) return true;
        
        // Map common terms to permission keys
        const permMap = {
            'wages': 'wages_module',
            'hr': 'hr_module',
            'master': 'master_register',
            'invoice': 'payment_invoice',
            'admin': 'admin_dashboard'
        };
        const key = permMap[moduleName.toLowerCase()];
        return user.permissions?.includes(key);
    };

    const getQuickActions = () => {
        return [
            { label: "👷 Today's Attendance", query: "Summarize today's attendance across all sites." },
            { label: "💰 Total Wage Cost", query: "What is the total wage spent this week?" },
            { label: "📋 Work Orders Summary", query: "Give me a summary of all active work orders." },
            { label: "👥 Employee Directory", query: "List the active employees and their roles." }
        ];
    };
    const [isTyping, setIsTyping] = useState(false);
    const [siteData, setSiteData] = useState([]);
    const [globalStats, setGlobalStats] = useState({ todayAttendance: 0, weeklyWages: 0 });
    const [fullData, setFullData] = useState({});
    const scrollRef = useRef(null);

    useEffect(() => {
        if (isOpen && user) {
            fetchIntelligence();
        }
    }, [isOpen, user]);

    const fetchIntelligence = async () => {
        try {
            const today = new Date().toISOString().split('T')[0];
            const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

            // 1. Fetch Core Data
            const { data: sites } = await supabase.from('sites').select('*');
            const { data: attendance } = await supabase.from('attendance').select('site_id, sub_id, attendance_date');
            const { data: payrolls } = await supabase.from('payrolls').select('net_pay, created_at');
            const { data: workOrders } = await supabase.from('work_orders').select('id, wo_number, site_id, vendor_id, wo_value, created_at');
            const { data: payments } = await supabase.from('payment_requests').select('id, request_number, amount, status, work_order_id, created_at');
            const { data: users } = await supabase.from('app_users').select('username, team_role, is_approved').eq('is_admin', false);
            
            // 2. Map sites with vendor counts and WO values
            const enrichedSites = (sites || []).map(site => {
                const siteAttendance = (attendance || []).filter(a => a.site_id === site.id);
                const todayAttendance = siteAttendance.filter(a => a.attendance_date === today).length;
                
                const siteWorkOrders = (workOrders || []).filter(wo => wo.site_id === site.id);
                const uniqueVendors = new Set(siteWorkOrders.map(wo => wo.vendor_id).filter(id => id));
                const totalWOValue = siteWorkOrders.reduce((sum, wo) => sum + (parseFloat(wo.wo_value) || 0), 0);
                
                return { 
                    ...site, 
                    vendorCount: uniqueVendors.size,
                    totalWOValue: totalWOValue,
                    todayCount: todayAttendance
                };
            });
            
            // 3. Global Stats
            const weeklyTotal = (payrolls || [])
                .filter(p => p.created_at >= lastWeek)
                .reduce((sum, p) => sum + (p.net_pay || 0), 0);

            const globalStats = {
                todayAttendance: (attendance || []).filter(a => a.attendance_date === today).length,
                weeklyWages: weeklyTotal
            };

            setSiteData(enrichedSites);
            setGlobalStats(globalStats);
            setFullData({
                sites: enrichedSites,
                workOrders: workOrders || [],
                payments: payments || [],
                employees: users || []
            });
        } catch (err) {
            console.error("Intelligence Fetch Error:", err);
        }
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const [activeSiteContext, setActiveSiteContext] = useState(null);
    const [inputValue, setInputValue] = useState('');

    const fetchSambaNovaResponse = async (userQuery) => {
        try {
            const apiKey = import.meta.env.VITE_SAMBANOVA_API_KEY;
            if (!apiKey) return "AI API Key is missing in environment variables.";

            const systemPrompt = `You are IIPL Smart Guide, an operational assistant for an interior design and construction management app. 
You have FULL READ ACCESS to the operational data provided below.

CRITICAL RULES:
1. READ-ONLY ACCESS: You are strictly FORBIDDEN from performing, confirming, or authorizing any EDIT, DELETE, or write operations. If a user asks to modify data, firmly state you only have read access.
2. NO ADMIN DETAILS: You are strictly FORBIDDEN from discussing Admin controls, system settings, or user passwords.
3. Keep your answers short, professional, and strictly related to the provided data.
4. Do NOT output raw JSON. Format data nicely for human reading (use bullet points or short paragraphs).

Current Live Data:
- Global Stats: ${JSON.stringify(globalStats)}
- Active Sites Summary: ${JSON.stringify(siteData.map(s => ({name: s.name, location: s.location, activeVendors: s.vendorCount, totalWorkOrderValue: s.totalWOValue, todayAttendance: s.todayCount})))}
- Full Operational Context: ${JSON.stringify(fullData)}

Answer the user's question accurately based entirely on this live data.`;

            const response = await fetch("https://api.sambanova.ai/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: "DeepSeek-V3.1",
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userQuery }
                    ],
                    temperature: 0.1,
                    top_p: 0.1
                })
            });
            const data = await response.json();
            if (data && data.choices && data.choices[0]) {
                return data.choices[0].message.content;
            }
            return "Sorry, I couldn't process that query via AI.";
        } catch (err) {
            console.error("SambaNova API Error:", err);
            return "I am currently experiencing a connection error with my AI brain.";
        }
    };

    const handleAction = (query) => {
        let displayQuery = query;
        if (query.startsWith('site_selected:')) {
            const siteId = query.split(':')[1];
            const site = siteData.find(s => s.id === siteId);
            displayQuery = `Selected Site: ${site ? site.name : siteId}`;
        }

        setMessages(prev => [...prev, { role: 'user', content: displayQuery }]);
        setIsTyping(true);

        // Simulate AI "Thinking"
        setTimeout(async () => {
            await processQuery(query.toLowerCase());
            setIsTyping(false);
        }, 800);
    };

    const processQuery = async (query) => {
        // Pure AI-Driven Engine
        const botResponse = await fetchSambaNovaResponse(query);
        setMessages(prev => [...prev, { role: 'bot', content: botResponse }]);
    };

    const handleSend = () => {
        if (!inputValue.trim()) return;
        handleAction(inputValue.trim());
        setInputValue('');
    };

    // Remove quickAction since we now use handleAction directly

    return (
        <div className={styles.botContainer}>
            <button 
                className={`${styles.toggleBtn} ${isOpen ? styles.active : ''}`}
                onClick={() => setIsOpen(!isOpen)}
                title="Help Assistant"
            >
                {isOpen ? <X size={28} /> : <Sparkles size={28} />}
            </button>

            {isOpen && (
                <div className={styles.chatWindow}>
                    <div className={styles.header}>
                        <div className={styles.headerTitle}>
                            <Sparkles size={20} className={styles.sparkleIcon} />
                            <div>
                                <h3>IIPL Smart Guide</h3>
                                <span>Assistant is Online</span>
                            </div>
                        </div>
                        <button onClick={() => setIsOpen(false)} className={styles.closeBtn}><X size={20} /></button>
                    </div>

                    <div className={styles.messagesArea} ref={scrollRef}>
                        {messages.map((m, i) => (
                            <div key={i} className={`${styles.messageWrapper} ${m.role === 'user' ? styles.userWrapper : styles.botWrapper}`}>
                                <div className={styles.message}>
                                    {m.content.split('\n').map((line, li) => (
                                        <div key={li}>{line}</div>
                                    ))}
                                    {m.navLink && (
                                        <button 
                                            className={styles.navActionBtn}
                                            onClick={() => {
                                                navigate(m.navLink.path);
                                                setIsOpen(false);
                                            }}
                                        >
                                            {m.navLink.label} <ChevronRight size={14} />
                                        </button>
                                    )}
                                    {m.externalLink && (
                                        <button 
                                            className={styles.navActionBtn}
                                            onClick={() => {
                                                window.open(m.externalLink, '_blank');
                                            }}
                                        >
                                            Do you want to know more? <ChevronRight size={14} />
                                        </button>
                                    )}
                                    {m.actionOptions && (
                                        <div className={styles.messageOptions}>
                                            {m.actionOptions.map((opt, oi) => (
                                                <button 
                                                    key={oi} 
                                                    className={styles.navActionBtn}
                                                    onClick={() => handleAction(opt.query)}
                                                >
                                                    {opt.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    {m.customComponent === 'SiteSelector' && (
                                        <SiteSelector 
                                            sites={siteData} 
                                            onSelect={(site) => handleAction(`site_selected:${site.id}`)} 
                                        />
                                    )}
                                </div>
                            </div>
                        ))}
                        {isTyping && (
                            <div className={styles.botWrapper}>
                                <div className={styles.typingIndicator}>
                                    <span></span><span></span><span></span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.quickActions}>
                        {getQuickActions().map((action, i) => (
                            <button key={i} onClick={() => handleAction(action.query)}>{action.label}</button>
                        ))}
                    </div>

                    <div className={styles.inputArea}>
                        <input 
                            type="text" 
                            placeholder="Ask me anything..." 
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        />
                        <button id="botSendBtn" onClick={handleSend} className={styles.sendBtn}>
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssistantBot;
