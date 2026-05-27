FROM mirror.gcr.io/library/node:22-bookworm
WORKDIR /usr/src/app
COPY SimplePeopleStoring-app/package*.json ./
RUN npm ci
COPY SimplePeopleStoring-app/ ./
EXPOSE 3000
CMD ["node", "index.js"]