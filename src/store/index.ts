import { configureStore } from '@reduxjs/toolkit';
import { firebaseService } from '../services/firebaseService';

export const store = configureStore({
  reducer: {
    [firebaseService.reducerPath]: firebaseService.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(firebaseService.middleware),
});


export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
