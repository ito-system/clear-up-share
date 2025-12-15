package main

import (
	"log"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/ito-system/clear-up-share/backend/models"
	"github.com/joho/godotenv"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var db *gorm.DB
var jwtSecret []byte

// RegisterInput はユーザー登録リクエストの入力形式
type RegisterInput struct {
	Username string `json:"username" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

// LoginInput はログインリクエストの入力形式
type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// CreateGroupInput はグループ作成リクエストの入力形式
type CreateGroupInput struct {
	Name string `json:"name" binding:"required"`
}

// HistoryItem は履歴アイテムの統合形式
type HistoryItem struct {
	ID          uint      `json:"id"`
	Type        string    `json:"type"` // "expense" または "settlement"
	Date        time.Time `json:"date"`
	Amount      float64   `json:"amount"`
	Description string    `json:"description,omitempty"`
	PayerID     uint      `json:"payerID"`
	PayerName   string    `json:"payerName"`
	ReceiverID  uint      `json:"receiverID,omitempty"`
	ReceiverName string   `json:"receiverName,omitempty"`
}

// initDB はデータベース接続を初期化し、マイグレーションを実行します
func initDB() {
	dbName := os.Getenv("DB_NAME")
	if dbName == "" {
		dbName = "clearup.db"
	}

	var err error
	db, err = gorm.Open(sqlite.Open(dbName), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// マイグレーション実行
	err = db.AutoMigrate(
		&models.User{},
		&models.Group{},
		&models.Membership{},
		&models.Expense{},
		&models.Split{},
		&models.Settlement{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	log.Println("Database connected and migrated successfully")
}

// AuthMiddleware はJWT認証ミドルウェア
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Authorizationヘッダーからトークンを取得
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		// "Bearer "プレフィックスを除去
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == authHeader {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		// トークンを検証
		token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, jwt.ErrSignatureInvalid
			}
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// クレームからuserIDを取得
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			c.Abort()
			return
		}

		userIDFloat, ok := claims["userID"].(float64)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid userID in token"})
			c.Abort()
			return
		}

		userID := uint(userIDFloat)

		// userIDをコンテキストに設定
		c.Set("userID", userID)
		c.Next()
	}
}

// RegisterUser はユーザー登録を処理します
// POST /api/v1/auth/register
func RegisterUser(c *gin.Context) {
	var input RegisterInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// パスワードをハッシュ化
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to hash password"})
		return
	}

	// ユーザー作成
	user := models.User{
		Username:       input.Username,
		Email:          input.Email,
		HashedPassword: string(hashedPassword),
	}

	if err := db.Create(&user).Error; err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Username or email already exists"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
		},
	})
}

// generateJWT はユーザーIDを含むJWTトークンを生成します
func generateJWT(userID uint) (string, error) {
	claims := jwt.MapClaims{
		"userID": userID,
		"exp":    time.Now().Add(time.Hour * 1).Unix(), // 1時間後に有効期限切れ
		"iat":    time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// LoginUser はログインを処理します
// POST /api/v1/auth/login
func LoginUser(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// メールでユーザーを検索
	var user models.User
	if err := db.Where("email = ?", input.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// パスワード照合
	if err := bcrypt.CompareHashAndPassword([]byte(user.HashedPassword), []byte(input.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid email or password"})
		return
	}

	// JWTトークンを生成
	token, err := generateJWT(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": token,
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"email":    user.Email,
		},
	})
}

// LogoutUser はログアウトを処理します
// POST /api/v1/auth/logout
func LogoutUser(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"message": "Logged out successfully",
	})
}

// CreateGroup はグループを作成します
// POST /api/v1/groups
func CreateGroup(c *gin.Context) {
	var input CreateGroupInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// コンテキストからuserIDを取得
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// トランザクションでグループとメンバーシップを作成
	tx := db.Begin()

	// グループ作成
	group := models.Group{
		Name:    input.Name,
		OwnerID: userID.(uint),
	}

	if err := tx.Create(&group).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create group"})
		return
	}

	// 作成者をメンバーとして追加
	membership := models.Membership{
		UserID:  userID.(uint),
		GroupID: group.ID,
	}

	if err := tx.Create(&membership).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add owner as member"})
		return
	}

	tx.Commit()

	c.JSON(http.StatusCreated, gin.H{
		"message": "Group created successfully",
		"group": gin.H{
			"id":      group.ID,
			"name":    group.Name,
			"ownerID": group.OwnerID,
		},
	})
}

// GetGroupHistory はグループの履歴を取得します
// GET /api/v1/groups/:groupID/history
func GetGroupHistory(c *gin.Context) {
	// パスパラメータからgroupIDを取得
	groupIDStr := c.Param("groupID")
	groupID, err := strconv.ParseUint(groupIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	// コンテキストからuserIDを取得
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// ユーザーがグループのメンバーであることを確認
	var membership models.Membership
	if err := db.Where("user_id = ? AND group_id = ?", userID, groupID).First(&membership).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a member of this group"})
		return
	}

	// Expenseを取得（Payerをプリロード）
	var expenses []models.Expense
	if err := db.Preload("Payer").Where("group_id = ?", groupID).Find(&expenses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch expenses"})
		return
	}

	// Settlementを取得（Payer, Receiverをプリロード）
	var settlements []models.Settlement
	if err := db.Preload("Payer").Preload("Receiver").Where("group_id = ?", groupID).Find(&settlements).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settlements"})
		return
	}

	// 履歴アイテムを統合
	var history []HistoryItem

	for _, e := range expenses {
		history = append(history, HistoryItem{
			ID:          e.ID,
			Type:        "expense",
			Date:        e.Date,
			Amount:      e.Amount,
			Description: e.Description,
			PayerID:     e.PayerID,
			PayerName:   e.Payer.Username,
		})
	}

	for _, s := range settlements {
		history = append(history, HistoryItem{
			ID:           s.ID,
			Type:         "settlement",
			Date:         s.CreatedAt,
			Amount:       s.Amount,
			PayerID:      s.PayerID,
			PayerName:    s.Payer.Username,
			ReceiverID:   s.ReceiverID,
			ReceiverName: s.Receiver.Username,
		})
	}

	// 日付で降順ソート（新しいものが先）
	sort.Slice(history, func(i, j int) bool {
		return history[i].Date.After(history[j].Date)
	})

	c.JSON(http.StatusOK, gin.H{
		"groupID": groupID,
		"history": history,
	})
}

func main() {
	// 環境変数をロード
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: .env file not found, using default values")
	}

	// JWTシークレットを読み込み
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Fatal("JWT_SECRET environment variable is required")
	}
	jwtSecret = []byte(secret)

	// データベース初期化
	initDB()

	// Ginルーター初期化
	r := gin.Default()

	// APIルート
	v1 := r.Group("/api/v1")
	{
		// 認証不要のルート
		auth := v1.Group("/auth")
		{
			auth.POST("/register", RegisterUser)
			auth.POST("/login", LoginUser)
			auth.POST("/logout", LogoutUser)
		}

		// 認証が必要なルート
		groups := v1.Group("/groups")
		groups.Use(AuthMiddleware())
		{
			groups.POST("", CreateGroup)
			groups.GET("/:groupID/history", GetGroupHistory)
		}
	}

	// サーバー起動
	log.Println("Server starting on :8080")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
