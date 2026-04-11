# ScénarIA - AI Agent & Developer Guide

Welcome to the **ScénarIA** codebase. This document serves as a comprehensive reference for AI agents and developers to understand the application's architecture, logic, and integration patterns.

---

## 1. Project Overview
**ScénarIA** is a professional-grade, AI-powered screenwriting platform. It guides users through a strict 9-stage cinematic production pipeline, from initial brainstorming to a full storyboarded script.

### Tech Stack
- **Frontend**: React (Vite), TypeScript, Tailwind-inspired Vanilla CSS.
- **Backend/Storage**: Firebase (Firestore, Authentication).
- **AI Engine**: Google Gemini API (Pro/Flash/Flash-Lite models), Claude (via backend integrations).
- **Communication**: WebRTC (for potential real-time features), Web Speech API (Universal TTS).
- **Media**: Cloudinary (Image management).

---

## 2. Core Architecture: The 9-Stage Pipeline
The application follows a linear narrative progression. AI agents must respect this flow as each stage acts as a "Source of Truth" for the next.

1.  **Brainstorming**: The foundation. Interactive "Source of Truth".
2.  **Logline**: The 1-2 sentence "hook".
3.  **3-Act Structure**: 8-beat narrative framework (K.M. Weiland/StudioBinder style).
4.  **Synopsis**: Full narrative narrative summary.
5.  **Character & Location Bible**: Extracted entities with deep development data.
6.  **Treatment**: Prose narrative with high visual detail.
7.  **Step Outline (Séquencier)**: Technical scene-by-scene breakdown.
8.  **Script**: Final professional screenplay formatting.
9.  **Storyboard**: Visual representation of scenes.

---

## 3. Data Model & Firestore Structure
Data is organized into high-level **Projects** and granular **Primitives**.

-   **Projects (`projects` collection)**: Contains metadata (title, format, genre), stage readiness states (`insights`), and legacy draft fields.
-   **Primitives (`primitives` subcollection or global)**: Every block of content is a "Primitive".
    -   `primitive_id`: Unique ID (Essential for AI tool calls).
    -   `stage_id`: The stage it belongs to.
    -   `order_index`: Sequence position.
    -   `content`: Markdown-formatted text.
    -   `title`: Optional header.

---

## 4. AI Logic: The "Script Doctor" Agent
The `ScriptDoctor` is the primary AI interface. It operates as an autonomous system administrator.

### Model Routing (Cascade)
The system uses a `resilientRequest` wrapper in `geminiService.ts` to handle failures:
-   **Complex Tasks** (A-Z generation): `Gemini 1.5 Pro` (or latest).
-   **Iterative Tasks** (Chat, quick patches): `Gemini 1.5 Flash`.
-   **Simple Tasks**: `Gemini 1.5 Flash Lite`.
-   **Timeout**: 5-15s depending on complexity. Fallback to older versions if failure persists.

### Technical Telemetry & ID-Mapping
-   **Hydration**: On project load, `telemetryService` caches a full map of `primitive_id`s.
-   **Context Injection**: Every prompt to the Script Doctor includes the `[PRIMITIVE ID-MAP]`.
-   **Tool Calls**: The agent MUST use `primitive_id` for operations:
    -   `propose_patch(id, updates)`
    -   `delete_primitive(id, stage)`
    -   `add_primitive(stage, primitive)`
    -   `update_stage_insight(stage, insight)`

---

## 5. UI Implementation Standards
-   **`<Primitive />` Component**: Standardized wrapper for all content blocks. Includes:
    -   Inline editing.
    -   TTS (Text-to-Speech) "Speaker" button.
    -   AI-driven "Fix It" actions.
-   **`<StepLayout />`**: Unified layout for all workflow stages. Ensures consistent sidebar/chat spacing.
-   **"Ghost" Generation**: The system proactively drafts the *next* stage once the current one is validated (e.g., Validated Logline -> Drafted 3-Act Structure).

---

## 6. Guidelines for AI Agents (Pair Programming)
When working on this project, adhere to these rules:

1.  **State-Awareness**: Always check the current `activeStage` and project metadata before suggesting changes.
2.  **Telemetry First**: If a database update is required, ensure you have the correct `primitive_id`.
3.  **UI Symmetry**: Maintain the "floating UI" principle. Subpanels (Sidebar/Chat) should not break the centering of the `MainCanvas`.
4.  **Error Handling**: Use the established `ErrorPages` and `telemetryService.reportError` for robustness.
5.  **Aesthetics**: Follow the "Rich Aesthetics" guidelines—use gradients, glassmorphism, and smooth transitions defined in `index.css`.

---

## 7. Key Files Directory
-   `src/services/geminiService.ts`: Core AI reasoning and tool definitions.
-   `src/services/telemetryService.ts`: ID-Map management and technical status reporting.
-   `src/services/contextAssembler.ts`: Logic for gathering narrative context for prompts.
-   `src/components/Primitive.tsx`: The atomic unit of UI content.
-   `src/components/ScriptDoctor.tsx`: The main AI interaction drawer.
-   `system_logic.md`: The "Global Directives" for system behavior.

---
*Created by Antigravity AI - April 2026*
