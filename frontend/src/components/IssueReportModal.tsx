import React, { useState, useRef, useEffect } from 'react';

interface IssueReportModalProps {
  onSuccess?: () => void;
  onClose: () => void;
}

const OBFUSCATED = ['jmvegas21', 'gmail', 'com'];

const IssueReportModal: React.FC<IssueReportModalProps> = ({ onSuccess, onClose }) => {
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle'|'loading'|'success'|'error'>('idle');
  const [error, setError] = useState<string|null>(null);
  const [honeypot, setHoneypot] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const spamWords = ['viagra', 'casino', 'loan', 'bitcoin', 'crypto', 'porn', 'sex', 'escort', 'nude'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setStatus('loading');
    // Honeypot
    if (honeypot) {
      setError('Submission blocked.');
      setStatus('error');
      return;
    }
    // Spam filter
    const lower = (subject + ' ' + message).toLowerCase();
    if (spamWords.some(w => lower.includes(w))) {
      setError('Submission blocked by spam filter.');
      setStatus('error');
      return;
    }
    try {
      const res = await fetch('/.netlify/functions/send-issue-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, subject, message })
      });
      if (res.ok) {
        setStatus('success');
        setEmail('');
        setSubject('');
        setMessage('');
        if (onSuccess) onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to send.');
        setStatus('error');
      }
    } catch (err) {
      setError('Failed to send.');
      setStatus('error');
    }
  };

  // Close on background click
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black bg-opacity-60" style={{backdropFilter: 'blur(2px)'}} role="dialog" aria-modal="true">
      <form ref={formRef} onSubmit={handleSubmit} className="relative space-y-4 bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <button type="button" onClick={onClose} aria-label="Close" className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl font-bold focus:outline-none">&times;</button>
        <h2 className="text-xl font-semibold mb-2">Report an Issue or Suggestion</h2>
        <div className="hidden">
          <label htmlFor="website">Website</label>
          <input id="website" name="website" value={honeypot} onChange={e => setHoneypot(e.target.value)} tabIndex={-1} autoComplete="off" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Your Email (optional)</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="you@example.com (optional)"
            autoComplete="email"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Subject <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Bug, Feature Request, or Feedback"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Message <span className="text-red-500">*</span></label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={4}
            placeholder="Describe the issue, feature, or feedback..."
            required
          />
        </div>
        <div className="flex items-center space-x-4">
          <button
            type="submit"
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
            disabled={status === 'loading' || !subject || !message}
            aria-busy={status === 'loading'}
          >
            {status === 'loading' ? 'Sending...' : 'Send'}
          </button>
          {status === 'success' && <span className="text-green-600 text-sm">Thank you! Your report was sent.</span>}
          {status === 'error' && error && <span className="text-red-600 text-sm">{error}</span>}
        </div>
      </form>
    </div>
  );
};

export default IssueReportModal; 