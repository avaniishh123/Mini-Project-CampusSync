# Cleanup script for Replit disk space
echo 'Cleaning up unnecessary files to free disk space...'

# Remove Python cache files
Get-ChildItem -Path . -Include "__pycache__" -Directory -Recurse | Remove-Item -Force -Recurse
Get-ChildItem -Path . -Include "*.pyc","*.pyo","*.pyd" -File -Recurse | Remove-Item -Force

# Remove test images and large sample files
Get-ChildItem -Path ./backend -Filter "pexels-*.jpg" -Recurse | Remove-Item -Force
Get-ChildItem -Path ./backend/static/uploads -Include "*.jpeg","*.jpg","*.png" -File -Recurse | Remove-Item -Force

# Clean up logs
Get-ChildItem -Path ./backend/logs -Filter "*.log" -File | Remove-Item -Force
Get-ChildItem -Path ./backend -Filter "*.log" -File | Remove-Item -Force
Get-ChildItem -Path . -Filter "*.log" -File | Remove-Item -Force

# Remove node modules if they exist (these are very large)
if (Test-Path ./frontend/node_modules) {
    Remove-Item -Path ./frontend/node_modules -Recurse -Force
}

echo 'Cleanup completed!'
