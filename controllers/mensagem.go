package controllers

import (
	"net/http"

	"crm-backend/config"
	"crm-backend/models"

	"github.com/gin-gonic/gin"
)

// ListarMensagens retorna as mensagens de um lead, garantindo que o lead pertence ao usuário logado
func ListarMensagens(c *gin.Context) {
	usuarioID := c.MustGet("usuario_id").(uint)
	leadID := c.Param("id")

	// 1. Confirma que o lead pertence ao usuário autenticado
	var lead models.Lead
	if err := config.DB.Where("id = ? AND usuario_id = ?", leadID, usuarioID).First(&lead).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lead não encontrado"})
		return
	}

	var mensagens []models.Mensagem
	config.DB.Where("lead_id = ?", leadID).Order("created_at asc").Find(&mensagens)

	c.JSON(http.StatusOK, gin.H{"data": mensagens})
}

// CriarMensagem cria uma mensagem, garantindo que o lead pertence ao usuário logado
func CriarMensagem(c *gin.Context) {
	usuarioID := c.MustGet("usuario_id").(uint)

	var input models.Mensagem
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Confirma que o lead pertence ao usuário autenticado antes de salvar a mensagem
	var lead models.Lead
	if err := config.DB.Where("id = ? AND usuario_id = ?", input.LeadID, usuarioID).First(&lead).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lead não encontrado"})
		return
	}

	if input.Autor == "" {
		input.Autor = "Atendente"
	}

	if err := config.DB.Create(&input).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao salvar mensagem"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": input})
}
