FROM node:latest
WORKDIR /usr/src/app
COPY SimplePeopleStoring-app/package*.json ./
RUN npm install
COPY SimplePeopleStoring-app/ ./
EXPOSE 3000
CMD ["node", "index.js"]