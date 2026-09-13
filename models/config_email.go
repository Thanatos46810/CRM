package models

import "gorm.io/gorm"

type ConfigEmailUsuario struct {
	gorm.Model
	UsuarioID uint   `json:"usuario_id" gorm:"not null;unique"`
	Provedor  string `json:"provedor"` // "gmail", "outlook", "custom"
	SmtpHost  string `json:"smtp_host"`
	SmtpPort  string `json:"smtp_port"`
	SmtpUser  string `json:"smtp_user"`
	SmtpPass  string `json:"smtp_pass"` // Criptografado no banco
	UsarSSL   bool   `json:"usar_ssl"`
}
