package main

import (
	"log"

	"github.com/ito-system/clear-up-share/backend/database"
	"github.com/ito-system/clear-up-share/backend/router"
	"github.com/ito-system/clear-up-share/backend/utils"
)

func main() {
	// JWTシークレットを初期化
	utils.InitJWT()

	// データベース初期化
	database.InitDB()

	// ルーター設定
	r := router.SetupRouter()

	// サーバー起動
	log.Println("Server starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
