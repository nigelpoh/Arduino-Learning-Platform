package main

import (
	"encoding/base64"
	"fmt"
	"log"
	"io/ioutil"

	"net/smtp"
	// "github.com/emersion/go-sasl"
	// "github.com/emersion/go-smtp"
)

type MailerOptions struct {
	Username	string
	Password	string
	Host			string
	Port			string
	From			string
	EmailPath	string
}

type Mailer struct {
	auth			smtp.Auth
	// auth			sasl.Client
	smtpHost	string
	from			string
	email			string
}

func NewMailer(options *MailerOptions) (*Mailer, error) {
	username := base64.StdEncoding.EncodeToString([]byte(options.Username))
	password := base64.StdEncoding.EncodeToString([]byte(options.Password))
	log.Printf("%s, %s", username, password)

	// auth := smtp.PlainAuth("", username, password, options.Host)
	auth := smtp.PlainAuth("", options.Username, options.Password, options.Host)
	// auth := sasl.NewPlainClient("", options.Username, options.Password)
	smtpHost := options.Host + ":" + options.Port

	emailBody, err := ioutil.ReadFile(options.EmailPath)
	if err != nil {
		return nil, err
	}

	email := "Subject: Thank you for registering!" + "\r\n\r\n" + string(emailBody)

	m := &Mailer {
		auth,
		smtpHost,
		options.From,
		email,
	}

	return m, nil
}

func (m *Mailer) RecordEmail(to string, email string) error {
	msg := fmt.Sprintf("MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\r\nFrom: \"foundry::kits\" <%s>\r\nTo: \"OPS\" <%s>\r\nSubject: New signup\r\n\r\n%s\r\n", m.from, to, email)
	return m.SendMail(to, msg)
}

func (m *Mailer) SendResponse(to string) error {
	msg := fmt.Sprintf("MIME-version: 1.0;\nContent-Type: text/html; charset=\"UTF-8\";\r\nFrom: \"foundry::kits\" <%s>\r\nTo: \"New friend!\" <%s>\r\n%s", m.from, to, m.email)

	err := m.SendMail(to, msg)
	if err != nil {
		return err
	}

	return nil
}

func (m *Mailer) SendMail(to string, msg string) error {
	err := smtp.SendMail(m.smtpHost, m.auth, m.from, []string{to},[]byte(msg))
	if err != nil {
		return err
	}

	return nil
}


