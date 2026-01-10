Param(
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

function Move-RootDocsToDocsFolder {
    param(
        [string]$RepoRoot
    )
    $docsFolder = Join-Path $RepoRoot 'docs'
    if (-not (Test-Path $docsFolder)) {
        Write-Host "Creating docs folder at $docsFolder" -ForegroundColor Cyan
        New-Item -ItemType Directory -Path $docsFolder | Out-Null
    }

    $rootDocs = Get-ChildItem -Path $RepoRoot -Filter *.md -File | Where-Object { $_.Name -ne 'README.md' }
    foreach ($doc in $rootDocs) {
        $target = Join-Path $docsFolder $doc.Name
        if ($DryRun) {
            Write-Host "[DryRun] Would move: $($doc.FullName) -> $target" -ForegroundColor Yellow
        }
        else {
            Write-Host "Moving: $($doc.Name) -> docs/" -ForegroundColor Green
            Move-Item -Force -Path $doc.FullName -Destination $target
        }
    }
}

function RewriteLinks {
    param(
        [string]$RepoRoot
    )
    # 1) In README.md: change ./<file>.md to ./docs/<file>.md for known moved files
    $readmePath = Join-Path $RepoRoot 'README.md'
    if (Test-Path $readmePath) {
        $content = Get-Content -Path $readmePath -Raw
        # Replace links that point to root docs with docs/ versions
        $patterns = @(
            'ARCHITECTURE_IMPLEMENTATION.md', 'ARCHITECTURE.md', 'BARCODE_QR_FIX.md', 'CHECKOUT_IMPLEMENTATION_COMPLETE.md',
            'CI_CD_PIPELINE_UPDATES.md', 'CODE_CHANGES_DETAILED.md', 'context.md', 'CONTRIBUTING.md', 'ENV_USAGE.md',
            'FRONTEND_IMPLEMENTATION.md', 'IMPLEMENTATION_STATUS.md', 'IMPLEMENTATION_VERIFICATION.md', 'QR_BARCODE_TESTING_GUIDE.md',
            'QR_DATA_FLOW_FIX.md', 'QUICK_REFERENCE.md', 'SETUP.md', 'SOLUTION_COMPLETE.md', 'INVITE_PRODUCTION_ASSESSMENT.md', 'INVITE_GO_NODOGO.md'
        )
        foreach ($p in $patterns) {
            # Replace (./p) -> (./docs/p)
            $content = $content -replace "\(\./$p\)", "(./docs/$p)"
        }
        if ($DryRun) {
            Write-Host "[DryRun] README.md link rewrite simulated" -ForegroundColor Yellow
        }
        else {
            Set-Content -Path $readmePath -Value $content -NoNewline
        }
    }

    # 2) In docs/*.md: change ../<file>.md to ./<file>.md for any lingering references
    $docsFolder = Join-Path $RepoRoot 'docs'
    if (Test-Path $docsFolder) {
        Get-ChildItem -Path $docsFolder -Filter *.md -File -Recurse | ForEach-Object {
            $path = $_.FullName
            $content = Get-Content -Path $path -Raw
            $newContent = $content -replace "\(\.\.\/([A-Za-z0-9_\-]+\.md)(#[^)]+)?\)", "(./$1$2)"
            if ($newContent -ne $content) {
                if ($DryRun) {
                    Write-Host "[DryRun] Would rewrite relative links in: $path" -ForegroundColor Yellow
                }
                else {
                    Write-Host "Rewriting relative links in: $path" -ForegroundColor Green
                    Set-Content -Path $path -Value $newContent -NoNewline
                }
            }
        }
    }
}

# Entry
$repoRoot = Resolve-Path "." | Select-Object -ExpandProperty Path
Move-RootDocsToDocsFolder -RepoRoot $repoRoot
RewriteLinks -RepoRoot $repoRoot
