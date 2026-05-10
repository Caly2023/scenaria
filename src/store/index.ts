import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { firebaseService } from '../services/firebaseService';
import discoveryReducer from './discoverySlice';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

const rootReducer = combineReducers({
  [firebaseService.reducerPath]: firebaseService.reducer,
  discovery: discoveryReducer,
});

const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['discovery', firebaseService.reducerPath], // Persist discovery and firebase cache
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(firebaseService.middleware),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
