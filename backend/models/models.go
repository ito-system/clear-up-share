package models

import (
	"time"

	"gorm.io/gorm"
)

// User はアプリケーションのユーザーを表します
type User struct {
	gorm.Model
	Username       string `gorm:"uniqueIndex;not null"`
	Email          string `gorm:"uniqueIndex;not null"`
	HashedPassword string `gorm:"not null"`
}

// Group は支出を共有するグループを表します
type Group struct {
	gorm.Model
	Name    string `gorm:"not null"`
	OwnerID uint   `gorm:"not null"`
	Owner   User   `gorm:"foreignKey:OwnerID"`
}

// Membership はユーザーとグループの関連を表します
type Membership struct {
	gorm.Model
	UserID  uint  `gorm:"uniqueIndex:idx_user_group;not null"`
	GroupID uint  `gorm:"uniqueIndex:idx_user_group;not null"`
	User    User  `gorm:"foreignKey:UserID"`
	Group   Group `gorm:"foreignKey:GroupID"`
}

// Expense はグループ内の支出を表します
type Expense struct {
	gorm.Model
	GroupID     uint      `gorm:"not null"`
	PayerID     uint      `gorm:"not null"`
	Amount      float64   `gorm:"not null"`
	Description string    `gorm:"not null"`
	Date        time.Time `gorm:"not null"`
	Group       Group     `gorm:"foreignKey:GroupID"`
	Payer       User      `gorm:"foreignKey:PayerID"`
}

// Split は支出の均等割り負債を表します
type Split struct {
	gorm.Model
	ExpenseID uint    `gorm:"not null"`
	DebtorID  uint    `gorm:"not null"`
	AmountDue float64 `gorm:"not null"`
	Expense   Expense `gorm:"foreignKey:ExpenseID"`
	Debtor    User    `gorm:"foreignKey:DebtorID"`
}

// Settlement はグループ内の精算を表します
type Settlement struct {
	gorm.Model
	GroupID    uint    `gorm:"not null"`
	PayerID    uint    `gorm:"not null"`
	ReceiverID uint    `gorm:"not null"`
	Amount     float64 `gorm:"not null"`
	Group      Group   `gorm:"foreignKey:GroupID"`
	Payer      User    `gorm:"foreignKey:PayerID"`
	Receiver   User    `gorm:"foreignKey:ReceiverID"`
}
