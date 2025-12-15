package database

import (
	"fmt"
	"log"
	"os"

	"github.com/ito-system/clear-up-share/backend/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// DB はグローバルなデータベース接続を保持します
var DB *gorm.DB

// InitDB はデータベース接続を初期化し、マイグレーションを実行します
func InitDB() {
	// 環境変数からPostgreSQL接続用のDSN (Data Source Name) を構築
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable",
		os.Getenv("DB_HOST"),
		os.Getenv("DB_USER"),
		os.Getenv("DB_PASSWORD"),
		os.Getenv("DB_NAME"),
		os.Getenv("DB_PORT"),
	)

	log.Printf("Connecting to DB with DSN: %s", dsn)

	var err error
	// PostgreSQLに接続
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// マイグレーション実行
	err = DB.AutoMigrate(
		&models.User{},
		&models.Group{},
		&models.Membership{},
		&models.Expense{},
		&models.Split{},
		&models.Settlement{},
	)
	if err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	log.Println("Database connected and migrated successfully")
}
