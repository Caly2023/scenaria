import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, query, where, doc, getDocs, onSnapshot, 
  updateDoc, addDoc, deleteDoc, orderBy, serverTimestamp 
} from 'firebase/firestore';
import { Project, Sequence, Character, Location } from '../types';

export const firebaseApi = createApi({
  reducerPath: 'firebaseApi',
  baseQuery: fakeBaseQuery(),
  tagTypes: ['Project', 'Sequence', 'TreatmentSequence', 'ScriptScene', 'PitchPrimitive', 'Character', 'Location'],
  endpoints: (builder) => ({
    getProjects: builder.query<Project[], string>({
      async queryFn(userId) {
        if (!userId) return { data: [] };
        try {
          const q = query(
            collection(db, 'projects'),
            where('collaborators', 'array-contains', userId),
            orderBy('updatedAt', 'desc')
          );
          const snapshot = await getDocs(q);
          const projs = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Project))
            .filter(p => p.metadata?.title && p.metadata?.title.trim() !== '');
          return { data: projs };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      },
      async onCacheEntryAdded(userId, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        if (!userId) return;
        let unsubscribe = () => {};
        try {
          await cacheDataLoaded;
          const q = query(
            collection(db, 'projects'),
            where('collaborators', 'array-contains', userId),
            orderBy('updatedAt', 'desc')
          );
          unsubscribe = onSnapshot(q, (snapshot) => {
            const projs = snapshot.docs
              .map(doc => ({ id: doc.id, ...doc.data() } as Project))
              .filter(p => p.metadata?.title && p.metadata?.title.trim() !== '');
            updateCachedData(() => projs);
          });
        } catch {}
        await cacheEntryRemoved;
        unsubscribe();
      }
    }),

    getProjectById: builder.query<Project | null, string>({
      async queryFn(projectId) {
        if (!projectId) return { data: null };
        return { data: null }; // Will be populated by onCacheEntryAdded or getDoc
      },
      async onCacheEntryAdded(projectId, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        if (!projectId) return;
        let unsubscribe = () => {};
        try {
          await cacheDataLoaded;
          unsubscribe = onSnapshot(doc(db, 'projects', projectId), (snapshot) => {
            if (snapshot.exists()) {
              updateCachedData(() => ({ id: snapshot.id, ...snapshot.data() } as Project));
            } else {
              updateCachedData(() => null);
            }
          });
        } catch {}
        await cacheEntryRemoved;
        unsubscribe();
      }
    }),

    getSubcollection: builder.query<any[], { projectId: string; collectionName: string; orderByField?: string }>({
      async queryFn({ projectId, collectionName, orderByField }) {
        if (!projectId) return { data: [] };
        return { data: [] };
      },
      async onCacheEntryAdded({ projectId, collectionName, orderByField }, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
        if (!projectId) return;
        let unsubscribe = () => {};
        try {
          await cacheDataLoaded;
          let q = query(collection(db, 'projects', projectId, collectionName));
          if (orderByField) {
            q = query(q, orderBy(orderByField));
          }
          unsubscribe = onSnapshot(q, (snapshot) => {
            updateCachedData(() => snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
          });
        } catch {}
        await cacheEntryRemoved;
        unsubscribe();
      }
    }),

    updateProjectField: builder.mutation<void, { id: string; field: string; content: any }>({
      async queryFn({ id, field, content }) {
        try {
          await updateDoc(doc(db, 'projects', id), {
            [field]: content,
            updatedAt: serverTimestamp()
          });
          return { data: undefined };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      },
      async onQueryStarted({ id, field, content }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          firebaseApi.util.updateQueryData('getProjectById', id, (draft) => {
            if (draft) {
              (draft as any)[field] = content;
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      }
    }),

    updateProjectMetadata: builder.mutation<void, { id: string; metadata: any }>({
      async queryFn({ id, metadata }) {
        try {
          await updateDoc(doc(db, 'projects', id), {
            metadata,
            updatedAt: serverTimestamp()
          });
          return { data: undefined };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      },
      async onQueryStarted({ id, metadata }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          firebaseApi.util.updateQueryData('getProjectById', id, (draft) => {
            if (draft) {
              draft.metadata = metadata;
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      }
    }),

    updateSubcollectionDoc: builder.mutation<void, { projectId: string; collectionName: string; docId: string; data: any; orderByField?: string }>({
      async queryFn({ projectId, collectionName, docId, data }) {
        try {
          await updateDoc(doc(db, 'projects', projectId, collectionName, docId), {
            ...data,
            updatedAt: serverTimestamp()
          });
          return { data: undefined };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      },
      async onQueryStarted({ projectId, collectionName, docId, data, orderByField }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          firebaseApi.util.updateQueryData('getSubcollection', { projectId, collectionName, orderByField }, (draft) => {
            const index = draft.findIndex((item: any) => item.id === docId);
            if (index !== -1) {
              draft[index] = { ...draft[index], ...data };
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      }
    }),

    addSubcollectionDoc: builder.mutation<string, { projectId: string; collectionName: string; data: any }>({
      async queryFn({ projectId, collectionName, data }) {
        try {
          const docRef = await addDoc(collection(db, 'projects', projectId, collectionName), {
            ...data,
            projectId,
            createdAt: serverTimestamp()
          });
          return { data: docRef.id };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      }
    }),

    deleteSubcollectionDoc: builder.mutation<void, { projectId: string; collectionName: string; docId: string; orderByField?: string }>({
      async queryFn({ projectId, collectionName, docId }) {
        try {
          await deleteDoc(doc(db, 'projects', projectId, collectionName, docId));
          return { data: undefined };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      },
      async onQueryStarted({ projectId, collectionName, docId, orderByField }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          firebaseApi.util.updateQueryData('getSubcollection', { projectId, collectionName, orderByField }, (draft) => {
            const index = draft.findIndex((item: any) => item.id === docId);
            if (index !== -1) {
              draft.splice(index, 1);
            }
          })
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      }
    }),

    createProject: builder.mutation<string, { projectData: any }>({
      async queryFn({ projectData }) {
        try {
          const docRef = await addDoc(collection(db, 'projects'), {
            ...projectData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          return { data: docRef.id };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      }
    }),

    deleteProject: builder.mutation<void, string>({
      async queryFn(projectId) {
        try {
          const subcollections = ['sequences', 'characters', 'locations', 'pitch_primitives', 'treatment_sequences', 'script_scenes'];
          for (const sub of subcollections) {
            const subSnap = await getDocs(collection(db, 'projects', projectId, sub));
            for (const subDoc of subSnap.docs) {
              await deleteDoc(subDoc.ref);
            }
          }
          await deleteDoc(doc(db, 'projects', projectId));
          return { data: undefined };
        } catch (error: any) {
          return { error: { message: error.message } };
        }
      }
    })
  })
});

export const {
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useGetSubcollectionQuery,
  useUpdateProjectFieldMutation,
  useUpdateProjectMetadataMutation,
  useUpdateSubcollectionDocMutation,
  useAddSubcollectionDocMutation,
  useDeleteSubcollectionDocMutation,
  useCreateProjectMutation,
  useDeleteProjectMutation
} = firebaseApi;
