package router

import (
	"github.com/gin-gonic/gin"
	"github.com/ito-system/clear-up-share/backend/handler"
	"github.com/ito-system/clear-up-share/backend/middleware"
)

// SetupRouter はGinルーターを初期化し、すべてのルートを設定します
func SetupRouter() *gin.Engine {
	r := gin.Default()

	// APIルート
	v1 := r.Group("/api/v1")
	{
		// 認証不要のルート
		auth := v1.Group("/auth")
		{
			auth.POST("/register", handler.RegisterUser)
			auth.POST("/login", handler.LoginUser)
			auth.POST("/logout", handler.LogoutUser)
		}

		// 認証が必要なルート
		groups := v1.Group("/groups")
		groups.Use(middleware.AuthMiddleware())
		{
			groups.GET("", handler.GetGroups)
			groups.POST("", handler.CreateGroup)
			groups.GET("/:groupID/history", handler.GetGroupHistory)
			groups.GET("/:groupID/members", handler.GetGroupMembers)
			groups.POST("/:groupID/expenses", handler.AddExpense)
			groups.PUT("/:groupID/expenses/:expenseID", handler.EditExpense)
			groups.DELETE("/:groupID/expenses/:expenseID", handler.DeleteExpense)
			groups.GET("/:groupID/debts", handler.GetGroupDebts)
			groups.POST("/:groupID/settlements", handler.RecordSettlement)
		}
	}

	return r
}
