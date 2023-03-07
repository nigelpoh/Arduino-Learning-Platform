FROM golang:alpine

ADD . /go/src/app
WORKDIR /go/src/app

ENV PORT=3000

RUN go get github.com/githubnemo/CompileDaemon

ENTRYPOINT CompileDaemon --build="go build main.go" --command=./main
#CMD ["go", "run", "main.go"]
