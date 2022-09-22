FROM node:lts-alpine

# The port that your application listens to.
EXPOSE 3000

# Set /app as the working directory.
WORKDIR /app

# Install build dependencies for Cypher parser.
RUN apk add --no-cache git make gcc g++ python3

# Install app dependencies. A wildcard is used to ensure both package.json
# AND package-lock.json are copied.
COPY package*.json ./
RUN npm install

# Any steps below will be re-run upon each file change in your working directory.
ADD . .

# Run main.ts.
CMD ["npx", "ts-node", "./src/main.ts"]
