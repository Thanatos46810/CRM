package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/mail"
	"os"
	"time"
)

func ValidarEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

// EnviarCodigoEmail dispara o envio em segundo plano via API HTTP do Resend
// (em vez de SMTP, que é bloqueado no plano free do Render).
func EnviarCodigoEmail(destinatario, codigo string) error {
	if !ValidarEmail(destinatario) {
		return fmt.Errorf("endereço de e-mail inválido")
	}

	apiKey := os.Getenv("SMTP_PASSWORD") // reaproveitando a mesma variável, que já guarda a API Key do Resend

	if apiKey == "" {
		fmt.Printf("[DEV LOG] Código %s gerado para o e-mail: %s\n", codigo, destinatario)
		return nil
	}

	go func() {
		if err := enviarViaResendAPI(apiKey, destinatario, codigo); err != nil {
			log.Printf("[EMAIL] Falha ao enviar código para %s: %v\n", destinatario, err)
		} else {
			log.Printf("[EMAIL] Código enviado com sucesso para %s\n", destinatario)
		}
	}()

	return nil
}

func enviarViaResendAPI(apiKey, destinatario, codigo string) error {
	payload := map[string]string{
		"from":    "CRM Pipeline <onboarding@resend.dev>",
		"to":      destinatario,
		"subject": "Codigo de Verificacao - CRM",
		"text":    fmt.Sprintf("Seu codigo de verificacao e: %s", codigo),
	}
	// EnviarCodigoResetSenha envia o código de redefinição de senha por e-mail
func EnviarCodigoResetSenha(destinatario, codigo string) error {
	if !ValidarEmail(destinatario) {
		return fmt.Errorf("endereço de e-mail inválido")
	}

	apiKey := os.Getenv("SMTP_PASSWORD")

	if apiKey == "" {
		fmt.Printf("[DEV LOG] Código de redefinição %s gerado para o e-mail: %s\n", codigo, destinatario)
		return nil
	}

	go func() {
		if err := enviarResetViaResendAPI(apiKey, destinatario, codigo); err != nil {
			log.Printf("[EMAIL] Falha ao enviar código de redefinição para %s: %v\n", destinatario, err)
		} else {
			log.Printf("[EMAIL] Código de redefinição enviado com sucesso para %s\n", destinatario)
		}
	}()

	return nil
}

func enviarResetViaResendAPI(apiKey, destinatario, codigo string) error {
	payload := map[string]string{
		"from":    "CRM Pipeline <onboarding@resend.dev>",
		"to":      destinatario,
		"subject": "Redefinicao de Senha - CRM",
		"text":    fmt.Sprintf("Seu codigo para redefinir a senha e: %s", codigo),
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("erro ao montar corpo da requisição: %v", err)
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("erro ao criar requisição: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("erro de conexão com a API do Resend: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("Resend retornou status %d", resp.StatusCode)
	}

	return nil
}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("erro ao montar corpo da requisição: %v", err)
	}

	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(body))
	if err != nil {
		return fmt.Errorf("erro ao criar requisição: %v", err)
	}
	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 15 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("erro de conexão com a API do Resend: %v", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("Resend retornou status %d", resp.StatusCode)
	}

	return nil
}