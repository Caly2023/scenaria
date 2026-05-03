import {
  collection,
  query,
  where,
  doc,
  getDocs,
  onSnapshot,
  updateDoc,
  deleteDoc,
  orderBy,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { stageRegistry } from "../../config/stageRegistry";
import { Project } from "../../types";
import { classifyError } from "../../lib/errorClassifier";
import { serializeData } from "./utils";
import { baseApi } from "./baseApi";

export const projectApi = baseApi.injectEndpoints({
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
              (p) => typeof p.metadata?.title === "string" && p.metadata?.title.trim() !== "",
            );
          return { data: serializeData(projs) };
        } catch (error: unknown) {
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
                (p) => typeof p.metadata?.title === "string" && p.metadata?.title.trim() !== "",
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
        } catch (error: unknown) {
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

    updateProjectField: builder.mutation<
      void,
      { id: string; field: string; content: any }
    >({
      async queryFn({ id, field, content }) {
        if (!id || !field) return { error: { message: "Missing id or field", status: 400 } };
        try {
          await updateDoc(doc(db, "projects", id), {
            [field]: content,
            updatedAt: serverTimestamp(),
          });
          return { data: undefined };
        } catch (error: unknown) {
          return { error: classifyError(error) };
        }
      },
      async onQueryStarted(
        { id, field, content },
        { dispatch, queryFulfilled },
      ) {
        const patchResult = dispatch(
          projectApi.util.updateQueryData("getProjectById", id, (draft) => {
            if (draft) {
              if (field.includes(".")) {
                const parts = field.split(".");
                let current = draft as any;
                for (let i = 0; i < parts.length - 1; i++) {
                  if (!current[parts[i]]) current[parts[i]] = {};
                  current = current[parts[i]];
                }
                current[parts[parts.length - 1]] = content;
              } else {
                (draft as any)[field] = content;
              }
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
        if (!id) return { error: { message: "Missing id", status: 400 } };
        try {
          await updateDoc(doc(db, "projects", id), {
            metadata,
            updatedAt: serverTimestamp(),
          });
          return { data: undefined };
        } catch (error: unknown) {
          return { error: classifyError(error) };
        }
      },
      async onQueryStarted({ id, metadata }, { dispatch, queryFulfilled }) {
        const patchResult = dispatch(
          projectApi.util.updateQueryData("getProjectById", id, (draft) => {
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

    deleteProject: builder.mutation<void, string>({
      async queryFn(projectId) {
        if (!projectId) return { error: { message: "Missing projectId", status: 400 } };
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
        } catch (error: unknown) {
          return { error: classifyError(error) };
        }
      },
    }),

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
              collection(db, "projects", projectRef.id, "draft_primitives"),
            );
            batch.set(primRef, {
              ...p,
              projectId: projectRef.id,
              createdAt: serverTimestamp(),
            });
          });

          await batch.commit();
          return { data: projectRef.id };
        } catch (error: unknown) {
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
  useUpdateProjectFieldMutation,
  useUpdateProjectMetadataMutation,
  useDeleteProjectMutation,
  useInitializeProjectWithPrimitivesMutation,
} = projectApi;
