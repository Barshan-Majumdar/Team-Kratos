import React from 'react';
import { Loader2 } from 'lucide-react';

const PageLoader = ({ text = "Loading..." }) => {
  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[400px]">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
      <p className="text-slate-500 font-medium animate-pulse">{text}</p>
    </div>
  );
};

export default PageLoader;
