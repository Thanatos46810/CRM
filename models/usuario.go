package models

import "gorm.io/gorm"

type Usuario struct {
	gorm.Model
	Nome              string `json:"nome" binding:"required"`
	Email             string `json:"email" gorm:"unique;not null" binding:"required"`
	Senha             string `json:"senha,omitempty" binding:"required"`
	CodigoVerificacao string `json:"-"`
	Verificado        bool   `json:"verificado" gorm:"default:false"`
}
