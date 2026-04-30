import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";
import { db } from "../lib/firebase";
import {
  collection,
  query,
  where,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
  addDoc,
  deleteDoc,
  orderBy,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from "firebase/firestore";
import { stageRegistry } from "../config/stageRegistry";
import { Project } from "../types";
import { classifyError } from "../lib/errorClassifier";


/**
 * Recursively converts Firestore Timestamps to plain numbers (milliseconds).
 * Ensures Redux state remains serializable.
 */
function serializeData(data: any): any {
  if (data === null || data === undefined) return data;

  if (data instanceof Timestamp) {
    return data.toMillis();
  }

  if (Array.isArray(data)) {
    return data.map(serializeData);
  }

  if (typeof data === "object") {
    const serialized: any = {};
    for (const key in data) {
      if (Object.prototype.hasOwnProperty.call(data, key)) {
        serialized[key] = serializeData(data[key]);
      }
    }
    return serialized;
  }

  return data;
}


export const firebaseService = createApi({
  reducerPath: "firebaseService",
  baseQuery: fakeBaseQuery(),
  tagTypes: [
    "Project",
    "Sequence",
    "TreatmentSequence",
    "ScriptScene",
    "PitchPrimitive",
    "Character",
    "Location",
  ],
  endpoints: (builder) => ({
    getProjects: builder.query<Project[], string>({
      async queryFn(userId) {
        if (!userId) return { data: [] };
        try {
          const q = query(
            collection(db, "projects"),
            where("collaborators", "array-contains", userId),
            orderBy("updatedAt", "desc"),
          );
          const snapshot = await getDocs(q);
          const projs = snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }) as Project)
            .filter(
              (p) => p.metadata?.title && p.metadata?.title.trim() !== "",
            );
          return { data: serializeData(projs) };
        } catch (error: any) {
          return { error: classifyError(error) };
        }
      },
      async onCacheEntryAdded(
        userId,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved },
      ) {
        if (!userId) return;
        let unsubscribe = () => {};
        try {
          await cacheDataLoaded;
          const q = query(
            collection(db, "projects"),
            where("collaborators", "array-contains", userId),
            orderBy("updatedAt", "desc"),
          );
          unsubscribe = onSnapshot(q, (snapshot) => {
            const projs = snapshot.docs
              .map((doc) => ({ id: doc.id, ...doc.data() }) as Project)
              .filter(
                (p) => p.metadata?.title && p.metadata?.title.trim() !== "",
              );
            updateCachedData(() => serializeData(projs));
          });
        } catch {}
        await cacheEntryRemoved;
        unsubscribe();
      },
    }),

    getProjectById: builder.query<Project | null, string>({
      async queryFn(projectId) {
        if (!projectId) return { data: null };
        try {
          const { getDoc } = await import("firebase/firestore");
          const docRef = doc(db, "projects", projectId);
          const snapshot = await getDoc(docRef);
          if (!snapshot.exists()) {
            return { error: { message: "Project not found", status: 404 } };
          }
          const data = { id: snapshot.id, ...snapshot.data() } as Project;
          return { data: serializeData(data) };
        } catch (error: any) {
          return { error: classifyError(error) };
        }
      },
      async onCacheEntryAdded(
        projectId,
        { updateCachedData, cacheDataLoaded, cacheEntryRemoved },
      ) {
        if (!projectId) return;
        let unsubscribe = () => {};
        try {
          await cacheDataLoaded;
          unsubscribe = onSnapshot(
            doc(db, "projects", projectId),
            (snapshot) => {
              if (snapshot.exists()) {
                updateCachedData(
                  () => serializeData(({ id: snapshot.id, ...snapshot.data() }) as Project),
                );
              } else {
                updateCachedData(() => null);
              }
            },
          );
        } catch {}
        await cacheEntryRemoved;
        unsubscribe();
      },
    }),

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

    updateProjectField: builder.mutation<
      void,
      { id: string; field: string; content: any }
    >({
      async queryFn({ id, field, content }) {
        try {
          await updateDoc(doc(db, "projects", id), {
            [field]: content,
            updatedAt: serverTimestamp(),
          });
          return { data: undefined };
        } catch (error: any) {
          return { error: classifyError(error) };
        }
      },
      async onQueryStarted(
        { id, field, content },
        { dispatch, queryFulfilled },
      ) {
        const patchResult = dispatch(
          firebaseService.util.updateQueryData("getProjectById", id, (draft) => {
            if (draft) {
              (draft as any)[field] = content;
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
      },
    }),

    updateProjectMetadata: builder.mutation<
      void,
      { id: string; metadata: any }
    >({
      async queryFn({ id, metadata }) {
        try {
          await updateDoc(doc(db, "projects", id), {
            metadata,
            updatedAt: serverTimestamp(),
          });
          return { data: undefined };
        } catch (error: any) {
          return { error: classifyError(error) };
        }
      },
      async onQueryStarted({ id, metadata }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          firebaseService.util.updateQueryData("getProjectById", id, (draft) => {
            if (draft) {
              draft.metadata = metadata;
            }
          }),
        );
        try {
          await queryFulfilled;
        } catch {
          patchResult.undo();
        }
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
          firebaseService.util.updateQueryData(
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
      { projectId: string; collectionName: string; data: any }
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
          firebaseService.util.updateQueryData(
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



    deleteProject: builder.mutation<void, string>({
      async queryFn(projectId) {
        try {
          const subcollections = stageRegistry.getAllCollectionNames();
          for (const sub of subcollections) {
            const subSnap = await getDocs(
              collection(db, "projects", projectId, sub),
            );
            for (const subDoc of subSnap.docs) {
              await deleteDoc(subDoc.ref);
            }
          }
          await deleteDoc(doc(db, "projects", projectId));
          return { data: undefined };
        } catch (error: any) {
          return { error: classifyError(error) };
        }
      },
    }),

    /** Bulk-delete all documents in a project subcollection. Used by handleRegenerate. */
    clearSubcollection: builder.mutation<
      void,
      { projectId: string; collectionName: string }
    >({
      async queryFn({ projectId, collectionName }) {
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

    /**
     * Atomic project initialization: Project document + initial Pitch Primitives.
     * Prevents "hollow" projects.
     */
    initializeProjectWithPrimitives: builder.mutation<
      string,
      { projectId?: string; projectData: any; primitives: any[] }
    >({
      async queryFn({ projectId, projectData, primitives }) {
        try {
          console.log("[FirebaseService] Initializing project with primitives:", {
            projectId,
            projectData,
            primitivesCount: primitives.length,
          });
          const projectRef = projectId
            ? doc(db, "projects", projectId)
            : doc(collection(db, "projects"));
          const batch = writeBatch(db);

          batch.set(projectRef, {
            ...projectData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          primitives.forEach((p) => {
            const primRef = doc(
              collection(db, "projects", projectRef.id, "pitch_primitives"),
            );
            batch.set(primRef, {
              ...p,
              projectId: projectRef.id,
              createdAt: serverTimestamp(),
            });
          });

          await batch.commit();
          return { data: projectRef.id };
        } catch (error: any) {
          return { error: classifyError(error) };
        }
      },
      invalidatesTags: ["Project"],
    }),
  }),
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

  useDeleteProjectMutation,
  useClearSubcollectionMutation,
  useInitializeProjectWithPrimitivesMutation,
} = firebaseService;

