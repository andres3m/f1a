import { useState } from 'react';
import LoaderCard from '../components/LoaderCard/LoaderCard';
import HistoryCard from '../components/HistoryCard/HistoryCard';

export default function Home() {
  const [question, setQuestion] = useState('');
  const [history, setHistory] = useState<{ question: string; response: string }[]>([]);
  const [loading, setLoading] = useState(false); // State to track loading

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); // Set loading to true when request is initiated

    try {
      const res = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });

      const data = await res.json();

      // Add the question and response to the history
      setHistory([{ question, response: data.response }, ...history]);
    } finally {
      setLoading(false); // Stop loading after response is received
    }

    // Clear the question input
    setQuestion('');
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Ask the LLM</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question"
          style={{ marginRight: '10px' }}
        />
        <button type="submit">Ask</button>
      </form>

      <LoaderCard loading={loading} />

      <HistoryCard history={history} />
      
    </div>
  );
}
