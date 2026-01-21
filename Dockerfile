FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

RUN npm install -g serve

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 4222

ENTRYPOINT ["/entrypoint.sh"]
CMD ["serve", "-s", "dist/ng-hse-monitoring/browser", "-l", "4222"]
