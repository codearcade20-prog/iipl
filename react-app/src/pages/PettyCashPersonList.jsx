import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { UserPlus, Search, Phone, CreditCard, Landmark, Trash2 } from 'lucide-react';
import { useMessage } from '../context/MessageContext';
import LoadingScreen from '../components/LoadingScreen';
import styles from './PettyCashPersonList.module.css';

const PettyCashPersonList = () => {
    const navigate = useNavigate();
    const { alert, confirm, toast } = useMessage();
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchPersons();
    }, []);

    const fetchPersons = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('petty_cash_persons')
                .select('*')
                .order('name');

            if (error) throw error;
            setPersons(data || []);
        } catch (error) {
            console.error('Error fetching persons:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        const confirmed = await confirm('Are you sure you want to delete this person?');
        if (!confirmed) return;

        try {
            const { error } = await supabase
                .from('petty_cash_persons')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setPersons(persons.filter(p => p.id !== id));
            toast('Person deleted successfully.');
        } catch (error) {
            console.error('Error deleting person:', error);
            alert('Error deleting person: ' + error.message, 'Delete Error');
        }
    };

    const filteredPersons = persons.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.phone?.includes(searchTerm)
    );

    if (loading && persons.length === 0) return <LoadingScreen message="Fetching request persons..." />;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.headerInfo}>
                    <h1 className={styles.title}>Request Persons</h1>
                    <p className={styles.subtitle}>Manage employees and vendors for petty cash</p>
                </div>
                <button className={styles.addBtn} onClick={() => navigate('/accounts/petty-cash/persons/new')}>
                    <UserPlus size={18} /> New Request Person
                </button>
            </header>

            <div className={styles.searchBar}>
                <Search size={18} className={styles.searchIcon} />
                <input 
                    type="text" 
                    placeholder="Search by name or phone..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            {loading ? (
                <div className={styles.loading}>Loading persons...</div>
            ) : filteredPersons.length > 0 ? (
                <div className={styles.grid}>
                    {filteredPersons.map(person => (
                        <div key={person.id} className={styles.card}>
                            <div className={styles.cardHeader}>
                                <div className={styles.personInfo}>
                                    <h3 className={styles.personName}>{person.name}</h3>
                                    <span className={styles.personType}>{person.person_type}</span>
                                </div>
                                <button className={styles.deleteBtn} onClick={() => handleDelete(person.id)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className={styles.cardBody}>
                                <div className={styles.detail}>
                                    <Phone size={14} /> {person.phone}
                                </div>
                                <div className={styles.detail}>
                                    <CreditCard size={14} /> {person.account_number}
                                </div>
                                <div className={styles.detail}>
                                    <Landmark size={14} /> {person.bank_name} ({person.ifsc_code})
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className={styles.emptyState}>
                    <p>No request persons found.</p>
                </div>
            )}
        </div>
    );
};

export default PettyCashPersonList;
