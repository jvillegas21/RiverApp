import React, { useState } from 'react';
import { useReports } from '../contexts/ReportContext';

interface ReportFormProps {
  onSuccess?: () => void;
}

const ReportForm: React.FC<ReportFormProps> = ({ onSuccess }) => {
  const { submitReport, loading, error } = useReports();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState('flood');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(false);
    if (!title || !description || !location || !category) return;
    
    await submitReport({ title, description, location, category });
    setTitle('');
    setDescription('');
    setLocation('');
    setCategory('flood');
    setSuccess(true);
    if (onSuccess) onSuccess();
  };

  return (
    <form className="bg-white rounded-lg shadow-md p-6 space-y-4" onSubmit={handleSubmit}>
      <h2 className="text-xl font-semibold mb-2">Submit a Flood or Hazard Report</h2>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Title <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Brief title for your report"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          required
        >
          <option value="flood">Flood</option>
          <option value="hazard">Hazard</option>
          <option value="weather">Weather</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Location <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={location}
          onChange={e => setLocation(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Street address, landmark, or area description"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Description <span className="text-red-500">*</span></label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={3}
          placeholder="Provide details about the situation..."
          required
        />
      </div>

      <div className="flex items-center space-x-4">
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          disabled={loading || !title || !description || !location || !category}
        >
          {loading ? 'Submitting...' : 'Submit Report'}
        </button>
        {success && <span className="text-green-600 text-sm">Report submitted!</span>}
        {error && <span className="text-red-600 text-sm">{error}</span>}
      </div>
    </form>
  );
};

export default ReportForm; 