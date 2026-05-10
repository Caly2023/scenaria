import {
  collection,
  query,
  doc,
  getDocs,
  onSnapshot,
  addDoc,
  deleteDoc,
  setDoc,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { classifyError } from "../../lib/errorClassifier";
import { serializeData } from "./utils";
import { baseApi } from "./baseApi";

/** Typed shape of every subcollection document returned from Firestore. */
export interface SubcollectionItem extends Record<string, unknown> {
  id: string;
}

export const subcollectionApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSubcollection: builder.query<
      SubcollectionItem[],
      { projectId: string; collectionName: string; orderByField?: string }
    >({
      async queryFn({ projectId, collectionName, orderByField }): Promise<{ data: SubcollectionItem[] } | { error: ReturnType<typeof classifyError> }> {
        if (!projectId) return { data: [] };
        try {
          let q = query(collection(db, "projects", projectId, collectionName));
          if (orderByField) {
            q = query(q, orderBy(orderByField));
          }
          const snapshot = await getDocs(q);
          const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          return { data: serializeData<SubcollectionItem[]>(data) };
        } catch (error: unknown) {
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
              serializeData<SubcollectionItem[]>(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
            );
          });
        } catch { /* ignore subscribe errors */ }
        await cacheEntryRemoved;
        unsubscribe();
      },
    }),

    updateSubcollectionDoc: builder.mutation<
      null,
      {
        projectId: string;
        collectionName: string;
        docId: string;
        data: Record<string, unknown>;
        orderByField?: string;
      }
    >({
      async queryFn({ projectId, collectionName, docId, data }) {
        if (!projectId || !collectionName || !docId) {
          return { error: { message: "Missing required fields", status: 400 } };
        }
        try {
          // Use setDoc with merge:true so this acts as an upsert — never fails
          // if the document doesn't exist yet (e.g. stale AI ID references).
          await setDoc(
            doc(db, "projects", projectId, collectionName, docId),
            { ...data, updatedAt: serverTimestamp() },
            { merge: true },
          );
          return { data: null };
        } catch (error: unknown) {
          return { error: classifyError(error) };
        }
      },
      async onQueryStarted(
        { projectId, collectionName, docId, data, orderByField },
        { dispatch, queryFulfilled },
      ) {
        // Patch ALL 3 possible cache variants so no listener can re-add stale data:
        //  1. With the provided orderByField (or undefined)
        //  2. Without orderByField (common read path)
        //  3. With "order" as the sort key (most primitives sort by this)
        const applyUpdate = (draft: SubcollectionItem[]) => {
          const index = draft.findIndex((item) => item.id === docId);
          if (index !== -1) draft[index] = { ...draft[index], ...data };
        };

        const patches = [
          dispatch(subcollectionApi.util.updateQueryData(
            "getSubcollection",
            { projectId, collectionName, orderByField },
            applyUpdate,
          )),
          // Patch WITHOUT orderByField if caller passed one
          ...(orderByField ? [dispatch(subcollectionApi.util.updateQueryData(
            "getSubcollection",
            { projectId, collectionName },
            applyUpdate,
          ))] : []),
          // Patch WITH the common "order" sort key if not already covered
          ...(orderByField !== "order" ? [dispatch(subcollectionApi.util.updateQueryData(
            "getSubcollection",
            { projectId, collectionName, orderByField: "order" },
            applyUpdate,
          ))] : []),
        ];
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((p) => p.undo());
        }
      },
    }),

    addSubcollectionDoc: builder.mutation<
      string,
      { projectId: string; collectionName: string; data: Record<string, unknown>; orderByField?: string }
    >({
      async queryFn({ projectId, collectionName, data }) {
        try {
          const docRef = await addDoc(
            collection(db, "projects", projectId, collectionName),
            { ...data, projectId, createdAt: serverTimestamp() },
          );
          return { data: docRef.id };
        } catch (error: unknown) {
          return { error: classifyError(error) };
        }
      },
      async onQueryStarted(
        { projectId, collectionName, data, orderByField },
        { dispatch, queryFulfilled },
      ) {
        const tempId = `temp-${Math.random().toString(36).substring(7)}`;
        const optimisticItem: SubcollectionItem = { id: tempId, ...data, isOptimistic: true, createdAt: Date.now() };
        const patchResult = dispatch(
          subcollectionApi.util.updateQueryData(
            "getSubcollection",
            { projectId, collectionName, orderByField },
            (draft: SubcollectionItem[]) => {
              draft.push(optimisticItem);
              if (orderByField) {
                draft.sort((a, b) => {
                  const aVal = a[orderByField];
                  const bVal = b[orderByField];
                  return (aVal as string | number) > (bVal as string | number) ? 1 : -1;
                });
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
              (draft: SubcollectionItem[]) => {
                const index = draft.findIndex((item) => item.id === tempId);
                if (index !== -1) {
                  draft[index] = { ...draft[index], id: realId, isOptimistic: undefined };
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
      null,
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
          await deleteDoc(doc(db, "projects", projectId, collectionName, docId));
          return { data: null };
        } catch (error: unknown) {
          return { error: classifyError(error) };
        }
      },
      async onQueryStarted(
        { projectId, collectionName, docId, orderByField },
        { dispatch, queryFulfilled },
      ) {
        /**
         * BUGFIX: The cache can be keyed with or without `orderByField`.
         * We must patch ALL variants so the item disappears from the UI
         * regardless of which query key the component subscribed to.
         * If we only patch one variant, the Firestore snapshot listener on
         * the *other* variant will re-add the item — making the delete look
         * like it failed and prompting the AI to ask for permission again.
         */
        const removeFromDraft = (draft: SubcollectionItem[]) => {
          const index = draft.findIndex((item) => item.id === docId);
          if (index !== -1) draft.splice(index, 1);
        };

        const patches = [
          dispatch(subcollectionApi.util.updateQueryData(
            "getSubcollection",
            { projectId, collectionName, orderByField },
            removeFromDraft,
          )),
          // Patch the variant WITHOUT orderByField too (common read path)
          ...(orderByField ? [dispatch(subcollectionApi.util.updateQueryData(
            "getSubcollection",
            { projectId, collectionName },
            removeFromDraft,
          ))] : []),
          // Patch the variant WITH the common "order" sort key
          ...(orderByField !== "order" ? [dispatch(subcollectionApi.util.updateQueryData(
            "getSubcollection",
            { projectId, collectionName, orderByField: "order" },
            removeFromDraft,
          ))] : []),
        ];
        try {
          await queryFulfilled;
        } catch {
          // Firestore rejected — restore all patches
          patches.forEach((p) => p.undo());
        }
      },
    }),

    clearSubcollection: builder.mutation<
      null,
      { projectId: string; collectionName: string }
    >({
      async queryFn({ projectId, collectionName }) {
        if (!projectId || !collectionName) {
          return { error: { message: "Missing projectId or collectionName", status: 400 } };
        }
        try {
          const snap = await getDocs(collection(db, "projects", projectId, collectionName));
          if (snap.empty) return { data: null };
          const batch = writeBatch(db);
          snap.docs.forEach((d) => batch.delete(d.ref));
          await batch.commit();
          return { data: null };
        } catch (error: unknown) {
          return { error: classifyError(error) };
        }
      },
    }),

    setSubcollectionDoc: builder.mutation<
      null,
      {
        projectId: string;
        collectionName: string;
        docId: string;
        data: Record<string, unknown>;
        orderByField?: string;
      }
    >({
      async queryFn({ projectId, collectionName, docId, data }) {
        if (!projectId || !collectionName || !docId) {
          return { error: { message: "Missing required fields", status: 400 } };
        }
        try {
          const { setDoc } = await import("firebase/firestore");
          await setDoc(
            doc(db, "projects", projectId, collectionName, docId),
            { ...data, updatedAt: serverTimestamp() },
          );
          return { data: null };
        } catch (error: unknown) {
          return { error: classifyError(error) };
        }
      },
      async onQueryStarted(
        { projectId, collectionName, docId, data, orderByField },
        { dispatch, queryFulfilled },
      ) {
        const upsertInDraft = (draft: SubcollectionItem[]) => {
          const index = draft.findIndex((item) => item.id === docId);
          if (index !== -1) {
            draft[index] = { ...draft[index], ...data };
          } else {
            draft.push({ id: docId, ...data });
            if (orderByField) {
              draft.sort((a, b) => {
                const aVal = a[orderByField];
                const bVal = b[orderByField];
                return (aVal as string | number) > (bVal as string | number) ? 1 : -1;
              });
            }
          }
        };
        const patches = [
          dispatch(subcollectionApi.util.updateQueryData(
            "getSubcollection",
            { projectId, collectionName, orderByField },
            upsertInDraft,
          )),
          ...(orderByField ? [dispatch(subcollectionApi.util.updateQueryData(
            "getSubcollection",
            { projectId, collectionName },
            upsertInDraft,
          ))] : []),
        ];
        try {
          await queryFulfilled;
        } catch {
          patches.forEach((p) => p.undo());
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
