FROM node:latest
ENV NODE_ENV=production
WORKDIR /app

COPY package*.json
CMD npm install --production
COPY . .

CMD ["node", "booker.js"]