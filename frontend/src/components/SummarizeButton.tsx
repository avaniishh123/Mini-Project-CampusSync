import React, { useState } from 'react';
import { summarizeAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';

// Icons
interface SummarizeIconProps {
  size?: number;
  className?: string;
}

const SummarizeIcon: React.FC<SummarizeIconProps> = ({ size = 18, className = '' }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    className={className}
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
    <polyline points="14 2 14 8 20 8"></polyline>
    <line x1="16" y1="13" x2="8" y2="13"></line>
    <line x1="16" y1="17" x2="8" y2="17"></line>
    <polyline points="10 9 9 9 8 9"></polyline>
  </svg>
);

interface SummarizeButtonProps {
  text: string;
  minLength?: number;
  onSummary?: (summary: string) => void;
  onShowSummary?: (show: boolean) => void;
  showSummary?: boolean;
  loading?: boolean;
  onLoading?: (loading: boolean) => void;
}

const SummarizeButton: React.FC<SummarizeButtonProps> = ({ text, minLength = 100, onSummary, onShowSummary, showSummary = false, loading: externalLoading, onLoading }) => {
  const auth = useAuth();
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if text is long enough to summarize (at least 20 words)
  const wordCount = text.trim().split(/\s+/).length;
  const isLongEnough = wordCount >= 20;

  const handleSummarize = async () => {
    if (!isLongEnough) {
      setError('Text must be at least 20 words long to summarize');
      return;
    }

    try {
      setLoading(true);
      if (onLoading) onLoading(true);
      setError(null);
      if (onShowSummary) onShowSummary(true);
      
      const token = auth.getToken();
      if (!token) {
        setError('Please login to use the summarize feature');
        setLoading(false);
        if (onLoading) onLoading(false);
        if (onShowSummary) onShowSummary(false);
        return;
      }

      // If we already have a summary, just toggle visibility
      if (summary && showSummary) {
        if (onShowSummary) onShowSummary(false);
        setLoading(false);
        if (onLoading) onLoading(false);
        return;
      }

      // If hiding summary, no need to fetch again
      if (summary && !showSummary) {
        if (onShowSummary) onShowSummary(true);
        setLoading(false);
        if (onLoading) onLoading(false);
        return;
      }

      const response = await summarizeAPI.summarizeText(token, text);
      if (response?.status === 'success' && response?.data?.summary) {
        setSummary(response.data.summary);
        if (onSummary) onSummary(response.data.summary);
        if (onShowSummary) onShowSummary(true);
      } else {
        throw new Error(response?.message || 'Failed to generate summary');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to summarize. Please try again later.');
      if (onShowSummary) onShowSummary(false);
    } finally {
      setLoading(false);
      if (onLoading) onLoading(false);
    }
  };

  return (
    <button 
      className={`flex items-center justify-center px-3 py-2 rounded-lg transition-colors flex-1 ${showSummary 
        ? 'bg-primary-50 text-primary-600 font-medium' 
        : 'text-gray-600 hover:bg-gray-50'}`}
      onClick={handleSummarize}
      disabled={loading || externalLoading}
      title={isLongEnough 
        ? showSummary 
          ? "Click to hide summary" 
          : "Summarize this post" 
        : "Post must be at least 20 words long to summarize"}
    >
      {(loading || externalLoading) ? (
        <div className="animate-spin h-4 w-4 border-2 border-primary-500 border-t-transparent rounded-full mr-2"></div>
      ) : (
        <SummarizeIcon 
          size={18} 
          className={`mr-2 transition-transform ${showSummary ? 'rotate-180' : ''}`} 
        />
      )}
      <span className="text-sm">
        {showSummary ? 'Hide Summary' : 'Summarize'}
      </span>
    </button>
  );
};

export default SummarizeButton;
