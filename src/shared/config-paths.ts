import * as path from "node:path";
import { getAgentDir } from "./utils.ts";

// Keep "extentions" spelling: this is the configured user-facing config directory.
const SUBAGENTS_CONFIG_DIR_PARTS = ["extentions", "pi-subagents"] as const;

export function getSubagentsConfigDir(agentDir = getAgentDir()): string {
	return path.join(agentDir, ...SUBAGENTS_CONFIG_DIR_PARTS);
}

export function getSubagentsConfigPath(agentDir = getAgentDir()): string {
	return path.join(getSubagentsConfigDir(agentDir), "config.json");
}
