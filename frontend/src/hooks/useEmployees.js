import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Custom hook for fetching the employee directory.
 * @param {boolean} enabled - Whether to fetch (e.g., only if user is admin)
 * @returns {{ employees: Array, loading: boolean, error: string|null, refetch: Function }}
 */
export function useEmployees(enabled = true, targetDate = null) {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchEmployees = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const url = targetDate 
        ? `${API_BASE}/api/users?date=${targetDate}`
        : `${API_BASE}/api/users`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`Failed to fetch employees (${res.status})`);
      const data = await res.json();
      setEmployees(data);
    } catch (err) {
      console.error('useEmployees error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [enabled, targetDate]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return { employees, loading, error, refetch: fetchEmployees };
}
