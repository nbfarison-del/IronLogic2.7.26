param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("default", "nightly", "sunday", "weekly", "monthly", "weeklyUX", "weeklyIronLogic", "monthlyResearch", "custom")]
    [string]$PipelineName = "default",
    [Parameter(Mandatory = $false)]
    [string]$CustomPrompts = "",
    [Parameter(Mandatory = $false)]
    [string]$ProjectRoot = (Get-Location).Path,
    [Parameter(Mandatory = $false)]
    [string]$OpenCodeCmd = "$env:APPDATA\npm\opencode.cmd",
    [Parameter(Mandatory = $false)]
    [switch]$ShowVerbose
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path $ProjectRoot

$pipelineDefs = @{
    default = @(
        @{ Prompt = "project_manager";         Label = "Project Manager" }
        @{ Prompt = "application_engineer";    Label = "Application Engineer" }
        @{ Prompt = "qa_engineer";             Label = "QA Engineer" }
        @{ Prompt = "documentation_engineer";  Label = "Documentation Engineer" }
    )
    monthly = @(
        @{ Prompt = "project_manager";         Label = "Project Manager" }
        @{ Prompt = "research_engineer";       Label = "Research Engineer" }
        @{ Prompt = "ironlogic_engineer";      Label = "IronLogic Engineer" }
    )
    weekly = @(
        @{ Prompt = "project_manager";         Label = "Project Manager" }
        @{ Prompt = "ironlogic_engineer";      Label = "IronLogic Engineer" }
    )
    sunday = @(
        @{ Prompt = "project_manager";         Label = "Project Manager" }
        @{ Prompt = "ux_engineer";             Label = "UX Engineer" }
        @{ Prompt = "qa_engineer";             Label = "QA Engineer" }
    )
    nightly = @(
        @{ Prompt = "project_manager";         Label = "Project Manager" }
        @{ Prompt = "application_engineer";    Label = "Application Engineer" }
        @{ Prompt = "qa_engineer";             Label = "QA Engineer" }
        @{ Prompt = "documentation_engineer";  Label = "Documentation Engineer" }
    )
    weeklyUX = @(
        @{ Prompt = "project_manager";         Label = "Project Manager" }
        @{ Prompt = "ux_engineer";             Label = "UX Engineer" }
        @{ Prompt = "qa_engineer";             Label = "QA Engineer" }
        @{ Prompt = "documentation_engineer";  Label = "Documentation Engineer" }
    )
    weeklyIronLogic = @(
        @{ Prompt = "project_manager";         Label = "Project Manager" }
        @{ Prompt = "ironlogic_engineer";      Label = "IronLogic Engineer" }
        @{ Prompt = "qa_engineer";             Label = "QA Engineer" }
        @{ Prompt = "documentation_engineer";  Label = "Documentation Engineer" }
    )
    monthlyResearch = @(
        @{ Prompt = "project_manager";         Label = "Project Manager" }
        @{ Prompt = "research_engineer";       Label = "Research Engineer" }
        @{ Prompt = "ironlogic_engineer";      Label = "IronLogic Engineer (review)" }
        @{ Prompt = "documentation_engineer";  Label = "Documentation Engineer" }
    )
}

if ($PipelineName -eq "custom") {
    if (-not $CustomPrompts) {
        Write-Error "Custom pipeline requires -CustomPrompts (comma-separated prompt names)"
        exit 1
    }
    $pipeline = $CustomPrompts -split "," | ForEach-Object {
        $name = $_.Trim()
        @{ Prompt = $name; Label = $name }
    }
}
else {
    $pipeline = $pipelineDefs[$PipelineName]
}

$runnerScript   = Join-Path $ProjectRoot "IronLogicHQ\AI\scripts\ai-runner.ps1"
$reportsDir     = Join-Path $ProjectRoot "IronLogicHQ\AI\reports"
$logsDir        = Join-Path $ProjectRoot "IronLogicHQ\AI\logs"
$promptsDir     = Join-Path $ProjectRoot "IronLogicHQ\AI\prompts"
$sessionLog     = Join-Path $logsDir "session.log"
$pipelineSession = "pipeline-$(Get-Date -Format 'yyyyMMdd_HHmmss')"
$timestamp      = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

if (-not (Test-Path $runnerScript)) {
    Write-Error "ai-runner.ps1 not found at $runnerScript"
    exit 1
}

Write-Host "+=================================================+"
Write-Host "|        Master Runner - IronLogic AI Pipeline     |"
Write-Host "+=================================================+"
Write-Host "| Session: $($pipelineSession.PadRight(34))|"
Write-Host "| Steps:   $($pipeline.Count.ToString().PadRight(34))|"
Write-Host "+=================================================+"
Write-Host ""

$results = @()
$context = ""
$aborted = $false

foreach ($step in $pipeline) {
    $promptName = $step.Prompt
    $label = $step.Label

    Write-Host "-- Step $($results.Count + 1): $label ($promptName) --"

    $stepSession = "$pipelineSession-$promptName"
    $stepLog = Join-Path $logsDir "$stepSession.log"

    $startLine = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] RUNNING: $promptName (session: $stepSession)"
    $startLine | Out-File -FilePath $stepLog -Encoding utf8

    $splat = @{
        PromptName  = $promptName
        SessionId   = $stepSession
        ProjectRoot = $ProjectRoot
        OpenCodeCmd = $OpenCodeCmd
    }
    if ($context) { $splat.Context = $context }
    if ($ShowVerbose) { $splat.ShowVerbose = $true }

    try {
        $result = & $runnerScript @splat
        $exitCode = $LASTEXITCODE
    }
    catch {
        $exitCode = 1
        $result = "ERROR: $_"
    }

    $status = if ($exitCode -eq 0) { "SUCCESS" } else { "FAILURE" }
    $resultObj = [PSCustomObject]@{
        PromptName = $promptName
        SessionId  = $stepSession
        Status     = $status
        ExitCode   = $exitCode
        Timestamp  = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    }
    $results += $resultObj

    $endLine = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ${status}: $promptName (exit: $exitCode)"
    $endLine | Out-File -FilePath $stepLog -Encoding utf8 -Append
    $endLine | Out-File -FilePath $sessionLog -Encoding utf8 -Append

    Write-Host "  -> ${status} (exit code: $exitCode)"
    Write-Host "  -> Log: $stepLog"

    $reportFile = Join-Path $reportsDir "$stepSession.md"
    if ($exitCode -eq 0 -and (Test-Path $reportFile)) {
        try { $context = Get-Content $reportFile -Raw } catch { $context = "" }
    }
    elseif ($exitCode -ne 0) {
        $context = "ERROR: $promptName failed with exit code $exitCode"
        $aborted = $true
        Write-Warning "Pipeline aborted -- $label failed"
        break
    }

    Write-Host ""
}

if (-not $aborted) {
    Write-Host "-- All steps completed successfully --"
    Write-Host ""
}

$successCount = @($results | Where-Object { $_.Status -eq "SUCCESS" }).Count
$failCount    = @($results | Where-Object { $_.Status -eq "FAILURE" }).Count
$pipelineStatus = if ($failCount -eq 0) { "SUCCESS" } else { "FAILURE" }

$summaryLines = @()
$summaryLines += "# Executive Summary - AI Pipeline Run"
$summaryLines += ""
$summaryLines += "**Session**: $pipelineSession"
$summaryLines += "**Date**: $timestamp"
$summaryLines += "**Pipeline Status**: $pipelineStatus"
$summaryLines += "**Steps**: $($results.Count) total - $successCount succeeded, $failCount failed"
$summaryLines += ""
$summaryLines += "---"
$summaryLines += ""
$summaryLines += "## Step Results"
$summaryLines += ""
$summaryLines += "| # | Agent | Status | Exit Code |"
$summaryLines += "|---|-------|--------|-----------|"

for ($i = 0; $i -lt $results.Count; $i++) {
    $r = $results[$i]
    $num = $i + 1
    $summaryLines += "| $num | $($r.PromptName) | $($r.Status) | $($r.ExitCode) |"
}

$summaryLines += ""
$summaryLines += "## Reports"
$summaryLines += ""

foreach ($r in $results) {
    $rf = Join-Path $reportsDir "$($r.SessionId).md"
    $lf = Join-Path $logsDir "$($r.SessionId).log"
    if (Test-Path $rf) {
        $size = (Get-Item $rf).Length
        $summaryLines += "- **$($r.PromptName)**: $($r.Status) -- $($r.SessionId).md ($size bytes)"
    }
    if (Test-Path $lf) {
        $size = (Get-Item $lf).Length
        $summaryLines += "  - Log: $($r.SessionId).log ($size bytes)"
    }
}

if ($failCount -gt 0) {
    $summaryLines += ""
    $summaryLines += "> Pipeline stopped early due to step failure."
}
else {
    $summaryLines += ""
    $summaryLines += "> All steps completed successfully."
}

$summary = $summaryLines -join "`n"

$summaryFile = Join-Path $reportsDir "$pipelineSession-executive-summary.md"
$summary | Out-File -FilePath $summaryFile -Encoding utf8

$logLine = "[$timestamp] PIPELINE ${pipelineSession}: $successCount success, $failCount failure -- $pipelineStatus"
$logLine | Out-File -FilePath $sessionLog -Encoding utf8 -Append

Write-Host "+=================================================+"
Write-Host "|           Pipeline Complete                      |"
Write-Host "|  Status: $($pipelineStatus.PadRight(35))|"
Write-Host "|  $successCount succeeded, $failCount failed                         |"
Write-Host "|  Executive Summary: $(Split-Path $summaryFile -Leaf)   |"
Write-Host "+=================================================+"

# Git commit/push on success
$branchName = $null
$pushSucceeded = $false

if ($pipelineStatus -eq "SUCCESS") {
    try {
        $gitCmd = Get-Command "git.exe" -ErrorAction SilentlyContinue
        if (-not $gitCmd) { $gitCmd = Get-Command "git" -ErrorAction SilentlyContinue }
        if (-not $gitCmd) {
            $ghDesktopPaths = Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" -ErrorAction SilentlyContinue
            foreach ($gp in $ghDesktopPaths) { $gitCmd = $gp.FullName; break }
        }

        if ($gitCmd) {
            $gitExe = if ($gitCmd -is [System.Management.Automation.CommandInfo]) { $gitCmd.Source } else { $gitCmd }
            $dateStr = Get-Date -Format "yyyyMMdd-HHmmss"
            $branchName = "ai-reports/default-${dateStr}"
            $commitMsg = "[AI Automation] Pipeline=${PipelineName} Session=${pipelineSession} Status=${pipelineStatus}"

            Write-Host "  -> Git: committing to branch ${branchName}"

            & $gitExe fetch origin main 2>&1 | Out-Null
            & $gitExe checkout -b $branchName "origin/main" 2>&1 | Out-Null

            if ($LASTEXITCODE -eq 0) {
                & $gitExe add "IronLogicHQ/AI/reports/" "IronLogicHQ/AI/logs/" 2>&1 | Out-Null
                & $gitExe add $summaryFile 2>&1 | Out-Null
                & $gitExe commit -m $commitMsg 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    & $gitExe push origin $branchName 2>&1 | Out-Null
                    if ($LASTEXITCODE -eq 0) {
                        $pushSucceeded = $true
                        Write-Host "  -> Git: pushed to origin/${branchName}"
                    }
                    else { Write-Warning "Git push failed" }
                }
                else {
                    Write-Host "  -> Git: nothing to commit"
                    & $gitExe checkout main 2>&1 | Out-Null
                    & $gitExe branch -D $branchName 2>&1 | Out-Null
                }
            }
            else { Write-Warning "Git: could not create branch" }
        }
        else {
            Write-Host "  -> Git: not installed -- skipping"
        }
    }
    catch { Write-Warning "Git skipped: $_" }
}

[PSCustomObject]@{
    Pipeline       = $pipelineSession
    Status         = $pipelineStatus
    Steps          = $results.Count
    SuccessCount   = $successCount
    FailCount      = $failCount
    SummaryFile    = $summaryFile
    GitBranch      = $branchName
    GitPushed      = $pushSucceeded
    Results        = $results
}

if ($failCount -gt 0) { exit 1 } else { exit 0 }
