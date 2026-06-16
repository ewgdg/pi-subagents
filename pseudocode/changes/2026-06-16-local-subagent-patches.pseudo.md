---
affects:
  - src/extension/index.ts
  - src/agents/agents.ts
  - test/unit/index-child-registration.test.ts
---

# Local Subagent Patches

## Intent

Keep child fanout registration single-sourced through the standalone fanout-child extension, prevent legacy skill docs from being discovered as agents, and keep tests aligned with current Node TypeScript execution constraints.

## Behavior

```pseudo
main subagent extension registration:
  if running inside any child subagent:
    return before registering parent extension surfaces
    do not call fanout-child registration from index.ts
    this avoids duplicate tool-name registration when fanout-child.ts is also loaded as its own extension

buildPiArgs(input):
  if child tools include exact builtin "subagent":
    authorize fanout child routing via environment variables
    append the standalone fanout-child extension path
    rely on fanout-child.ts to register child-safe fanout tooling exactly once

  if explicit extensions are configured:
    disable default extension discovery
    pass prompt runtime extension, fanout-child extension when authorized, tool extension paths, and allowed explicit extensions once each

agent file discovery:
  recursively scan agent directories
  if a directory is named "skills":
    skip it entirely
  otherwise continue recursive agent discovery

index child registration tests:
  run TypeScript child-process probes through the repo TypeScript loader plus jiti so parameter-property syntax is supported on current Node
  unwrap jiti default exports before invoking extension registrations
  set child-mode environment variables by their public string names inside probe scripts
  verify parent mode registers normal tool surfaces
  verify the main extension registers nothing in child mode, including fanout-authorized child mode
  verify the standalone fanout-child extension registers only child-safe subagent tooling
```
