package models

import (
	"time"

	"gorm.io/gorm"
)

// User: アプリ利用者
type User struct {
	gorm.Model
	Username       string `gorm:"unique;not null"` // ユーザー名 (必須、一意)
	Email          string `gorm:"unique;not null"` // メールアドレス (必須、一意)
	HashedPassword string `gorm:"not null"`        // ハッシュ化されたパスワード
	// Group: Userが所有するグループ
	OwnedGroups []Group `gorm:"foreignkey:OwnerID"`
	// Membership: Userが所属するグループ
	Memberships []Membership
}

// Group: 支出を共有する単位
type Group struct {
	gorm.Model
	Name    string `gorm:"not null"`
	OwnerID uint   // グループ所有者ID (User.IDを参照)
	Owner   User   `gorm:"foreignkey:OwnerID"` // リレーション
	// Expenses: このグループの支出
	Expenses []Expense
	// Members: このグループのメンバー
	Memberships []Membership
}

// Membership: グループとユーザーの紐づけ
type Membership struct {
	gorm.Model
	UserID   uint `gorm:"uniqueIndex:idx_group_user"`
	GroupID  uint `gorm:"uniqueIndex:idx_group_user"`
	JoinedAt time.Time
	User     User
	Group    Group
}

// Expense: 個々の支出記録（立替）
type Expense struct {
	gorm.Model
	GroupID     uint `gorm:"not null"`
	Group       Group
	PayerID     uint `gorm:"not null"` // 支払った人
	Payer       User
	Amount      float64 `gorm:"not null"` // 立替金額
	Description string
	Date        time.Time
	// Splits: この支出に対する各メンバーの負担額
	Splits []Split
}

// Split: 支出に対する各メンバーの負担額
type Split struct {
	gorm.Model
	ExpenseID uint `gorm:"uniqueIndex:idx_expense_debtor"`
	Expense   Expense
	DebtorID  uint `gorm:"uniqueIndex:idx_expense_debtor"` // 負債者（負担すべき人）
	Debtor    User
	AmountDue float64 // 負担すべき金額
}

// Settlement: 実際に行われた清算記録
type Settlement struct {
	gorm.Model
	GroupID    uint `gorm:"not null"`
	Group      Group
	PayerID    uint `gorm:"not null"` // 送金した人
	Payer      User
	ReceiverID uint `gorm:"not null"` // 受け取った人
	Receiver   User
	Amount     float64 `gorm:"not null"` // 清算金額
	Date       time.Time
}
