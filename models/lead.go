package models

import "gorm.io/gorm"

type Lead struct {
	gorm.Model
	UsuarioID uint    `json:"usuario_id"`
	Nome      string  `json:"nome" binding:"required"`
	Email     string  `json:"email" binding:"required"`
	Telefone  string  `json:"telefone"`
	Empresa   string  `json:"empresa"`
	Status    string  `json:"status"`
	Valor     float64 `json:"valor"`
	Canal     string  `json:"canal"` // ex: "whatsapp", "instagram", "facebook", "tiktok", "manual"
}
