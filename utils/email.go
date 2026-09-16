package utils

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/mail"
	"os"
	"time"
)

func ValidarEmail(email string) bool {
	_, err := mail.ParseAddress(email)
	return err == nil
}

// EnviarCodigoEmail envia o código de verificação pela API HTTP do Resend.
func EnviarCodigoEmail(destinatario, codigo string) error {
	return enviarCodigo(destinatario, codigo, "Codigo de Verificacao - CRM", "Seu codigo de verificacao e: %s")
}

// EnviarCodigoResetSenha envia o código de redefinição de senha por e-mail.
func EnviarCodigoResetSenha(destinatario, codigo string) error {
	return enviarCodigo(destinatario, codigo, "Redefinicao de Senha - CRM", "Seu codigo para redefinir a senha e: %s")
}

func enviarCodigo(destinatario, codigo, assunto, mensagem string) error {
	if !ValidarEmail(destinatario) {
		return fmt.Errorf("endereço de e-mail inválido")
	}

	apiKey := os.Getenv("RESEND_API_KEY")
	if apiKey == "" {
		apiKey = os.Getenv("SMTP_PASSWORD")
	}

	if apiKey == "" {
		return fmt.Errorf("serviço de e-mail não configurado: defina RESEND_API_KEY")
	}

	return enviarViaResendAPI(apiKey, destinatario, assunto, fmt.Sprintf(mensagem, codigo))
}

func enviarViaResendAPI(apiKey, destinatario, assunto, mensagem string) error {
	remetente := os.Getenv("EMAIL_FROM")
	if remetente == "" {
		remetente = "CRM Pipeline <onboarding@resend.dev>"
	}

	payload := map[string]string{
		"from":    remetente,
		"to":      destinatario,
		"subject": assunto,
		"text":    mensagem,
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
		resposta, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return fmt.Errorf("Resend retornou status %d: %s", resp.StatusCode, string(resposta))
	}

	return nil
}
