# ベースイメージ: Goの最新バージョン
FROM golang:1.25-alpine AS builder

# 作業ディレクトリの設定
WORKDIR /app

# 依存関係のコピーとダウンロード
COPY go.mod go.sum ./
RUN go mod download

# ソースコードのコピー
COPY . .

# サーバーアプリケーションのビルド
# CGO_ENABLED=0 は静的バイナリを作成し、実行環境を小さくします
RUN CGO_ENABLED=0 go build -o /clearup-server ./main.go

# 実行用イメージの定義 (軽量化)
FROM alpine:latest

# タイムゾーンの設定
ENV TZ=Asia/Tokyo

# ビルドしたバイナリをコピー
COPY --from=builder /clearup-server /clearup-server

# 実行権限の付与
RUN chmod +x /clearup-server

# サーバーのデフォルトポート
EXPOSE 8080

# コンテナ起動時のコマンド
CMD ["/clearup-server"]