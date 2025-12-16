package handler

import (
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ito-system/clear-up-share/backend/database"
	"github.com/ito-system/clear-up-share/backend/models"
)

// CreateGroupInput はグループ作成リクエストの入力形式
type CreateGroupInput struct {
	Name string `json:"name" binding:"required"`
}

// AddSettlementInput は清算記録リクエストの入力形式
type AddSettlementInput struct {
	PayerID    uint    `json:"payerID" binding:"required"`
	ReceiverID uint    `json:"receiverID" binding:"required"`
	Amount     float64 `json:"amount" binding:"required,gt=0"`
}

// DebtSummary はメンバーごとの貸借額を表す形式
type DebtSummary struct {
	UserID   uint    `json:"userID"`
	Username string  `json:"username"`
	Balance  float64 `json:"balance"`
}

// HistoryItem は履歴アイテムの統合形式
type HistoryItem struct {
	ID           uint      `json:"id"`
	Type         string    `json:"type"` // "expense" または "settlement"
	Date         time.Time `json:"date"`
	Amount       float64   `json:"amount"`
	Description  string    `json:"description,omitempty"`
	PayerID      uint      `json:"payerID"`
	PayerName    string    `json:"payerName"`
	ReceiverID   uint      `json:"receiverID,omitempty"`
	ReceiverName string    `json:"receiverName,omitempty"`
}

// GetGroups はユーザーが所属するグループ一覧を取得します
// GET /api/v1/groups
func GetGroups(c *gin.Context) {
	// コンテキストからuserIDを取得
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	// ユーザーが所属するグループを取得
	var memberships []models.Membership
	if err := database.DB.Preload("Group").Where("user_id = ?", userID).Find(&memberships).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch groups"})
		return
	}

	// レスポンス用のグループリストを構築
	type GroupResponse struct {
		ID      uint   `json:"id"`
		Name    string `json:"name"`
		OwnerID uint   `json:"ownerID"`
	}

	groups := make([]GroupResponse, len(memberships))
	for i, m := range memberships {
		groups[i] = GroupResponse{
			ID:      m.Group.ID,
			Name:    m.Group.Name,
			OwnerID: m.Group.OwnerID,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"groups": groups,
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
	tx := database.DB.Begin()

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
	if err := database.DB.Where("user_id = ? AND group_id = ?", userID, groupID).First(&membership).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a member of this group"})
		return
	}

	// Expenseを取得（Payerをプリロード）
	var expenses []models.Expense
	if err := database.DB.Preload("Payer").Where("group_id = ?", groupID).Find(&expenses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch expenses"})
		return
	}

	// Settlementを取得（Payer, Receiverをプリロード）
	var settlements []models.Settlement
	if err := database.DB.Preload("Payer").Preload("Receiver").Where("group_id = ?", groupID).Find(&settlements).Error; err != nil {
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

// GetGroupMembers はグループのメンバー一覧を取得します
// GET /api/v1/groups/:groupID/members
func GetGroupMembers(c *gin.Context) {
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
	if err := database.DB.Where("user_id = ? AND group_id = ?", userID, groupID).First(&membership).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a member of this group"})
		return
	}

	// グループのメンバーを取得
	var memberships []models.Membership
	if err := database.DB.Preload("User").Where("group_id = ?", groupID).Find(&memberships).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch members"})
		return
	}

	// レスポンス用のメンバーリストを構築
	type MemberResponse struct {
		ID       uint   `json:"id"`
		Username string `json:"username"`
		Email    string `json:"email"`
	}

	members := make([]MemberResponse, len(memberships))
	for i, m := range memberships {
		members[i] = MemberResponse{
			ID:       m.User.ID,
			Username: m.User.Username,
			Email:    m.User.Email,
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"groupID": groupID,
		"members": members,
	})
}

// GetGroupDebts はグループの負債状態を計算します
// GET /api/v1/groups/:groupID/debts
func GetGroupDebts(c *gin.Context) {
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
	if err := database.DB.Where("user_id = ? AND group_id = ?", userID, groupID).First(&membership).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a member of this group"})
		return
	}

	// グループのメンバーを取得
	var memberships []models.Membership
	if err := database.DB.Preload("User").Where("group_id = ?", groupID).Find(&memberships).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch members"})
		return
	}

	// メンバー情報をマップに保存
	memberMap := make(map[uint]string)
	balances := make(map[uint]float64)
	for _, m := range memberships {
		memberMap[m.UserID] = m.User.Username
		balances[m.UserID] = 0
	}

	// グループの全支出を取得
	var expenses []models.Expense
	if err := database.DB.Where("group_id = ?", groupID).Find(&expenses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch expenses"})
		return
	}

	// 支出IDのリストを作成
	var expenseIDs []uint
	for _, e := range expenses {
		expenseIDs = append(expenseIDs, e.ID)
	}

	// 全てのSplitを取得
	var splits []models.Split
	if len(expenseIDs) > 0 {
		if err := database.DB.Where("expense_id IN ?", expenseIDs).Find(&splits).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch splits"})
			return
		}
	}

	// 支払額を集計（Expense.PayerIDごと）
	for _, e := range expenses {
		balances[e.PayerID] += e.Amount
	}

	// 負担額を集計（Split.DebtorIDごと）
	for _, s := range splits {
		balances[s.DebtorID] -= s.AmountDue
	}

	// 清算を考慮（Settlement）
	var settlements []models.Settlement
	if err := database.DB.Where("group_id = ?", groupID).Find(&settlements).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch settlements"})
		return
	}

	// 清算による調整
	// Payerは送金した（＝支払った）ので、その分負債が減る（balanceが減る）
	// Receiverは受け取った（＝受領した）ので、その分債権が減る（balanceが減る）
	for _, s := range settlements {
		balances[s.PayerID] -= s.Amount    // 送金者は支払ったので、受け取る権利が減る
		balances[s.ReceiverID] += s.Amount // 受領者は受け取ったので、支払う義務が減る（balanceが増える）
	}

	// DebtSummaryのリストを作成
	var debts []DebtSummary
	for userID, username := range memberMap {
		debts = append(debts, DebtSummary{
			UserID:   userID,
			Username: username,
			Balance:  balances[userID],
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"groupID": groupID,
		"debts":   debts,
	})
}

// RecordSettlement は清算を記録します
// POST /api/v1/groups/:groupID/settlements
func RecordSettlement(c *gin.Context) {
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
	if err := database.DB.Where("user_id = ? AND group_id = ?", userID, groupID).First(&membership).Error; err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "You are not a member of this group"})
		return
	}

	// リクエストボディをバインド
	var input AddSettlementInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// PayerとReceiverが同じでないことを確認
	if input.PayerID == input.ReceiverID {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payer and receiver cannot be the same"})
		return
	}

	// PayerがグループのメンバーであることをPayerがグループのメンバーであることを確認
	var payerMembership models.Membership
	if err := database.DB.Where("user_id = ? AND group_id = ?", input.PayerID, groupID).First(&payerMembership).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Payer is not a member of this group"})
		return
	}

	// ReceiverがグループのメンバーであることをReceiverがグループのメンバーであることを確認
	var receiverMembership models.Membership
	if err := database.DB.Where("user_id = ? AND group_id = ?", input.ReceiverID, groupID).First(&receiverMembership).Error; err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Receiver is not a member of this group"})
		return
	}

	// Settlementを作成
	settlement := models.Settlement{
		GroupID:    uint(groupID),
		PayerID:    input.PayerID,
		ReceiverID: input.ReceiverID,
		Amount:     input.Amount,
	}

	if err := database.DB.Create(&settlement).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create settlement"})
		return
	}

	// Payer, Receiverの情報を取得してレスポンスに含める
	var payer models.User
	var receiver models.User
	database.DB.First(&payer, input.PayerID)
	database.DB.First(&receiver, input.ReceiverID)

	c.JSON(http.StatusCreated, gin.H{
		"message": "Settlement recorded successfully",
		"settlement": gin.H{
			"id":           settlement.ID,
			"groupID":      settlement.GroupID,
			"payerID":      settlement.PayerID,
			"payerName":    payer.Username,
			"receiverID":   settlement.ReceiverID,
			"receiverName": receiver.Username,
			"amount":       settlement.Amount,
			"createdAt":    settlement.CreatedAt,
		},
	})
}
