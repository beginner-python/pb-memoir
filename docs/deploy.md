# デプロイ手順

公開環境は 3 つのサービスで構成し、すべて無料枠で動かします。ダッシュボード操作が必要な箇所は人が行い、
マイグレーション・サンプル投入・確認は手元のスクリプトで行います。

| 役割 | サービス | ステージング | 本番 |
|---|---|---|---|
| フロント | Vercel | `main` ブランチのプレビュー URL | Production Branch = `release` |
| API | Render(Python ネイティブ) | `pb-memoir-staging`(`main`) | `pb-memoir`(`release`) |
| DB | Supabase(Postgres + pgvector) | `pb-memoir-staging` | `pb-memoir` |

流れ: PR → CI → `main` にマージ → ステージングに自動デプロイ → スモークテスト → `git tag v1.2.0` → `release` が進む → 本番に自動デプロイ。

手順の順番は **0 → 1 → 2 → 3 → 4** です。Render の Blueprint は `release` ブランチの存在を検証するため、先に初回タグで `release` を作ります。

---

## 0. `release` ブランチを作る(初回タグ)

```bash
git tag -a v0.1.0 -m "v0.1.0: 初回リリース"
git push origin v0.1.0
```

Release ワークフローが `release` ブランチを作成します(Actions の Release が success になるまで 1 分ほど)。

## 1. Supabase(2 プロジェクト)

1. https://supabase.com/dashboard で **New project** を 2 回(`pb-memoir-staging`、`pb-memoir`)。リージョンは **Northeast Asia (Tokyo)**。DB パスワードは控える
2. 各プロジェクトの **Connect** → **Session pooler** の接続文字列をコピー(IPv4 対応。形式: `postgresql://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres`)
3. 手元に `backend/.env.staging` と `backend/.env.production` を作る(どちらも gitignore 済み)

   ```
   DATABASE_URL=postgresql+asyncpg://postgres.<ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?ssl=require
   LLM_PROVIDER=mock
   ```

   パスワードに `& # ? / @` などが含まれる場合はパーセントエンコードする。`sslmode=` ではなく `?ssl=require` を使う(asyncpg の仕様)
4. マイグレーションとサンプル投入(ステージング・本番それぞれ)

   ```bash
   cd backend
   set -a; source .env.staging; set +a
   uv run alembic upgrade head
   uv run python -m scripts.seed
   uv run python -c "import asyncio;from app.db import engine;from sqlalchemy import text
   async def m():
       async with engine.connect() as c: print((await c.execute(text('select count(*) from entries'))).scalar())
   asyncio.run(m())"
   ```

   `.env.production` でも同じ手順を行う
5. keepalive 用に、各プロジェクトの **Project Settings → API** から **Project URL** と **anon public key** を控える

RLS はマイグレーション `0002` で有効化済みのため、anon キーでは表を読み書きできません(バックエンドは `postgres` ロールで接続するため影響なし)。

## 2. Render(Blueprint)

1. https://dashboard.render.com → **New → Blueprint** → GitHub の `pb-memoir` を選択。Blueprint Name は任意、Branch は `main`、Path は `render.yaml` のまま。`render.yaml` からサービス 2 つがまとめて作られる(Blueprint の操作は 1 回)
2. 画面に出る 4 つの入力欄(2 サービス × 2 変数)を埋めて **Deploy Blueprint**
   - `DATABASE_URL`: 手順 1 の値(ステージングと本番で別。`postgresql+asyncpg://` から `?ssl=require` までを貼る)
   - `CORS_ORIGINS`: Vercel のドメイン(手順 3 の後で分かるので、いったん `https://example.com` を入れ、後で更新)
3. 初回デプロイ後、`https://pb-memoir-staging.onrender.com/health` と `https://pb-memoir.onrender.com/health` が `{"status":"ok", ..., "database":"ok", "service":"pb-memoir-staging"}` のように返すことを確認(`service` でどちらか分かる)

無料プランは 15 分でスリープします。起動時にマイグレーションを実行するため、復帰に 30〜60 秒かかります。

## 3. Vercel

1. https://vercel.com/new → `pb-memoir` を Import
2. Vercel が `backend` と `frontend` を検出して「multi-service project」を提案するが **使わない**。**Root Directory** の Edit から `frontend` を選ぶと Next.js 単体の設定になる
3. **Environment Variables** に `BACKEND_URL` = `https://pb-memoir-staging.onrender.com` を追加(この時点では Production と Preview 共通で可)。Type は **Config** にする(Secret にすると後から値を変えられない)
4. Deploy。`https://pb-memoir.vercel.app` が本番 URL になる
5. **Settings → Environments → Production → Branch Tracking** を `release` に変更(手順 0 で `release` は作成済み)
6. 同じ Environments 画面(または Environment Variables)で `BACKEND_URL` を分ける。Secret で作ってしまった場合は削除して作り直す
   - Production: `https://pb-memoir.onrender.com`
   - Preview: `https://pb-memoir-staging.onrender.com`
7. **Settings → Functions** に Function Region があれば Tokyo(hnd1)を選ぶ(既定は米国東部で、Render への転送が遠回りになる)
8. **Deployments** の最新(Production)を **Redeploy** して、変更した変数を反映。`https://pb-memoir.vercel.app/api/health` の `service` が `pb-memoir` になれば本番を向いている
9. 次に `main` へ push されたとき、`main` のプレビュー URL(`https://pb-memoir-git-main-<scope>.vercel.app`)が作られる。これがステージング
10. **Settings → General → Node.js Version** が 24.x であることを確認(`package.json` の `engines` でも指定済み)

Vercel のドメインが決まったら、Render の `CORS_ORIGINS` を `https://<production>.vercel.app,https://pb-memoir-git-main-<scope>.vercel.app` に更新する(プロキシ経由のため実際には不要だが、直接アクセスされた場合の保険)。

## 4. GitHub の設定

**Repository variables**(Settings → Secrets and variables → Actions → Variables)

| 名前 | 値 |
|---|---|
| `STAGING_FRONTEND_URL` | `main` のプレビュー URL |
| `PRODUCTION_FRONTEND_URL` | 本番 URL |
| `SUPABASE_STAGING_URL` | ステージングの Project URL |
| `SUPABASE_PRODUCTION_URL` | 本番の Project URL |

**Secrets**

| 名前 | 値 |
|---|---|
| `SUPABASE_STAGING_ANON_KEY` | ステージングの anon key |
| `SUPABASE_PRODUCTION_ANON_KEY` | 本番の anon key |

**ブランチ保護**(Settings → Branches → `main`): PR 必須、必須チェックに `backend` `frontend` `e2e`。`release` は保護しない(Release ワークフローが更新する)。

## 5. 動作確認

- 本番 URL の `/api/health` が `database: ok`、`read_only: true`、`service: pb-memoir` を返す
- 本番 URL でチャットの質問例を押すと、時期チップと根拠が表示され、回答(モックの定型文)が流れる
- `main` のプレビュー URL でも同様に動き、`/api/health` の `service` が `pb-memoir-staging`
- Actions の **Smoke (staging)** と **Keepalive** を手動実行(Run workflow)して成功する

## 6. 日常の運用

- 変更は PR → CI → `main` にマージ。スモークテストがステージングを検証する
- 本番に出すときは `git tag -a vX.Y.Z -m "..." && git push origin vX.Y.Z`(Release ワークフローが `main` の祖先であること・CI 成功を確認してから `release` を進める)
- 戻すときは前のタグで同じ操作(`release` がそのコミットに戻る)
- 質問例のキャッシュ(`suggestions.json`)は「去年」「先月」の基準日が固定されるため、数か月に一度 `LLM_PROVIDER=openai` で `scripts.build_suggestions` を実行して更新する
- Supabase の無料プロジェクトは 7 日間無操作で停止する。keepalive ワークフローが 3 日ごとに起こすが、停止してしまった場合はダッシュボードの **Restore** で復帰させる
