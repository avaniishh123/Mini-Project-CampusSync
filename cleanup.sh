#!/bin/bash
# Cleanup script for Replit disk space
echo 'Cleaning up unnecessary files to free disk space...'

# Remove Python cache files
find . -name __pycache__ -type d -exec rm -rf {} + 2>/dev/null || echo "No __pycache__ directories found"
find . -name '*.pyc' -delete
find . -name '*.pyo' -delete
find . -name '*.pyd' -delete

# Remove test images and large sample files
find ./backend -name 'pexels-*.jpg' -delete
find ./backend/static/uploads -type f -name '*.jpeg' -delete 2>/dev/null || echo "No jpeg files found"
find ./backend/static/uploads -type f -name '*.jpg' -delete 2>/dev/null || echo "No jpg files found"
find ./backend/static/uploads -type f -name '*.png' -delete 2>/dev/null || echo "No png files found"

# Clean up logs
rm -f ./backend/logs/*.log
rm -f ./backend/*.log
rm -f ./*.log

# Remove node modules if they exist (these are very large)
if [ -d "./frontend/node_modules" ]; then
    rm -rf ./frontend/node_modules
    echo "Removed node_modules folder"
fi

# Clean pip cache if it exists
if [ -d "~/.cache/pip" ]; then
    rm -rf ~/.cache/pip
    echo "Removed pip cache"
fi

# Clean jupyter notebooks output to save space
find . -name '*.ipynb' -exec jupyter nbconvert --clear-output --inplace {} \; 2>/dev/null || echo "No notebooks to clean"

echo 'Cleanup completed!'
