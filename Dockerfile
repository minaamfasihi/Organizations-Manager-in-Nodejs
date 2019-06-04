FROM node:8

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

RUN npm install -g nodemon

COPY package*.json ./

# RUN npm install && mv /usr/src/app/node_modules /node_modules

RUN npm install

COPY . .

CMD ["npm", "run", "start"]
