@echo off
set FEED=https://www.shopeditor.com.ua/se_files/dropostore3EE755DD3639.xml
set URL=https://oqfrhvgzwstoxabttqno.supabase.co/functions/v1/import_yml

rem --- ваші значення ---
set ANON=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xZnJodmd6d3N0b3hhYnR0cW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ3Njc3NTgsImV4cCI6MjA3MDM0Mzc1OH0.LW0LywEqkReNw6JOHvOCDGkr1ff55LTod9_IM_uKsjs
set SECRET=123321
rem ----------------------

echo Importing from: %FEED%
echo Using Supabase: %URL%
echo ---------------------------------------------

curl -L -X POST "%URL%" ^
  -H "Authorization: Bearer %ANON%" ^
  -H "X-Import-Secret: %SECRET%" ^
  -H "Content-Type: application/json" ^
  --data "{\"url\":\"%FEED%\"}"

echo ---------------------------------------------
echo Done.
pause
