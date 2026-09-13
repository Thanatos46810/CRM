package controllers

import (
	"net/http"

	"crm-backend/config"
	"crm-backend/models"

	"github.com/gin-gonic/gin"
)

func ListarMensagens(c *gin.Context) {
	leadID := c.Param("id")

	var mensagens []models.Mensagem
	config.DB.Where("lead_id = ?", leadID).Order("created_at asc").Find(&mensagens)

	c.JSON(http.StatusOK, gin.H{"data": mensagens})
}

func CriarMensagem(c *gin.Context) {
	var input models.Mensagem
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
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
