param(
    [Parameter(Mandatory = $false)]
    [ValidateSet("default", "nightly", "sunday", "weekly", "monthly", "weeklyUX", "weeklyIronLogic", "monthlyResearch", "custom")]
    [string]$PipelineName = "default",

    [Parameter(Mandatory = $false)]
    [string]$CustomPrompts = "",

    [Parameter(Mandatory = $false)]
    [string]$ProjectRoot = (Get-Location).Path,

    [Parameter(Mandatory = $false)]
    [string]$OpenCodeCmd = "opencode",

    [Parameter(Mandatory = $false)]
    [switch]$ShowVerbose
)

$ErrorActionPreference = "Stop"
$ProjectRoot = Resolve-Path $ProjectRoot
$aiDir = $ProjectRoot

# Load automation config
$configFile = Join-Path $ProjectRoot "IronLogicHQ\AI\automation_config.json"
$config = $null
if (Test-Path $configFile) {
    try { $config = Get-Content $configFile -Raw | ConvertFrom-Json } catch { }
}

# Pipeline definitions
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

# Resolve pipeline
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

# Paths
$runnerScript   = Join-Path $ProjectRoot "IronLogicHQ\AI\scripts\ai-runner.ps1"
$reportsDir     = Join-Path $ProjectRoot "IronLogicHQ\AI\reports"
$logsDir        = Join-Path $ProjectRoot "IronLogicHQ\AI\logs"
$promptsDir     = Join-Path $ProjectRoot "IronLogicHQ\AI\prompts"
$sessionLog     = Join-Path $logsDir "session.log"
$pipelineSession = "pipeline-$(Get-Date -Format 'yyyyMMdd_HHmmss')"
$timestamp      = Get-Date -Format "yyyy-MM-dd HH:mm:ss"

# Validate
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

# Execute steps
$results = @()
$context = ""
$aborted = $false

foreach ($step in $pipeline) {
    $promptName = $step.Prompt
    $label = $step.Label

    Write-Host "-- Step $($results.Count + 1): $label ($promptName) --"

    $stepSession = "$pipelineSession-$promptName"
    $stepLog = Join-Path $logsDir "$stepSession.log"

    # Log start
    $startLine = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] RUNNING: $promptName (session: $stepSession)"
    $startLine | Out-File -FilePath $stepLog -Encoding utf8

    # Build splat
    $splat = @{
        PromptName  = $promptName
        SessionId   = $stepSession
        ProjectRoot = $ProjectRoot
        OpenCodeCmd = $OpenCodeCmd
    }
    if ($context) { $splat.Context = $context }
    if ($ShowVerbose) { $splat.ShowVerbose = $true }

    # Execute
    try {
        $result = & $runnerScript @splat 2>&1
        $exitCode = $LASTEXITCODE
    }
    catch {
        $exitCode = 1
        $result = "ERROR: $_"
    }

    # Capture
    $status = if ($exitCode -eq 0) { "SUCCESS" } else { "FAILURE" }
    $resultObj = [PSCustomObject]@{
        PromptName = $promptName
        SessionId  = $stepSession
        Status     = $status
        ExitCode   = $exitCode
        Timestamp  = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    }
    $results += $resultObj

    # Log end
    $endLine = "[$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')] ${status}: $promptName (exit: $exitCode)"
    $endLine | Out-File -FilePath $stepLog -Encoding utf8 -Append
    $endLine | Out-File -FilePath $sessionLog -Encoding utf8 -Append

    Write-Host "  -> ${status} (exit code: $exitCode)"
    Write-Host "  -> Log: $stepLog"

    # Context for next step
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

# Build Executive Summary
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

# Save
$summaryFile = Join-Path $reportsDir "$pipelineSession-executive-summary.md"
$summary | Out-File -FilePath $summaryFile -Encoding utf8

# Log completion
$logLine = "[$timestamp] PIPELINE ${pipelineSession}: $successCount success, $failCount failure -- $pipelineStatus"
$logLine | Out-File -FilePath $sessionLog -Encoding utf8 -Append

Write-Host "+=================================================+"
Write-Host "|           Pipeline Complete                      |"
Write-Host "|  Status: $($pipelineStatus.PadRight(35))|"
Write-Host "|  $successCount succeeded, $failCount failed                         |"
Write-Host "|  Executive Summary: $(Split-Path $summaryFile -Leaf)   |"
Write-Host "+=================================================+"

# ================================================================
# Git commit and push (if enabled and pipeline succeeded)
# ================================================================
$branchName = $null
$pushSucceeded = $false

if ($config -and $config.git -and $config.git.enabled -eq $true -and $pipelineStatus -eq "SUCCESS") {
    try {
        # Locate git.exe
        $gitCmd = Get-Command "git.exe" -ErrorAction SilentlyContinue
        if (-not $gitCmd) { $gitCmd = Get-Command "git" -ErrorAction SilentlyContinue }
        if (-not $gitCmd) {
            # Search common install locations + GitHub Desktop bundled git
            $gitPaths = @(
                "${env:ProgramFiles}\Git\bin\git.exe",
                "${env:ProgramFiles(x86)}\Git\bin\git.exe",
                "$env:LOCALAPPDATA\Programs\Git\bin\git.exe",
                "${env:ProgramFiles}\Git\cmd\git.exe",
                "${env:ProgramFiles(x86)}\Git\cmd\git.exe"
            )
            # Add GitHub Desktop bundled git (version wildcard)
            $ghDesktopPaths = Get-ChildItem "$env:LOCALAPPDATA\GitHubDesktop\app-*\resources\app\git\cmd\git.exe" -ErrorAction SilentlyContinue
            foreach ($gp in $ghDesktopPaths) { $gitPaths += $gp.FullName }
            foreach ($gp in $gitPaths) {
                if (Test-Path $gp) { $gitCmd = $gp; break }
            }
        }

        if ($gitCmd) {
            $gitExe = if ($gitCmd -is [System.Management.Automation.CommandInfo]) { $gitCmd.Source } else { $gitCmd }
            $remote = if ($config.git.remote) { $config.git.remote } else { "origin" }
            $prefix = if ($config.git.branch_prefix) { $config.git.branch_prefix } else { "ai-reports" }
            $base   = if ($config.git.base_branch) { $config.git.base_branch } else { "main" }
            $msgPre = if ($config.git.commit_message_prefix) { $config.git.commit_message_prefix } else { "[AI Automation]" }
            $dateStr = Get-Date -Format "yyyyMMdd-HHmmss"
            $branchName = "${prefix}/${PipelineName}-${dateStr}"
            $commitMsg = "${msgPre} Pipeline=${PipelineName} Session=${pipelineSession} Status=${pipelineStatus}"

            Write-Host "  -> Git: committing to branch ${branchName}"

            # Fetch latest base branch
            & $gitExe fetch $remote $base 2>&1 | Out-Null

            # Create and switch to a new feature branch
            & $gitExe checkout -b $branchName "$remote/$base" 2>&1 | Out-Null

            if ($LASTEXITCODE -eq 0) {
                # Stage configured files
                $filesToCommit = if ($config.git.files_to_commit) { @($config.git.files_to_commit) } else { @("IronLogicHQ/AI/reports/", "IronLogicHQ/AI/logs/") }
                foreach ($f in $filesToCommit) { & $gitExe add $f 2>&1 | Out-Null }

                # Also add the executive summary explicitly
                & $gitExe add $summaryFile 2>&1 | Out-Null

                # Commit
                & $gitExe commit -m $commitMsg 2>&1 | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "  -> Git: commit successful"
                    # Push
                    & $gitExe push $remote $branchName 2>&1 | Out-Null
                    if ($LASTEXITCODE -eq 0) {
                        $pushSucceeded = $true
                        Write-Host "  -> Git: pushed to ${remote}/${branchName}"
                    } else {
                        Write-Warning "Git push failed (remote may not be accessible)"
                    }
                } else {
                    Write-Host "  -> Git: nothing to commit (no changes)"
                    & $gitExe checkout $base 2>&1 | Out-Null
                    & $gitExe branch -D $branchName 2>&1 | Out-Null
                }
            } else {
                Write-Warning "Git: could not create branch ${branchName} from ${remote}/${base}"
            }
        } else {
            Write-Host "  -> Git: not installed -- skipping commit/push"
            Write-Host "  -> Install Git for Windows from https://git-scm.com to enable this feature"
        }
    }
    catch {
        Write-Warning "Git operation skipped: $_"
    }
}
else {
    if ($pipelineStatus -ne "SUCCESS") {
        Write-Host "  -> Git: skipped (pipeline did not succeed)"
    }
    elseif (-not $config -or -not $config.git -or $config.git.enabled -ne $true) {
        Write-Host "  -> Git: disabled in automation_config.json"
    }
}

# Return
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
