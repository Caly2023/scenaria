import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ExtractedData } from '../types';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
}

interface DiscoveryState {
  sessions: Record<string, {
    messages: Message[];
    extractedData: ExtractedData | null;
    lastIdea: string;
    updatedAt: number;
  }>;
  currentIdea: string | null;
}

const initialState: DiscoveryState = {
  sessions: {},
  currentIdea: null,
};

const discoverySlice = createSlice({
  name: 'discovery',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<{ idea: string; messages: Message[]; extractedData: ExtractedData | null }>) => {
      const { idea, messages, extractedData } = action.payload;
      const key = idea.substring(0, 50);
      state.sessions[key] = {
        messages,
        extractedData,
        lastIdea: idea,
        updatedAt: Date.now(),
      };
    },
    setCurrentIdea: (state, action: PayloadAction<string | null>) => {
      state.currentIdea = action.payload;
    },
    clearSession: (state, action: PayloadAction<string>) => {
      const key = action.payload.substring(0, 50);
      delete state.sessions[key];
    },
    resetDiscovery: (state) => {
      state.sessions = {};
      state.currentIdea = null;
    }
  },
});

export const { setSession, setCurrentIdea, clearSession, resetDiscovery } = discoverySlice.actions;
export default discoverySlice.reducer;
