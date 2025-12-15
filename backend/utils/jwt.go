package utils

import (
	"log"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// JWTSecret はJWT署名用のシークレットキーを保持します
var JWTSecret []byte

// InitJWT はJWTシークレットを初期化します
func InitJWT() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		log.Println("Warning: JWT_SECRET not set, using default value for development")
		secret = "default-secret-for-dev"
	}
	JWTSecret = []byte(secret)
}

// GenerateJWT はユーザーIDを含むJWTトークンを生成します
func GenerateJWT(userID uint) (string, error) {
	claims := jwt.MapClaims{
		"userID": userID,
		"exp":    time.Now().Add(time.Hour * 1).Unix(), // 1時間後に有効期限切れ
		"iat":    time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWTSecret)
}
