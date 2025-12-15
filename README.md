# ClearUp

友人間やルームシェア、旅行などで発生した支出を記録し、**誰が誰にいくら負っているか**を正確に計算・清算するための支出共有アプリケーションです。

## 主要機能

- **ユーザー認証**: ユーザー登録・ログイン・ログアウト（JWT 認証）
- **グループ作成**: 複数人で共有するグループの作成・管理
- **支出の記録**: 均等割り支出の登録・編集・削除
- **負債の自動計算**: グループ内での負債関係を自動で算出
- **清算の記録**: 精算履歴の記録と管理

---

## 技術スタック

| レイヤー           | 技術                              |
| ------------------ | --------------------------------- |
| **バックエンド**   | Go (Gin, GORM), PostgreSQL        |
| **フロントエンド** | React (Vite), TypeScript, Zustand |
| **環境**           | Docker, Docker Compose            |

---

## プロジェクト構成

```
ClearUp/
├── backend/             # Go アプリケーション（API サーバー）
│   ├── handler/         # HTTP ハンドラー
│   ├── middleware/      # 認証ミドルウェア
│   ├── models/          # GORM モデル定義
│   ├── database/        # DB 接続・マイグレーション
│   ├── router/          # API ルート定義
│   └── utils/           # JWT ユーティリティ
├── frontend/            # React アプリケーション（UI）
│   ├── src/
│   │   ├── pages/       # ページコンポーネント
│   │   ├── components/  # UI 部品
│   │   └── stores/      # Zustand 状態管理
│   └── ...
├── .env                 # 環境変数ファイル
└── docker-compose.yml   # Docker 環境定義
```

---

## 環境構築手順

### 前提条件

- [Docker](https://www.docker.com/) がインストールされていること
- [Docker Compose](https://docs.docker.com/compose/) が利用可能であること

### セットアップ手順

#### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd ClearUp
```

#### 2. 環境変数ファイルの準備

プロジェクトルートに `.env` ファイルを作成してください。
内容は開発者に確認してください。

#### 3. Docker コンテナの起動

```bash
docker compose up --build -d
```

#### 4. アクセス確認

| サービス             | URL                   |
| -------------------- | --------------------- |
| **フロントエンド**   | http://localhost:5173 |
| **バックエンド API** | http://localhost:8080 |
| **PostgreSQL**       | localhost:5432        |

---

## API エンドポイント

### 認証（認証不要）

| メソッド | エンドポイント          | 説明         |
| -------- | ----------------------- | ------------ |
| `POST`   | `/api/v1/auth/register` | ユーザー登録 |
| `POST`   | `/api/v1/auth/login`    | ログイン     |
| `POST`   | `/api/v1/auth/logout`   | ログアウト   |

### グループ（認証必要）

| メソッド | エンドポイント                    | 説明             |
| -------- | --------------------------------- | ---------------- |
| `POST`   | `/api/v1/groups`                  | グループ作成     |
| `GET`    | `/api/v1/groups/:groupID/history` | グループ履歴取得 |
| `GET`    | `/api/v1/groups/:groupID/members` | メンバー一覧取得 |

### 支出（認証必要）

| メソッド | エンドポイント                                | 説明     |
| -------- | --------------------------------------------- | -------- |
| `POST`   | `/api/v1/groups/:groupID/expenses`            | 支出登録 |
| `PUT`    | `/api/v1/groups/:groupID/expenses/:expenseID` | 支出編集 |
| `DELETE` | `/api/v1/groups/:groupID/expenses/:expenseID` | 支出削除 |

### 負債・清算（認証必要）

| メソッド | エンドポイント                        | 説明         |
| -------- | ------------------------------------- | ------------ |
| `GET`    | `/api/v1/groups/:groupID/debts`       | 負債情報取得 |
| `POST`   | `/api/v1/groups/:groupID/settlements` | 清算記録     |

---

## 開発時のヒント

### コンテナ操作

```bash
# 全サービスの起動
docker compose up -d

# 全サービスの停止
docker compose down

# 特定サービスの再起動
docker compose restart backend
docker compose restart frontend

# コンテナのリビルド（依存関係の変更時など）
docker compose up --build -d
```

### ログの確認

```bash
# 全サービスのログ
docker compose logs -f

# 特定サービスのログ
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

### コンテナ内でのコマンド実行

```bash
# バックエンドコンテナでシェルを起動
docker compose exec backend sh

# フロントエンドコンテナでシェルを起動
docker compose exec frontend sh

# PostgreSQL に接続
docker compose exec db psql -U clearup_user -d clearup_db
```

### Postico 2 でのデータベース接続

[Postico 2](https://eggerapps.at/postico2/) を使用してデータベースを GUI で確認できます。

**接続設定:**

| 項目         | 値               |
| ------------ | ---------------- |
| **Host**     | `localhost`      |
| **Port**     | `5432`           |
| **User**     | `clearup_user`   |
| **Password** | `.env` ファイル参照 |
| **Database** | `clearup_db`     |

**セットアップ手順:**

1. [Postico 2](https://eggerapps.at/postico2/) をインストール
2. Postico 2 を起動し、「New Server」をクリック
3. 上記の接続設定を入力
4. 「Connect」をクリック

これにより、テーブル構造の確認やデータの閲覧・編集が GUI で行えます。

### データベースのリセット

```bash
# ボリュームを含めて完全にリセット
docker compose down -v
docker compose up --build -d
```

---

## ライセンス

This project is licensed under the MIT License.
