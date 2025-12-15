package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
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

func RegisterUser(c *gin.Context, db *gorm.DB) {
	c.JSON(200, gin.H{"message": "Registration endpoint ready! (Implementation pending)"})
}

func main() {
	// データベースの初期化と接続（サーバー起動の準備）
	db := initDB()

	// Ginルーターを初期化
	router := gin.Default()

	v1 := router.Group("/api/v1")
	{
		auth := v1.Group("/auth")
		{
			// ユーザー登録エンドポイント
			// クロージャを利用してdbインスタンスをハンドラに渡す
			auth.POST("/register", func(c *gin.Context) {
				RegisterUser(c, db)
			})
			// auth.POST("/login", LoginUser) // 今後の実装
		}
		// ... 他のAPIグループ（/groupsなど）もここに設定 ...
	}

	// サーバーを起動
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080" // デフォルトポート
	}
	log.Printf("Starting Gin server on :%s", port)
	log.Fatal(router.Run(":" + port)) // ポート8080で起動
}
