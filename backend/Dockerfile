# Use an official slim Python image as a base
FROM python:3.10.12-slim

# Install system packages (including build-essential and Cargo, if needed)
RUN apt-get update && apt-get install -y --no-install-recommends \
      build-essential \
      cargo \
 && rm -rf /var/lib/apt/lists/*

# Set the working directory
WORKDIR /app

# Copy the requirements file into the image
COPY requirements.txt .

# Install Python dependencies
RUN python -m pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code
COPY . .

# Expose the port (e.g., 8000)
EXPOSE 8000

# Run Uvicorn via Python module syntax to avoid PATH issues
CMD ["python", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]
