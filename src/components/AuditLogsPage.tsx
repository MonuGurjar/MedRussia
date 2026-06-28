import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface AuditLog {
  _id: string;
  userId: string;
  action: string;
  details: any;
  ipAddress: string;
  timestamp: string;
}

export const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  
  const limit = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const authHeader = session?.access_token ? `Bearer ${session.access_token}` : '';

      const query = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });
      if (search) query.append('search', search);
      if (actionFilter) query.append('action', actionFilter);

      const res = await fetch(`/api/audit?${query.toString()}`, {
        headers: {
          'Authorization': authHeader
        }
      });
      const data = await res.json();
      if (res.ok) {
        setLogs(data.logs);
        setTotal(data.total);
      } else {
        alert(data.error);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Audit Logs</h2>
          <p className="text-slate-500 text-sm">System activity and security events.</p>
        </div>
        <button onClick={fetchLogs} className="px-4 py-2 bg-[#0f172a] text-white rounded-lg text-sm font-semibold hover:bg-slate-800 flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">refresh</span> Refresh
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 flex gap-4">
        <input 
          type="text" 
          placeholder="Search by User ID or Action..." 
          className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-indigo-500"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchLogs()}
        />
        <select 
          className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Actions</option>
          <option value="LOGIN">LOGIN</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="REGISTER">REGISTER</option>
          <option value="PROFILE_UPDATED">PROFILE_UPDATED</option>
          <option value="DOCUMENT_UPLOADED">DOCUMENT_UPLOADED</option>
          <option value="DOCUMENT_VERIFIED">DOCUMENT_VERIFIED</option>
        </select>
        <button onClick={() => { setPage(1); fetchLogs(); }} className="px-4 bg-indigo-50 text-indigo-700 rounded-lg font-semibold text-sm hover:bg-indigo-100">
          Search
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-500">Loading...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-semibold">Timestamp</th>
                  <th className="p-4 font-semibold">User ID</th>
                  <th className="p-4 font-semibold">Action</th>
                  <th className="p-4 font-semibold">IP Address</th>
                  <th className="p-4 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                {logs.map(log => (
                  <tr key={log._id} className="hover:bg-slate-50">
                    <td className="p-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                    <td className="p-4 font-medium text-slate-900">{log.userId}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded text-xs font-bold">{log.action}</span>
                    </td>
                    <td className="p-4 text-xs font-mono">{log.ipAddress}</td>
                    <td className="p-4">
                      <pre className="text-[10px] bg-slate-50 p-2 rounded max-w-xs overflow-x-auto text-slate-600 border border-slate-100">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </td>
                  </tr>
                ))}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-10 text-center text-slate-500">No logs found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button 
              disabled={page === 1} 
              onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-sm hover:bg-slate-200 disabled:opacity-50"
            >
              Previous
            </button>
            <button 
              disabled={page === totalPages} 
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-slate-100 text-slate-600 rounded text-sm hover:bg-slate-200 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
