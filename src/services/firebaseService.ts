import { baseApi } from "./firebase/baseApi";
import { projectApi } from "./firebase/projectEndpoints";
import { subcollectionApi } from "./firebase/subcollectionEndpoints";

export const firebaseService = baseApi as unknown as typeof projectApi & typeof subcollectionApi;

export * from "./firebase/projectEndpoints";
export * from "./firebase/subcollectionEndpoints";
