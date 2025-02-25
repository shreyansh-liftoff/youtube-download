FROM node:18-slim

# Install dependencies
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    gnupg2 \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment and install yt-dlp inside it
RUN python3 -m venv /opt/yt-dlp-env \
    && /opt/yt-dlp-env/bin/pip install --no-cache-dir yt-dlp

# Set environment variable to use the virtual environment
ENV PATH="/opt/yt-dlp-env/bin:$PATH"

# Create a non-root user
RUN groupadd -r pptruser && useradd -r -g pptruser -G audio,video pptruser \
    && mkdir -p /home/pptruser/Downloads \
    && chown -R pptruser:pptruser /home/pptruser

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PORT=8001

# Set the working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .
RUN chown -R pptruser:pptruser /app

# Build TypeScript
RUN npm run build

# Switch to non-root user
USER pptruser

# Expose the port
EXPOSE 8001

# Start the application
CMD ["npm", "run", "dev"]