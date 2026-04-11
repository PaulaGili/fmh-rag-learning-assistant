FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/main.py .
COPY backend/rag.py .

RUN mkdir -p data && \
    curl -fL "https://raw.githubusercontent.com/PaulaGili/fmh-rag-learning-assistant/main/data/fmh_info.json" -o data/fmh_info.json && \
    curl -fL "https://github.com/PaulaGili/fmh-rag-learning-assistant/raw/main/data/embeddings.npy" -o data/embeddings.npy

ENV PYTHONUNBUFFERED=1
ENV DATA_DIR=/app/data

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=10s --start-period=120s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:7860/health')" || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
