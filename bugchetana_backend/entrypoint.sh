#!/bin/sh
set -e

echo "Collecting static files..."
python manage.py collectstatic --noinput

echo "Starting Gunicorn..."
exec gunicorn bugchetana_backend.wsgi:application --bind 0.0.0.0:8000