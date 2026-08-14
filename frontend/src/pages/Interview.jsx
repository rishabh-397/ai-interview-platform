import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import io from 'socket.io-client';
import api from '../services/api';
import WebcamProctor from '../components/WebcamProctor.jsx';

export default function Interview() {
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerText, setAnswerText] = useState('');
  const [code, setCode] = useState('// Write your solution here\n');
  const [feedback, setFeedback] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [proctorWarning, setProctorWarning] = useState(null);
  const [proctorWarningCount, setProctorWarningCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [followUpQuestion, setFollowUpQuestion] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [language, setLanguage] = useState('javascript');
  const [codeOutput, setCodeOutput] = useState(null);
  const [customInput, setCustomInput] = useState('');
  const [running, setRunning] = useState(false);
  const [similarityWarning, setSimilarityWarning] = useState(null);
  const [speechPace, setSpeechPace] = useState(null);
  const recognitionRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const socketRef = useRef(null);
  const speechStartTimeRef = useRef(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const questionCount = Number(searchParams.get('count')) || 5;
  const companyIdParam = searchParams.get('companyId') || null;
  const persona = searchParams.get('persona') || 'friendly';

  useEffect(() => {
    const saved = localStorage.getItem('activeInterview');

    if (saved) {
      const parsed = JSON.parse(saved);
      setSession(parsed.session);
      setQuestions(parsed.questions);
      setCurrentIndex(parsed.currentIndex || 0);
      setAnswerText(parsed.answerText || '');
    } else {
      api.post('/interview/start', { companyId: companyIdParam, questionCount })
        .then(({ data }) => {
          setSession(data.session);
          setQuestions(data.questions);
        })
        .catch((err) => console.error(err));
    }

    const socket = io('/', {
      path: '/socket.io',
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    socket.on('connect', () => setConnectionStatus('connected'));
    socket.on('disconnect', () => setConnectionStatus('reconnecting'));
    socket.on('reconnect', () => {
      setConnectionStatus('connected');
      if (session) socket.emit('join-session', session.id);
    });
    socket.on('reconnect_attempt', () => setConnectionStatus('reconnecting'));

    return () => socket.disconnect();
  }, []);

  useEffect(() => {
    if (session && questions.length > 0) {
      localStorage.setItem('activeInterview', JSON.stringify({ session, questions, currentIndex, answerText }));
    }
  }, [session, questions, currentIndex, answerText]);

  useEffect(() => {
    if (session) socketRef.current?.emit('join-session', session.id);
  }, [session]);

  useEffect(() => {
    const issueProctorWarning = (message, eventType) => {
      if (!session) return;
      socketRef.current?.emit('proctor-event', {
        sessionId: session.id,
        eventType,
        details: { timestamp: new Date().toISOString() },
      });

      setProctorWarning(message);
      setProctorWarningCount((c) => {
        const next = c + 1;
        if (next >= 2) {
          // inform server and redirect
          (async () => {
            try {
              await api.post(`/interview/${session.id}/terminate`, { reason: 'repeated_proctor_violation' });
            } catch (e) {
              // continue even if server call fails
            }
            socketRef.current?.emit('proctor-event', {
              sessionId: session.id,
              eventType: 'interview_terminated',
              details: { reason: 'repeated_proctor_violation', timestamp: new Date().toISOString() },
            });
            setProctorWarning('Interview ended due to repeated security policy violations.');
            try { localStorage.removeItem('activeInterview'); } catch (e) {}
            try { socketRef.current?.disconnect(); } catch (e) {}
            navigate('/dashboard');
          })();
        }
        return next;
      });
    };

    const handleVisibilityChange = () => {
      if (document.hidden && session) {
        issueProctorWarning('Tab switch detected — please return to the interview (warning).', 'tab_switch');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [session, navigate]);

  useEffect(() => {
    if (session && document.fullscreenElement === null) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    }
  }, [session]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const inFullscreen = document.fullscreenElement !== null;
      setIsFullscreen(inFullscreen);
      if (!inFullscreen && session) {
        socketRef.current?.emit('proctor-event', {
          sessionId: session.id,
          eventType: 'fullscreen_exit',
          details: { timestamp: new Date().toISOString() },
        });
        setProctorWarning('You exited fullscreen — please return to fullscreen (warning).');
        setProctorWarningCount((c) => {
          const next = c + 1;
          if (next >= 2) {
            (async () => {
              try {
                await api.post(`/interview/${session.id}/terminate`, { reason: 'repeated_proctor_violation' });
              } catch (e) {}
              socketRef.current?.emit('proctor-event', {
                sessionId: session.id,
                eventType: 'interview_terminated',
                details: { reason: 'repeated_proctor_violation', timestamp: new Date().toISOString() },
              });
              setProctorWarning('Interview ended due to repeated security policy violations.');
              try { localStorage.removeItem('activeInterview'); } catch (e) {}
              try { socketRef.current?.disconnect(); } catch (e) {}
              navigate('/dashboard');
            })();
          }
          return next;
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [session]);

  const enterFullscreen = () => {
    document.documentElement.requestFullscreen?.();
  };

  const handleCodeChange = (value) => {
    setCode(value);
    socketRef.current?.emit('code-change', { sessionId: session?.id, code: value, language });
  };

  const handleRunCode = async () => {
    setRunning(true);
    setCodeOutput(null);
    try {
      const { data } = await api.post('/code/run', { code, language, input: customInput });
      setCodeOutput(data);
    } catch (err) {
      setCodeOutput({ output: '', error: 'Failed to reach code execution service.', exitCode: -1 });
    } finally {
      setRunning(false);
    }
  };

  const handleAnswerChange = (value) => {
    setAnswerText(value);
    socketRef.current?.emit('typing', { sessionId: session?.id, isTyping: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socketRef.current?.emit('typing', { sessionId: session?.id, isTyping: false });
    }, 1500);
  };

  const handleCodePaste = () => {
    socketRef.current?.emit('proctor-event', {
      sessionId: session?.id,
      eventType: 'copy_paste',
      details: { timestamp: new Date().toISOString() },
    });
    setProctorWarning('Paste detected in code editor — this has been logged.');
  };

  const handleEditorMount = (editor) => {
    editor.onDidPaste(() => handleCodePaste());
  };

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (currentQuestion && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(currentQuestion.question_text);
      utterance.rate = 0.95;
      window.speechSynthesis.speak(utterance);
    }
    return () => window.speechSynthesis?.cancel();
  }, [currentQuestion]);

  const startVoiceAnswer = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setProctorWarning('Voice answering is not supported in this browser — try Chrome or Edge.');
      return;
    }

    setSpeechPace(null);
    speechStartTimeRef.current = Date.now();

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setAnswerText(transcript);
    };

    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopVoiceAnswer = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);

    if (speechStartTimeRef.current) {
      const elapsedMinutes = (Date.now() - speechStartTimeRef.current) / 60000;
      const wordCount = answerText.trim().split(/\s+/).filter(Boolean).length;
      if (elapsedMinutes > 0.05 && wordCount > 0) {
        const wpm = Math.round(wordCount / elapsedMinutes);
        setSpeechPace(wpm);
      }
      speechStartTimeRef.current = null;
    }
  };

  const handleSubmitAnswer = async () => {
    if (!currentQuestion) return;
    setSubmitting(true);
    try {
      const { data } = await api.post('/interview/answer', {
        sessionId: session.id,
        questionId: currentQuestion.id,
        answerText,
        codeSubmission: code,
        questionText: currentQuestion.question_text,
        expectedKeywords: currentQuestion.expected_keywords,
        persona,
      });
      setFeedback(data.aiResult);
      setFollowUpQuestion(data.followUpQuestion || null);
      if (data.similarity?.flagged) {
        setSimilarityWarning(`Your code is ${Math.round(data.similarity.maxSimilarity * 100)}% similar to another submission for this question.`);
      } else {
        setSimilarityWarning(null);
      }

      if (currentIndex + 1 < questions.length) {
        try {
          const usedIds = questions.map((q) => q.id);
          const { data: adaptiveData } = await api.post('/interview/adaptive-next', {
            category: currentQuestion.category,
            currentScore: data.aiResult.score,
            excludeIds: usedIds,
          });
          if (adaptiveData.question) {
            setQuestions((prev) => {
              const updated = [...prev];
              updated[currentIndex + 1] = adaptiveData.question;
              return updated;
            });
          }
        } catch (adaptiveErr) {
          console.error('Adaptive difficulty swap failed (non-critical):', adaptiveErr);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    setAnswerText('');
    setFeedback(null);
    setFollowUpQuestion(null);
    setSpeechPace(null);
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const { data } = await api.post(`/interview/${session.id}/complete`);
      localStorage.removeItem('activeInterview');
      navigate(`/report/${session.id}`, { state: data });
    }
  };

  if (!session || !currentQuestion) return <div className="page-container">Loading interview...</div>;

  return (
    <div className="page-container interview-layout">
      {session && !isFullscreen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', padding: 20 }}>
          <div style={{ maxWidth: 680, textAlign: 'center' }}>
            <h2 style={{ marginTop: 0 }}>Security check — Fullscreen required</h2>
            <p style={{ color: '#ddd' }}>For strict proctoring, this interview requires fullscreen mode. Please enter fullscreen to continue.</p>
            <div style={{ marginTop: 18, display: 'flex', gap: 12, justifyContent: 'center' }}>
              <button onClick={() => { enterFullscreen(); }} style={{ padding: '10px 18px', fontSize: 16 }}>Enter Fullscreen</button>
              <button onClick={() => { setProctorWarning('You must enter fullscreen to continue this interview.'); }} style={{ padding: '10px 18px', fontSize: 16, background: '#444' }}>Why?</button>
            </div>
            <p style={{ marginTop: 12, fontSize: 13, color: '#bbb' }}>If you exit fullscreen during the interview, you will receive warnings — after two warnings the interview will be terminated.</p>
          </div>
        </div>
      )}
      {connectionStatus === 'reconnecting' && (
        <div style={{ position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', background: '#3a3020', border: '1px solid #a88', padding: '6px 16px', borderRadius: 8, color: '#f5d5a5', zIndex: 100 }}>
          Reconnecting... your progress is saved.
        </div>
      )}
      {!isFullscreen && (
        <div style={{ marginBottom: 12 }}>
          <button onClick={enterFullscreen} style={{ background: '#333', fontSize: 13 }}>⛶ Enter Fullscreen (recommended)</button>
        </div>
      )}
      <div className="question-panel">
        <h3>Question {currentIndex + 1} of {questions.length}</h3>
        <p className="category-tag">{currentQuestion.category}</p>
        <p>{currentQuestion.question_text}</p>

        <div style={{ marginBottom: 8 }}>
          <button
            onClick={isRecording ? stopVoiceAnswer : startVoiceAnswer}
            style={{ background: isRecording ? '#a33' : '#333', fontSize: 13 }}
          >
            {isRecording ? '⏹ Stop Recording' : '🎤 Answer by Voice'}
          </button>
        </div>

        <textarea
          placeholder="Type your verbal/written answer here, or use the voice button above..."
          value={answerText}
          onChange={(e) => handleAnswerChange(e.target.value)}
          rows={6}
        />

        {speechPace && (
          <p style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            🗣 Speaking pace: <strong>{speechPace} words/min</strong>{' '}
            {speechPace < 110 ? '(a bit slow — aim for 110-150 wpm)' : speechPace > 160 ? '(a bit fast — slow down slightly)' : '(good pace)'}
          </p>
        )}

        {feedback && (
          <div className="feedback-box">
            <strong>AI Score: {feedback.score}/100</strong>
            <p>{feedback.feedback}</p>
            <p style={{ fontSize: 12, color: '#888', marginTop: 6 }}>
              Filler words: {feedback.filler_word_count ?? 0} · Tone: <span style={{ textTransform: 'capitalize' }}>{feedback.sentiment || 'neutral'}</span>
            </p>
          </div>
        )}

        {followUpQuestion && (
          <div style={{ background: '#20283a', border: '1px solid #3a5a8a', padding: 10, borderRadius: 8, marginTop: 10, color: '#a5c5f5' }}>
            💬 Follow-up (optional, for extra practice): {followUpQuestion}
          </div>
        )}

        {similarityWarning && (
          <div style={{ background: '#3a2a10', border: '1px solid #a86a2a', padding: 10, borderRadius: 8, marginTop: 10, color: '#f5c085' }}>
            🔍 {similarityWarning}
          </div>
        )}

        {proctorWarning && (
          <div style={{ background: '#3a2020', border: '1px solid #a33', padding: 10, borderRadius: 8, marginTop: 10, color: '#f5a5a5' }}>
            ⚠ {proctorWarning}
          </div>
        )}

        <div className="button-row">
          {!feedback ? (
            <button onClick={handleSubmitAnswer} disabled={submitting}>
              {submitting ? 'Evaluating...' : 'Submit Answer'}
            </button>
          ) : (
            <button onClick={handleNext}>
              {currentIndex + 1 < questions.length ? 'Next Question' : 'Finish Interview'}
            </button>
          )}
        </div>
      </div>

      <div className="code-panel">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <h4 style={{ margin: 0 }}>Live Code Editor</h4>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              style={{ background: '#161922', color: '#e6e6e6', border: '1px solid #2c313d', borderRadius: 6, padding: '4px 8px', fontSize: 13 }}
            >
              <option value="javascript">JavaScript</option>
              <option value="python">Python</option>
              <option value="java">Java</option>
              <option value="cpp">C++</option>
              <option value="c">C</option>
            </select>
            <button onClick={handleRunCode} disabled={running} style={{ fontSize: 13 }}>
              {running ? 'Running...' : '▶ Run Code'}
            </button>
          </div>
        </div>
        <Editor
          height="280px"
          language={language}
          value={code}
          onChange={handleCodeChange}
          onMount={handleEditorMount}
          theme="vs-dark"
        />
        <label style={{ fontSize: 12, color: '#888', display: 'block', marginTop: 10, marginBottom: 4 }}>
          Custom Input (stdin) — optional
        </label>
        <textarea
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          rows={2}
          placeholder="e.g. 5&#10;1 2 3 4 5"
          style={{ width: '100%', fontFamily: 'monospace', fontSize: 13 }}
        />
        {codeOutput && (
          <div style={{ background: '#0a0c10', border: '1px solid #262b36', borderRadius: 8, padding: 10, marginTop: 8, fontFamily: 'monospace', fontSize: 13, maxHeight: 150, overflowY: 'auto' }}>
            {codeOutput.output && <pre style={{ margin: 0, color: '#a5f5a5', whiteSpace: 'pre-wrap' }}>{codeOutput.output}</pre>}
            {codeOutput.error && <pre style={{ margin: 0, color: '#f5a5a5', whiteSpace: 'pre-wrap' }}>{codeOutput.error}</pre>}
            {!codeOutput.output && !codeOutput.error && <span style={{ color: '#888' }}>(no output)</span>}
          </div>
        )}
      </div>

      <WebcamProctor
        socketRef={socketRef}
        sessionId={session.id}
        onWarning={setProctorWarning}
      />
    </div>
  );
}