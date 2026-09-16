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

// Registrar trata o cadastro de novos usuários e disparo do código de e-mail
func Registrar(c *gin.Context) {
	var input struct {
		Nome  string `json:"nome" binding:"required"`
		Email string `json:"email" binding:"required"`
		Senha string `json:"senha" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados inválidos fornecidos"})
		return
	}

	// 1. Valida a sintaxe do e-mail
	if !utils.ValidarEmail(input.Email) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Endereço de e-mail inválido"})
		return
	}

	// 2. Verifica se o usuário já existe
	var usuarioExistente models.Usuario
	errExistente := config.DB.Where("email = ?", input.Email).First(&usuarioExistente).Error

	rand.Seed(time.Now().UnixNano())
	codigo := fmt.Sprintf("%06d", rand.Intn(1000000))

	if errExistente == nil {
		// Se já existe e está verificado, bloqueia
		if usuarioExistente.Verificado {
			c.JSON(http.StatusBadRequest, gin.H{"error": "E-mail já cadastrado"})
			return
		}

		// Se existe mas não foi verificado, atualiza código e reenvia
		usuarioExistente.CodigoVerificacao = codigo
		if err := config.DB.Save(&usuarioExistente).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao atualizar código de verificação"})
			return
		}

		if err := utils.EnviarCodigoEmail(usuarioExistente.Email, codigo); err != nil {
			c.JSON(http.StatusBadGateway, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message": fmt.Sprintf("Código reenviado para a sua conta (%s)", usuarioExistente.Email),
			"email":   usuarioExistente.Email,
		})
		return
	}

	// 3. Criptografa a senha com Bcrypt para novo cadastro
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Senha), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao processar senha"})
		return
	}

	usuario := models.Usuario{
		Nome:              input.Nome,
		Email:             input.Email,
		Senha:             string(hashedPassword),
		CodigoVerificacao: codigo,
		Verificado:        false,
	}

	// 4. Salva no banco de dados
	if err := config.DB.Create(&usuario).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Erro ao criar usuário"})
		return
	}

	// 5. Envia o e-mail de verificação (se falhar, remove do banco para evitar travamentos)
	if err := utils.EnviarCodigoEmail(usuario.Email, codigo); err != nil {
		config.DB.Unscoped().Delete(&usuario)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Erro ao enviar código de verificação: %s", err.Error()),
		})
		return
	}

	// 6. Resposta de sucesso para a interface
	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Código enviado para a sua conta (%s)", usuario.Email),
		"email":   usuario.Email,
	})
}

// Login realiza a autenticação do usuário e gera o token JWT
func Login(c *gin.Context) {
	var input struct {
		Email string `json:"email" binding:"required"`
		Senha string `json:"senha" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Dados de login inválidos"})
		return
	}

	var usuario models.Usuario
	if err := config.DB.Where("email = ?", input.Email).First(&usuario).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "E-mail ou senha incorretos"})
		return
	}

	// Compara o hash da senha
	if err := bcrypt.CompareHashAndPassword([]byte(usuario.Senha), []byte(input.Senha)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "E-mail ou senha incorretos"})
		return
	}

	// 🔒 TRAVA DE VERIFICAÇÃO: Bloqueia o login se o e-mail não tiver sido verificado
	if !usuario.Verificado {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Conta pendente de verificação. Insira o código enviado para o seu e-mail.",
			"email": usuario.Email,
		})
		return
	}

	// Gera o token JWT apenas se estiver verificado
	token, err := config.GerarToken(usuario.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"usuario": gin.H{
			"id":    usuario.ID,
			"nome":  usuario.Nome,
			"email": usuario.Email,
		},
	})
}

// VerificarCodigo valida o OTP e ativa a conta do usuário
func VerificarCodigo(c *gin.Context) {
	var input struct {
		Email  string `json:"email" binding:"required"`
		Codigo string `json:"codigo" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Código ou e-mail inválido"})
		return
	}

	var usuario models.Usuario
	if err := config.DB.Where("email = ? AND codigo_verificacao = ?", input.Email, input.Codigo).First(&usuario).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Código de verificação incorreto ou expirado"})
		return
	}

	// Atualiza o status no PostgreSQL
	usuario.Verificado = true
	usuario.CodigoVerificacao = "" // Limpa o código utilizado
	config.DB.Save(&usuario)

	// Gera o token JWT liberando o acesso ao CRM
	token, err := config.GerarToken(usuario.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao gerar token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Conta verificada com sucesso!",
		"token":   token,
		"usuario": gin.H{
			"id":    usuario.ID,
			"nome":  usuario.Nome,
			"email": usuario.Email,
		},
	})
}
