FROM golang:1.15-alpine as build

RUN apk add --no-cache git ca-certificates

WORKDIR /src
COPY go.mod go.sum *.go ./
RUN CGO_ENABLED=0 go build -ldflags "-s -w"

FROM scratch

COPY .env /.env
COPY id_ed25519 /id_ed25519
COPY known_hosts /known_hosts
COPY cycle_content.json ./cycle_content.json
COPY email.html /email.html
COPY --from=build /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/
COPY --from=build /src/backend /backend

ENTRYPOINT ["/backend"]
