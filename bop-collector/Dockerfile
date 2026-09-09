FROM python:3.12-slim

WORKDIR /app
COPY bop-collector/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY bop-collector/collector.py ./

CMD ["python", "collector.py"]
