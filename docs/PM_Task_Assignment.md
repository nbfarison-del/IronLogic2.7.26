# Project Manager Task Assignment Plan

## Task Assignment Plan

**Workflow:** nightly  
**Cycle Date:** 2026-07-19  
**Priority Level:** high  

### Tasks for Downstream Agents

| Agent | Task | Priority | Context | Dependencies |
|-------|------|----------|---------|--------------|
| QA Engineer | Validate ai-runner.ps1 stderr redirect fix | 1 | application_engineer fixed PowerShell stderr handling by adding `2>$null` to line 55 of `IronLogicHQ/AI/scripts/ai-runner.ps1`. The fix prevents `$ErrorActionPreference = "Stop"` from treating ANSI escape codes as terminating errors. | None |
| QA Engineer | Run full verification suite (lint, test, build) | 2 | Execute `npm run lint`, `npm test`, and `npm run build` to ensure no regressions from the fix. | None |
| QA Engineer | Create regression test for stderr handling | 3 | Write test to verify ai-runner.ps1 handles stderr output without failing. Test should validate that ANSI codes in stderr don't cause PowerShell errors. | None |
| QA Engineer | Validate pipeline integrity | 4 | Test the full nightly pipeline execution to ensure the fix works in context. Verify master-runner.ps1 properly invokes ai-runner.ps1 with the fix applied. | None |

### Known Issues to Track
- The fix only addresses stderr redirect in ai-runner.ps1. master-runner.ps1 also has `$ErrorActionPreference = "Stop"` on line 15 but calls ai-runner.ps1 as a script, so it's unaffected.
- No existing tests for PowerShell scripts in the codebase. Consider adding PowerShell testing framework (Pester) for future validation.

### Previous Cycle Findings
- application_engineer successfully identified and fixed root cause of pipeline failures.
- Fix was verified manually with `opencode run --auto "Say hello in one word" 2>$null`.
- The fix is minimal and targeted, reducing risk of unintended side effects.

### Additional Notes
- The fix is in `IronLogicHQ/AI/scripts/ai-runner.ps1:55`
- Original code: `$output = $fullPrompt | & $OpenCodeCmd run --auto`
- Fixed code: `$output = $fullPrompt | & $OpenCodeCmd run --auto 2>$null`
- This is a critical infrastructure fix affecting all pipeline executions.
- QA should prioritize validation of the fix before any other testing activities.