import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import RegistrationFlow from '../components/RegistrationFlow';

function Register() {
  return (
    <div className="min-h-screen mesh-bg flex flex-col items-center justify-center p-4 md:p-8">
      
      {/* Brand Header */}
      <div className="absolute top-8 left-8 flex items-center gap-2">
        <Link to="/" replace>
          <img src="/Crew.png" alt="Crew HR Logo" className="h-10 w-auto object-contain drop-shadow-sm cursor-pointer" />
        </Link>
      </div>

      <div className="w-full max-w-[800px] flex justify-center mt-16">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }} className="w-full">
          <RegistrationFlow />
        </motion.div>
      </div>
    </div>
  );
}

export default Register;
