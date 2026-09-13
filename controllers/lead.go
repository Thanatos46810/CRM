package controllers

import (
	"net/http"

	"crm-backend/config"
	"crm-backend/models"

	"github.com/gin-gonic/gin"
)

func ListarLeads(c *gin.Context) {
	usuarioID := c.MustGet("usuario_id").(uint)

	var leads []models.Lead
	config.DB.Where("usuario_id = ?", usuarioID).Order("created_at desc").Find(&leads)
	c.JSON(http.StatusOK, gin.H{"data": leads})
}

func CriarLead(c *gin.Context) {
	usuarioID := c.MustGet("usuario_id").(uint)

	var input models.Lead
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	lead := models.Lead{
		UsuarioID: usuarioID,
		Nome:      input.Nome,
		Email:     input.Email,
		Telefone:  input.Telefone,
		Empresa:   input.Empresa,
		Valor:     input.Valor,
		Status:    "novo",
		Canal:     input.Canal,
	}

	if lead.Canal == "" {
		lead.Canal = "manual"
	}

	if err := config.DB.Create(&lead).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Erro ao criar lead"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"data": lead})
}

func EditarLead(c *gin.Context) {
	usuarioID := c.MustGet("usuario_id").(uint)
	id := c.Param("id")

	var lead models.Lead
	if err := config.DB.Where("id = ? AND usuario_id = ?", id, usuarioID).First(&lead).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lead não encontrado"})
		return
	}

	var input models.Lead
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Model(&lead).Updates(models.Lead{
		Nome:     input.Nome,
		Email:    input.Email,
		Telefone: input.Telefone,
		Empresa:  input.Empresa,
		Valor:    input.Valor,
	})

	c.JSON(http.StatusOK, gin.H{"data": lead})
}

func DeletarLead(c *gin.Context) {
	usuarioID := c.MustGet("usuario_id").(uint)
	id := c.Param("id")

	var lead models.Lead
	if err := config.DB.Where("id = ? AND usuario_id = ?", id, usuarioID).First(&lead).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lead não encontrado"})
		return
	}

	config.DB.Delete(&lead)
	c.JSON(http.StatusOK, gin.H{"message": "Lead removido com sucesso"})
}

func AtualizarStatusLead(c *gin.Context) {
	usuarioID := c.MustGet("usuario_id").(uint)
	id := c.Param("id")

	var lead models.Lead
	if err := config.DB.Where("id = ? AND usuario_id = ?", id, usuarioID).First(&lead).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Lead não encontrado"})
		return
	}

	var input struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	config.DB.Model(&lead).Update("status", input.Status)
	c.JSON(http.StatusOK, gin.H{"data": lead})
}
