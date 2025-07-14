import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';

export interface UserReport {
  id: string;
  title: string;
  description: string;
  location: string;
  category: string;
  created_at: string;
  upvotes: number;
  downvotes: number;
  status: 'active' | 'removed';
  expires_at?: string;
}

interface ReportContextType {
  reports: UserReport[];
  loading: boolean;
  error: string | null;
  fetchReports: () => Promise<void>;
  submitReport: (report: Omit<UserReport, 'id' | 'created_at' | 'upvotes' | 'downvotes' | 'status' | 'expires_at'>) => Promise<void>;
  upvoteReport: (id: string) => Promise<void>;
  downvoteReport: (id: string) => Promise<void>;
  clearAllReports: () => Promise<void>;
  loadingReportId: string | null;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export const useReports = () => {
  const context = useContext(ReportContext);
  if (!context) throw new Error('useReports must be used within a ReportProvider');
  return context;
};

export const ReportProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingReportId, setLoadingReportId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get('/api/reports');
      setReports(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to fetch reports');
      console.error('Fetch reports error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const submitReport = useCallback(async (report: Omit<UserReport, 'id' | 'created_at' | 'upvotes' | 'downvotes' | 'status' | 'expires_at'>) => {
    setLoading(true);
    setError(null);
    try {
      await axios.post('/api/reports', report);
      await fetchReports();
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to submit report');
      console.error('Submit report error:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchReports]);

  const upvoteReport = useCallback(async (id: string) => {
    setLoadingReportId(id);
    setError(null);
    // Optimistically update local state
    setReports(prev => prev.map(r => r.id === id ? { ...r, upvotes: r.upvotes + 1 } : r));
    try {
      const res = await axios.patch(`/api/reports/${id}/vote/upvote`);
      // If backend returns a different upvote count, sync it
      if (res.data && typeof res.data.upvotes === 'number') {
        setReports(prev => prev.map(r => r.id === id ? { 
          ...r, 
          upvotes: res.data.upvotes,
          expires_at: res.data.expires_at 
        } : r));
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to upvote report');
      // Revert optimistic update on error
      setReports(prev => prev.map(r => r.id === id ? { ...r, upvotes: r.upvotes - 1 } : r));
      console.error('Upvote report error:', err);
    } finally {
      setLoadingReportId(null);
    }
  }, []);

  const downvoteReport = useCallback(async (id: string) => {
    setLoadingReportId(id);
    setError(null);
    // Optimistically update local state
    setReports(prev => prev.map(r => r.id === id ? { ...r, downvotes: r.downvotes + 1 } : r));
    try {
      const res = await axios.patch(`/api/reports/${id}/vote/downvote`);
      // If backend says report was deleted, remove it
      if (res.data && res.data.deleted) {
        setReports(prev => prev.filter(r => r.id !== id));
      } else if (res.data && typeof res.data.downvotes === 'number') {
        setReports(prev => prev.map(r => r.id === id ? { ...r, downvotes: res.data.downvotes } : r));
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to downvote report');
      // Revert optimistic update on error
      setReports(prev => prev.map(r => r.id === id ? { ...r, downvotes: r.downvotes - 1 } : r));
      console.error('Downvote report error:', err);
    } finally {
      setLoadingReportId(null);
    }
  }, []);

  const clearAllReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      await axios.delete('/api/reports');
      setReports([]);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to clear reports');
      console.error('Clear reports error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <ReportContext.Provider value={{ 
      reports, 
      loading, 
      error, 
      fetchReports, 
      submitReport, 
      upvoteReport, 
      downvoteReport,
      clearAllReports,
      loadingReportId
    }}>
      {children}
    </ReportContext.Provider>
  );
}; 