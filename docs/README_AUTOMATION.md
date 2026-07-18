# IronLogic AI Automation

## Overview

One-scheduled-task automation framework. A single Windows Task Scheduler trigger runs the master launcher, which detects overdue workflows and executes the appropriate AI agents. The Project Manager is the first agent in every pipeline and determines what work is due.

## Architecture

```
Windows Task Scheduler (At startup)
        |
        v
master-launcher.bat
        |
        v
master-runner.ps1 -Mode auto
        |
        v
Reads automation_config.json + execution_history.json
        |
        v
Detects overdue workflows (catch-up logic)
        |
        v
For each overdue workflow:
  Run pipeline steps sequentially (PM -> Agent -> ...)
  Update execution_history.json
  Generate ExecutiveSummary.md
```

## Folder Layout

```
IronLogic2.7.26/
+-- master-launcher.bat           Single Task Scheduler entry point
+-- IronLogicHQ/
    +-- AI/
        +-- automation_config.json     Schedule definitions (edit to change timing)
        +-- execution_history.json     Tracks last run, status, errors per workflow
        +-- prompts/                   Agent role definitions (7 prompt files)
        |   +-- project_manager.md     Decision-maker, always runs first
        |   +-- application_engineer.md
        |   +-- qa_engineer.md
        |   +-- documentation_engineer.md
        |   +-- ux_engineer.md
        |   +-- ironlogic_engineer.md
        |   +-- research_engineer.md
        +-- scripts/
        |   +-- master-runner.ps1      Orchestrator: catch-up, execution, summaries
        |   +-- ai-runner.ps1          Single-step agent executor
        +-- reports/                   Generated per-step reports + Executive Summaries
        +-- logs/                      Execution logs (session.log + per-step logs)
```

## Workflows

| Workflow | Pipeline | Frequency | Output |
|----------|----------|-----------|--------|
| **nightly** | PM -> Application Engineer -> QA -> Documentation Engineer | Daily | ExecutiveSummary.md |
| **weekly_ux** | PM -> UX Engineer -> QA | Weekly | UX_Report.md |
| **weekly_ironlogic** | PM -> IronLogic Engineer (review only) | Weekly | IronLogic_Report.md |
| **monthly_research** | PM -> Research Engineer -> IronLogic Engineer (review) | Monthly | Research_Report.md |

## Missed-Run Catch-Up

The system does NOT replay every missed schedule. When the computer starts:

1. `execution_history.json` is read
2. Each workflow's `last_run` is compared to its period boundary:
   - **Daily**: overdue if `last_run` is before today
   - **Weekly**: overdue if `last_run` is before this Monday
   - **Monthly**: overdue if `last_run` is before the 1st of this month
3. ONE execution of each overdue workflow is performed
4. `execution_history.json` is updated

Example: Computer off Mon-Fri, turned on Saturday -> runs ONE nightly, ONE weekly_ux, ONE weekly_ironlogic, and ONE monthly_research (if overdue).

## Configuration

Edit `IronLogicHQ/AI/automation_config.json`:

```json
{
  "schedules": {
    "nightly": {
      "description": "Description of this workflow",
      "frequency": "daily|weekly|monthly",
      "workflow": ["prompt_name_1", "prompt_name_2", "..."]
    }
  }
}
```

No source code edits are needed to change schedules.

## Execution History

Maintained in `IronLogicHQ/AI/execution_history.json`:

- `last_run` - timestamp of last execution
- `status` - SUCCESS or FAILURE
- `duration_seconds` - how long the workflow took
- `reports_generated` - paths to generated reports
- `errors` - error messages from failed steps
- `branches_created` - branches created during the workflow

## Manual Run

```batch
master-launcher.bat
```

Or run a specific workflow directly:

```batch
powershell -ExecutionPolicy Bypass -File "IronLogicHQ\AI\scripts\master-runner.ps1" -Mode nightly
```

Valid modes: `auto` (default, catch-up), `nightly`, `weekly_ux`, `weekly_ironlogic`, `monthly_research`.

## Setting Up Windows Task Scheduler

1. Press Win+R, type `taskschd.msc`, press Enter
2. Click **Create Task** (right side)
3. **General** tab: Name = "IronLogic AI Automation", check "Run whether user is logged on or not"
4. **Triggers** tab: New -> Begin the task: "At startup", delay task for: "1 minute"
5. **Actions** tab: New -> Action: "Start a program"
   - Program/script: `C:\Users\nbfar\OneDrive\IronLogic2.7.26\master-launcher.bat`
6. **Conditions** tab: Uncheck "Start the task only if the computer is on AC power"
7. **Settings** tab: Check "Run task as soon as possible after a scheduled start is missed"
8. Click OK, enter your Windows password when prompted

## Safety

- Automation never modifies application source files (`src/`, `vite.config.js`, `package.json`)
- The IronLogic Engineer agent reviews only -- never modifies the DMAIC algorithm automatically
- All code changes require lint + test + build verification
- Workflows stop on first failure
- Feature branches are created for any code modifications (user approval required)
