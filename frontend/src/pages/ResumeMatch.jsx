import React, { useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import api from '../services/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

export default function ResumeMatch() {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [extracting, setExtracting] = useState(false);
  const fileInputRef = React.useRef(null);

  const extractPdfText = async (file) => {
    setExtracting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item) => item.str).join(' ');
        fullText += pageText + '\n';
      }

      setResumeText(fullText.trim());
    } catch (err) {
      console.error('PDF extraction error:', err);
      setResumeText('');
    } finally {
      setExtracting(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);

    if (file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => setResumeText(event.target.result);
      reader.readAsText(file);
    } else if (file.type === 'application/pdf') {
      extractPdfText(file);
    } else {
      setResumeText('');
      alert('Unsupported file type — please upload a .txt or .pdf file, or paste your resume text directly.');
    }
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (event) => setResumeText(event.target.result);
        reader.readAsText(file);
      } else if (file.type === 'application/pdf') {
        extractPdfText(file);
      } else {
        alert('Unsupported file type — please upload .txt or .pdf');
      }
    }
  };

  const onDragOver = (e) => e.preventDefault();

  const triggerFileBrowse = () => fileInputRef.current && fileInputRef.current.click();

  const handleAnalyze = async () => {
    if (!resumeText.trim() || !jobDescription.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/resume/match', { resumeText, jobDescription });
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <h2>Resume ↔ Job Description Match</h2>
      <p style={{ color: '#888', marginBottom: 20 }}>
        Paste your resume text and a job description to see your match score, missing skills, and a personalized study plan.
      </p>

      <div className="resume-grid" style={{ gap: 20 }}>
        <div className="resume-panel">
          <label style={{ display: 'block', marginBottom: 8 }}>Resume text</label>

          <div
            className="dropzone"
            onDrop={onDrop}
            onDragOver={onDragOver}
            onClick={triggerFileBrowse}
            role="button"
            tabIndex={0}
            style={{ marginBottom: 10 }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.pdf"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <div className="dropzone-inner">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 16V13a4 4 0 00-4-4H8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 3v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <div style={{ marginLeft: 12 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>Drag & drop your resume here</div>
                <div style={{ fontSize: 13, color: '#94A3B8' }}>or click to browse (.pdf, .docx, .txt)</div>
              </div>
            </div>
          </div>

          {fileName && <p style={{ fontSize: 12, color: '#94A3B8' }}>Loaded: {fileName}</p>}
          {extracting && <p style={{ fontSize: 12, color: 'var(--accent)' }}>Extracting text from PDF...</p>}

          <textarea
            className="custom-textarea"
            rows={14}
            placeholder="Paste your resume text here (or drop a file above)..."
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            style={{ width: '100%', marginBottom: 16 }}
          />
        </div>

        <div className="job-panel">
          <label style={{ display: 'block', marginBottom: 8 }}>Job description</label>
          <textarea
            className="custom-textarea"
            rows={20}
            placeholder="Paste the job description here..."
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            style={{ width: '100%', marginBottom: 16 }}
          />
        </div>
      </div>

      <div style={{ marginTop: 8 }}>
        <button className="primary-action" onClick={handleAnalyze} disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Analyzing...' : 'Analyze Match'}
        </button>
      </div>

      {result && (
        <div style={{ marginTop: 24 }}>
          <div className="stat-card" style={{ display: 'inline-block', marginBottom: 20 }}>
            <span>{result.match_score}%</span>
            <label>Match Score</label>
          </div>

          <h3>Missing Skills / Keywords</h3>
          {result.missing_skills.length === 0 ? (
            <p>No major gaps found — good coverage!</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
              {result.missing_skills.map((skill) => (
                <span key={skill} className="category-tag">{skill}</span>
              ))}
            </div>
          )}

          <h3>Personalized Study Plan</h3>
          {result.study_plan.map((item) => (
            <div key={item.skill} className="answer-card">
              <strong>{item.skill}</strong>
              <p>{item.suggestion}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}