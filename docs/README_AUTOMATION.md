# IronLogic AI Automation

## Overview

AI-powered automation for code review and project maintenance. Runs via Windows Task Scheduler, executes agent pipelines, and pushes reports to a Git branch for human review.

## Pipeline Flow

```
Windows Task Scheduler (at startup, 1 min delay)
        |
        v
master-runner.ps1 -PipelineName <name>
        |
        v
For each step in pipeline:
    run ai-runner.ps1 (reads prompt, pipes to opencode, saves report)
    pass report as context to next step
        |
        v
Generate Executive Summary
        |
        v
Git: create branch ai-reports/<name>-<timestamp>
     commit reports + logs
     push to origin
        |
        v
Done
```

## Pipelines

| Name | Steps | Frequency |
|------|-------|-----------|
| `default` | PM > App Engineer > QA > Documentation Engineer | Daily |
| `nightly` | Same as default | Daily |
| `weekly` | PM > IronLogic Engineer (review only) | Weekly |
| `sunday` | PM > UX Engineer > QA Engineer | Weekly |
| `monthly` | PM > Research Engineer > IronLogic Engineer (review) | Monthly |
| `weeklyUX` | PM > UX Engineer > QA Engineer > Documentation Engineer | Weekly |
| `weeklyIronLogic` | PM > IronLogic Engineer > QA > Documentation | Weekly |
| `monthlyResearch` | PM > Research Engineer > IronLogic Engineer (review) > Documentation | Monthly |

## Git Integration

After a successful pipeline run, the system automatically:

1. **Creates a branch** from `origin/main`: `ai-reports/<PipelineName>-<YYYYMMDD-HHMMSS>`
2. **Commits** reports, logs, and automation config
3. **Pushes** to `origin`

You review the branch and merge when ready.

### Configuration

Edit `IronLogicHQ/AI/automation_config.json`:

```json
{
  "git": {
    "enabled": true,
    "remote": "origin",
    "branch_prefix": "ai-reports",
    "base_branch": "main",
    "commit_message_prefix": "[AI Automation]",
    "files_to_commit": [
      "IronLogicHQ/AI/reports/",
      "IronLogicHQ/AI/logs/",
      "docs/README_AUTOMATION.md",
      "docs/AI_CONTEXT.md"
    ]
  }
}
```

Set `"enabled": false` to disable git operations.

### Prerequisites

- **Git for Windows** installed and accessible
- Repository cloned with HTTPS or SSH authentication configured
- No unstaged changes in the working directory

## Installation

### 1. Install Git for Windows

Download from https://git-scm.com and install. Verify:

```batch
git --version
```

### 2. Set up Windows Task Scheduler

1. Open **Task Scheduler** (Win+R `taskschd.msc`)
2. **Create Task**:
   - General: Name "IronLogic AI Automation", check "Run whether user is logged on"
   - Triggers: New > "At startup", delay 1 minute
   - Actions: New > Start a program > browse to `master-launcher.bat`
   - Conditions: Uncheck "Start only on AC power"
   - Settings: Check "Run task as soon as possible after a missed scheduled start"

### 3. Create the launcher batch file

**`master-launcher.bat`** (place at project root):

```batch
@echo off
cd /d "C:\Users\nbfar\OneDrive\IronLogic2.7.26"
powershell -ExecutionPolicy Bypass -File "IronLogicHQ\AI\scripts\master-runner.ps1" -PipelineName default
```

### 4. Test manually

```batch
powershell -ExecutionPolicy Bypass -File "IronLogicHQ\AI\scripts\master-runner.ps1" -PipelineName weekly -ShowVerbose
```

## Manual Run (specific pipeline)

```batch
powershell -ExecutionPolicy Bypass -File "IronLogicHQ\AI\scripts\master-runner.ps1" -PipelineName nightly
powershell -ExecutionPolicy Bypass -File "IronLogicHQ\AI\scripts\master-runner.ps1" -PipelineName weeklyUX
powershell -ExecutionPolicy Bypass -File "IronLogicHQ\AI\scripts\master-runner.ps1" -PipelineName monthlyResearch
```

## Safety

- Never modifies application source files (`src/`, `vite.config.js`, `package.json`)
- IronLogic Engineer reviews only -- never modifies the DMAIC algorithm automatically
- Workflows stop on first failure
- Git pushes go to a feature branch, never directly to `main`
- Reports include success/failure status for every step
