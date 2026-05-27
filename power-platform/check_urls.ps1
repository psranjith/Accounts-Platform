$base = 'http://127.0.0.1:5510'
$pages = @('index','dashboard','companies','documents','inbox','launch-tally','reports','reports-company','assistant','pricing','subscription')
$urls = @()
$urls += "$base/preview/index.html"
foreach ($p in $pages) { $urls += "$base/preview/index.html?page=$p" }
foreach ($p in $pages) { $urls += "$base/power-platform/portal/pages/$p.liquid" }
$urls += "$base/power-platform/portal/templates/adp-user-context.liquid"
$urls += "$base/power-platform/catalog/bundles.json"
$urls += "$base/power-platform/catalog/powerbi-reports.json"
$urls += "$base/preview/preview.js"
$urls += "$base/preview/preview.css"
$urls += "$base/preview/rdp/SmartsoftTallyServer.rdp"

foreach ($u in $urls) {
  try {
    $r = Invoke-WebRequest -Uri $u -Method Head -UseBasicParsing -TimeoutSec 10 -ErrorAction Stop
    Write-Host "$u, $($r.StatusCode)"
  } catch {
    $code = if ($_.Exception.Response) { [int]$_.Exception.Response.StatusCode } else { 'ERR' }
    Write-Host "$u, $code"
  }
}
