import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import styles from './WorkOrders.module.css';

const WorkOrders = () => {
    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1 className={styles.title}>Work Orders Repository</h1>
                <Link to="/">
                    <Button variant="secondary">← Back to Dashboard</Button>
                </Link>
            </div>

            <div className={styles.content}>
                <iframe
                    src="https://drive.google.com/embeddedfolderview?id=1jv0jUIV6Rx3Ah-j4Q-dIoj1j7pjMBi_y#list"
                    className={styles.frame}
                    title="Work Orders"
                />
            </div>
        </div>
    );
};

export default WorkOrders;
