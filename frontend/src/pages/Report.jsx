import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import api from '../services/api';

export default function Report() {
  const { sessionId } = useParams();
  const [report, setReport] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [exporting, setExporting] = useState(false);
  const reportRef = useRef(null);

  useEffect(() => {
    api.get(`/interview/${sessionId}/report`)
      .then(({ data }) => setReport(data))
      .catch((err) => console.error(err));

    api.get('/dashboard/average-score')
      .then(({ data }) => setComparison(data))
      .catch((err) => console.error(err));
  }, [sessionId]);

  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(reportRef.current, { backgroundColor: '#0f1115', scale: 2 });
      const imgData = canvas.toDataURL('image/png');

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, imgHeight);
      pdf.save(`interview-report-${sessionId}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
    } finally {
      setExporting(false);
    }
  };

  if (!report) return <div className="page-container">Loading report...</div>;

  const { session, answers } = report;

  const radarData = [
    { subject: 'Communication', score: session.communication_score || 0 },
    { subject: 'Technical', score: session.technical_score || 0 },
    { subject: 'Confidence', score: session.confidence_score || 0 },
    { subject: 'Overall', score: session.overall_score || 0 },
  ];

  return (
    <div className="page-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Interview Report</h2>
        <button onClick={handleDownloadPdf} disabled={exporting}>
          {exporting ? 'Generating PDF...' : '⬇ Download PDF'}
        </button>
      </div>

      <div ref={reportRef} style={{ padding: 8 }}>
        <p>Overall Score: <strong>{session.overall_score ?? '-'}</strong> / 100</p>

        {comparison && comparison.averageScore && (
          <p style={{ color: '#888', marginBottom: 16 }}>
            Platform average: <strong>{comparison.averageScore}</strong>/100 (across {comparison.totalCompleted} completed interviews) —{' '}
            {parseFloat(session.overall_score) > parseFloat(comparison.averageScore) ? (
              <span style={{ color: '#34d399' }}>you're above average 🎉</span>
            ) : (
              <span style={{ color: '#fbbf24' }}>keep practicing to beat the average</span>
            )}
          </p>
        )}

        <div style={{ width: '100%', height: 300 }}>
          <ResponsiveContainer>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="subject" />
              <PolarRadiusAxis angle={30} domain={[0, 100]} />
              <Radar name="Score" dataKey="score" stroke="#5b8def" fill="#5b8def" fillOpacity={0.5} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <h3>Answer Breakdown</h3>
        {answers.map((a, idx) => (
          <div key={a.id} className="answer-card">
            <h4>Q{idx + 1}: {a.question_text}</h4>
            <p><strong>Your answer:</strong> {a.answer_text}</p>
            <p><strong>AI Feedback:</strong> {a.ai_feedback}</p>
            <p><strong>Score:</strong> {a.ai_score}/100</p>
          </div>
        ))}
      </div>
    </div>
  );
}