<#
.SYNOPSIS
    Install / uninstall / check Windows Scheduled Tasks for IronLogic AI Automation
.DESCRIPTION
    Reads config/automation_config.json and registers or removes a scheduled
    task for each enabled agent. Must be run as Administrator.
.PARAMETER Action
    install | uninstall | status
.EXAMPLE
    .\scheduler_setup.ps1 -Action install
    .\scheduler_setup.ps1 -Action status
#>

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('install', 'uninstall', 'status')]
    [string]$Action
)

# Ensure admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if ($Action -ne 'status' -and -not $isAdmin) {
    Write-Error "Administrator privileges required for '$Action'. Run PowerShell as Administrator."
    exit 1
}

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\.."
$ConfigPath = "$ProjectRoot\config\automation_config.json"
$LauncherPath = "$ProjectRoot\scripts\master_launcher.ps1"
$TaskPrefix = "IronLogic-Automation-"

if (-not (Test-Path $ConfigPath)) {
    Write-Error "Config not found: $ConfigPath"
    exit 1
}

$config = Get-Content $ConfigPath -Raw | ConvertFrom-Json

# ── Helper: cron → Windows Task trigger ────────────────────────
function Convert-CronToTrigger {
    param([string]$Cron)
    # Format: "minute hour * * dayOfWeek"
    # e.g. "0 9 * * 1" = Monday 9:00 AM
    $parts = $Cron -split '\s+'
    if ($parts.Count -ne 5) { return $null }

    $minute = $parts[0]
    $hour   = $parts[1]
    $dow    = $parts[4]

    $dowMap = @{
        '0' = 'Sunday'; '1' = 'Monday'; '2' = 'Tuesday'; '3' = 'Wednesday'
        '4' = 'Thursday'; '5' = 'Friday'; '6' = 'Saturday'
    }

    $daysOfWeek = if ($dow -match '^\d+$') { @($dowMap[$dow]) }
                  elseif ($dow -eq '*') { @('Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday') }
                  else { @($dow) }

    $trigger = New-ScheduledTaskTrigger -Weekly -DaysOfWeek $daysOfWeek -At "${hour}:$minute"
    return $trigger
}

switch ($Action) {
    'install' {
        Write-Host "=== Installing IronLogic Automation Tasks ===" -ForegroundColor Cyan
        $count = 0
        foreach ($entry in $config.schedule.PSObject.Properties) {
            $agentName = $entry.Name
            $agentCfg  = $entry.Value
            if (-not $agentCfg.enabled) {
                Write-Host "  Skipping $agentName (disabled)" -ForegroundColor DarkYellow
                continue
            }

            $taskName = "$TaskPrefix$agentName"
            $trigger = Convert-CronToTrigger -Cron $agentCfg.cron
            if (-not $trigger) {
                Write-Warning "  Could not parse cron for $agentName : $($agentCfg.cron)"
                continue
            }

            $action = New-ScheduledTaskAction -Execute "powershell.exe" `
                -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$LauncherPath`" -Agent $agentName"

            $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest

            $settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable

            # Remove existing if re-installing
            Unregister-ScheduledTask -TaskName $taskName -Confirm:$false -ErrorAction SilentlyContinue

            Register-ScheduledTask -TaskName $taskName `
                -Action $action `
                -Trigger $trigger `
                -Principal $principal `
                -Settings $settings `
                -Description "IronLogic AI Automation — $agentName ($($agentCfg.description))" | Out-Null

            Write-Host "  [+] Registered: $taskName ($($agentCfg.description))" -ForegroundColor Green
            $count++
        }
        Write-Host "=== $count task(s) installed ===" -ForegroundColor Cyan
        break
    }

    'uninstall' {
        Write-Host "=== Uninstalling IronLogic Automation Tasks ===" -ForegroundColor Yellow
        $tasks = Get-ScheduledTask -TaskPath "\" | Where-Object { $_.TaskName -like "$TaskPrefix*" }
        if ($tasks.Count -eq 0) {
            Write-Host "  No tasks found." -ForegroundColor DarkYellow
        } else {
            foreach ($t in $tasks) {
                Unregister-ScheduledTask -TaskName $t.TaskName -Confirm:$false
                Write-Host "  [-] Removed: $($t.TaskName)" -ForegroundColor Red
            }
        }
        break
    }

    'status' {
        Write-Host "=== IronLogic Automation Task Status ===" -ForegroundColor Cyan
        $tasks = Get-ScheduledTask -TaskPath "\" | Where-Object { $_.TaskName -like "$TaskPrefix*" }
        if ($tasks.Count -eq 0) {
            Write-Host "  No automation tasks registered." -ForegroundColor DarkYellow
        } else {
            foreach ($t in $tasks | Sort-Object TaskName) {
                $state = $t.State
                $next = (Get-ScheduledTask -TaskName $t.TaskName | Get-ScheduledTaskInfo).NextRunTime
                $nextStr = if ($next) { $next.ToString("yyyy-MM-dd HH:mm") } else { "—" }
                $color = switch ($state) {
                    'Ready'    { 'Green' }
                    'Running'  { 'Cyan' }
                    'Disabled' { 'DarkYellow' }
                    default    { 'Gray' }
                }
                Write-Host "  [$state] $($t.TaskName) — next: $nextStr" -ForegroundColor $color
            }
        }

        # Also show config summary
        Write-Host "`nConfig schedule:" -ForegroundColor Cyan
        $config = Get-Content $ConfigPath -Raw | ConvertFrom-Json
        foreach ($entry in $config.schedule.PSObject.Properties) {
            $c = $entry.Value
            $status = if ($c.enabled) { "ENABLED" } else { "DISABLED" }
            Write-Host "  [$status] $($entry.Name): $($c.description) (cron: $($c.cron))" -ForegroundColor $(if ($c.enabled) { 'White' } else { 'DarkYellow' })
        }
        break
    }
}
