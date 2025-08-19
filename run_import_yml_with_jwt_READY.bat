@echo off
REM ============================================
REM One-click YML/XML import via Supabase Edge (JWT + secret)
REM ============================================

set "SB_URL=https://oqfrhvgzwstoxabttqno.supabase.co"
set "ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xZnJodmd6d3N0b3hhYnR0cW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3Njc3NTgsImV4cCI6MjA3MDM0Mzc1OH0.LW0LywEqkReNw6JOHvOCDGkr1ff55LTod9_IM_uKsjs"
set "IMPORT_SECRET=123321"
set "FEED_URL=https://www.shopeditor.com.ua/se_files/dropostore3EE755DD3639.xml"

echo.
echo Importing from: %FEED_URL%
echo Using Supabase: %SB_URL%
echo --------------------------------------------
echo Sending request...

curl -X POST ^
  -H "Authorization: Bearer %ANON_KEY%" ^
  -H "apikey: %ANON_KEY%" ^
  -H "X-Import-Token: %IMPORT_SECRET%" ^
  "%SB_URL%/functions/v1/import_yml?url=%FEED_URL%"

echo.
echo --------------------------------------------
echo Done.
echo Press any key to close...
pause >nul
