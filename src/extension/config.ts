import * as fs from "node:fs";
import type { ExtensionConfig } from "../shared/types.ts";
import { getSubagentsConfigPath } from "../shared/config-paths.ts";

const DEFAULT_CONFIG: ExtensionConfig = {
	asyncByDefault: true,
};

export function loadConfig(): ExtensionConfig {
	const configPath = getSubagentsConfigPath();
	try {
		if (fs.existsSync(configPath)) {
			return { ...DEFAULT_CONFIG, ...JSON.parse(fs.readFileSync(configPath, "utf-8")) as ExtensionConfig };
		}
	} catch (error) {
		console.error(`Failed to load subagent config from '${configPath}':`, error);
	}
	return { ...DEFAULT_CONFIG };
}
