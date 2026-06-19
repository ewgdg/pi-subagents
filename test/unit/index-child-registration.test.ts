import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { SUBAGENT_CHILD_ENV, SUBAGENT_FANOUT_CHILD_ENV } from "../../src/runs/shared/pi-args.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function parentToolEnv(): NodeJS.ProcessEnv {
	const env = { ...process.env };
	delete env[SUBAGENT_CHILD_ENV];
	delete env[SUBAGENT_FANOUT_CHILD_ENV];
	return env;
}

describe("subagent extension child mode", () => {
	it("collapses tool detail before direct subagent tool execution", () => {
		const script = String.raw`
			import registerSubagentExtensionModule from "./src/extension/index.ts";
			const registerSubagentExtension = registerSubagentExtensionModule.default ?? registerSubagentExtensionModule;
			const events = { on() { return () => {}; }, emit() {} };
			let registeredTool;
			const fakePi = new Proxy({
				events,
				registerTool(tool) { registeredTool = tool; },
				registerCommand() {},
				registerShortcut() {},
				registerMessageRenderer() {},
				sendMessage() {},
				getSessionName() { return undefined; },
			}, {
				get(target, prop) {
					if (prop in target) return target[prop];
					return () => undefined;
				},
			});
			registerSubagentExtension(fakePi);
			if (!registeredTool) throw new Error("tool not registered");
			const calls = [];
			const ctx = {
				cwd: process.cwd(),
				hasUI: true,
				ui: {
					setToolsExpanded(value) { calls.push(value); },
					setWidget() {},
					requestRender() {},
					theme: { fg(_name, text) { return text; }, bg(_name, text) { return text; }, bold(text) { return text; } },
				},
				sessionManager: { getSessionId() { return "session-test"; }, getSessionFile() { return null; } },
				modelRegistry: { getAvailable() { return []; } },
			};
			await registeredTool.execute("collapse-check", { action: "list" }, new AbortController().signal, undefined, ctx);
			if (calls[0] !== false) throw new Error("expected setToolsExpanded(false), got " + JSON.stringify(calls));
		`;

		execFileSync(
			process.execPath,
			[
				"--import",
				"jiti/register",
				"--import",
				"./test/support/register-loader.mjs",
				"--input-type=module",
				"--eval",
				script,
			],
			{ cwd: projectRoot, env: parentToolEnv(), stdio: "pipe" },
		);
	});

	it("does not show async badge for explicit foreground clarify chain calls", () => {
		const script = String.raw`
			import registerSubagentExtensionModule from "./src/extension/index.ts";
			const registerSubagentExtension = registerSubagentExtensionModule.default ?? registerSubagentExtensionModule;
			const events = { on() { return () => {}; }, emit() {} };
			let registeredTool;
			const fakePi = new Proxy({
				events,
				registerTool(tool) { registeredTool = tool; },
				registerCommand() {},
				registerShortcut() {},
				registerMessageRenderer() {},
				sendMessage() {},
				getSessionName() { return undefined; },
			}, {
				get(target, prop) {
					if (prop in target) return target[prop];
					return () => undefined;
				},
			});
			registerSubagentExtension(fakePi);
			if (!registeredTool) throw new Error("tool not registered");
			const theme = { fg(_name, text) { return text; }, bold(text) { return text; } };
			const asyncChain = registeredTool.renderCall({ chain: [{ agent: "worker" }, { agent: "reviewer" }], async: true }, theme).text;
			const clarifyChain = registeredTool.renderCall({ chain: [{ agent: "worker" }, { agent: "reviewer" }], async: true, clarify: true }, theme).text;
			if (!asyncChain.includes("[async]")) throw new Error("expected async chain badge, got " + asyncChain);
			if (clarifyChain.includes("[async]")) throw new Error("unexpected clarify async badge: " + clarifyChain);
		`;

		execFileSync(
			process.execPath,
			[
				"--import",
				"jiti/register",
				"--import",
				"./test/support/register-loader.mjs",
				"--input-type=module",
				"--eval",
				script,
			],
			{ cwd: projectRoot, env: parentToolEnv(), stdio: "pipe" },
		);
	});

	it("hides foreground controls when asyncByDefault is enabled", () => {
		const script = String.raw`
			import * as fs from "node:fs";
			import * as os from "node:os";
			import * as path from "node:path";
			import registerSubagentExtensionModule from "./src/extension/index.ts";
			const registerSubagentExtension = registerSubagentExtensionModule.default ?? registerSubagentExtensionModule;
			const agentDir = fs.mkdtempSync(path.join(os.tmpdir(), "subagent-config-"));
			fs.mkdirSync(path.join(agentDir, "extensions", "subagent"), { recursive: true });
			fs.writeFileSync(path.join(agentDir, "extensions", "subagent", "config.json"), JSON.stringify({ asyncByDefault: true }));
			process.env.PI_CODING_AGENT_DIR = agentDir;
			let registeredTool;
			const fakePi = new Proxy({
				events: { on() { return () => {}; }, emit() {} },
				registerTool(tool) { registeredTool = tool; },
				registerCommand() {},
				registerShortcut() {},
				registerMessageRenderer() {},
				sendMessage() {},
				getSessionName() { return undefined; },
			}, {
				get(target, prop) {
					if (prop in target) return target[prop];
					return () => undefined;
				},
			});
			registerSubagentExtension(fakePi);
			if (!registeredTool) throw new Error("tool not registered");
			if (!registeredTool.description.includes("Default execution is async/background")) throw new Error("missing async default guidance: " + registeredTool.description);
			if (registeredTool.description.includes("async:false")) throw new Error("unexpected foreground guidance: " + registeredTool.description);
			if (registeredTool.parameters.properties.timeoutMs !== undefined) throw new Error("timeoutMs should be hidden when async is default");
			if (registeredTool.parameters.properties.async !== undefined) throw new Error("async should be hidden when async is default");
			if (registeredTool.parameters.properties.clarify !== undefined) throw new Error("clarify should be hidden when async is default");
		`;

		execFileSync(
			process.execPath,
			[
				"--import",
				"jiti/register",
				"--import",
				"./test/support/register-loader.mjs",
				"--input-type=module",
				"--eval",
				script,
			],
			{ cwd: projectRoot, env: parentToolEnv(), stdio: "pipe" },
		);
	});

	it("hides foreground controls when forceTopLevelAsync is enabled", () => {
		const script = String.raw`
			import * as fs from "node:fs";
			import * as os from "node:os";
			import * as path from "node:path";
			import registerSubagentExtensionModule from "./src/extension/index.ts";
			const registerSubagentExtension = registerSubagentExtensionModule.default ?? registerSubagentExtensionModule;
			const agentDir = fs.mkdtempSync(path.join(os.tmpdir(), "subagent-config-"));
			fs.mkdirSync(path.join(agentDir, "extensions", "subagent"), { recursive: true });
			fs.writeFileSync(path.join(agentDir, "extensions", "subagent", "config.json"), JSON.stringify({ forceTopLevelAsync: true }));
			process.env.PI_CODING_AGENT_DIR = agentDir;
			let registeredTool;
			const fakePi = new Proxy({
				events: { on() { return () => {}; }, emit() {} },
				registerTool(tool) { registeredTool = tool; },
				registerCommand() {},
				registerShortcut() {},
				registerMessageRenderer() {},
				sendMessage() {},
				getSessionName() { return undefined; },
			}, {
				get(target, prop) {
					if (prop in target) return target[prop];
					return () => undefined;
				},
			});
			registerSubagentExtension(fakePi);
			if (!registeredTool) throw new Error("tool not registered");
			if (!registeredTool.description.includes("Default execution is async/background")) throw new Error("missing async default guidance: " + registeredTool.description);
			if (registeredTool.description.includes("async:false")) throw new Error("unexpected foreground guidance: " + registeredTool.description);
			if (registeredTool.parameters.properties.timeoutMs !== undefined) throw new Error("timeoutMs should be hidden when force async is enabled");
			if (registeredTool.parameters.properties.async !== undefined) throw new Error("async should be hidden when force async is enabled");
			if (registeredTool.parameters.properties.clarify !== undefined) throw new Error("clarify should be hidden when force async is enabled");
		`;

		execFileSync(
			process.execPath,
			[
				"--import",
				"jiti/register",
				"--import",
				"./test/support/register-loader.mjs",
				"--input-type=module",
				"--eval",
				script,
			],
			{ cwd: projectRoot, env: parentToolEnv(), stdio: "pipe" },
		);
	});

	it("returns before registering anything for non-fanout children", () => {
		const script = String.raw`
			import registerSubagentExtensionModule from "./src/extension/index.ts";
			const registerSubagentExtension = registerSubagentExtensionModule.default ?? registerSubagentExtensionModule;
			process.env.PI_SUBAGENT_CHILD = "1";
			process.env.PI_SUBAGENT_FANOUT_CHILD = "0";
			const calls = [];
			const fakePi = new Proxy({}, {
				get(_target, prop) {
					return (..._args) => {
						calls.push(String(prop));
						return undefined;
					};
				},
			});
			registerSubagentExtension(fakePi);
			if (calls.length > 0) {
				throw new Error("Unexpected child-mode registrations: " + calls.join(", "));
			}
		`;

		execFileSync(
			process.execPath,
			[
				"--import",
				"jiti/register",
				"--import",
				"./test/support/register-loader.mjs",
				"--input-type=module",
				"--eval",
				script,
			],
			{ cwd: projectRoot, stdio: "pipe" },
		);
	});

	it("returns before registering anything for fanout children through the main extension", () => {
		const script = String.raw`
			import registerSubagentExtensionModule from "./src/extension/index.ts";
			const registerSubagentExtension = registerSubagentExtensionModule.default ?? registerSubagentExtensionModule;
			process.env.PI_SUBAGENT_CHILD = "1";
			process.env.PI_SUBAGENT_FANOUT_CHILD = "1";
			const calls = [];
			const fakePi = new Proxy({}, {
				get(_target, prop) {
					return (..._args) => {
						calls.push(String(prop));
						return undefined;
					};
				},
			});
			registerSubagentExtension(fakePi);
			if (calls.length > 0) {
				throw new Error("Unexpected child-mode registrations: " + calls.join(", "));
			}
		`;

		execFileSync(
			process.execPath,
			[
				"--import",
				"jiti/register",
				"--import",
				"./test/support/register-loader.mjs",
				"--input-type=module",
				"--eval",
				script,
			],
			{ cwd: projectRoot, stdio: "pipe" },
		);
	});

	it("lets fanout children call read-only list but blocks mutating management actions", () => {
		const script = String.raw`
			import registerFanoutChildSubagentExtensionModule from "./src/extension/fanout-child.ts";
			const registerFanoutChildSubagentExtension = registerFanoutChildSubagentExtensionModule.default ?? registerFanoutChildSubagentExtensionModule;
			process.env.PI_SUBAGENT_CHILD = "1";
			process.env.PI_SUBAGENT_FANOUT_CHILD = "1";
			let registeredTool;
			const fakePi = {
				events: { on() { return () => {}; }, emit() {} },
				registerTool(tool) { registeredTool = tool; },
				getSessionName() { return undefined; },
			};
			registerFanoutChildSubagentExtension(fakePi);
			if (!registeredTool) throw new Error("tool not registered");
			const ctx = {
				cwd: process.cwd(),
				hasUI: false,
				sessionManager: { getSessionId() { return "session-test"; }, getSessionFile() { return null; } },
				modelRegistry: { getAvailable() { return []; } },
			};
			const list = await registeredTool.execute("list-check", { action: "list" }, new AbortController().signal, undefined, ctx);
			if (list.isError) throw new Error("list should be allowed: " + JSON.stringify(list.content));
			const create = await registeredTool.execute("create-check", { action: "create", config: { name: "x" } }, new AbortController().signal, undefined, ctx);
			if (!create.isError) throw new Error("create should be blocked");
			const text = create.content?.[0]?.text ?? "";
			if (!text.includes("not available from child-safe subagent fanout mode")) throw new Error("unexpected create error: " + text);
		`;

		execFileSync(
			process.execPath,
			[
				"--import",
				"jiti/register",
				"--import",
				"./test/support/register-loader.mjs",
				"--input-type=module",
				"--eval",
				script,
			],
			{ cwd: projectRoot, stdio: "pipe" },
		);
	});
});
