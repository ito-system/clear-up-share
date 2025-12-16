package main

import (
	"log"

	"github.com/ito-system/clear-up-share/backend/database"
	"github.com/ito-system/clear-up-share/backend/router"
	"github.com/ito-system/clear-up-share/backend/utils"
	"github.com/joho/godotenv"
)

func main() {
	// .envファイルを読み込む（存在しない場合は無視）
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("No .env file found, using environment variables or defaults")
	}

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
