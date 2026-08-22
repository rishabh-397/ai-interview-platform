import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import api from '../services/api';
import StrictProctor from './StrictProctor';

const isCodingCategory = (category) => category === 'DSA';

export default function QuestionPracticeModal({ questionId, onClose, onSolved }) {
  const [question, setQuestion] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [code, setCode] = useState('// Write your solution here\n');
  const [language, setLanguage] = useState('javascript');
  const [codeOutput, setCodeOutput] = useState(null);
  const [customInput, setCustomInput] = useState('');
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [aiHelp, setAiHelp] = useState(null);
  const [askingHelp, setAskingHelp] = useState(false);

  useEffect(() => {
    api.get(`/question-bank/${questionId}`)
      .then(({ data }) => setQuestion(data.question))
      .catch((err) => console.error(err));
  }, [questionId]);

  const handleRunCode = async () => {
    setRunning(true);
    setCodeOutput(null);
    setAiHelp(null);
    try {
      const { data } = await api.post('/code/run', { code, language, input: customInput });
      setCodeOutput(data);
    } catch (err) {
      setCodeOutput({ output: '', error: 'Failed to reach code execution service.', exitCode: -1 });
    } finally {
      setRunning(false);
    }
  };

  const handleAskAiForHelp = async () => {
    if (!codeOutput?.error) return;
    setAskingHelp(true);
    setAiHelp(null);
    try {
      const { data } = await api.post('/chatbot/message', {
        message: `I'm getting this error in my ${language} code:\n\nCode:\n${code}\n\nError:\n${codeOutput.error}\n\nWhat's wrong and how do I fix it? Be concise.`,
      });
      setAiHelp(data.reply);
    } catch (err) {
      setAiHelp('Could not reach the AI helper now.');
    } finally {
      setAskingHelp(false);
    }
  };

  const handleProctorViolation = (type) => {
    console.warn('Proctor violation:', type);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setAiResult(null);
    try {
      const { data } = await api.post(`/question-bank/${questionId}/answer`, {
        answerText: isCodingCategory(question.category) ? undefined : answerText,
        codeSubmission: isCodingCategory(question.category) ? code : undefined,
      });
      setAiResult(data.aiResult);
      if (data.autoSolved) onSolved?.(questionId);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!question) {
    return (
      <div style={overlayStyle}>
        <div style={modalStyle}>
          <p>Loading question...</p>
        </div>
      </div>
    );
  }

  const coding = isCodingCategory(question.category);

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{ ...modalStyle, maxWidth: coding ? 900 : 560 }}>
        <StrictProctor enabled={true} onViolation={handleProctorViolation} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <span className="category-tag">{question.category}</span>{' '}
            <span style={{ fontSize: 12, color: '#888', textTransform: 'capitalize' }}>{question.difficulty}</span>
            <h3 style={{ marginTop: 8 }}>{question.question_text}</h3>
          </div>
          <button onClick={onClose} style={{ background: '#333', padding: '4px 10px' }}>✕</button>
        </div>
        {coding ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginBottom: 8 }}>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                style={{ background: '#161922', color: '#e6e6e6', border: '1px solid #2c313d', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}
              >
                <option value="javascript">JavaScript</option>
                <option value="python">Python</option>
                <option value="java">Java</option>
                <option value="cpp">C++</option>
              </select>
              <button onClick={handleRunCode} disabled={running} style={{ fontSize: 13 }}>
                {running ? 'Running...' : '▶ Run Code'}
              </button>
            </div>
            <Editor
              height="240px"
              language={language}
              value={code}
              onChange={setCode}
              theme="vs-dark"
            />
            <label style={{ fontSize: 12, color: '#888', display: 'block', marginTop: 10, marginBottom: 4 }}>
              Custom Input (stdin) — optional, feed test input to your program here
            </label>
            <textarea
              placeholder="Type your answer here..."
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              rows={6}
              style={{ width: '100%', marginTop: 8 }}
            />
            {codeOutput && (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Output</label>
                <div style={{ background: '#0a0c10', border: '1px solid #262b36', padding: 10, borderRadius: 8, marginTop: 8, color: '#a5c5f5', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                  {codeOutput.output && <pre style={{ margin: 0, color: '#a5f5a5', whiteSpace: 'pre-wrap' }}>{codeOutput.output}</pre>}
                  {codeOutput.error && <pre style={{ margin: 0, color: '#f5a5a5', whiteSpace: 'pre-wrap' }}>{codeOutput.error}</pre>}
                  {!codeOutput.output && !codeOutput.error && <span style={{ color: '#888' }}>(no output)</span>}
                </div>
              </div>
            )}
            {codeOutput?.error && (
              <div style={{ marginTop: 8 }}>
                <button onClick={handleAskAiForHelp} disabled={askingHelp} style={{ fontSize: 13, background: '#3a5a8a' }}>
                  {askingHelp ? 'Asking AI...' : '🤖 Ask AI to help fix this error'}
                </button>
                {aiHelp && (
                  <div style={{ background: '#20283a', border: '1px solid #3a5a8a', padding: 10, borderRadius: 8, marginTop: 8, color: '#a5c5f5', fontSize: 13, whiteSpace: 'pre-wrap' }}>
                    {aiHelp}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <textarea
            placeholder="Type your answer here..."
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            rows={6}
            style={{ width: '100%', marginTop: 8 }}
          />
        )}
        <div style={{ marginTop: 12 }}>
          <strong>AI Score: {aiResult?.score}/100</strong>
          <p>{aiResult?.feedback}</p>
        </div>
        <div className="button-row">
          <button onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Evaluating...' : 'Submit Answer'}
          </button>
        </div>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 300,
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
};

const modalStyle = {
  background: '#161922', border: '1px solid #262b36', borderRadius: 12,
  padding: 24, width: '100%', maxHeight: '90vh', overflowY: 'auto',
};