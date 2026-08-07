import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';

import { Toaster, toast } from 'react-hot-toast';

if (typeof window !== 'undefined') {
  window.alert = (message) => {
    const text = String(message).toLowerCase();
    if (text.includes('error') || text.includes('fail') || text.includes('invalid') || text.includes('warning')) {
      toast.error(message);
    } else {
      toast.success(message);
    }
  };

  window.confirmDialog = (message) => {
    return new Promise((resolve) => {
      window.dispatchEvent(new CustomEvent('show-confirm', { detail: { message, resolve } }));
    });
  };
}

const GlobalConfirm = () => {
  const [dialog, setDialog] = React.useState(null);
  
  React.useEffect(() => {
    const handler = (e) => setDialog(e.detail);
    window.addEventListener('show-confirm', handler);
    return () => window.removeEventListener('show-confirm', handler);
  }, []);

  if (!dialog) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { dialog.resolve(false); setDialog(null); }} />
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-6 max-w-sm w-full relative z-10 flex flex-col text-center">
        <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center border border-rose-100 mb-4 mx-auto">
          <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-lg font-bold text-slate-900 font-display mb-2">Confirm Action</h3>
        <p className="text-sm text-slate-600 mb-6">{dialog.message}</p>
        <div className="flex items-center gap-3 w-full">
          <button onClick={() => { dialog.resolve(false); setDialog(null); }} className="flex-1 px-4 py-2.5 rounded-xl border-2 border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button onClick={() => { dialog.resolve(true); setDialog(null); }} className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white font-bold text-sm hover:bg-rose-700 transition-colors">
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <BrowserRouter>
      <GlobalConfirm />
      <Toaster position="bottom-right" />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
