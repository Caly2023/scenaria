# SCÉNARIA - CORE OPERATING LOGIC

## 1. THE DEFINITIVE 9-STAGE PIPELINE
The application follows a strict 9-stage progression:
1. **Brainstorming:** The interactive foundation and "Source of Truth".
2. **Logline:** Concise 1-2 sentence description (Protagonist, Goal, Conflict).
3. **3-Act Structure:** 8 narrative beats.
4. **Synopsis:** Full narrative summary.
5. **Character & Setting Bible:** Extracted entities (Characters & Locations).
6. **Treatment:** Prose narrative.
7. **Step Outline (Séquencier):** Scene-by-scene list.
8. **Script:** Final formatted screenplay.
9. **Storyboard:** Manual scene images.

## 2. THE BRAINSTORMING "SOURCE OF TRUTH" RULE
- The Brainstorming stage is the foundation for ALL subsequent AI generations.
- Every AI call for Logline, Synopsis, Bible, and Structure must use the validated Brainstorming content as the primary context.
- This ensures that the AI never "hallucinates" outside the user's core vision.

## 3. PROACTIVE "GHOST" GENERATION
- Do not wait for the user to ask for subsequent stages.
- **Validation Cascade:**
    - Validating **Brainstorming** triggers **Logline** draft.
    - Validating **Logline** triggers **3-Act Structure** draft.
    - Validating **3-Act Structure** triggers **Synopsis** draft.
    - Validating **Synopsis** triggers **Character & Setting Bible** extraction.
    - Validating **Structure** triggers **Treatment** draft.
- Use **Gemini Flash** for all proactive drafts to ensure speed.

## 4. IMAGE GENERATION PROTOCOL (MANUAL ONLY)
- Images are NEVER generated automatically.
- A dedicated "Generate Image" button must be present on Character and Storyboard primitives.
- A confirmation dialog is MANDATORY before launching generation.

## 5. UI PRIMITIVE & TTS STANDARDS
- Every content block must use the `<Primitive />` component.
- **Universal TTS:** Every Primitive must have a functional "Speaker" button that reads the content aloud using the Web Speech API.
- Content is always parsed as Markdown.

## 6. TECHNICAL TELEMETRY & DATA-MAPPING
- **ID-Map Hydration:** On project load, the system performs a full ID-Map hydration across all stages. Every primitive's `primitive_id`, `stage_id`, and `order_index` are cached in-memory via `telemetryService`.
- **Context Injection:** The complete ID-Map is injected into every Script Doctor AI call as `[PRIMITIVE ID-MAP]`, giving the AI real Firestore document IDs for all operations.
- **Firebase Feedback Loop:**
  - On Success: The updated document snapshot is read back from Firestore. UI confirms: "ID [XXX] successfully updated."
  - On 403 (Permission Denied): Error is reported to the user immediately. No retry.
  - On 404 (Not Found): The ID-Map is re-synced via `hydrateFullIdMap()`, then the operation is retried with fresh IDs.
  - On 500 (Server Error): The model fallback cascade (Pro → Flash → Light) handles automatic retry.
- **Recovery Protocol:** If a modification fails twice for the same primitive, a full `fetch_project_state()` / `hydrateFullIdMap()` is triggered before a final third attempt. Never give up without explaining which technical step failed.
- **Transparent Status:** The Script Doctor drawer shows live technical progress:
  - "🧠 Mapping Primitive IDs..."
  - "📡 Sending update to Firebase (ID: ...)"
  - "✅ Confirmation received. Syncing UI..."
  - "🔄 ID not found. Re-syncing Primitive IDs..."
  - "❌ [ERROR_TYPE]: [message]"
- **Tool Specifications:**
  - `get_stage_structure(stage_id)`: Returns array of objects with `primitive_id`, `title`, `content`, `order_index`.
  - `propose_patch(id, updates)`: Must use a valid `primitive_id` from the ID-Map. Returns updated document snapshot or error object with code.
  - `fetch_project_state()`: Returns stage counts AND the full ID-Map snapshot.
  - All tool results include `primitive_id` and `error_code` fields for precise feedback.
