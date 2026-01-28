FROM node:20-bookworm

RUN apt-get update \
  && apt-get install -y texlive-full poppler-utils ghostscript \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json /app/package.json
RUN npm install --omit=dev

COPY server.js /app/server.js

EXPOSE 5005

CMD ["npm", "start"]
