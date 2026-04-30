import { ToolHandler } from "./toolTypes";
import { getArgString, getArgArray } from "../../utils/scriptDoctorUtils";

export const updateAgentStatus: ToolHandler = async (args, context) => {
  const { setAiStatus, setDoctorMessages, botMsgId } = context;
  const status = getArgString(args, "status") ?? "Thinking...";
  setAiStatus(status);
  if (botMsgId) {
    setDoctorMessages((prev) =>
      prev.map((m) => (m.id === botMsgId ? { ...m, status } : m))
    );
  }
  return { success: true };
};

export const setSuggestedActions: ToolHandler = async (args, context) => {
  const { setDoctorMessages, botMsgId } = context;
  const actions = (getArgArray(args, "actions") as string[]) ?? [];
  if (botMsgId) {
    setDoctorMessages((prev) =>
      prev.map((m) => (m.id === botMsgId ? { ...m, suggested_actions: actions } : m))
    );
  }
  return { success: true };
};
