/**
 * Client for streaming predictions via Server-Sent Events
 */

export interface StreamPrediction {
  status: 'initializing' | 'analyzing' | 'generating' | 'complete' | 'error';
  progress: number;
  partial?: string;
  top_candidates?: string[];
  predictions?: string[];
  confidence_scores?: number[];
  candidate_index?: number;
}

export interface StreamOptions {
  onUpdate: (data: StreamPrediction) => void;
  onComplete: (data: StreamPrediction) => void;
  onError: (error: Error) => void;
}

export class PredictionStreamClient {
  private eventSource: EventSource | null = null;
  private modelServerUrl: string;

  constructor(modelServerUrl: string = 'http://localhost:8001') {
    this.modelServerUrl = modelServerUrl;
  }

  /**
   * Stream twist predictions from story setup
   */
  streamPredictions(
    storySetup: string,
    options: StreamOptions,
    genre?: string,
    numPredictions: number = 3
  ): () => void {
    // Encode parameters
    const params = new URLSearchParams({
      setup: storySetup,
      num_predictions: numPredictions.toString(),
    });

    if (genre) {
      params.append('genre', genre);
    }

    const url = `${this.modelServerUrl}/stream/predict-twist?${params.toString()}`;

    // Create EventSource connection
    this.eventSource = new EventSource(url);

    this.eventSource.onmessage = (event) => {
      try {
        const data: StreamPrediction = JSON.parse(event.data);

        if (data.status === 'complete') {
          options.onComplete(data);
          this.close();
        } else {
          options.onUpdate(data);
        }
      } catch (error) {
        options.onError(error as Error);
        this.close();
      }
    };

    this.eventSource.onerror = (_error) => {
      options.onError(new Error('Stream connection error'));
      this.close();
    };

    // Return cleanup function
    return () => this.close();
  }

  /**
   * Close the event source connection
   */
  close() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }
}

/**
 * React hook for streaming predictions
 */
import { useState, useEffect, useRef } from 'react';

export interface UseStreamPredictionsResult {
  predictions: string[];
  confidenceScores: number[];
  progress: number;
  status: string;
  isLoading: boolean;
  error: Error | null;
}

export function useStreamPredictions(
  storySetup: string | null,
  genre?: string,
  numPredictions: number = 3
): UseStreamPredictionsResult {
  const [predictions, setPredictions] = useState<string[]>([]);
  const [confidenceScores, setConfidenceScores] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('idle');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const clientRef = useRef<PredictionStreamClient | null>(null);

  useEffect(() => {
    if (!storySetup) return;

    setIsLoading(true);
    setError(null);
    setPredictions([]);
    setProgress(0);

    if (!clientRef.current) {
      clientRef.current = new PredictionStreamClient();
    }

    const cleanup = clientRef.current.streamPredictions(
      storySetup,
      {
        onUpdate: (data) => {
          setStatus(data.status);
          setProgress(data.progress);

          if (data.top_candidates) {
            setPredictions(data.top_candidates);
          }
        },
        onComplete: (data) => {
          setStatus('complete');
          setProgress(1.0);
          setIsLoading(false);

          if (data.predictions) {
            setPredictions(data.predictions);
          }
          if (data.confidence_scores) {
            setConfidenceScores(data.confidence_scores);
          }
        },
        onError: (err) => {
          setError(err);
          setIsLoading(false);
          setStatus('error');
        }
      },
      genre,
      numPredictions
    );

    return cleanup;
  }, [storySetup, genre, numPredictions]);

  return {
    predictions,
    confidenceScores,
    progress,
    status,
    isLoading,
    error
  };
}
