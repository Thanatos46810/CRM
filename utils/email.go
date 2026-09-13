package utils

import (
	"fmt"
	"net/mail"
	"net/smtp"
	"os"
)

func ValidarEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

func EnviarCodigoEmail(destinatario, codigo string) error {
	if !ValidarEmail(destinatario) {
		return fmt.Errorf("endereço de e-mail inválido")
	}

	password := os.Getenv("SMTP_PASSWORD")
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")

	// Remetente padrão do Resend para ambiente de testes
	from := "onboarding@resend.dev"

	if password == "" {
		fmt.Printf("[DEV LOG] Código %s gerado para o e-mail: %s\n", codigo, destinatario)
		return nil
	}

	auth := smtp.PlainAuth("", "resend", password, smtpHost)
	msg := []byte(fmt.Sprintf("From: CRM Pipeline <%s>\r\n"+
		"To: %s\r\n"+
		"Subject: Codigo de Verificacao - CRM\r\n"+
		"\r\n"+
		"Seu codigo de verificacao e: %s\r\n", from, destinatario, codigo))

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, from, []string{destinatario}, msg)
	if err != nil {
		return fmt.Errorf("falha ao enviar e-mail: %v", err)
	}

	return nil
}
