package models

import "gorm.io/gorm"

type Integracao struct {
	gorm.Model
	UsuarioID   uint   `json:"usuario_id"`
	Plataforma  string `json:"plataforma" gorm:"not null"` // "whatsapp", "instagram", "facebook", "tiktok"
	Status      string `json:"status"`                     // "conectado", "desconectado"
	AccessToken string `json:"access_token"`
	AccountID   string `json:"account_id"`
}
