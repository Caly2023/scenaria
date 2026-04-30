import {
  collection,
  query,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { classifyError } from "../../lib/errorClassifier";
import { serializeData } from "./utils";
import { baseApi } from "./baseApi";

export const subcollectionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubcollection: builder.query<
      any[],
      { projectId: string; collectionName: string; orderByField?: string }
    >({
      async queryFn({ projectId, collectionName, orderByField }) {
        if (!projectId) return { data: [] };
        try {
          let q = query(collection(db, "projects", projectId, collectionName));
          if (orderByField) {
            q = query(q, orderBy(orderByField));
          }
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          return { data: serializeData(data) };
        } catch (error: any) {
          return { error: classifyError(error) };
        }
      },
      async onCacheEntryAdded(
        { projectId, collectionName, orderByField },
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved },
      ) {
        if (!projectId) return;
        let unsubscribe = () => {};
        try {
          await cacheDataLoaded;
          let q = query(collection(db, "projects", projectId, collectionName));
          if (orderByField) {
            q = query(q, orderBy(orderByField));
          }
          unsubscribe = onSnapshot(q, (snapshot) => {
            updateCachedData(() =>
              serializeData(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))),
            );
          });
        } catch {}
        await cacheEntryRemoved;
        unsubscribe();
      },
    }),

    updateSubcollectionDoc: builder.mutation<
      void,
      {
        projectId: string;
        collectionName: string;
        docId: string;
        data: any;
        orderByField?: string;
      }
    >({
      async queryFn({ projectId, collectionName, docId, data }) {
        if (!projectId || !collectionName || !docId) {
          return { error: { message: "Missing required fields", status: 400 } };
        }
        try {
          await updateDoc(
            doc(db, "projects", projectId, collectionName, docId),
            {
              ...data,
              updatedAt: serverTimestamp(),
            },
          );
          return { data: undefined };
        } catch (error: any) {
          return { error: classifyError(error) };
        }
      },
      async onQueryStarted(
        { projectId, collectionName, docId, data, orderByField },
        { dispatch, queryFulfilled },
      ) {
        const patchResult = dispatch(
          subcollectionApi.util.updateQueryData(
            "getSubcollection",
            { projectId, collectionName, orderByField },
            (draft) => {
              const index = draft.findIndex((item: any) => item.id === docId);
              if (index !== -1) {
                draft[index] = { ...draft[index], ...data };
              }
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    addSubcollectionDoc: builder.mutation<
      string,
      { projectId: string; collectionName: string; data: any; orderByField?: string }
    >({
      async queryFn({ projectId, collectionName, data }) {
        try {
          const docRef = await addDoc(
            collection(db, "projects", projectId, collectionName),
            {
              ...data,
              projectId,
              createdAt: serverTimestamp(),
            },
          );
          return { data: docRef.id };
        } catch (error: any) {
          return { error: classifyError(error) };
        }
      },
      async onQueryStarted(
        { projectId, collectionName, data, orderByField },
        { dispatch, queryFulfilled },
      ) {
        const tempId = `temp-${Math.random().toString(36).substring(7)}`;
        const patchResult = dispatch(
          subcollectionApi.util.updateQueryData(
            "getSubcollection",
            { projectId, collectionName, orderByField },
            (draft) => {
              draft.push({ 
                id: tempId, 
                ...data, 
                isOptimistic: true,
                createdAt: Date.now() 
              });
              if (orderByField) {
                draft.sort((a: any, b: any) => (a[orderByField] > b[orderByField] ? 1 : -1));
              }
            },
          ),
        );
        try {
          const { data: realId } = await queryFulfilled;
          dispatch(
            subcollectionApi.util.updateQueryData(
              "getSubcollection",
              { projectId, collectionName, orderByField },
              (draft) => {
                const index = draft.findIndex((item: any) => item.id === tempId);
                if (index !== -1) {
                  draft[index].id = realId;
                  delete draft[index].isOptimistic;
                }
              },
            ),
          );
        } catch {
          patchResult.undo();
        }
      },
    }),

    deleteSubcollectionDoc: builder.mutation<
      void,
      {
        projectId: string;
        collectionName: string;
        docId: string;
        orderByField?: string;
      }
    >({
      async queryFn({ projectId, collectionName, docId }) {
        if (!projectId || !collectionName || !docId) {
          return { error: { message: "Missing required fields", status: 400 } };
        }
        try {
          await deleteDoc(
            doc(db, "projects", projectId, collectionName, docId),
          );
          return { data: undefined };
        } catch (error: any) {
          return { error: classifyError(error) };
        }
      },
      async onQueryStarted(
        { projectId, collectionName, docId, orderByField },
        { dispatch, queryFulfilled },
      ) {
        const patchResult = dispatch(
          subcollectionApi.util.updateQueryData(
            "getSubcollection",
            { projectId, collectionName, orderByField },
            (draft) => {
              const index = draft.findIndex((item: any) => item.id === docId);
              if (index !== -1) {
                draft.splice(index, 1);
              }
            },
          ),
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    clearSubcollection: builder.mutation<
      void,
      { projectId: string; collectionName: string }
    >({
      async queryFn({ projectId, collectionName }) {
        if (!projectId || !collectionName) {
          return { error: { message: "Missing projectId or collectionName", status: 400 } };
        }
        try {
          const snap = await getDocs(
            collection(db, "projects", projectId, collectionName),
          );
          if (snap.empty) return { data: undefined };
          
          const batch = writeBatch(db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          
          return { data: undefined };
        } catch (error: any) {
          return { error: classifyError(error) };
        }
      },
    }),
  }),
});

export const {
  useGetSubcollectionQuery,
  useUpdateSubcollectionDocMutation,
  useAddSubcollectionDocMutation,
  useDeleteSubcollectionDocMutation,
  useClearSubcollectionMutation,
} = subcollectionApi;
