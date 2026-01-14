FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built files
COPY dist ./dist

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "dist/index.js"]
