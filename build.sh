#!/usr/bin/env bash
# Exit on error
set -o errexit

cd backend
pip install --upgrade pip
pip install -r requirements.txt
python manage.py collectstatic --no-input
python manage.py migrate
