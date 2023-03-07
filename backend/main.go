package main

import (
	"log"
	"net/http"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		log.Fatalln(err)
	}

	recordHandlerOptions := &RecordHandlerOptions {
		Name: os.Getenv("GIT_NAME"),
		Email: os.Getenv("GIT_EMAIL"),
		RepoPath: os.Getenv("REPO_PATH"),
		RepoURL: os.Getenv("GIT_REPO_URL"),
		KeyFile: os.Getenv("KEY_FILE"),
		RecordFile: os.Getenv("RECORD_FILE"),
	}

	mailerOptions := &MailerOptions {
		Username: os.Getenv("SMTP_USERNAME"),
		Password: os.Getenv("SMTP_PASSWORD"),
		Host: os.Getenv("SMTP_HOST"),
		Port: os.Getenv("SMTP_PORT"),
		From: os.Getenv("SMTP_FROM"),
		EmailPath: os.Getenv("EMAIL_PATH"),
	}

	timeoutIncrement, err := strconv.ParseInt(os.Getenv("TIMEOUT_INCREMENT"), 0, 64)
	if err != nil {
		log.Fatalln(err)
	}

	errors := make(chan error)
	handlerOptions := HandlerOptions {
		rhOptions: recordHandlerOptions,
		acrhTimeoutIncrement: timeoutIncrement,
		mailerOptions: mailerOptions,
		errors: errors,
		websiteDirectory: os.Getenv("WEBSITE_DIR"),
		dataPath: os.Getenv("DATA_PATH"),
	}

	handler, err := NewHandler(&handlerOptions)
	if err != nil {
		log.Fatalln(err)
		return
	}
	defer handler.Close()

	listen := os.Getenv("LISTEN")
	http.HandleFunc("/", handler.Router)

	log.Printf("listening at %s\n", listen)
	log.Fatalln(http.ListenAndServe(listen, nil))
}
