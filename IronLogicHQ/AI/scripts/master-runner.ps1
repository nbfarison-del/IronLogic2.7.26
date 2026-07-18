param(
    [ValidateSet("auto", "nightly", "weekly_ux", "weekly_ironlogic", "monthly_research")]
    [string]$Mode = "auto",
    [string]$ProjectRoot = (Get-Location).Path,
    [switch]$ShowVerbose
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path $ProjectRoot
$aiDir = Join-Path $ProjectRoot "IronLogicHQ\AI"
$configFile = Join-Path $aiDir "automation_config.json"
$historyFile = Join-Path $aiDir "execution_history.json"
$runnerScript = Join-Path $aiDir "scripts\ai-runner.ps1"
$reportsDir = Join-Path $aiDir "reports"
$logsDir = Join-Path $aiDir "logs"

# Ensure directories exist
foreach ($dir in @($aiDir, $reportsDir, $logsDir)) {
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
}

# Load config
if (-not (Test-Path $configFile)) {
    Write-Error "Config not found: ${configFile}"
    exit 1
}
$config = Get-Content $configFile -Raw | ConvertFrom-Json

# Load or initialize history
if (Test-Path $historyFile) {
    $history = Get-Content $historyFile -Raw | ConvertFrom-Json
}
else {
    $history = [PSCustomObject]@{}
}
# Ensure all configured workflows have history entries
foreach ($wfName in $config.schedules.PSObject.Properties.Name) {
    if (-not (Get-Member -InputObject $history -Name $wfName -MemberType NoteProperty)) {
        $history | Add-Member -MemberType NoteProperty -Name $wfName -Value ([PSCustomObject]@{
            last_run          = $null
            status            = $null
            duration_seconds  = $null
            reports_generated = @()
            errors            = @()
            branches_created  = @()
        })
    }
}
$history | ConvertTo-Json -Depth 10 | Out-File $historyFile -Encoding utf8

# -----------------------------------------------------------------
# Determine which workflows to run
# -----------------------------------------------------------------
function Get-OverdueWorkflows {
    param([PSCustomObject]$Config, [PSCustomObject]$History)
    $now = Get-Date
    $overdue = @()
    foreach ($wfName in $Config.schedules.PSObject.Properties.Name) {
        $schedule = $Config.schedules.$wfName
        $wfHistory = $History.$wfName
        $isOverdue = $false
        if (-not $wfHistory -or -not $wfHistory.last_run) {
            $isOverdue = $true
        }
        else {
            $lastRun = [DateTime]::Parse($wfHistory.last_run)
            switch ($schedule.frequency) {
                "daily" {
                    $periodStart = Get-Date -Hour 0 -Minute 0 -Second 0
                    if ($lastRun -lt $periodStart) { $isOverdue = $true }
                }
                "weekly" {
                    $daysFromMonday = [int]$now.DayOfWeek - [int][DayOfWeek]::Monday
                    if ($daysFromMonday -lt 0) { $daysFromMonday += 7 }
                    $periodStart = $now.AddDays(-$daysFromMonday).Date
                    if ($lastRun -lt $periodStart) { $isOverdue = $true }
                }
                "monthly" {
                    $periodStart = Get-Date -Day 1 -Hour 0 -Minute 0 -Second 0
                    if ($lastRun -lt $periodStart) { $isOverdue = $true }
                }
            }
        }
        if ($isOverdue) { $overdue += $wfName }
    }
    return $overdue
}

if ($Mode -eq "auto") {
    $workflowsToRun = Get-OverdueWorkflows -Config $config -History $history
    if ($workflowsToRun.Count -eq 0) {
        Write-Host "No overdue workflows. Nothing to run."
        exit 0
    }
    Write-Host "Overdue workflows detected: $($workflowsToRun -join ', ')"
}
else {
    $workflowsToRun = @($Mode)
}

# -----------------------------------------------------------------
# Run a single workflow and return results
# -----------------------------------------------------------------
function Invoke-Workflow {
    param([string]$WfName, [PSCustomObject]$Schedule, [string]$ProjectRoot, [string]$RunnerScript, [string]$ReportsDir, [bool]$ShowVerbose)
    $steps = $Schedule.workflow
    $wfSession = "pipeline-${WfName}-$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $wfStart = Get-Date
    Write-Host "============================================"
    Write-Host "  Running: ${WfName}  $($Schedule.description)"
    Write-Host "  Session: ${wfSession}"
    Write-Host "  Steps: $($steps.Count)"
    Write-Host "============================================"
    $results = @()
    $context = ""
    $overallStatus = "SUCCESS"
    $allErrors = @()
    foreach ($stepPrompt in $steps) {
        $stepSession = "${wfSession}-${stepPrompt}"
        Write-Host "--- Step: ${stepPrompt} ---"
        $splat = @{
            PromptName  = $stepPrompt
            SessionId   = $stepSession
            ProjectRoot = $ProjectRoot
        }
        if ($context) { $splat.Context = $context }
        if ($ShowVerbose) { $splat.ShowVerbose = $true }
        $result = & $RunnerScript @splat 2>&1
        $exitCode = $LASTEXITCODE
        $resultObj = if ($result -is [System.Management.Automation.PSCustomObject]) {
            $result
        }
        else {
            [PSCustomObject]@{
                PromptName = $stepPrompt
                SessionId  = $stepSession
                Status     = if ($exitCode -eq 0) { "SUCCESS" } else { "FAILURE" }
                ExitCode   = $exitCode
                Output     = ($result | Out-String)
            }
        }
        $results += $resultObj
        if ($resultObj.Status -eq "SUCCESS") {
            $reportFile = Join-Path $ReportsDir "${stepSession}.md"
            if (Test-Path $reportFile) { $context = Get-Content $reportFile -Raw } else { $context = $resultObj.Output }
        }
        else {
            $overallStatus = "FAILURE"
            $allErrors += "[${stepPrompt}] $($resultObj.Output)"
            Write-Warning "Step ${stepPrompt} failed  stopping workflow"
            break
        }
        Write-Host ""
    }
    $wfDuration = [math]::Round(((Get-Date) - $wfStart).TotalSeconds, 1)
    $successCount = @($results | Where-Object { $_.Status -eq "SUCCESS" }).Count
    $failCount = @($results | Where-Object { $_.Status -eq "FAILURE" }).Count
    $reportPaths = $results | Where-Object { $_.Status -eq "SUCCESS" } | ForEach-Object {
        Join-Path $ReportsDir "$($_.SessionId).md"
    }
    # Generate Executive Summary
    $execSummaryFile = Join-Path $ReportsDir "${wfSession}-executive-summary.md"
    $summaryLines = @()
    $summaryLines += "# Executive Summary  ${WfName}"
    $summaryLines += ""
    $summaryLines += "**Session**: ${wfSession}"
    $summaryLines += "**Timestamp**: ${timestamp}"
    $summaryLines += "**Duration**: ${wfDuration}s"
    $summaryLines += "**Status**: ${overallStatus}"
    $summaryLines += ""
    $summaryLines += "## Agents Executed"
    $summaryLines += ""
    foreach ($r in $results) {
        $summaryLines += "- $($r.PromptName): $($r.Status)"
    }
    if ($failCount -gt 0) {
        $summaryLines += ""
        $summaryLines += "## Errors"
        $summaryLines += ""
        foreach ($err in $allErrors) { $summaryLines += "- ${err}" }
    }
    $summaryLines += ""
    $summaryLines += "## Reports Generated"
    $summaryLines += ""
    foreach ($rp in $reportPaths) { $summaryLines += "- ${rp}" }
    $summaryLines += ""
    $summaryLines += "## Recommendations"
    $summaryLines += "- Review agent outputs above"
    $summaryLines += ""
    $summaryLines += "## Future Work"
    $summaryLines += "- Next scheduled: $($Schedule.description)"
    ($summaryLines -join "`n") | Out-File $execSummaryFile -Encoding utf8
    Write-Host "--- Workflow ${WfName} complete: ${overallStatus} (${wfDuration}s) ---"
    Write-Host "  Executive Summary: ${execSummaryFile}"
    return [PSCustomObject]@{
        Workflow          = $WfName
        Status            = $overallStatus
        Duration          = $wfDuration
        SessionId         = $wfSession
        StepResults       = $results
        SuccessCount      = $successCount
        FailCount         = $failCount
        Errors            = $allErrors
        ReportsGenerated  = $reportPaths
        ExecutiveSummary  = $execSummaryFile
    }
}

# -----------------------------------------------------------------
# Execute all overdue / selected workflows
# -----------------------------------------------------------------
$allResults = @()
foreach ($wfName in $workflowsToRun) {
    $schedule = $config.schedules.$wfName
    $wfResult = Invoke-Workflow -WfName $wfName -Schedule $schedule -ProjectRoot $ProjectRoot -RunnerScript $runnerScript -ReportsDir $reportsDir -ShowVerbose $ShowVerbose
    # Update execution history
    $history.$wfName = [PSCustomObject]@{
        last_run          = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
        status            = $wfResult.Status
        duration_seconds  = $wfResult.Duration
        reports_generated = @($wfResult.ReportsGenerated)
        errors            = @($wfResult.Errors)
        branches_created  = @()
    }
    $history | ConvertTo-Json -Depth 10 | Out-File $historyFile -Encoding utf8
    $allResults += $wfResult
}

# Log session
$logLine = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] RUN: $($workflowsToRun -join ', ')"
$logLine | Out-File (Join-Path $logsDir "session.log") -Encoding utf8 -Append

# Final tally
$wfSuccess = @($allResults | Where-Object { $_.Status -eq "SUCCESS" }).Count
$wfFail = @($allResults | Where-Object { $_.Status -eq "FAILURE" }).Count
Write-Host "============================================"
Write-Host "  All workflows: ${wfSuccess} succeeded, ${wfFail} failed"
Write-Host "============================================"

if ($wfFail -gt 0) { exit 1 } else { exit 0 }
