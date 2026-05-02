import { ToolHandler } from "./toolTypes";
import { telemetryService } from "../telemetryService";
import { getArgString } from "../../utils/scriptDoctorUtils";
import { WorkflowStage } from "../../types";
import { stageRegistry } from "../../config/stageRegistry";

/**
 * export_project_document
 * Génère et télécharge un document exporté du projet (PDF-like, Markdown, ou JSON structuré).
 * L'agent peut déclencher un export sans intervention manuelle de l'utilisateur.
 */
export const exportProjectDocument: ToolHandler = async (args, context) => {
  const { currentProject, stageContents, characters, locations, addToast, t } = context;
  const format = (getArgString(args, "format") ?? "markdown") as "markdown" | "json" | "txt";
  const stage = getArgString(args, "stage") as WorkflowStage | "all" ?? "all";

  telemetryService.setStatus("export_project_document", "📄", `Compiling ${format} export...`);

  try {
    const { metadata } = currentProject;
    const title = metadata?.title ?? "Untitled Project";
    const timestamp = new Date().toISOString().split("T")[0];

    let content = "";
    let filename = "";

    if (format === "json") {
      const exportData: Record<string, any> = {
        metadata,
        exportedAt: timestamp,
        stages: {},
      };

      const stagesToExport = stage === "all"
        ? stageRegistry.getAll()
        : [stageRegistry.get(stage)];

      for (const sDef of stagesToExport) {
        if (sDef.collectionName === "characters") {
          exportData.stages[sDef.id] = characters;
        } else if (sDef.collectionName === "locations") {
          exportData.stages[sDef.id] = locations;
        } else {
          exportData.stages[sDef.id] = stageContents[sDef.id] ?? [];
        }
      }

      content = JSON.stringify(exportData, null, 2);
      filename = `${title.replace(/\s+/g, "_")}_${timestamp}.json`;

    } else {
      // Markdown / txt
      const lines: string[] = [];
      lines.push(`# ${title}`);
      lines.push(`*Exporté le ${timestamp}*`);
      lines.push("");

      if (metadata) {
        lines.push("## Métadonnées");
        lines.push(`- **Format**: ${metadata.format ?? "—"}`);
        lines.push(`- **Genre**: ${metadata.genre ?? "—"}`);
        lines.push(`- **Ton**: ${metadata.tone ?? "—"}`);
        lines.push(`- **Durée cible**: ${metadata.targetDuration ?? "—"}`);
        if (metadata.logline) {
          lines.push(`- **Logline**: ${metadata.logline}`);
        }
        lines.push("");
      }

      const stagesToExport = stage === "all"
        ? stageRegistry.getAll()
        : [stageRegistry.get(stage)];

      for (const sDef of stagesToExport) {
        const primitives = sDef.collectionName === "characters"
          ? characters
          : sDef.collectionName === "locations"
          ? locations
          : stageContents[sDef.id] ?? [];

        if (!primitives || primitives.length === 0) continue;

        lines.push(`## ${sDef.id}`);
        lines.push("");

        for (const p of primitives as any[]) {
          const heading = p.title || p.name || "";
          if (heading) lines.push(`### ${heading}`);
          if (p.content || p.description) {
            lines.push(p.content || p.description || "");
          }
          lines.push("");
        }
      }

      content = lines.join("\n");
      filename = `${title.replace(/\s+/g, "_")}_${stage === "all" ? "complet" : stage.replace(/\s+/g, "_")}_${timestamp}.${format === "txt" ? "txt" : "md"}`;
    }

    // Trigger browser download
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast(`📄 Export téléchargé: ${filename}`, "success");
    telemetryService.setStatus("export_project_document", "✅", `Exported as ${filename}`);
    return { success: true, filename, format, stage };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    telemetryService.setStatus("export_project_document", "❌", "Export failed.");
    return { success: false, error: message };
  }
};

/**
 * read_user_preferences
 * Lit les préférences utilisateur stockées dans localStorage (thème, langue,
 * accessibilité, niveau de sévérité du docteur, etc.) pour que l'agent
 * puisse adapter ses analyses en conséquence.
 */
export const readUserPreferences: ToolHandler = async (args, context) => {
  telemetryService.setStatus("read_user_preferences", "⚙️", "Reading user preferences...");

  try {
    const theme = localStorage.getItem("scenaria_theme") ?? "dark";
    const language = localStorage.getItem("scenaria_language") ?? "fr";
    const doctorSeverity = localStorage.getItem("scenaria_doctor_severity") ?? "balanced";
    const doctorTone = localStorage.getItem("scenaria_doctor_tone") ?? "professional";

    let accessibility = { highContrast: false, largeText: false, reducedMotion: false };
    try {
      const raw = localStorage.getItem("scenaria_accessibility");
      if (raw) accessibility = JSON.parse(raw);
    } catch {}

    const preferences = {
      theme,
      language,
      doctorSeverity,   // "strict" | "balanced" | "lenient"
      doctorTone,       // "professional" | "friendly" | "concise"
      accessibility,
    };

    telemetryService.setStatus("read_user_preferences", "✅", "Preferences loaded.");
    return { success: true, data: preferences };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
};

/**
 * update_agent_memory
 * Permet à l'agent de persister ses propres notes ou réflexions ("scratchpad")
 * au sein du projet, pour les retrouver lors d'une session ultérieure.
 */
export const updateAgentMemory: ToolHandler = async (args, context) => {
  const { currentProject, addToast } = context;
  const memory = getArgString(args, "memory") ?? "";

  telemetryService.setStatus("update_agent_memory", "🧠", "Updating agent scratchpad...");

  const { store } = await import("../../store");
  const { firebaseService } = await import("../firebaseService");

  try {
    // We store this in a special key in metadata to ensure persistence
    await store.dispatch(
      firebaseService.endpoints.updateProjectMetadata.initiate({
        id: currentProject.id,
        metadata: { 
          ...currentProject.metadata, 
          agent_scratchpad: memory 
        } as any
      })
    ).unwrap();

    telemetryService.setStatus("update_agent_memory", "✅", "Memory persisted.");
    return { success: true };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
};

