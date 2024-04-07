FROM node:18-alpine

WORKDIR /usr/src/app

COPY . .
RUN npm cache clear --force && npm run build

CMD ["node", "dist/server/server.js"]