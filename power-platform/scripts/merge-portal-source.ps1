param(
  [string]$RepoPortal = (Resolve-Path "$PSScriptRoot/../portal").Path,
  [string]$SitePath   = (Resolve-Path "$PSScriptRoot/../portal-download/smart---site-mgrkm").Path
)

$ErrorActionPreference = "Stop"

$PageTemplate    = "311ba2bb-807d-4741-ac43-c06d3651ea0e"
$PublishingState = "026485d7-b15a-43f3-8a94-1bb15dd5b95b"
$LanguageId      = "59fabf29-a73b-4ec0-9b7e-f88d30bf698c"
$HomeRootId      = "bdb8b5b0-d546-463d-a7cc-d18ee51e6a4e"

function New-Guid2 { [Guid]::NewGuid().ToString().ToLower() }

function Write-File([string]$Path, [string]$Content) {
  $dir = Split-Path -Parent $Path
  if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  Set-Content -LiteralPath $Path -Value $Content -Encoding UTF8 -NoNewline
}

# 1) Web template: adp-user-context
$tplDir = Join-Path $SitePath "web-templates/adp-user-context"
if (-not (Test-Path $tplDir)) { New-Item -ItemType Directory -Path $tplDir | Out-Null }
$tplYml = @"
adx_name: adp-user-context
adx_webtemplateid: $(New-Guid2)
"@
$tplSrc = Get-Content -LiteralPath (Join-Path $RepoPortal "templates/adp-user-context.liquid") -Raw
Write-File (Join-Path $tplDir "Adp-User-Context.webtemplate.yml") $tplYml
Write-File (Join-Path $tplDir "Adp-User-Context.webtemplate.source.html") $tplSrc
Write-Host "Wrote web template: adp-user-context"

# 2) Replace Home page content with index.liquid
$indexLiquid = Get-Content -LiteralPath (Join-Path $RepoPortal "pages/index.liquid") -Raw
Write-File (Join-Path $SitePath "web-pages/home/Home.webpage.copy.html") $indexLiquid
Write-File (Join-Path $SitePath "web-pages/home/content-pages/Home.en-US.webpage.copy.html") $indexLiquid
Write-Host "Updated Home page copy from index.liquid"

# 3) Create new pages
$pages = @(
  @{ Slug = "dashboard";    File = "Dashboard";     Title = "Dashboard";     Url = "dashboard";    Source = "dashboard.liquid"    },
  @{ Slug = "companies";    File = "Companies";     Title = "Companies";     Url = "companies";    Source = "companies.liquid"    },
  @{ Slug = "documents";    File = "Documents";     Title = "Documents";     Url = "documents";    Source = "documents.liquid"    },
  @{ Slug = "reports";      File = "Reports";       Title = "Reports";       Url = "reports";      Source = "reports.liquid"      },
  @{ Slug = "assistant";    File = "Assistant";     Title = "Assistant";     Url = "assistant";    Source = "assistant.liquid"    },
  @{ Slug = "inbox";        File = "Inbox";         Title = "Inbox";         Url = "inbox";        Source = "inbox.liquid"        },
  @{ Slug = "launch-tally"; File = "Launch-Tally";  Title = "Launch Tally";  Url = "launch-tally"; Source = "launch-tally.liquid" }
)

foreach ($p in $pages) {
  $pageDir    = Join-Path $SitePath "web-pages/$($p.Slug)"
  $contentDir = Join-Path $pageDir "content-pages"
  if (-not (Test-Path $pageDir))    { New-Item -ItemType Directory -Path $pageDir    | Out-Null }
  if (-not (Test-Path $contentDir)) { New-Item -ItemType Directory -Path $contentDir | Out-Null }

  $rootId = New-Guid2
  $langId = New-Guid2

  $rootYml = @"
adx_displayorder: 1
adx_enablerating: false
adx_enabletracking: false
adx_excludefromsearch: false
adx_feedbackpolicy: 756150005
adx_hiddenfromsitemap: false
adx_isroot: true
adx_name: $($p.Title)
adx_pagetemplateid: $PageTemplate
adx_parentpageid: $HomeRootId
adx_partialurl: $($p.Url)
adx_publishingstateid: $PublishingState
adx_sharedpageconfiguration: false
adx_title: $($p.Title)
adx_webpageid: $rootId
"@

  $langYml = @"
adx_displayorder: 1
adx_enablerating: false
adx_enabletracking: false
adx_excludefromsearch: false
adx_feedbackpolicy: 756150005
adx_hiddenfromsitemap: false
adx_isroot: false
adx_name: $($p.Title)
adx_pagetemplateid: $PageTemplate
adx_parentpageid: $HomeRootId
adx_partialurl: $($p.Url)
adx_publishingstateid: $PublishingState
adx_rootwebpageid: $rootId
adx_sharedpageconfiguration: false
adx_title: $($p.Title)
adx_webpageid: $langId
adx_webpagelanguageid: $LanguageId
"@

  $copy = Get-Content -LiteralPath (Join-Path $RepoPortal "pages/$($p.Source)") -Raw

  Write-File (Join-Path $pageDir    "$($p.File).webpage.yml")                                $rootYml
  Write-File (Join-Path $pageDir    "$($p.File).webpage.copy.html")                          $copy
  Write-File (Join-Path $pageDir    "$($p.File).webpage.custom_css.css")                     ""
  Write-File (Join-Path $pageDir    "$($p.File).webpage.custom_javascript.js")               ""
  Write-File (Join-Path $pageDir    "$($p.File).webpage.summary.html")                       ""
  Write-File (Join-Path $contentDir "$($p.File).en-US.webpage.yml")                          $langYml
  Write-File (Join-Path $contentDir "$($p.File).en-US.webpage.copy.html")                    $copy
  Write-File (Join-Path $contentDir "$($p.File).en-US.webpage.custom_css.css")               ""
  Write-File (Join-Path $contentDir "$($p.File).en-US.webpage.custom_javascript.js")         ""
  Write-File (Join-Path $contentDir "$($p.File).en-US.webpage.summary.html")                 ""

  Write-Host "Created page: $($p.Title) (/$($p.Url))"
}

Write-Host "Merge completed."
