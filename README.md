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
docker compose exec frontend npm run typecheck
docker compose exec frontend npm test                         # フロントのテスト (Vitest)
docker compose --profile e2e run --rm e2e                    # E2E テスト (Playwright)。専用の DB・API・フロントを別に立てて実行
docker compose rm -sf db-e2e backend-e2e frontend-e2e       # E2E 用スタックの片付け
```

## テスト

| 種類 | 対象 DB | 実行 |
|---|---|---|
| バックエンド pytest | 専用 DB `memoir_test`(自動作成、テストごとに空にする) | `docker compose exec backend uv run pytest` |
| フロント Vitest | なし(純粋ロジック) | `docker compose exec frontend npm test` |
| E2E Playwright | 専用スタック(`db-e2e` / `backend-e2e` / `frontend-e2e`)。使い捨て DB にサンプル日記を投入した状態で実行し、開発用 DB には触れない | `docker compose --profile e2e run --rm e2e` |

## サンプルデータ

公開デモ用に、架空の家族(両親と娘の水瀬)の日記 142 件(2024 年 10 月〜2026 年 10 月)を同梱しています。
実在の人物・出来事とは関係ありません。

```bash
docker compose exec backend uv run python -m scripts.seed               # 日記が無いときだけ投入
docker compose exec backend uv run python -m scripts.seed --reset --yes # 全削除してから投入
```

## LLM のモード切替

| 変数 | mock(既定・公開デモ) | openai(ローカル) |
|---|---|---|
| 埋め込み | 文字 n-gram のハッシュ(無料・決定的。モックでも埋め込みと pgvector 検索は行う) | text-embedding-3-small |
| 時期の抽出 | 質問例のキャッシュ(`app/data/suggestions.json`) | gpt-4o-mini(Structured Outputs) |
| 回答 | 検索結果を引用する定型文 | gpt-4o-mini のストリーム生成 |

切り替え手順:

1. `backend/.env` で `LLM_PROVIDER=openai` と `OPENAI_API_KEY` を設定し、`docker compose restart backend`
2. `docker compose exec backend uv run python -m scripts.reindex` で全日記を再埋め込み。モックと OpenAI は別の埋め込みモデルで、ベクトルは同じ列を使うため、切り替えのたびに必要(OpenAI 側は 142 件で約 1 万トークン、1 円未満)
3. 戻すときは `LLM_PROVIDER=mock` にして再起動し、再度 `reindex`

質問例のキャッシュは `LLM_PROVIDER=openai` の状態で次のコマンドで再生成します(「去年」「先月」は生成日基準で固定されるため、公開前に実行します)。

```bash
docker compose exec backend uv run python -m scripts.build_suggestions
```

モックの限界: 語彙の重なりしか見ないため、言い換え(「犬」と「ワンちゃん」)は拾えず、時期の抽出は質問例に対してのみ動きます。

## 開発状況

- [x] フェーズ 0: リポジトリ整備
- [x] フェーズ 1: バックエンド中核(日記 CRUD・埋め込み)
- [x] フェーズ 2: 検索と対話(LLM による時期抽出・SSE)
- [x] フェーズ 3: フロントエンド
- [x] フェーズ 4: 架空データ・読み取り専用モード・OpenAI モード
- [ ] フェーズ 5: 公開(Supabase / Render / Vercel / CI)
