# pb-memoir

日記・思い出・子育ての記録を書き溜めて、あとから自然文で聞ける個人ナレッジアプリ。
RAG(Retrieval-Augmented Generation)を自前実装したポートフォリオ作品です。

> 「去年の夏、何があった?」「はじめて歩いたのはいつ?」と聞くと、該当する日記を根拠にして答えます。

## 構成

(フェーズ 5 で構成図・設計判断・セットアップ手順を記載)

- フロントエンド: Next.js (App Router, TypeScript, Tailwind CSS, shadcn/ui)
- バックエンド: FastAPI, SQLAlchemy 2.0, Alembic
- データベース: PostgreSQL + pgvector (ローカルは Docker、本番は Supabase)
- LLM / 埋め込み: OpenAI(ローカル開発)、モック(公開デモ・API 費用ゼロ)

## ローカル起動(Docker)

ローカル開発環境は Docker Compose で完結します。本番はコンテナを使わず、Vercel(フロント)/ Render(API)/ Supabase(DB)にデプロイします。

```bash
cp backend/.env.example backend/.env       # 必要なら OPENAI_API_KEY と LLM_PROVIDER=openai を設定
cp frontend/.env.example frontend/.env.local
docker compose up --build
```

- フロントエンド: http://localhost:3000
- API: http://localhost:8000 (`/health`, `/docs`)
- DB: `localhost:5434`(ホストから接続する場合)

よく使うコマンド:

```bash
docker compose exec backend uv run pytest                      # バックエンドのテスト
docker compose exec backend uv run alembic revision --autogenerate -m "..."
docker compose exec backend uv run alembic upgrade head
docker compose exec frontend npm run lint
```

## 開発状況

- [x] フェーズ 0: リポジトリ整備
- [ ] フェーズ 1: バックエンド中核(日記 CRUD・埋め込み)
- [ ] フェーズ 2: 検索と対話(日付パーサー・SSE)
- [ ] フェーズ 3: フロントエンド
- [ ] フェーズ 4: 架空データ・読み取り専用モード・OpenAI モード
- [ ] フェーズ 5: 公開(Supabase / Render / Vercel / CI)
