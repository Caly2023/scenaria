import { vi } from 'vitest';

// Global mocks
vi.mock('firebase/firestore', () => ({
  collection: vi.fn(),
  doc: vi.fn(),
  getDocs: vi.fn(),
  addDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(),
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  where: vi.fn(),
  getFirestore: vi.fn(),
  getAuth: vi.fn(),
}));

vi.mock('../lib/firebase', () => ({
  db: {},
}));
