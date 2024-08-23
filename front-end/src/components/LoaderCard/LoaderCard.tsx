import React from 'react';
import styles from './loaderCard.module.css';

interface LoaderCardProps {
  loading: boolean;
}

const LoaderCard: React.FC<LoaderCardProps> = ({ loading }) => {
  if (!loading) return null;

  return (
    <div className={styles.loaderContainer}>
      <div className={styles.loaderCard}>
        <span className={styles.loader}></span>
      </div>
    </div>
  );
};

export default LoaderCard;
