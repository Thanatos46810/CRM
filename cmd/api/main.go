package main

import (
	"os"

	"crm-backend/config"
	"crm-backend/controllers"
	"crm-backend/middlewares"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	config.ConnectDatabase()

	r := gin.Default()

	configCors := cors.DefaultConfig()
	configCors.AllowAllOrigins = true
	configCors.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "Authorization"}
	r.Use(cors.New(configCors))

	api := r.Group("/api/v1")
	{
		// Rotas Públicas (Autenticação)
		api.POST("/auth/registrar", controllers.Registrar)
		api.POST("/auth/reenviar-codigo", controllers.ReenviarCodigo)
		api.POST("/auth/login", controllers.Login)
		api.POST("/auth/verificar", controllers.VerificarCodigo)
		api.POST("/auth/esqueci-senha", controllers.SolicitarResetSenha)
		api.POST("/auth/redefinir-senha", controllers.RedefinirSenha)
		// Rotas Protegidas por JWT
		protected := api.Group("/")
		protected.Use(middlewares.AuthRequired())
		{
			protected.GET("/leads", controllers.ListarLeads)
			protected.POST("/leads", controllers.CriarLead)
			protected.PUT("/leads/:id", controllers.EditarLead)
			protected.DELETE("/leads/:id", controllers.DeletarLead)
			protected.PUT("/leads/:id/status", controllers.AtualizarStatusLead)

			protected.GET("/leads/:id/mensagens", controllers.ListarMensagens)
			protected.POST("/mensagens", controllers.CriarMensagem)
		}
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r.Run(":" + port)
}
