import { useState, useEffect } from 'react';
import { aiFlowMode } from '../services/serviceState';

export function useAiFlow() {
  const [flow, setFlow] = useState(aiFlowMode.get());

  useEffect(() => {
    return aiFlowMode.subscribe((val) => {
      setFlow(val);
    });
  }, []);

  const toggleFlow = () => {
    const next = flow === 'production' ? 'development' : 'production';
    aiFlowMode.set(next);
  };

  return { flow, toggleFlow };
}
