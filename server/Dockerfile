FROM python:3.14-slim

WORKDIR /app

# Copy only requirements first for better cache usage
COPY api/requirements.txt ./

RUN pip install -r requirements.txt

# Copy the full server tree (build context is the server folder)
COPY . /app/server

CMD ["uvicorn", "server.api.main:app", "--host", "0.0.0.0", "--port", "8000"]