import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

import Navbar from './components/Navbar.jsx';
import BackgroundVideo from './components/BackgroundVideo.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';

import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import VerifyEmail from './pages/VerifyEmail.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Chatbot from './pages/Chatbot.jsx';
import ResumeMatch from './pages/ResumeMatch.jsx';
import AdminDashboard from './pages/AdminDashboard.jsx';
import ScheduleInterview from './pages/ScheduleInterview.jsx';
import AdminLiveMonitor from './pages/AdminLiveMonitor.jsx';
import QuestionBank from './pages/QuestionBank.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Interview from './pages/Interview.jsx';
import Report from './pages/Report.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  return (
    <>
      <BackgroundVideo />
      <Navbar />

      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route
            path="/chatbot"
            element={
              <ProtectedRoute>
                <Chatbot />
              </ProtectedRoute>
            }
          />

          <Route
            path="/resume-match"
            element={
              <ProtectedRoute>
                <ResumeMatch />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/schedule"
            element={
              <ProtectedRoute>
                <ScheduleInterview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-live"
            element={
              <ProtectedRoute>
                <AdminLiveMonitor />
              </ProtectedRoute>
            }
          />

          <Route
            path="/question-bank"
            element={
              <ProtectedRoute>
                <QuestionBank />
              </ProtectedRoute>
            }
          />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/interview"
            element={
              <ProtectedRoute>
                <Interview />
              </ProtectedRoute>
            }
          />

          <Route
            path="/report/:sessionId"
            element={
              <ProtectedRoute>
                <Report />
              </ProtectedRoute>
            }
          />

          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
        </Routes>
      </ErrorBoundary>
    </>
  );
}