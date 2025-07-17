# Use Node 18 (LTS) or Node 20 (latest LTS)
FROM node:20

WORKDIR /app

# Copy only package.json and lock file first for better caching
COPY package*.json ./

# Clean install dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]