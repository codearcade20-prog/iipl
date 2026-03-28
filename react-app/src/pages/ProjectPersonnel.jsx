import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Plus, Trash2, UserCog, User, Briefcase, HardHat } from 'lucide-react';
import { useMessage } from '../context/MessageContext';
import LoadingScreen from '../components/LoadingScreen';
import styles from './ProjectPersonnel.module.css';

const ProjectPersonnel = () => {
    const { role } = useParams();
    const { alert, confirm, toast } = useMessage();
    const [loading, setLoading] = useState(false);
    const [personnel, setPersonnel] = useState([]);
    const [newName, setNewName] = useState('');

    // Map URL parameter to DB enum and UI labels
    const getRoleInfo = (roleParam) => {
        switch (roleParam) {
            case 'coordinator':
                return { dbRole: 'Coordinator', title: 'Coordinators', icon: <UserCog size={24} /> };
            case 'designer':
                return { dbRole: 'Designer', title: 'Designers', icon: <Briefcase size={24} /> };
            case 'site-engineer':
                return { dbRole: 'Site Engineer', title: 'Site Engineers', icon: <HardHat size={24} /> };
            default:
                return { dbRole: 'Unknown', title: 'Personnel', icon: <User size={24} /> };
        }
    };

    const roleInfo = getRoleInfo(role);

    useEffect(() => {
        if (roleInfo.dbRole !== 'Unknown') {
            fetchPersonnel();
        }
    }, [role]);

    const fetchPersonnel = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('project_personnel')
                .select('*')
                .eq('role', roleInfo.dbRole)
                .order('name', { ascending: true });
            if (error) throw error;
            setPersonnel(data || []);
        } catch (error) {
            console.error("Error fetching personnel:", error);
            alert("Failed to load personnel list.");
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('project_personnel')
                .insert([{ name: newName.trim(), role: roleInfo.dbRole }]);
            if (error) throw error;
            toast(`${roleInfo.dbRole} added successfully!`);
            setNewName('');
            fetchPersonnel();
        } catch (error) {
            console.error("Error adding person:", error);
            alert("Failed to add person: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!await confirm(`Are you sure you want to remove ${name}?`)) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('project_personnel')
                .delete()
                .eq('id', id);
            if (error) throw error;
            toast(`${name} removed.`);
            fetchPersonnel();
        } catch (error) {
            console.error("Error deleting person:", error);
            alert("Failed to remove person.");
        } finally {
            setLoading(false);
        }
    };

    if (loading && personnel.length === 0) return <LoadingScreen message={`Loading ${roleInfo.title}...`} />;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>
                    <div className={styles.iconWrapper}>{roleInfo.icon}</div>
                    Manage {roleInfo.title}
                </h1>
                <p className={styles.subtitle}>Add or remove entries for the {roleInfo.dbRole} dropdown menu in Project Entry.</p>
            </header>

            <form className={styles.formCard} onSubmit={handleAdd}>
                <div className={styles.inputGroup}>
                    <input 
                        type="text" 
                        className={styles.input} 
                        value={newName} 
                        onChange={(e) => setNewName(e.target.value)} 
                        placeholder={`Enter new ${roleInfo.dbRole.toLowerCase()} name...`}
                        required 
                    />
                    <button type="submit" className={styles.submitBtn} disabled={loading || !newName.trim()}>
                        <Plus size={18} /> Add {roleInfo.dbRole}
                    </button>
                </div>
            </form>

            <div className={styles.listSection}>
                <div className={styles.listHeader}>
                    Existing {roleInfo.title} ({personnel.length})
                </div>
                {personnel.length > 0 ? (
                    <div className={styles.personList}>
                        {personnel.map(person => (
                            <div key={person.id} className={styles.personItem}>
                                <div className={styles.personInfo}>
                                    <div className={styles.iconWrapper} style={{ width: '32px', height: '32px', background: '#f8fafc', color: '#64748b' }}>
                                        <User size={16} />
                                    </div>
                                    <div>
                                        <div className={styles.personName}>{person.name}</div>
                                        <div className={styles.personDate}>Added {new Date(person.created_at).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <button className={styles.deleteBtn} onClick={() => handleDelete(person.id, person.name)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className={styles.emptyState}>
                        <p>No {roleInfo.title.toLowerCase()} added yet. Add one above.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProjectPersonnel;
