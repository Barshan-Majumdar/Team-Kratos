import React from 'react';
import { ShieldAlert, BookOpen, Clock, Activity, AlertTriangle, FileText, CheckCircle, Info, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function IrisInvestigation({ report, onClose }) {
  if (!report || !report.resultJSON) return null;

  const { resultJSON: data } = report;

  return (
    <div className="fixed inset-0 z-[60] bg-[#1F2B4D]/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="text-indigo-400" size={20} />
              <h2 className="text-lg font-bold font-serif">Iris Investigation Report</h2>
            </div>
            <p className="text-slate-400 text-xs font-mono">
              Fingerprint: {report.dataFingerprint?.substring(0, 12)}... | Generated: {new Date(report.generatedAt).toLocaleString()}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50">
          
          {report.generationStatus === 'STALE' && (
            <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-xl shadow-sm">
              <div className="flex">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-bold text-amber-800">
                    Warning: Underlying data has changed
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    The evidence (attendance records, policies, etc.) has been updated since this report was generated. Please click "Regenerate AI" to get an up-to-date analysis.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-2">
              <Activity size={16} className={report.generationStatus === 'STALE' ? "text-amber-500" : "text-emerald-500"} />
              <span className="text-sm font-bold text-slate-700">Status: {report.generationStatus}</span>
            </div>
            {data.humanReviewRequired && (
              <span className="bg-rose-100 text-rose-800 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 border border-rose-200">
                <AlertTriangle size={12} /> HR Review Required
              </span>
            )}
          </div>

          {/* What Happened */}
          <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-3 text-sm">
              <FileText size={16} className="text-indigo-500" /> Executive Summary
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">{data.whatHappened}</p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Evidence */}
            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4 text-sm">
                <CheckCircle size={16} className="text-emerald-500" /> Authoritative Evidence
              </h3>
              <ul className="space-y-4">
                {data.evidence?.map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-sm border-l-2 border-emerald-200 pl-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-700">{item.statement}</span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded">{item.sourceType}</span>
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Policy Findings */}
            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-4 text-sm">
                <BookOpen size={16} className="text-blue-500" /> Policy Findings
              </h3>
              <ul className="space-y-4">
                {data.policyFindings?.map((item, idx) => (
                  <li key={idx} className="flex flex-col gap-1.5 text-sm bg-blue-50/50 p-3 rounded-lg border border-blue-100">
                    <div className="flex justify-between items-start">
                      <span className="font-bold text-slate-800">{item.policy} <span className="text-slate-500 font-normal text-xs">(Sec {item.section})</span></span>
                      <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${
                        item.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' :
                        item.confidence === 'medium' ? 'bg-amber-100 text-amber-700' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {item.confidence}
                      </span>
                    </div>
                    <p className="text-slate-600 text-xs">{item.finding}</p>
                  </li>
                ))}
                {(!data.policyFindings || data.policyFindings.length === 0) && (
                  <p className="text-xs text-slate-500 italic">No explicit policy violations found in the provided context.</p>
                )}
              </ul>
            </section>
          </div>

          {/* Assessment */}
          <section className="bg-indigo-50/50 p-5 rounded-xl border border-indigo-100 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="flex items-center gap-2 font-bold text-indigo-900 text-sm">
                <Info size={16} className="text-indigo-500" /> AI Assessment
              </h3>
              <span className="text-[10px] font-bold text-indigo-600 uppercase bg-indigo-100 px-2 py-0.5 rounded-full">
                Confidence: {data.assessmentConfidence}
              </span>
            </div>
            <p className="text-sm text-indigo-800 leading-relaxed">{data.assessment}</p>
          </section>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Limitations */}
            <section className="bg-amber-50/50 p-5 rounded-xl border border-amber-100 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold text-amber-900 mb-3 text-sm">
                <AlertTriangle size={16} className="text-amber-500" /> Limitations & Unknowns
              </h3>
              <ul className="list-disc list-inside space-y-1">
                {data.limitations?.map((item, idx) => (
                  <li key={idx} className="text-xs text-amber-800 leading-relaxed">{item}</li>
                ))}
              </ul>
            </section>

            {/* Next Steps */}
            <section className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-3 text-sm">
                <Clock size={16} className="text-slate-500" /> Recommended Action
              </h3>
              <p className="text-sm font-medium text-slate-700 leading-relaxed">{data.recommendedNextStep}</p>
            </section>
          </div>

        </div>
      </motion.div>
    </div>
  );
}
