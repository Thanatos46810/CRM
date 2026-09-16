package controllers

import (
	"fmt"
	"math/rand"
	"net/http"
	"time"

	"crm-backend/config"
	"crm-backend/models"
	"crm-backend/utils"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

type SolicitarResetInput struct {
	Email string `json:"email" binding:"required,email"`
}

type RedefinirSenhaInput struct {
	Email     string `json:"email" binding:"required,email"`
	Codigo    string `json:"codigo" binding:"required"`
	NovaSenha string `json:"nova_senha" binding:"required,min=6"`
}

// SolicitarResetSenha gera um código de redefinição e envia por e-mail
func SolicitarResetSenha(c *gin.Context) {
	var input SolicitarResetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var usuario models.Usuario
	if err := config.DB.Where("email = ?", input.Email).First(&usuario).Error; err != nil {
		// Por segurança, não revela se o e-mail existe ou não na base
		c.JSON(http.StatusOK, gin.H{"message": "Se este e-mail estiver cadastrado, um código de redefinição foi enviado."})
		return
	}

	rand.Seed(time.Now().UnixNano())
	codigo := fmt.Sprintf("%06d", rand.Intn(1000000))

	usuario.CodigoResetSenha = codigo
	config.DB.Save(&usuario)

	utils.EnviarCodigoResetSenha(usuario.Email, codigo)

	c.JSON(http.StatusOK, gin.H{"message": "Se este e-mail estiver cadastrado, um código de redefinição foi enviado."})
}

// RedefinirSenha valida o código e atualiza a senha do usuário
func RedefinirSenha(c *gin.Context) {
	var input RedefinirSenhaInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var usuario models.Usuario
	if err := config.DB.Where("email = ? AND codigo_reset_senha = ?", input.Email, input.Codigo).First(&usuario).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Código inválido ou expirado"})
		return
	}

	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.NovaSenha), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao processar nova senha"})
		return
	}

	usuario.Senha = string(hashedPassword)
	usuario.CodigoResetSenha = ""
	config.DB.Save(&usuario)

	c.JSON(http.StatusOK, gin.H{"message": "Senha redefinida com sucesso"})
}