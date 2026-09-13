package models

import "gorm.io/gorm"

type Mensagem struct {
	gorm.Model
	LeadID uint   `json:"lead_id" binding:"required"`
	Texto  string `json:"texto" binding:"required"`
	Autor  string `json:"autor"`
}
