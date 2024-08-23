import React from 'react';
import styles from './historyCard.module.css';

type HistoryEntry = {
  question: string;
  response: string;
};

type HistoryCardProps = {
  history: HistoryEntry[];
};

const HistoryCard: React.FC<HistoryCardProps> = ({ history }) => {
  return (
    <div className={styles.historyContainer}>
      {history.map((entry, index) => (
        <div key={index} className={styles.card}>
          <h3 className={styles.title}>Question:</h3>
          <p>{entry.question}</p>
          <h3 className={styles.title}>Response:</h3>
          <p>{entry.response}</p>
        </div>
      ))}
    </div>
  );
};

export default HistoryCard;
