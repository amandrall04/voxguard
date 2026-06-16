FROM node:22-bookworm-slim

WORKDIR /app

# Install ffmpeg/ffprobe for audio analysis
RUN rm -f /etc/apt/sources.list.d/debian.sources \
	&& printf '%s\n' \
		'deb http://deb.debian.org/debian bookworm main' \
		'deb http://deb.debian.org/debian bookworm-updates main' \
		'deb http://security.debian.org/debian-security bookworm-security main' \
		> /etc/apt/sources.list \
	&& apt-get update -o Acquire::Retries=3 -o Acquire::http::No-Cache=true \
	&& apt-get install -y --no-install-recommends ffmpeg python3 python3-pip python3-venv libsndfile1 \
	&& rm -rf /var/lib/apt/lists/*


# Install dependencies
ARG NPM_REGISTRY=https://registry.npmjs.org/
ENV NPM_CONFIG_REGISTRY=$NPM_REGISTRY
COPY package*.json ./
RUN npm config set fetch-retries 8 \
	&& npm config set fetch-retry-mintimeout 20000 \
	&& npm config set fetch-retry-maxtimeout 180000 \
	&& npm config set fetch-timeout 600000 \
	&& npm config set prefer-offline false \
	&& npm config set maxsockets 1 \
	&& npm config set progress false \
	&& npm install --include=dev --no-audit --no-fund

# Install Python dependencies for feature extraction
COPY ml/requirements.txt ./ml/requirements.txt
RUN python3 -m venv /opt/venv \
	&& /opt/venv/bin/pip install --no-cache-dir -r ./ml/requirements.txt

ENV PATH="/opt/venv/bin:$PATH"
ENV PYTHON_BIN="/opt/venv/bin/python"

# Copy source code
COPY . .

# Build the application
RUN npm run build

ENV NODE_ENV=production

# Expose the port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
