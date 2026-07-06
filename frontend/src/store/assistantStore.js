import { create } from 'zustand';

export const useAssistantStore = create((set) => ({
  sessionId: localStorage.getItem('voice-ai-session-id'),
  status: 'idle',
  transcript: '',
  liveResponse: '',
  messages: [],
  error: '',
  mouthLevel: 0,
  setSessionId: (sessionId) => {
    localStorage.setItem('voice-ai-session-id', sessionId);
    set({ sessionId });
  },
  setStatus: (status) => set({ status }),
  setTranscript: (transcript) => set({ transcript }),
  setLiveResponse: (liveResponse) => set({ liveResponse }),
  appendLiveResponse: (text) => set((state) => ({ liveResponse: `${state.liveResponse}${text}` })),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setError: (error) => set({ error }),
  setMouthLevel: (mouthLevel) => set({ mouthLevel }),
  resetTurn: () => set({ transcript: '', liveResponse: '', error: '' }),
}));
