import React, { useEffect, useState } from 'react';
import api from '../services/api';
import CompanyLogo from '../components/CompanyLogo.jsx';
import QuestionPracticeModal from '../components/QuestionPracticeModal.jsx';

export default function QuestionBank() {
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [progress, setProgress] = useState({ total: 0, solved: 0 });
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeQuestionId, setActiveQuestionId] = useState(null);

  const [search, setSearch] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [category, setCategory] = useState('');
  const [difficulty, setDifficulty] = useState('');

  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const loadQuestions = () => {
    setLoading(true);
    const params = new URLSearchParams({ page, pageSize });
    if (search) params.append('search', search);
    if (companyId) params.append('companyId', companyId);
    if (category) params.append('category', category);
    if (difficulty) params.append('difficulty', difficulty);

    api.get(`/question-bank?${params.toString()}`)
      .then(({ data }) => {
        setQuestions(data.questions);
        setTotal(data.total);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  };

  const loadProgress = () => {
    api.get('/question-bank/progress')
      .then(({ data }) => setProgress(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    api.get('/companies').then(({ data }) => setCompanies(data.companies)).catch((err) => console.error(err));
    loadProgress();
  }, []);

  useEffect(() => {
    loadQuestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, companyId, category, difficulty]);

  const handleToggleSolved = async (questionId) => {
    try {
      await api.post(`/question-bank/${questionId}/toggle-solved`);
      setQuestions((prev) => prev.map((q) => (q.id === questionId ? { ...q, solved: !q.solved } : q)));
      loadProgress();
    } catch (err) {
      console.error(err);
    }
  };

  const progressPercent = progress.total > 0 ? Math.round((progress.solved / progress.total) * 100) : 0;

  return (
    <div className="page-container" style={{ maxWidth: 1100 }}>
      <h2>Question Bank</h2>
      <p style={{ color: '#888', marginBottom: 16 }}>
        {total} questions{companies.length ? ` · ${companies.length} companies` : ''}
      </p>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 6 }}>
          <span>{progressPercent}% solved</span>
          <span>{progress.solved} / {progress.total}</span>
        </div>
        <div style={{ background: '#262b36', borderRadius: 8, height: 8, overflow: 'hidden' }}>
          <div style={{ width: `${progressPercent}%`, background: 'var(--accent)', height: '100%' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Search questions..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: '1 1 200px', padding: 8, borderRadius: 6, background: '#161922', border: '1px solid #2c313d', color: '#e6e6e6' }}
        />
        <select value={companyId} onChange={(e) => { setCompanyId(e.target.value); setPage(1); }} style={{ background: '#161922', color: '#e6e6e6', border: '1px solid #2c313d', borderRadius: 6, padding: 8 }}>
          <option value="">All Companies</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} style={{ background: '#161922', color: '#e6e6e6', border: '1px solid #2c313d', borderRadius: 6, padding: 8 }}>
          <option value="">All Categories</option>
          <option value="DSA">DSA</option>
          <option value="System Design">System Design</option>
          <option value="Behavioural">Behavioural</option>
          <option value="HR">HR</option>
        </select>
        <select value={difficulty} onChange={(e) => { setDifficulty(e.target.value); setPage(1); }} style={{ background: '#161922', color: '#e6e6e6', border: '1px solid #2c313d', borderRadius: 6, padding: 8 }}>
          <option value="">All Levels</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : questions.length === 0 ? (
        <p>No questions match your filters.</p>
      ) : (
        <table className="history-table">
          <thead>
            <tr><th>Company</th><th>Question</th><th>Category</th><th>Difficulty</th><th>Solved</th></tr>
          </thead>
          <tbody>
            {questions.map((q) => (
              <tr key={q.id} onClick={() => setActiveQuestionId(q.id)} style={{ cursor: 'pointer' }}>
                <td style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CompanyLogo name={q.company_name} logoUrl={q.company_logo} size={20} />
                  {q.company_name || 'General'}
                </td>
                <td style={{ maxWidth: 320 }}>{q.question_text}</td>
                <td><span className="category-tag">{q.category}</span></td>
                <td style={{ textTransform: 'capitalize' }}>{q.difficulty}</td>
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={q.solved} onChange={() => handleToggleSolved(q.id)} style={{ width: 18, height: 18, cursor: 'pointer' }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16, alignItems: 'center' }}>
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>Prev</button>
          <span style={{ fontSize: 14, color: '#888' }}>Page {page} of {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>Next</button>
        </div>
      )}

      {activeQuestionId && (
        <QuestionPracticeModal
          questionId={activeQuestionId}
          onClose={() => setActiveQuestionId(null)}
          onSolved={(id) => {
            setQuestions((prev) => prev.map((q) => (q.id === id ? { ...q, solved: true } : q)));
            loadProgress();
          }}
        />
      )}
    </div>
  );
}