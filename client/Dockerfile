ARG NODE_VERSION=20.20.1-alpine

FROM node:${NODE_VERSION} AS dev

WORKDIR /app
RUN chown node:node /app

USER node

COPY --chown=node:node package*.json ./

RUN npm install

COPY --chown=node:node . .

EXPOSE 5173

ENTRYPOINT [ "/app/entrypoint.sh" ]

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]