import React, { useState } from 'react';
import sentimentService from '../services/sentimentService';
import { SmileyIcon, CloseIcon } from '../utils/materialIcons';

interface SentimentAnalysisProps {
  text: string;
}

interface SentimentResult {
  score: number;
  label: 'Likely Negative' | 'Likely Neutral' | 'Likely Positive';
  sentiment: 'Positive' | 'Negative' | 'Neutral';
  emotionalIntensity: number;
  detectedEmotions: Array<{name: string, percentage: number}>;
}

const SentimentAnalysis: React.FC<SentimentAnalysisProps> = ({ text }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [sentimentResult, setSentimentResult] = useState<SentimentResult | null>(null);
  const [apiError, setApiError] = useState(false);

  const handleAnalyzeClick = async () => {
    if (showResults) {
      setShowResults(false);
      return;
    }
    
    setIsAnalyzing(true);
    setApiError(false);
    
    // Set a timeout to prevent infinite analyzing state
    const timeoutId = setTimeout(() => {
      console.log('Sentiment analysis timed out');
      setApiError(true);
      setSentimentResult({
        score: 50,
        label: 'Likely Neutral',
        sentiment: 'Neutral',
        emotionalIntensity: 3,
        detectedEmotions: []
      });
      setShowResults(true);
      setIsAnalyzing(false);
    }, 5000); // 5 second timeout
    
    try {
      // Force the UI to update before starting analysis
      await new Promise(resolve => setTimeout(resolve, 50));
      
      const result = await sentimentService.analyzeSentiment(text);
      clearTimeout(timeoutId); // Clear the timeout if analysis completes successfully
      setSentimentResult(result);
      setShowResults(true);
    } catch (error) {
      console.error('Error in sentiment analysis:', error);
      clearTimeout(timeoutId); // Clear the timeout if there's an error
      setApiError(true);
      // Create fallback result for API error
      setSentimentResult({
        score: 50,
        label: 'Likely Neutral',
        sentiment: 'Neutral',
        emotionalIntensity: 3,
        detectedEmotions: []
      });
      setShowResults(true);
    } finally {
      clearTimeout(timeoutId); // Ensure timeout is cleared
      setIsAnalyzing(false);
    }
  };

  // Get color based on sentiment
  const getSentimentColor = () => {
    if (!sentimentResult) return '';
    if (sentimentResult.sentiment === 'Positive') return 'text-green-500';
    if (sentimentResult.sentiment === 'Negative') return 'text-red-500';
    return 'text-blue-500'; // Neutral is blue
  };

  const getSentimentBarColor = () => {
    if (!sentimentResult) return '';
    if (sentimentResult.sentiment === 'Positive') return 'bg-green-500';
    if (sentimentResult.sentiment === 'Negative') return 'bg-red-500';
    return 'bg-blue-500'; // Neutral is blue
  };

  const getEmotionBadgeColor = (emotion: string) => {
    if (emotion.toLowerCase().includes('happiness') || 
        emotion.toLowerCase().includes('joy')) {
      return 'bg-yellow-100 text-yellow-800';
    }
    if (emotion.toLowerCase().includes('sadness') || 
        emotion.toLowerCase().includes('sad')) {
      return 'bg-blue-100 text-blue-800';
    }
    if (emotion.toLowerCase().includes('anger') || 
        emotion.toLowerCase().includes('angry')) {
      return 'bg-red-100 text-red-800';
    }
    if (emotion.toLowerCase().includes('fear')) {
      return 'bg-purple-100 text-purple-800';
    }
    if (emotion.toLowerCase().includes('surprise')) {
      return 'bg-pink-100 text-pink-800';
    }
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="inline-block">
      <button
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-50 p-2 rounded-lg transition-colors"
        onClick={handleAnalyzeClick}
        title="Analyze sentiment"
        disabled={isAnalyzing}
      >
        <SmileyIcon size={20} className={`${showResults && sentimentResult ? 
          (sentimentResult.sentiment === 'Positive' ? 'text-green-500' : 
           sentimentResult.sentiment === 'Negative' ? 'text-red-500' : 
           'text-blue-500') : 'text-gray-500'}`} />
        <span className="text-sm text-gray-500">Sentiment</span>
      </button>
      
      {isAnalyzing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mb-4"></div>
              <p className="text-gray-700">Analyzing sentiment...</p>
            </div>
          </div>
        </div>
      )}
      
      {showResults && sentimentResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2">
              <h4 className="font-medium">Sentiment Analysis</h4>
              <button 
                className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
                onClick={() => setShowResults(false)}
              >
                <CloseIcon size={16} />
              </button>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <p className="text-gray-600 text-sm mb-1">Content analyzed:</p>
              <p className="font-medium">{text}</p>
            </div>
            
            <div className="p-4 border rounded-md mb-6">
              <p className="text-gray-600 text-sm mb-2">Sentiment:</p>
              <p className={`text-xl font-medium ${getSentimentColor()}`}>{sentimentResult.sentiment}</p>
              
              <p className="text-gray-600 text-sm mt-4 mb-1">Confidence:</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                <div 
                  className={`h-2.5 rounded-full ${getSentimentBarColor()}`} 
                  style={{ width: `${sentimentResult.score}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
              
              <p className="text-gray-600 text-sm mt-4 mb-1">Emotional Intensity:</p>
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                <div 
                  className="h-2.5 rounded-full bg-purple-500" 
                  style={{ width: `${(sentimentResult.emotionalIntensity / 10) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Low</span>
                <span>{sentimentResult.emotionalIntensity} / 10</span>
                <span>High</span>
              </div>
              
              {sentimentResult.detectedEmotions && sentimentResult.detectedEmotions.length > 0 && (
                <>
                  <p className="text-gray-600 text-sm mt-4 mb-2">Detected Emotions:</p>
                  <div className="flex flex-wrap gap-2">
                    {sentimentResult.detectedEmotions.map((emotion, index) => (
                      <span 
                        key={index} 
                        className={`px-3 py-1 rounded-full text-sm ${getEmotionBadgeColor(emotion.name)}`}
                      >
                        {emotion.name} {emotion.percentage}%
                      </span>
                    ))}
                  </div>
                </>
              )}
            </div>
            
            <div className="text-center text-xs text-gray-500 mb-4">
              {apiError ? (
                <span>Powered by: Error - API Error</span>
              ) : (
                <span>Powered by: Twitter RoBERTa (HuggingFace)</span>
              )}
            </div>
            
            <p className="text-sm text-gray-600 mb-4 text-center">
              This sentiment analysis is provided to help moderate content<br />and promote healthy discussions.
            </p>
            
            <div className="flex justify-end">
              <button 
                className="px-4 py-2 bg-blue-50 text-blue-600 font-medium rounded-md hover:bg-blue-100 transition-colors"
                onClick={() => setShowResults(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SentimentAnalysis;
