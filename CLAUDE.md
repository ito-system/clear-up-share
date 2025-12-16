# CLAUDE.md

必ず日本語で回答してください。

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ClearUp は割り勘・精算管理 Web アプリケーションです。グループ内での支出記録、負債計算、精算機能を提供します。

モノレポ構成:

- **frontend/**: React 19 + TypeScript + Vite
- **backend/**: Go API server (Gin + GORM/PostgreSQL)

## Commands

### Frontend (`frontend/` ディレクトリで実行)

```bash
npm run dev      # 開発サーバー起動 (HMR)
npm run build    # TypeScript + Vite ビルド
npm run lint     # ESLint 実行
```

### Backend (`backend/` ディレクトリで実行)

```bash
go run .         # サーバー起動 (localhost:8080)
go build         # バイナリビルド
go test ./...    # 全テスト実行
go test -v ./handler  # 特定パッケージのテスト
```

## Architecture

### Backend 構造

```
backend/
├── main.go              # エントリーポイント (JWT初期化 → DB初期化 → Router設定)
├── router/router.go     # APIルート定義 (/api/v1/...)
├── handler/             # HTTPハンドラー (auth, group, expense)
├── middleware/          # 認証ミドルウェア (JWT検証)
├── models/models.go     # GORMモデル定義
├── database/db.go       # PostgreSQL接続・マイグレーション
└── utils/jwt.go         # JWT生成・検証
```

**データモデル**: User → Group (owner) → Membership, Expense → Split, Settlement

**API 構成**:

- 認証不要: `/api/v1/auth/` (register, login, logout)
- 認証必要: `/api/v1/groups/` (グループ・支出・精算 CRUD)

### Frontend 構造

```
frontend/src/
├── App.tsx              # ルーティング (PrivateRoute/PublicRoute)
├── stores/authStore.ts  # Zustand認証状態 (token, user)
├── pages/               # ページコンポーネント
│   ├── auth/            # Login, Register
│   ├── groups/          # Groups一覧, GroupHistory
│   └── dashboard/       # Dashboard
└── components/          # UI部品 (GroupCreateForm, ExpenseModal, DebtSummary等)
```

**認証フロー**: localStorage 保存 → useAuthStore → PrivateRoute 保護
