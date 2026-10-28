import React, { Component, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Guard against transient network fetch errors when server wakes up or network pauses
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    const msg = event?.reason?.message || String(event?.reason || '');
    if (
      msg.includes('Failed to fetch') ||
      msg.includes('NetworkError') ||
      msg.includes('AbortError') ||
      msg.includes('Load failed')
    ) {
      event.preventDefault();
      console.warn('Recovered from transient fetch interruption:', msg);
    }
  });
}

interface ErrorBoundaryProps {
  children: any;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMsg: string;
}

class RootErrorBoundary extends (Component as any) {
  state: ErrorBoundaryState = { hasError: false, errorMsg: '' };

  constructor(props: ErrorBoundaryProps) {
    super(props);
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, errorMsg: error?.message || String(error) };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('App Root Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#f8fafc', color: '#1e293b', textAlign: 'center' }}>
          <div style={{ backgroundColor: '#ffffff', borderRadius: '24px', padding: '32px', maxWidth: '420px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💆‍♀️</div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '8px' }}>SabaiDee Massage</h2>
            <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>กำลังโหลดข้อมูลแพลตฟอร์ม กรุณารีเฟรชเพื่อเข้าสู่หน้าจอหลักค่ะ</p>
            <button
              onClick={() => {
                try { localStorage.clear(); } catch {}
                window.location.reload();
              }}
              style={{ backgroundColor: '#0ea5e9', color: '#ffffff', border: 'none', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer', width: '100%' }}
            >
              รีเฟรชเข้าสู่ระบบ
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </StrictMode>,
);
