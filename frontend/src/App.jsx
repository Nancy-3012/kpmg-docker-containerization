import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function App() {
  const [tasks, setTasks] = useState([]);
  const [name, setName] = useState('');

  const fetchTasks = () => {
    fetch(`${API_URL}/api/tasks`).then(r => r.json()).then(setTasks).catch(console.error);
  };

  useEffect(() => { fetchTasks(); }, []);

  const addTask = async (e) => {
    e.preventDefault();
    if (!name) return;
    await fetch(`${API_URL}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setName('');
    fetchTasks();
  };

  return (
    <div style={{ fontFamily: 'sans-serif', padding: 20 }}>
      <h1>Task Manager (KPMG Docker Task)</h1>
      <form onSubmit={addTask}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Task name" />
        <button type="submit">Add</button>
      </form>
      <ul>
        {tasks.map(t => <li key={t.id}>{t.name} — {t.status}</li>)}
      </ul>
    </div>
  );
}

export default App;
