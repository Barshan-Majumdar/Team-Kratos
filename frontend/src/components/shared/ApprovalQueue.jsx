import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';

const ApprovalQueue = ({ 
  title, 
  description, 
  fetchFn, 
  onApprove, 
  onReject, 
  columns, 
  renderRow,
  renderMobileCard
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchFn();
      setItems(Array.isArray(data) ? data.filter(d => d.status === 'Pending') : []);
    } catch (e) {
      console.error('Failed to fetch approval queue:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (id, action) => {
    try {
      if (action === 'Approve') {
        await onApprove(id);
      } else {
        await onReject(id);
      }
      await loadData();
    } catch (err) {
      console.error(err);
      alert(err.message || "Failed to process request");
    }
  };

  return (
    <div className="p-4 md:p-8 lg:p-12 h-full flex flex-col">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-slate-800 tracking-tight">{title}</h1>
        <p className="text-slate-500 mt-2">{description}</p>
      </div>

      <Card className="p-6 shadow-sm border-slate-100 flex-1 overflow-hidden flex flex-col">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-900 shrink-0">
          Pending Requests ({items.length})
        </h3>
        
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto flex-1 custom-scrollbar">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-slate-200">
                {columns.map((col, i) => (
                  <th key={i} className={`pb-3 text-sm font-bold text-slate-400 ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}>
                    {col.label}
                  </th>
                ))}
                <th className="pb-3 text-sm font-bold text-slate-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={columns.length + 1} className="py-8 text-center text-slate-500">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan={columns.length + 1} className="py-8 text-center text-slate-500">No pending requests right now! 🎉</td></tr>
              ) : (
                items.map(item => (
                  <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    {renderRow(item)}
                    <td className="py-4 text-right space-x-2 whitespace-nowrap">
                      <button 
                        onClick={() => handleAction(item.id, 'Approve')}
                        className="text-xs font-bold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg transition-colors border border-emerald-200 shadow-sm"
                      >
                        Approve
                      </button>
                      <button 
                        onClick={() => handleAction(item.id, 'Reject')}
                        className="text-xs font-bold text-red-700 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors border border-red-200 shadow-sm"
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View */}
        <div className="md:hidden flex flex-col gap-4 flex-1 overflow-y-auto pb-4 custom-scrollbar">
          {loading ? (
             <div className="py-8 text-center text-slate-500">Loading...</div>
          ) : items.length === 0 ? (
             <div className="py-8 text-center text-slate-500">No pending requests right now! 🎉</div>
          ) : (
             items.map(item => renderMobileCard(item, (action) => handleAction(item.id, action)))
          )}
        </div>
      </Card>
    </div>
  );
};

export default ApprovalQueue;
