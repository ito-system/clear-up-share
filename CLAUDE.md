# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

必ず日本語で回答してください。

## Project Overview

ClearUp は割り勘・精算管理 Web アプリケーションです。グループ内での支出記録、負債計算、精算機能を提供します。

モノレポ構成:

- **frontend/**: React 19 + TypeScript + Vite + Tailwind CSS 4
- **backend/**: Go API server (Gin + GORM/PostgreSQL)

## Commands

### Docker (推奨)

```bash
docker compose up --build -d    # 全サービス起動
docker compose down             # 停止
docker compose down -v          # データベースリセット含めて停止
docker compose logs -f backend  # バックエンドログ確認
```

### Frontend (`frontend/` ディレクトリで実行)

```bash
npm run dev      # 開発サーバー起動 (HMR, localhost:5173)
npm run build    # TypeScript + Vite ビルド
npm run lint     # ESLint 実行
```

### Backend (`backend/` ディレクトリで実行)

```bash
go run .              # サーバー起動 (localhost:8080)
go build              # バイナリビルド
go test ./...         # 全テスト実行
go test -v ./handler  # 特定パッケージのテスト
```

## Architecture

### データフロー

1. Frontend: axios → Backend API → PostgreSQL
2. 認証: JWT トークン → localStorage → Zustand → PrivateRoute

### Backend

- **router/router.go**: 全APIルート定義。認証不要(`/api/v1/auth/`)と認証必要(`/api/v1/groups/`)に分離
- **middleware/auth_middleware.go**: JWT検証、`c.Set("userID", ...)` でコンテキストにユーザーID設定
- **handler/**: 各ハンドラーで `c.Get("userID")` からユーザー取得、Membershipでグループ権限チェック
- **models/models.go**: GORM モデル。`gorm.Model` 埋め込みで ID, CreatedAt, UpdatedAt, DeletedAt 自動付与

**データモデル関係**:
```
User ─┬─< Membership >─ Group (OwnerID → User)
      ├─< Expense (PayerID) ─< Split (DebtorID → User)
      └─< Settlement (PayerID, ReceiverID)
```

### Frontend

- **stores/authStore.ts**: Zustand。`login()` で localStorage + state 更新、`initialize()` で復元
- **App.tsx**: PrivateRoute (token必須) / PublicRoute (token時リダイレクト) でルート保護
- **pages/**: 各ページで axios API コール、`useAuthStore` から token/user 取得

## API Endpoints

認証不要:
- `POST /api/v1/auth/register` - ユーザー登録
- `POST /api/v1/auth/login` - ログイン
- `POST /api/v1/auth/logout` - ログアウト

認証必要 (Authorization: Bearer {token}):
- `GET/POST /api/v1/groups` - グループ一覧/作成
- `GET /api/v1/groups/:groupID/history` - 履歴取得
- `GET /api/v1/groups/:groupID/members` - メンバー一覧
- `POST/PUT/DELETE /api/v1/groups/:groupID/expenses[/:expenseID]` - 支出 CRUD
- `GET /api/v1/groups/:groupID/debts` - 負債計算
- `POST /api/v1/groups/:groupID/settlements` - 精算記録
