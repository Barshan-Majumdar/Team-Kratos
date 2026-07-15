import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';

const AuthReceiver = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    
    if (!token) {
      navigate('/');
      return;
    }

    // Verify token with backend
    const verifyToken = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
          const user = await res.json();
          localStorage.setItem('token', token);
          localStorage.setItem('user', JSON.stringify(user));
          // Strip token from URL and redirect to dashboard
          navigate('/dashboard', { replace: true });
        } else {
          console.error("Token verification failed");
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error("Network error during token verification:", err);
        navigate('/', { replace: true });
      }
    };

    verifyToken();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white p-8 rounded-3xl shadow-xl max-w-sm w-full text-center"
      >
        <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight mb-2">Setting up Workspace...</h2>
        <p className="text-slate-500 font-medium">Please wait while we log you into your new company dashboard.</p>
      </motion.div>
    </div>
  );
};

export default AuthReceiver;
