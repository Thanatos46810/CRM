package utils

import (
	"fmt"
	"log"
	"net/mail"
	"net/smtp"
	"os"
	"time"
)

func ValidarEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

// EnviarCodigoEmail dispara o envio em segundo plano (goroutine) para não travar
// a resposta HTTP caso o SMTP demore ou falhe. Erros são apenas logados no servidor.
func EnviarCodigoEmail(destinatario, codigo string) error {
	if !ValidarEmail(destinatario) {
		return fmt.Errorf("endereço de e-mail inválido")
	}

	password := os.Getenv("SMTP_PASSWORD")
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	from := "onboarding@resend.dev"

	if password == "" {
		fmt.Printf("[DEV LOG] Código %s gerado para o e-mail: %s\n", codigo, destinatario)
		return nil
	}

	// Dispara em background com timeout próprio, para nunca travar quem chamou esta função
	go func() {
		if err := enviarComTimeout(smtpHost, smtpPort, password, from, destinatario, codigo); err != nil {
			log.Printf("[EMAIL] Falha ao enviar código para %s: %v\n", destinatario, err)
		} else {
			log.Printf("[EMAIL] Código enviado com sucesso para %s\n", destinatario)
		}
	}()

	return nil
}

func enviarComTimeout(smtpHost, smtpPort, password, from, destinatario, codigo string) error {
	done := make(chan error, 1)

	go func() {
		auth := smtp.PlainAuth("", "resend", password, smtpHost)
		msg := []byte(fmt.Sprintf("From: CRM Pipeline <%s>\r\n"+
			"To: %s\r\n"+
			"Subject: Codigo de Verificacao - CRM\r\n"+
			"\r\n"+
			"Seu codigo de verificacao e: %s\r\n", from, destinatario, codigo))

		err := smtp.SendMail(smtpHost+":"+smtpPort, auth, from, []string{destinatario}, msg)
		done <- err
	}()

	select {
	case err := <-done:
		return err
	case <-time.After(15 * time.Second):
		return fmt.Errorf("tempo esgotado ao conectar no servidor SMTP (%s:%s)", smtpHost, smtpPort)
	}
}
