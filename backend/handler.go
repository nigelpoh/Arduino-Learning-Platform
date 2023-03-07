package main

import (
	"encoding/json"
	"log"
	"text/template"
	"math/rand"
	"net/http"
	"os"
	"path/filepath"
)

type QuoteData struct {
	Header	string	`json:"header"`
	Quote		string	`json:"quote"`
}

type RawTemplateData struct {
	Quotes	[]QuoteData	`json:"quotes"`
}

type HandlerOptions struct {
	rhOptions *RecordHandlerOptions
	mailerOptions *MailerOptions
	acrhTimeoutIncrement int64
	errors chan error
	websiteDirectory string
	dataPath string
}

type Handler struct {
	acrh *AutoCommittingRecordHandler
	static http.Handler
	template *template.Template
	rtd *RawTemplateData
	mailer *Mailer
}

func NewHandler(options *HandlerOptions) (*Handler, error) {
	acrh, err := NewAutoCommittingRecordHandler(options.rhOptions, options.acrhTimeoutIncrement, options.errors)
	if err != nil {
		return nil, err
	}

	static := http.FileServer(http.Dir(options.websiteDirectory))
	t := template.Must(template.ParseFiles(filepath.Join(options.websiteDirectory, "index.html")))


	rtd, err := LoadDataFile(options.dataPath)
	if err != nil {
		return nil, err
	}

	mailer, err := NewMailer(options.mailerOptions)
	if err != nil {
		return nil, err
	}

	handler := &Handler {
		acrh,
		static,
		t,
		rtd,
		mailer,
	}

	return handler, nil
}

func LoadDataFile(filepath string) (*RawTemplateData, error) {
	file, err := os.Open(filepath)
	if err != nil {
		return nil, err
	}

	var rtd RawTemplateData
	d := json.NewDecoder(file)
	err = d.Decode(&rtd)
	if err != nil {
		return nil, err
	}

	return &rtd, nil
}

func (h *Handler) Close() {
	h.acrh.Close()
}

func (h *Handler) Router(w http.ResponseWriter, r *http.Request) {
	if r.URL.Path == "/" {
		h.Index(w, r)
	} else if r.URL.Path == "/register" && r.Method == http.MethodPost {
		h.Register(w, r)
	} else if r.URL.Path == "/pull" && r.Method == http.MethodPost {
		h.Pull(w, r)
	} else {
		h.static.ServeHTTP(w, r)
	}
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	email := r.FormValue("email")
	if email != "" {
		log.Println("Seems Correct!")
		if !(email == "thefoundrycollective@protonmail.com" || email == "nigelpjk@gmail.com") {
			/*
			err := h.acrh.WriteRecord(email)
			log.Println("No Error")
			if err != nil {
				log.Println(err)
				http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
				return
			}
			*/

			err := h.mailer.RecordEmail("admin@foundrycollective.io", email)
			if err != nil {
				log.Println(err)
				http.Redirect(w, r, "/", http.StatusFound)
				return
			}
		}

		err := h.mailer.SendResponse(email)
		if err != nil {
			log.Println(err)
			http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
			return
		}
	}

	http.Redirect(w, r, "/", http.StatusFound)
}

func (h *Handler) Index(w http.ResponseWriter, r *http.Request) {
	i := rand.Intn(len(h.rtd.Quotes))
	data := h.rtd.Quotes[i]

	h.template.Execute(w, &data)
}

func (h *Handler) Pull(w http.ResponseWriter, r *http.Request) {
	log.Println("pulling repo")
	err := h.acrh.rh.Pull()
	if err != nil {
		log.Println(err)
		http.Error(w, http.StatusText(http.StatusInternalServerError), http.StatusInternalServerError)
		return
	}

	// haha jank
	http.Error(w, http.StatusText(http.StatusOK), http.StatusOK)
}
