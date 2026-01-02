import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import styles from './VendorDashboard.module.css';

const VendorDashboard = () => {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Vendor & Site Dashboard</h1>
                <Link to="/">
                    <Button variant="secondary">← Back to Dashboard</Button>
                </Link>
            </div>

            <div className={styles.content}>
                <iframe
                    src="https://code-arcade.github.io/qs/"
                    className={styles.frame}
                    title="Vendor Dashboard"
                />
            </div>
        </div>
    );
};

export default VendorDashboard;
