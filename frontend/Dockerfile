# ベースイメージ: Node.jsのLTSバージョン
FROM node:20-alpine

# 作業ディレクトリの設定
WORKDIR /app

# 依存関係ファイルのコピーとインストール
COPY package*.json ./
RUN npm install

# 開発サーバーのデフォルトポート (Viteの標準)
EXPOSE 5173

# コンテナ起動時のコマンド
CMD ["npm", "run", "dev"]