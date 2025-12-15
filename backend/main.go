package main

import (
	"log"
	"os"

	"github.com/ito-system/clear-up-share/backend/models"

	"github.com/joho/godotenv"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

// DB接続とマイグレーションを行う初期化関数
func initDB() *gorm.DB {
	// .envファイルをロード
	err := godotenv.Load()
	if err != nil {
		log.Println("Note: .env file not found, using environment variables.")
	}

	// データベースファイル名を取得 (環境変数から取得、なければデフォルト値)
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "clearup.db"
	}

	// SQLiteへの接続
	db, err := gorm.Open(sqlite.Open(dbName), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect database:", err)
	}

	// マイグレーションの実行
	// 定義した全モデルに基づいてテーブルを作成/更新
	log.Println("Running database migrations...")
	err = db.AutoMigrate(
		&models.User{},
		&models.Group{},
		&models.Membership{},
		&models.Expense{},
		&models.Split{},
		&models.Settlement{},
	)
	if err != nil {
		log.Fatal("Failed to run migrations:", err)
	}
	log.Println("Database migration completed successfully.")

	return db
}

func main() {
	// データベースの初期化と接続（サーバー起動の準備）
	db := initDB()

	// サーバーの設定と起動はここから実装します
	log.Println("Database initialized. Ready to start Gin server...")

	// 今後のステップ: Ginルーターの設定、APIエンドポイントの実装
	// ...

	// 仮のサーバー起動メッセージ
	// log.Fatal(router.Run(":8080"))

	// dbが未使用だとエラーになるため一時的に利用
	_ = db
}
