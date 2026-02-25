FROM python:3.12-slim

RUN pip install pytest --no-cache-dir

WORKDIR /code

RUN useradd -m -u 1000 sandbox
USER sandbox

CMD ["pytest", "--tb=short", "-v"]
