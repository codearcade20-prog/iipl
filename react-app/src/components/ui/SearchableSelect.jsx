import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';
import styles from './SearchableSelect.module.css';

const SearchableSelect = ({ options, value, onChange, placeholder, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const wrapperRef = useRef(null);

    // Reset search when opening
    useEffect(() => {
        if (isOpen) setSearchTerm('');
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const filteredOptions = useMemo(() => {
        return options.filter(opt =>
            (opt || '').toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm]);

    return (
        <div className={`${styles.searchableSelectWrapper} ${className}`} ref={wrapperRef}>
            <div
                className={styles.searchableSelectHeader}
                onClick={() => setIsOpen(!isOpen)}
                style={{ borderColor: isOpen ? '#4f46e5' : '#e2e8f0' }}
            >
                <div className={value ? styles.selectedValue : styles.placeholder}>
                    {value || placeholder}
                </div>
                <ChevronDown size={18} style={{
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                    color: isOpen ? '#4f46e5' : '#94a3b8'
                }} />
            </div>

            {isOpen && (
                <div className={styles.searchableMenu}>
                    <div className={styles.searchFieldWrapper}>
                        <Search size={14} className={styles.searchIconInside} />
                        <input
                            autoFocus
                            className={styles.searchMenuInput}
                            placeholder="Type to search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                    <div className={styles.optionsList}>
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, i) => (
                                <div
                                    key={i}
                                    className={`${styles.optionItem} ${value === opt ? styles.optionActive : ''}`}
                                    onClick={() => {
                                        onChange(opt);
                                        setIsOpen(false);
                                    }}
                                >
                                    {opt}
                                </div>
                            ))
                        ) : (
                            <div className={styles.noOptions}>No results found</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchableSelect;
