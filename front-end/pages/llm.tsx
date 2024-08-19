import { useState } from 'react';

export default function Home() {
  const [question, setQuestion] = useState('');
  const [response, setResponse] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const res = await fetch('/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ question }),
    });

    const data = await res.json();
    setResponse(data.response);
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
        />
        <button type="submit">Ask</button>
      </form>
      {response && (
        <div>
          <h2>Response:</h2>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}
