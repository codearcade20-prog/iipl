import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Pagination.module.css';

export const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;

    const renderPageNumbers = () => {
        const pages = [];
        let startPage = Math.max(1, currentPage - 2);
        let endPage = Math.min(totalPages, currentPage + 2);

        if (currentPage <= 3) {
            endPage = Math.min(5, totalPages);
        }
        if (currentPage >= totalPages - 2) {
            startPage = Math.max(1, totalPages - 4);
        }

        for (let i = startPage; i <= endPage; i++) {
            pages.push(
                <button
                    key={i}
                    className={`${styles.pageButton} ${currentPage === i ? styles.active : ''}`}
                    onClick={() => onPageChange(i)}
                >
                    {i}
                </button>
            );
        }
        return pages;
    };

    return (
        <div className={styles.paginationContainer}>
            <span className={styles.pageInfo}>
                Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
            </span>
            <div className={styles.pageControls}>
                <button
                    className={styles.navButton}
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    aria-label="Previous Page"
                >
                    <ChevronLeft size={18} />
                </button>
                <div className={styles.pageNumbers}>
                    {currentPage > 3 && totalPages > 5 && (
                        <>
                            <button className={styles.pageButton} onClick={() => onPageChange(1)}>1</button>
                            <span className={styles.ellipsis}>...</span>
                        </>
                    )}
                    {renderPageNumbers()}
                    {currentPage < totalPages - 2 && totalPages > 5 && (
                        <>
                            <span className={styles.ellipsis}>...</span>
                            <button className={styles.pageButton} onClick={() => onPageChange(totalPages)}>{totalPages}</button>
                        </>
                    )}
                </div>
                <button
                    className={styles.navButton}
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    aria-label="Next Page"
                >
                    <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
};
