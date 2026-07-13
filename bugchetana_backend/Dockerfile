FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt
# (Note: gunicorn is required for the CMD below. It will need to be in requirements.txt)

COPY . /app/

# Collect static files (STATIC_URL is configured in settings)
RUN SECRET_KEY=dummy-key-for-build python manage.py collectstatic --noinput


EXPOSE 8000

ENTRYPOINT ["sh", "/app/entrypoint.sh"]
