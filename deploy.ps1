Set-Location "C:\Users\yihao\chinese-challenge"
$env:PATH = "C:\Users\yihao\AppData\Roaming\npm;$env:PATH"
$result = & npx vercel --prod --yes 2>&1
$result | Out-File -FilePath "C:\Users\yihao\chinese-challenge\deploy_result.txt" -Encoding utf8
