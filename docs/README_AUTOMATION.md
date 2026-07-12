# IronLogic AI Automation

## Overview

Local AI-powered automation infrastructure for code review, issue detection, and project maintenance. Runs on a configurable schedule via Windows Task Scheduler.

## Folder Layout

```
IronLogic2.7.26/
├── ai/                          # All automation artifacts
│   ├── prompts/                 # Agent prompt templates (.md)
│   ├── logs/                    # Execution logs (auto-rotated, 90-day retention)
│   ├── reports/                 # Markdown reports (52-week retention)
│   ├── agents/                  # Agent runner PowerShell scripts
│   └── memory/                  # Persistent context for agents
├── scripts/
│   ├── master_launcher.ps1      # Entry point — reads config, runs the right agent
│   └── scheduler_setup.ps1      # Install / uninstall Windows scheduled tasks
├── config/
│   └── automation_config.json   # Central configuration (schedule, paths, logging)
└── docs/
    ├── AI_CONTEXT.md            # Project context for AI agents
    └── README_AUTOMATION.md     # This file
```

## Configuration

All schedules live in one file:

**`config/automation_config.json`**

```json
{
  "schedule": {
    "code_review": {
      "enabled": true,
      "cron": "0 9 * * 1",
      "description": "Every Monday at 9:00 AM"
    }
  }
}
```

Change the `cron` values or set `enabled: false` to disable an agent. No other file needs editing.

## Agents

| Agent | When | What It Does |
|-------|------|-------------|
| `code_review.ps1` | Monday 9 AM | Scans `src/` for lint errors, dead code, anti-patterns |
| `issue_detector.ps1` | Wednesday 9 AM | Analyzes logs and reports for recurring issues |
| `cleanup.ps1` | Friday 9 AM | Archives old logs, trims memory, removes stale reports |

## Installation

### Prerequisites

- Windows 10+ (PowerShell 5.1+)
- Node.js 18+ (for ESLint if code review agent needs it)

### Steps

1. Open PowerShell **as Administrator**
2. Run the setup script:
   ```
   .\scripts\scheduler_setup.ps1 -Action install
   ```
3. Confirm the tasks appear in Task Scheduler:
   ```
   .\scripts\scheduler_setup.ps1 -Action status
   ```

### Manual Run

Run any agent immediately without waiting for the schedule:

```
.\scripts\master_launcher.ps1 -Agent code_review
.\scripts\master_launcher.ps1 -Agent issue_detection
.\scripts\master_launcher.ps1 -Agent cleanup
```

### Uninstall

```
.\scripts\scheduler_setup.ps1 -Action uninstall
```

## Logs

Each run creates a timestamped log file in `ai/logs/`:

```
ai/logs/
├── code_review_2026-07-12_090000.log
├── issue_detection_2026-07-14_090000.log
└── cleanup_2026-07-16_090000.log
```

Logs older than 90 days are automatically pruned.

## Reports

Reports are written to `ai/reports/` as markdown files:

```
ai/reports/
├── code_review_2026-W28.md
├── issue_detection_2026-W29.md
└── cleanup_2026-W30.md
```

## Extending

To add a new agent:

1. Create your script in `ai/agents/`
2. Create a prompt template in `ai/prompts/`
3. Add an entry in `config/automation_config.json` under `schedule`
4. Re-run `.\scripts\scheduler_setup.ps1 -Action install` to register the new task

## Safety

- **Automation never modifies application source files.**
- Only writes to `ai/`, `scripts/`, `config/`, `docs/`
- All destructive actions (archive, delete) log first
