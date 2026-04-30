import { createApi, fakeBaseQuery } from "@reduxjs/toolkit/query/react";

export const baseApi = createApi({
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
  endpoints: () => ({}),
});
