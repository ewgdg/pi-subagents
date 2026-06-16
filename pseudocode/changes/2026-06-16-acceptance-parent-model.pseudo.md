---
affects:
  - src/shared/model-info.ts
  - src/shared/types.ts
  - src/runs/foreground/execution.ts
  - src/runs/foreground/subagent-executor.ts
  - src/runs/foreground/chain-execution.ts
  - src/runs/background/async-execution.ts
  - test/integration/single-execution.test.ts
---

# Acceptance Runs Inherit Parent Model

## Intent

Keep explicit acceptance/finalization child runs on the same working model family as the parent session when no child-specific model is configured.

## Behavior

```pseudo
parent model propagation:
  when foreground or async executor receives current ctx.model:
    parentModel = "provider/id" from ctx.model if both provider and id exist
    parentProvider = ctx.model.provider if it exists

  pass parentProvider to child model resolution for ambiguous bare model ids
  pass parentModel to child execution as an acceptance-only fallback model
```

```pseudo
foreground child model selection:
  primaryModel = explicit model override
    else agent default model
    else if acceptance contract is explicit:
      parentModel
    else:
      no model override

  build child model candidates from primaryModel plus configured fallbacks

  if candidates exist:
    launch child with first candidate as --model
  else:
    launch child without --model and let pi resolve its normal default
```

```pseudo
acceptance finalization model selection:
  finalizationModel = model recorded from initial child run
    else explicit model override
    else agent default model
    else parentModel

  continue the same session with finalizationModel as --model when available
```

```pseudo
async child model selection:
  effectiveAcceptance = resolved acceptance contract for the async step

  primaryModel = explicit step or single-run model
    else agent default model
    else if effectiveAcceptance is explicit:
      parent current model
    else:
      no model override

  persist model and modelCandidates for the detached runner from primaryModel
```

```pseudo
regression tests:
  given no agent model and explicit acceptance:
    when parentModel is openai-codex/gpt-5.5
    then initial child call includes --model openai-codex/gpt-5.5
    and finalization call includes --model openai-codex/gpt-5.5

  given no agent model and no explicit acceptance:
    when parentModel exists
    then child call does not include --model
```
