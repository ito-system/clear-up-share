package handler

import (
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ito-system/clear-up-share/backend/database"
	"github.com/ito-system/clear-up-share/backend/models"
)

// AddExpenseInput は支出追加リクエストの入力形式
type AddExpenseInput struct {
	Description string  `json:"description" binding:"required"`
	Amount      float64 `json:"amount" binding:"required,gt=0"`
	PayerID     uint    `json:"payerID" binding:"required"`
	Date        string  `json:"date" binding:"required"`
	MemberIDs   []uint  `json:"memberIDs" binding:"required,min=1"`
}

// AddExpense は新規支出を追加します
// POST /api/v1/groups/:groupID/expenses
func AddExpense(c *gin.Context) {
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
	var input AddExpenseInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 日付をパース
	date, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	// トランザクション開始
	tx := database.DB.Begin()

	// Expenseを作成
	expense := models.Expense{
		GroupID:     uint(groupID),
		PayerID:     input.PayerID,
		Amount:      input.Amount,
		Description: input.Description,
		Date:        date,
	}

	if err := tx.Create(&expense).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create expense"})
		return
	}

	// Splitを作成（均等割り）
	memberCount := len(input.MemberIDs)
	amountPerMember := input.Amount / float64(memberCount)

	for _, memberID := range input.MemberIDs {
		split := models.Split{
			ExpenseID: expense.ID,
			DebtorID:  memberID,
			AmountDue: amountPerMember,
		}
		if err := tx.Create(&split).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create split"})
			return
		}
	}

	tx.Commit()

	c.JSON(http.StatusCreated, gin.H{
		"message": "Expense created successfully",
		"expense": gin.H{
			"id":          expense.ID,
			"groupID":     expense.GroupID,
			"payerID":     expense.PayerID,
			"amount":      expense.Amount,
			"description": expense.Description,
			"date":        expense.Date.Format("2006-01-02"),
		},
	})
}

// EditExpense は既存の支出を編集します
// PUT /api/v1/groups/:groupID/expenses/:expenseID
func EditExpense(c *gin.Context) {
	// パスパラメータからgroupIDとexpenseIDを取得
	groupIDStr := c.Param("groupID")
	groupID, err := strconv.ParseUint(groupIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	expenseIDStr := c.Param("expenseID")
	expenseID, err := strconv.ParseUint(expenseIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
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

	// 既存のExpenseを取得
	var expense models.Expense
	if err := database.DB.Where("id = ? AND group_id = ?", expenseID, groupID).First(&expense).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}

	// リクエストボディをバインド
	var input AddExpenseInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 日付をパース
	date, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format. Use YYYY-MM-DD"})
		return
	}

	// トランザクション開始
	tx := database.DB.Begin()

	// 既存のSplitを削除
	if err := tx.Where("expense_id = ?", expenseID).Delete(&models.Split{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete existing splits"})
		return
	}

	// Expenseを更新
	expense.PayerID = input.PayerID
	expense.Amount = input.Amount
	expense.Description = input.Description
	expense.Date = date

	if err := tx.Save(&expense).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update expense"})
		return
	}

	// 新しいSplitを作成（均等割り）
	memberCount := len(input.MemberIDs)
	amountPerMember := input.Amount / float64(memberCount)

	for _, memberID := range input.MemberIDs {
		split := models.Split{
			ExpenseID: expense.ID,
			DebtorID:  memberID,
			AmountDue: amountPerMember,
		}
		if err := tx.Create(&split).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create split"})
			return
		}
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"message": "Expense updated successfully",
		"expense": gin.H{
			"id":          expense.ID,
			"groupID":     expense.GroupID,
			"payerID":     expense.PayerID,
			"amount":      expense.Amount,
			"description": expense.Description,
			"date":        expense.Date.Format("2006-01-02"),
		},
	})
}

// DeleteExpense は支出を削除します
// DELETE /api/v1/groups/:groupID/expenses/:expenseID
func DeleteExpense(c *gin.Context) {
	// パスパラメータからgroupIDとexpenseIDを取得
	groupIDStr := c.Param("groupID")
	groupID, err := strconv.ParseUint(groupIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid group ID"})
		return
	}

	expenseIDStr := c.Param("expenseID")
	expenseID, err := strconv.ParseUint(expenseIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid expense ID"})
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

	// 既存のExpenseを取得
	var expense models.Expense
	if err := database.DB.Where("id = ? AND group_id = ?", expenseID, groupID).First(&expense).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Expense not found"})
		return
	}

	// トランザクション開始
	tx := database.DB.Begin()

	// 関連するSplitを削除
	if err := tx.Where("expense_id = ?", expenseID).Delete(&models.Split{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete splits"})
		return
	}

	// Expenseを削除
	if err := tx.Delete(&expense).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete expense"})
		return
	}

	tx.Commit()

	c.JSON(http.StatusOK, gin.H{
		"message": "Expense deleted successfully",
	})
}
