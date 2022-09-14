FROM node:lts-alpine as vue-stage
WORKDIR /app

# Install app dependencies.
COPY ./client/package*.json ./
RUN npm install

# Any steps below will be re-run upon each file change in your working directory.
ADD client/. .
RUN npm run build

FROM node:lts-alpine
WORKDIR /app

# Install app dependencies.
COPY ./service/package*.json ./
RUN npm install

# Copy front-end code.
COPY --from=vue-stage /app/dist /app/dist

# Any steps below will be re-run upon each file change in your working directory.
ADD service/. .
WORKDIR ./src
CMD ["npx", "ts-node", "./main.ts"]