import { configureStore } from '@reduxjs/toolkit';
import { firebaseApi } from '../services/firebaseApi';
import { geminiApi } from '../services/geminiApi';

export const store = configureStore({
  reducer: {
    [firebaseApi.reducerPath]: firebaseApi.reducer,
    [geminiApi.reducerPath]: geminiApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(firebaseApi.middleware, geminiApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
