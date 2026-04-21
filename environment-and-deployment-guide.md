# Wabrix Environment, Infrastructure, And Deployment Mental Model

Dokumen ini ditulis buat bantu kamu ngerti sistem ini dari atas sampai bawah dengan konteks repo yang sekarang, bukan teori generik.

Kalau mau versi super singkat:

- `phase` itu urutan pembangunan fitur.
- `environment` itu tempat fitur itu hidup.
- Jadi, phase dan environment itu beda axis.
- Semua phase dibangun dari `local` dulu.
- `staging` makin penting begitu kita nyentuh auth, webhook, dan provider eksternal.
- `production` bukan tempat eksperimen. Production itu hasil promosi dari staging yang sudah lolos check.

Atau bahasa gampangnya:

- `phase` jawab pertanyaan: "lagi bikin apa?"
- `environment` jawab pertanyaan: "lagi jalan di mana?"

## 1. Kondisi Repo Sekarang

As of sekarang, repo ini sudah sampai phase 6.

State yang sudah ada, sesuai [README.md](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/README.md):

- monorepo `pnpm` + Turborepo
- web app Next.js di `apps/web`
- ingress worker Hono + Cloudflare Worker di `apps/ingress`
- backend state dan function di Convex lewat `packages/backend`
- auth dan organisasi via Clerk
- Bot Studio
- Knowledge Base + RAG
- WhatsApp integration config
- webhook ingress dengan signature validation + raw event durability

Artinya, kita sudah lewat fase "repo skeleton doang". Sekarang sistem ini sudah punya banyak service yang saling ngomong.

## 2. Mental Model Besar: Siapa Ngapain

Kalau di-zoom out, arsitektur repo ini persis seperti yang ditulis di [docs/phase-0/architecture.md](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/docs/phase-0/architecture.md):

1. User buka dashboard web.
2. Web pakai Clerk buat auth.
3. Web pakai Convex buat baca atau tulis data aplikasi.
4. Meta kirim webhook ke Cloudflare Worker.
5. Worker validasi request dan simpan raw event ke Convex.
6. Baru setelah itu backend Convex yang akan proses event lebih dalam.

Nah, dari situ lahir pembagian tanggung jawab yang penting banget:

### Web (`apps/web`)

Web itu UI layer.

Dia tanggung jawab untuk:

- marketing pages
- dashboard
- locale routing
- auth experience
- form config

Web bukan tempat untuk:

- simpan secret raw
- proses webhook Meta
- jalankan AI flow transport
- enforce business rule yang critical sendirian

### Ingress Worker (`apps/ingress`)

Worker itu edge gatekeeper.

Dia tanggung jawab untuk:

- `GET /webhooks/whatsapp` verification
- `POST /webhooks/whatsapp` signature validation
- rate limiting per `phoneNumberId`
- durable write ke Convex
- return cepat ke Meta

Worker tidak boleh jadi tempat:

- generate AI reply
- bikin conversation state final
- send outbound WhatsApp
- jalanin orchestration berat

Ini bukan preferensi. Ini architectural rule dari phase 0. Kalau worker kebanyakan mikir, webhook bakal timeout dan sistem jadi flaky.

### Convex (`packages/backend`)

Convex itu source of truth aplikasi.

Dia tanggung jawab untuk:

- auth-linked data access
- org scoping
- RBAC
- raw event durability
- nanti inbound normalization
- nanti conversation mapping
- AI orchestration
- queue dan retry
- audit log

Kalau bingung "backend kita di mana?", jawabannya: backend utama kita ada di Convex.

### Clerk

Clerk itu identity layer.

Clerk ngurus:

- sign in / sign up
- session
- organizations
- membership events

Tapi penting:

Clerk bukan source of truth authorization final di app ini.

Repo ini sengaja pakai sync dari Clerk ke Convex, lalu authorization org-scoped dibaca dari `orgMembers` di Convex. Itu tertulis jelas di [docs/phase-2/README.md](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/docs/phase-2/README.md).

Artinya:

- Clerk jawab "siapa user ini?"
- Convex jawab "di org ini dia boleh ngapain?"

### Meta WhatsApp

Meta itu transport provider.

Dia:

- kasih webhook ke worker
- nanti terima outbound send
- nanti kirim delivery status

Meta bukan tempat business logic kita.

### AI Provider

Saat ini repo pakai Google AI sebagai default path, sesuai [docs/phase-3/README.md](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/docs/phase-3/README.md).

AI provider itu cuma inference dependency.

Dia tidak:

- megang auth app
- megang tenancy
- megang WhatsApp transport

## 3. Phase vs Environment: Ini Sumber Bingung Nomor Satu

Ini poin paling penting.

`Phase` dan `environment` itu beda hal.

### Phase

Phase adalah roadmap delivery.

Contoh:

- phase 2 = auth, organizations, RBAC
- phase 5 = WhatsApp integration config
- phase 6 = webhook ingress
- phase 7 = inbound processor

### Environment

Environment adalah lane tempat sistem dijalankan.

Di repo ini, environment strategy sudah ditulis di [docs/phase-0/release-plan.md](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/docs/phase-0/release-plan.md):

- `local`
- `staging`
- `production`

Jadi jangan pikir begini:

- phase 1 = dev
- phase 2 = staging
- phase 3 = production

Itu salah.

Yang benar:

- setiap phase dikerjakan dulu di `local`
- lalu dipromosikan ke `staging`
- lalu baru ke `production` kalau memang sudah layak

Jadi bentuknya bukan garis lurus satu layer, tapi grid:

| Phase | Local                 | Staging              | Production                    |
| ----- | --------------------- | -------------------- | ----------------------------- |
| 1     | build foundation      | optional preview     | belum perlu                   |
| 2     | auth & org tested     | mulai penting        | belum customer-live           |
| 3     | AI config lokal       | bagus untuk QA       | belum wajib live              |
| 4     | ingestion & RAG lokal | strongly recommended | belum wajib live              |
| 5     | setup config lokal    | sangat penting       | belum final cutover           |
| 6     | worker verified lokal | wajib                | belum dipromote sebelum lolos |
| 7+    | local implement       | wajib test real flow | promote bertahap              |

## 4. Jadi Sebenarnya Sekarang Kita Ada Di Mana?

Kalau ngomong feature maturity:

- repo sudah implement phase 6

Kalau ngomong environment maturity:

- `local` jelas aktif
- `staging` seharusnya sekarang mulai dianggap wajib
- `production` seharusnya belum jadi target rollout penuh, tapi harus mulai dipikir struktur dan isolasinya

Kenapa?

Karena setelah phase 6, sistem sudah nyentuh webhook dan transport boundary.

Begitu kamu masuk dunia webhook, "nanti aja staging" itu biasanya jebakan. Soalnya:

- webhook perlu URL publik
- signature validation harus dites di runtime yang mendekati nyata
- rate limit binding perlu env nyata
- provider callback nggak bisa di-simulasikan terus-terusan lewat local saja

## 5. Flow Yang Benar: Local → Staging → Production

Flow yang sehat untuk repo ini:

### Step 1: Build di local

Kerja harian kamu ada di local.

Local dipakai untuk:

- nulis code
- run `pnpm dev`
- run `pnpm lint`
- run `pnpm typecheck`
- run `pnpm test`
- run `pnpm build`
- manual DoD phase

Root command flow-nya ada di [package.json](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/package.json):

- `pnpm dev`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm build`

### Step 2: Promote ke staging

Staging itu tempat kamu ngetes integrasi nyata dengan isolasi aman.

Staging dipakai untuk:

- auth real-ish flow
- webhook verification
- provider callback
- QA bareng orang lain
- smoke test sebelum prod

Phase 0 release plan bilang:

- staging harus prove web loads
- dashboard loads
- ingress verification works
- signed webhook fixtures behave correctly

Jadi staging itu bukan opsional lagi once phase 6 kebuka.

### Step 3: Manual promote ke production

Production hanya boleh terima build yang sudah lolos:

- local verification
- CI verification
- staging verification
- manual approval

Production bukan tempat "coba dulu deh". Production itu tempat "sudah terbukti, sekarang dipromote".

## 6. Environment Strategy Per Service

Sekarang kita bahas service satu-satu.

## 6.1 Web App

Web app ada di `apps/web`.

Dari phase 0 architecture, target deploy-nya adalah Vercel.

### Local

Local jalan di:

- `http://localhost:3000`

Script-nya dari [apps/web/package.json](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/package.json):

- `next dev --port 3000`

### Staging

Staging web harus punya domain atau subdomain sendiri.

Contoh mental model:

- `staging-web.example.com`

### Production

Production web domain final.

Contoh:

- `app.example.com`

### Why separate?

Karena web environment beda akan punya:

- beda Clerk frontend keys
- beda Convex URL
- beda ingress URL
- beda callback URL

Kalau kamu campur semua ke satu web environment, kamu akan susah bedain mana data test dan mana data live.

## 6.2 Cloudflare Worker / Ingress

Ingress ada di `apps/ingress`.

Worker ini sekarang sudah real, bukan placeholder lagi.

Config utamanya ada di [apps/ingress/wrangler.toml](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/ingress/wrangler.toml).

Di situ sekarang sudah ada:

- default local-ish vars
- `[env.staging]`
- `[env.production]`

Jadi, jawaban singkat buat pertanyaan kamu:

### Kapan Cloudflare harus disetup?

- repo-level scaffold dari phase 1
- setup Cloudflare account dan real worker environment paling lambat phase 6

Kenapa paling lambat phase 6?

Karena phase 6 memang fitur webhook ingress. Tanpa Cloudflare runtime yang nyata, phase 6 cuma setengah jadi.

### Apakah butuh Cloudflare terpisah per environment?

Jawaban practical:

- ya, butuh environment yang terpisah
- tidak harus account yang terpisah
- tapi worker deployment, secret, rate limit binding, dan URL harus terisolasi

Di repo ini pola isolasinya sudah kelihatan:

- default worker name: `wabrix-ingress`
- staging worker name: `wabrix-ingress-staging`
- production worker name: `wabrix-ingress-production`

Jadi best practice yang cocok buat repo ini:

- satu Cloudflare account boleh
- tapi environment resources jangan share sembarangan

Yang wajib beda per environment:

- worker deployment target
- `CONVEX_HTTP_URL`
- `CONVEX_SHARED_SECRET`
- `META_APP_SECRET`
- `META_VERIFY_TOKEN`
- rate limit namespace

### Cloudflare masuk ke arsitektur di mana?

Cloudflare itu pintu depan untuk webhook transport.

Urutannya:

1. Meta call Cloudflare Worker
2. Worker verify request
3. Worker rate limit
4. Worker call Convex internal HTTP endpoint
5. Convex simpan raw event
6. Worker return `200`

Jadi Cloudflare bukan "backend utama".

Cloudflare itu narrow edge boundary.

## 6.3 Convex

Convex adalah backend utama.

Yang connect ke Convex sekarang:

- web client lewat `NEXT_PUBLIC_CONVEX_URL`
- Clerk sync lewat Convex HTTP route
- Cloudflare Worker lewat `CONVEX_HTTP_URL`

Lihat:

- [apps/web/providers/convex-client-provider.tsx](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/web/providers/convex-client-provider.tsx)
- [packages/backend/convex/http.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/http.ts)

### Bedanya `NEXT_PUBLIC_CONVEX_URL` vs `CONVEX_HTTP_URL`

Ini super penting:

- `NEXT_PUBLIC_CONVEX_URL`
  dipakai browser atau web client buat connect ke Convex
- `CONVEX_HTTP_URL`
  dipakai server-side worker buat call Convex HTTP endpoint

Simple-nya:

- browser pakai yang public
- worker pakai yang server-side internal-ish route

### Kapan bikin project atau deployment Convex?

Practical answer untuk repo ini:

- sebelum phase 2, kamu sudah butuh minimal satu Convex environment yang bisa dipakai local development
- sebelum phase 6, kamu harus punya staging Convex yang terpisah dari local
- sebelum rollout production, kamu harus punya production Convex yang bersih dari test data

Kalau mau mental model aman:

- local/dev data jangan campur staging
- staging jangan campur production

Mau itu diwujudkan sebagai separate project atau separate deployment, rule operasionalnya tetap sama:

- data harus terisolasi
- secrets harus beda
- webhook target harus beda

### Kenapa Convex penting banget dari phase 2?

Karena mulai phase 2:

- user sync masuk ke Convex
- organizations masuk ke Convex
- orgMembers masuk ke Convex
- RBAC baca state dari Convex

Artinya begitu phase 2 hidup, app ini sudah bukan sekadar frontend lagi.

## 6.4 Clerk

Clerk mulai jadi penting di phase 2.

Peran Clerk di repo ini:

- login
- session
- organization
- webhook membership sync

Issuer URL untuk Convex auth ada di [packages/backend/convex/auth.config.ts](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/packages/backend/convex/auth.config.ts):

- `CLERK_ISSUER_URL`

### Kapan bikin project / app Clerk?

- phase 2: wajib punya Clerk setup untuk development
- sebelum shared QA / staging auth test: wajib punya staging Clerk
- sebelum production launch: wajib punya production Clerk

### Kenapa sebaiknya dibedakan?

Karena auth environment yang dishare biasanya bikin chaos:

- test user nyampur live user
- webhook event nyasar ke backend yang salah
- callback URL conflict
- organization data bercampur

### Relationship Clerk → Convex

Flow-nya:

1. user auth di Clerk
2. frontend bawa auth context
3. Convex verify identity via issuer URL
4. Clerk webhook sync users/orgs/memberships ke Convex
5. app logic authorize based on synced membership

Jadi kalau suatu hari auth terasa "aneh", seringnya problem bukan cuma di Clerk, tapi di sync Clerk → Convex juga.

## 6.5 Meta WhatsApp

Meta mulai benar-benar nongol di phase 5 dan 6.

### Phase 5

Phase 5 cuma setup integration config:

- phone number id
- business account id
- access token
- app secret
- verify token
- webhook URL display

Itu semua dijelaskan di [docs/phase-5/README.md](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/docs/phase-5/README.md).

### Phase 6

Phase 6 baru bikin webhook beneran jalan.

Artinya:

- verify token harus real
- app secret harus real
- webhook URL harus public untuk staging/prod

### Kapan Meta setup dibutuhkan?

- dev exploration: bisa pakai token dummy atau manual fixture
- phase 5: mulai perlu model credential yang realistis
- phase 6 staging: wajib punya Meta app/test setup yang bisa verify webhook
- production: wajib pakai business asset production, bukan sandbox asal

## 6.6 AI Provider, Firecrawl, Observability, Billing

### AI Provider

Mulai phase 3.

Yang sekarang dipakai:

- `GOOGLE_GENERATIVE_AI_API_KEY`

### Firecrawl

Mulai relevan di phase 4.

Optional.

Kalau nggak ada, website ingestion masih punya fallback.

### Observability

Mulai muncul dari phase 3, tapi baru benar-benar penting menuju phase 14.

Env terkait:

- `HELICONE_API_KEY`
- `HELICONE_BASE_URL`
- `AXIOM_API_TOKEN`
- `AXIOM_DATASET`
- `SENTRY_DSN`

### Billing

Masih later phase.

Jangan buru-buru setup production billing kalau phase billing belum jalan.

## 7. Cara Bedain Local, Staging, Production Dengan Jelas

Ini harus jelas banget, karena banyak orang bilang "staging", tapi aslinya cuma "local yang dipublish".

Itu bahaya.

Environment yang sehat dibedakan oleh 4 hal:

### 1. URL beda

Contoh:

- local web: `http://localhost:3000`
- local ingress: `http://localhost:8787`
- staging web: domain staging
- staging ingress: worker staging
- production web: domain production
- production ingress: worker production

### 2. Secret beda

Contoh:

- verify token local beda dari staging
- shared secret worker → Convex beda dari production
- AI key staging jangan pakai production kalau bisa

### 3. Data beda

Jangan share data store antar environment kalau bisa dihindari.

Kalau staging dan production share data:

- debugging jadi misleading
- test event bisa ngerusak data live
- audit trail jadi noisy

### 4. External callback beda

Webhook target Clerk, Meta, dan nanti billing provider harus jelas environment-nya.

Kalau satu provider event nyasar ke backend salah, kamu bisa buang berjam-jam buat debugging hal yang sebenarnya cuma salah URL.

## 8. Env Var Mental Model: Biar Nggak Campur Aduk

File referensi sekarang:

- [.env.example](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/.env.example)
- [docs/local-setup.md](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/docs/local-setup.md)
- [apps/ingress/wrangler.toml](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/ingress/wrangler.toml)

Rule paling gampang:

- prefix `NEXT_PUBLIC_` = aman dibaca browser
- tanpa `NEXT_PUBLIC_` = anggap secret sampai terbukti bukan
- env di `wrangler.toml` = milik worker
- env di deployment platform web = milik Next.js app
- env di Convex dashboard/runtime = milik backend runtime

### Env yang public-ish

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_DEFAULT_LOCALE`
- `NEXT_PUBLIC_CONVEX_URL`
- `NEXT_PUBLIC_INGRESS_URL`

Ini boleh kelihatan ke browser karena isinya endpoint atau config public-ish, bukan secret.

### Env yang secret

- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SECRET`
- `CONVEX_SHARED_SECRET`
- `ENCRYPTION_SECRET`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `META_APP_SECRET`
- `META_VERIFY_TOKEN`
- `POLAR_API_KEY`
- `MIDTRANS_SERVER_KEY`

### Env yang sering bikin orang bingung

#### `NEXT_PUBLIC_CONVEX_URL`

Ini bukan secret.

Ini URL client buat connect ke Convex dari browser.

#### `CONVEX_HTTP_URL`

Ini dipakai worker buat call Convex HTTP endpoint.

#### `CONVEX_SHARED_SECRET`

Ini shared secret antara Cloudflare Worker dan Convex internal HTTP route.

Ini sama sekali bukan buat browser.

#### `NEXT_PUBLIC_INGRESS_URL`

Ini dipakai web untuk menampilkan webhook URL ke dashboard WhatsApp setup.

Dia bukan token, bukan auth credential.

#### `META_VERIFY_TOKEN`

Ini token challenge verification antara Meta dan webhook endpoint.

#### `META_APP_SECRET`

Ini secret untuk validate `X-Hub-Signature-256`.

## 9. Current Repo Gotchas Yang Harus Kamu Sadar

Ini bagian yang penting banget. Bukan teori, tapi hal-hal yang dari repo sekarang bisa bikin future-you kesel.

### Gotcha 1: Phase bukan environment

Udah dibahas, tapi worth repeating.

Kalau kamu mulai ngomong "sekarang kita sudah phase 6 berarti production", itu cara pikir yang salah.

### Gotcha 2: Cloudflare jangan dianggap urusan production doang

Untuk project biasa mungkin iya.

Untuk repo ini, mulai phase 6, Cloudflare staging itu part of the actual feature.

Karena webhook verification dan edge behavior nggak bisa dinilai full dari browser app doang.

### Gotcha 3: Clerk auth sukses belum tentu RBAC sukses

Kenapa?

Karena RBAC repo ini pakai synced membership di Convex, bukan asal percaya claim frontend.

Jadi:

- login berhasil
- tapi sync webhook Clerk gagal
- hasilnya: user authenticated tapi authorization app bisa kacau

### Gotcha 4: Jangan pernah taruh secret di `NEXT_PUBLIC_*`

Kalau namanya `NEXT_PUBLIC_*`, anggap dia bisa dilihat browser.

Jadi:

- `NEXT_PUBLIC_CONVEX_URL` aman
- `NEXT_PUBLIC_INGRESS_URL` aman
- `NEXT_PUBLIC_META_SECRET` kalau ada, itu disaster

### Gotcha 5: Placeholder `namespace_id` rate limit belum berarti siap prod

Di [apps/ingress/wrangler.toml](/Users/ryanakmalpasya/Documents/BS/Freelance/PROJECTS/SKEM PROJECT/SAAS/wabrix/apps/ingress/wrangler.toml) sekarang ada placeholder:

- `namespace_id = "2001"`

Itu bagus untuk repo bootstrap, tapi bukan final infra value.

Sebelum staging/prod, itu harus diganti.

### Gotcha 6: `.env.example` belum otomatis berarti perfect source of truth

Ini penting.

Dari repo sekarang, `.env.example` punya:

- `CLERK_PUBLISHABLE_KEY`

Tapi di ecosystem Next.js + Clerk, yang umum dan sering dibutuhkan di frontend adalah:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`

Di repo ini sendiri, `turbo.json` juga sudah mengenal `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`.

Artinya ada potential naming mismatch yang harus kamu review baik-baik waktu setup env nyata.

Ini bukan berarti app pasti broken sekarang.

Tapi ini exactly jenis mismatch yang sering lolos di local, terus bikin bingung pas deploy.

### Gotcha 7: Local success tidak sama dengan staging success

Webhook system bisa lulus local fixture tapi gagal di staging karena:

- URL publik beda
- provider callback beda
- secret beda
- middleware/edge behavior beda

Makanya release plan memang minta staging proof, bukan cuma local pass.

## 10. Kapan Harus Setup Apa? Timeline Praktis Per Phase

Sekarang kita bikin ini jadi actionable.

## Phase 0

Belum setup runtime besar-besaran.

Fokus:

- desain
- phase gates
- environment strategy

Output-nya ada di docs phase 0.

## Phase 1

Setup minimal:

- repo
- pnpm workspace
- turbo
- apps shells

Yang belum wajib:

- Clerk live
- Convex live
- Cloudflare live
- Meta live

## Phase 2

Mulai wajib setup:

- Convex development environment
- Clerk development app
- Clerk webhook target ke Convex

Kenapa phase 2?

Karena phase 2 adalah titik di mana app sudah butuh:

- identity
- orgs
- RBAC
- synced backend state

Kalau phase 2 belum punya Clerk + Convex yang proper, sebenarnya kamu belum jalanin phase 2 fully.

## Phase 3

Tambahan setup:

- AI provider key
- `ENCRYPTION_SECRET`
- observability optional

Kenapa?

Karena mulai simpan secret encrypted dan generate AI draft.

## Phase 4

Tambahan setup:

- `FIRECRAWL_API_KEY` optional
- ingestion-related sanity check

Belum wajib Cloudflare publik, tapi mulai bagus kalau staging sudah ada.

## Phase 5

Mulai butuh:

- `NEXT_PUBLIC_INGRESS_URL`
- Meta credential model yang lebih realistis
- WhatsApp config saved per org

Ini fase transisi penting.

Karena dari sini user sudah melihat webhook URL dan mulai kebayang integration boundary nyata.

## Phase 6

Mulai wajib:

- Cloudflare Worker environment nyata
- staging ingress URL publik
- rate limit binding
- `CONVEX_SHARED_SECRET`
- `META_APP_SECRET`
- `META_VERIFY_TOKEN`
- Convex staging target untuk raw event durability

Kalau phase 6 belum punya staging runtime yang realistis, kamu technically punya code, tapi belum punya operational confidence.

## Phase 7 dan seterusnya

Mulai butuh:

- webhook data yang benar-benar durable
- environment isolation makin ketat
- ops visibility makin penting
- observability makin wajib

Semakin jauh phase berjalan, semakin kecil toleransi terhadap env setup yang asal-asalan.

## 11. Practical Setup Order Yang Saya Rekomendasikan

Kalau saya jadi kamu satu minggu dari sekarang, saya akan setup in this order:

1. rapikan local env dulu
2. pastikan Clerk + Convex dev benar-benar stabil
3. pastikan web bisa auth dan dashboard jalan
4. setup Cloudflare worker staging
5. sambungkan worker staging ke Convex staging
6. siapkan Meta app/test config untuk webhook staging
7. baru lanjut phase 7

Kenapa urutannya begitu?

Karena phase 7 akan mulai mengubah raw webhook event menjadi internal state.

Kalau boundary phase 6 belum mentally clear, phase 7 bakal terasa berantakan.

## 12. What You Should Prepare Before Phase 7

Sebelum lanjut phase 7, minimal kamu harus bisa jawab "iya" untuk hal-hal ini:

### Local

- saya bisa run `pnpm dev`
- web jalan
- worker jalan
- Convex nyambung
- Clerk auth jalan
- phase 6 tests pass

### Staging

- saya punya staging Convex target
- saya punya staging Clerk app or equivalent isolated auth setup
- saya punya Cloudflare staging worker
- saya punya public webhook URL staging
- saya tahu secret mana milik staging

### Operational understanding

- saya paham worker cuma verify + store
- saya paham Convex yang akan normalize dan orchestrate
- saya paham Meta webhook event tidak boleh langsung trigger AI di worker
- saya paham duplicate event itu normal dan harus idempotent

## 13. Common Mistakes Yang Paling Sering Terjadi

Ini daftar jebakan yang paling realistis buat repo begini.

### Mistake 1: Share semua service untuk semua environment

Contoh jelek:

- satu Clerk app untuk dev, staging, prod
- satu Convex environment untuk semuanya
- satu Meta webhook URL untuk test dan prod

Efeknya:

- data nyampur
- debug susah
- insiden gampang

### Mistake 2: Mengira webhook = backend selesai

Webhook masuk itu baru pintu.

Setelah phase 6, sistem belum jadi full WhatsApp app.

Masih ada:

- normalization
- contacts
- conversations
- messages
- service window
- orchestration
- outbound queue

### Mistake 3: Menaruh business logic di worker

Ini temptation yang paling sering kejadian.

Karena worker terasa "dekat ke webhook", orang jadi pengen sekalian proses semuanya di sana.

Untuk repo ini, itu justru anti-pattern.

### Mistake 4: Menganggap UI configured berarti integration valid

Phase 5 memungkinkan save config.

Tapi save config bukan berarti:

- Meta webhook sudah verified
- secrets sudah cocok dengan app yang benar
- inbound event mapping sudah siap

### Mistake 5: Nggak bedain public config vs secret

Kalau semua env var terasa mirip, biasanya suatu hari ada secret bocor ke browser bundle.

Makanya biasakan selalu tanya:

- ini dipakai browser?
- ini dipakai server?
- ini dipakai worker?
- ini dipakai platform provider dashboard?

## 14. Rule Of Thumb Yang Paling Aman

Kalau kamu bingung harus naruh setup di mana, pakai rule ini:

### Rule 1

Kalau nilai itu dibutuhkan browser, prefix dengan `NEXT_PUBLIC_`.

Kalau tidak, jangan.

### Rule 2

Kalau request datang dari provider eksternal, masuk dulu ke ingress boundary yang sempit.

### Rule 3

Kalau logic itu menyentuh tenant state, queue, message, conversation, atau AI, taruh di Convex.

### Rule 4

Kalau secret beda environment, jangan pernah reuse hanya karena "biar gampang".

### Rule 5

Kalau sebuah phase mulai melibatkan URL callback publik, staging sudah bukan optional luxury lagi.

## 15. Cara Mikir Yang Paling Sehat Mulai Sekarang

Mulai sekarang, coba ubah cara mikir jadi begini:

"Saya bukan lagi cuma nambah fitur. Saya sedang menghubungkan beberapa runtime yang punya boundary berbeda."

Boundary itu adalah:

- browser boundary
- auth boundary
- edge boundary
- backend state boundary
- provider boundary

Begitu kamu ngerti boundary ini, banyak hal jadi jauh lebih kebaca:

- kenapa Cloudflare harus ada
- kenapa Convex jadi pusat state
- kenapa Clerk bukan RBAC final source
- kenapa staging jadi wajib
- kenapa phase 6 itu milestone operasional, bukan cuma milestone coding

## 16. Tutorial End-to-End: Setup Staging & Production (Phase 6)

Kamu bilang: _"kasih tutorial step by step beneran dari awal sampe abis, gua harus ngapain aja."_

Ini adalah **Actionable Step-by-Step Guide** untuk mensetup Staging Environment saat kamu masuk ke Phase 6. Proses Production persis sama, hanya beda penamaan. Jangan di-skip, kerjakan berurutan!

### Step 1: Bikin Convex Staging Baru

Convex harus di-setup paling awal karena URL-nya bakal dipake di semua tempat (Clerk, Web, Worker). Tapi ingat, project Convex baru ini **tablenya masih kosong/belum ada schema**. Jadi kita harus nge-deploy schemanya ke sana.

1. Buka [Convex Dashboard](https://dashboard.convex.dev).
2. Bikin project baru untuk memisahkan data (atau pakai environment Production/Staging terpisah kalau project sama). Misal: `wabrix-staging`.
3. Ambil `NEXT_PUBLIC_CONVEX_URL` dari project/deployment tersebut.
4. Pergi ke **Settings > Deploy Keys** di dashboard Convex tersebut, lalu Generate/Ambil **Deploy Key**. Ini rahasia, bentuknya biasanya panjang.
5. **(PENTING - Biar Table Muncul)**: Buka terminal lokal lu sekarang, arahin ke folder kerja lu, dan jalankan perintah deploy ini buat nge-push schema lo ke staging:
   ```bash
   CONVEX_DEPLOY_KEY="<deploy_key_yang_lu_copas_tadi>" npx convex deploy
   ```
   _Note: Setelah lo jalanin ini, semua tabel dan fungsi backend langsung kebuat di staging!_
6. Buat token random untuk `CONVEX_SHARED_SECRET` (misal dengan `openssl rand -hex 32` atau sekedar random string panjang).
7. Masukkan `CONVEX_SHARED_SECRET` ini ke menu **Settings > Environment Variables** di dashboard Convex `wabrix-staging`.

### Step 2: Bikin Clerk Staging Baru

Clerk butuh tau Convex URL buat ngirim webhook sync user.

1. Buka [Clerk Dashboard](https://clerk.com).
2. Buat App baru: `Wabrix Staging`. Jangan pakai app dev local!
3. Ambil `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` dan `CLERK_SECRET_KEY`.
4. Pergi ke **Webhooks** di dashboard Clerk.
5. Add Endpoint. URL-nya: `<NEXT_PUBLIC_CONVEX_URL_YANG_KAMU_DAPET_TADI_DI_STEP_1>/clerk`
6. Pilih event minimal: `user.created`, `user.updated`, `organization.created`, `organization.updated`, `organizationMembership.created`, dll.
7. Ambil **Signing Secret**. Ini bakal jadi `CLERK_WEBHOOK_SECRET`.
8. Masukkan `CLERK_WEBHOOK_SECRET` ini ke Environment Variables Convex `wabrix-staging` yang ada di Step 1.

### Step 3: Setup Web App (Vercel)

Web kita butuh kunci dari Convex dan Clerk, dan karena workflow kita pakai branch `dev` untuk Staging, ada sedikit "cheat" buat ngakalin Vercel yang otomatis maksa tracking branch `main` pas awal mula project dibikin.

1. Buka [Vercel](https://vercel.com). Add New Project.
2. Import repo GitHub wabrix kamu. (Biarin aja dia narik config dan deteksi pake `main` buat sementara).
3. Di bagian **Framework Preset**, pilih `Next.js`.
4. Di bagian **Root Directory**, set jadi `apps/web` (ini penting karena kita pakai monorepo turborepo).
5. Masukkan Environment Variables Staging di Vercel:
   - `NEXT_PUBLIC_CONVEX_URL` (dari Step 1)
   - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (dari Step 2)
   - `CLERK_SECRET_KEY` (dari Step 2)
6. Klik **Deploy**.
7. **Penting (Vercel Trade-off):** Saat proses deploy pertama ini, besar kemungkinan dia bakal **GAGAL** (karena branch `main` lo masih kosong/berantakan). Biarin aja fail, gak papa (cuekin). Lanjut tekan "Continue to Dashboard" buat masuk ke dashboard project.
8. Masuk ke tab **Settings** -> pilih menu **Git** (sebelah kiri).
9. Di bagian **Production Branch**, ubah setting tulisannya dari `main` menjadi `dev`. Terus di-Save.
10. Selesai! Mulai sekarang Vercel "project staging" ini mengandalkan branch `dev`. Buat mancing render ulang, cukup commit kosongan atau hal kecil di lokal lalu `git push origin dev`. Otomatis Vercel ngerender staging lu. Catat url-nya pas selesai, misal: `https://wabrix-staging.vercel.app`.

### Step 4: Setup Webhook Ingress (Cloudflare Worker)

Ini pintu masuk dari Meta WhatsApp.

1. Buka terminal di local, masuk ke folder ingress: `cd apps/ingress`.
2. Pastikan file `wrangler.toml` kamu punya setting untuk staging. Kalau belum ada, minimal terlihat seperti ini:
   ```toml
   [env.staging]
   name = "wabrix-ingress-staging"
   ```
3. Set secret untuk Cloudflare staging dengan menjalankan command ini satu per satu:
   - `npx wrangler secret put CONVEX_SHARED_SECRET --env staging` (paste secret dari Step 1)
   - `npx wrangler secret put META_APP_SECRET --env staging` (dapat dari Meta, lihat Step 5 nanti - bisa diisi dummy dulu sebelum Meta Meta app beres)
   - `npx wrangler secret put META_VERIFY_TOKEN --env staging` (bikin bebas aja "staging_verify_123")
4. **Edit `CONVEX_HTTP_URL` di Cloudflare Staging:**
   _(Ini sering bikin orang nyasar dan dapet error 404!)_
   URL yang lo dapet dari `NEXT_PUBLIC_CONVEX_URL` biasanya berakhiran `.convex.cloud` (buat koneksi frontend). **JANGAN pakai itu langsung!**
   Untuk `CONVEX_HTTP_URL` (buat API/Webhook), lo harus ubah akhiran `.cloud` jadi `.site`.
   Misal:
   - `NEXT_PUBLIC_CONVEX_URL` lo: `https://happy-animal-123.convex.cloud`
   - Maka `CONVEX_HTTP_URL` lo WAJIB: `https://happy-animal-123.convex.site`
     Masukin URL `.site` ini ke environment variables Cloudflare Staging lo (bisa via file toml di `[env.staging]` atau lewat dashboard Cloudflare).
5. Deploy: run `npm run deploy:staging` atau `npx wrangler deploy --env staging`.
6. Simpan URL worker-nya. Misal: `https://wabrix-ingress-staging.username.workers.dev`.

### Step 5: Meta WhatsApp Webhook Setup

Meta butuh endpoint public Cloudflare tadi.

1. Buka [Meta for Developers](https://developers.facebook.com).
2. Buat App baru (atau Test App). Tipe: Business.
3. Setelah App jadi, scroll ke bawah dan Add Product **WhatsApp**.
4. Pergi ke **App Settings > Basic**. Ambil **App Secret**. Balik ke step 4, masukin `META_APP_SECRET` ini ke secret Cloudflare kamu.
5. Di menu WhatsApp, pergi ke **Configuration**.
6. Klik **Edit** di bagian Webhook.
   - **Callback URL**: masukkan URL Cloudflare Worker dari Step 4 diikuti routingnya (misal: `https://wabrix-ingress-staging.username.workers.dev/webhooks/whatsapp`)
   - **Verify Token**: masukkan token terserah dari Step 4 tadi (misal: `staging_verify_123`).
7. Simpan dan Verify. (Kalau gagal, berarti Worker staging kamu error/belum nyala/verify_token salah).
8. Klik **Manage** Webhook fields, dan subscribe ke:
   - `messages`
   - `message_template_status_update`
   - `account_review_update` dll.

**Selesai**. Dengan mengikuti checklist step 1 sampai 5 ini, environment staging kamu sudah "End-to-End" nyambung dari UI sampai Webhook Meta tanpa nyampur data dengan Local Dev.

## 17. Final Practical Answer Untuk Pertanyaan Awal Kamu

### At which phases are we in development, staging, and production?

Bukan per-phase.

Semua phase dikerjakan lewat flow:

- local development
- staging verification
- production promotion

Tapi tingkat kebutuhan staging meningkat seiring phase:

- phase 1 sampai 2: local dominant
- phase 3 sampai 5: staging strongly recommended
- phase 6 onward: staging effectively mandatory

### How do we clearly differentiate environments?

Dengan membedakan:

- URL
- secrets
- data
- provider callback targets
- deployment target

### What is the correct dev → staging → production flow?

1. build di local
2. pass lint, typecheck, tests, build
3. manual DoD phase
4. deploy ke staging
5. smoke test dengan provider nyata atau fixture realistis
6. manual approval
7. promote ke production

### When should Cloudflare be set up?

- scaffold: phase 1
- real environment and public webhook runtime: wajib by phase 6

### Do we need separate Cloudflare setups?

Ya, minimal separate environments and secrets.

Satu account boleh, tapi jangan satu environment dipakai rame-rame.

### When do we create Convex and Clerk projects?

- Convex: wajib by phase 2
- Clerk: wajib by phase 2
- staging versions: sebaiknya sebelum phase 6, dan practically wajib by phase 6
- production versions: sebelum rollout live

### What should be prepared before next phase?

Sebelum phase 7:

- local env stabil
- staging ingress publik siap
- Convex staging siap
- Clerk staging siap
- Meta staging/test webhook verify siap
- secret map jelas
- kamu paham boundary worker vs Convex

## 18. Penutup

Kalau mau satu kalimat yang paling worth diingat:

`wabrix` bukan app yang "punya backend".

`wabrix` adalah sistem multi-runtime dengan boundary yang sengaja dipisah:

- web untuk UI
- Clerk untuk identity
- Cloudflare Worker untuk edge ingress
- Convex untuk durable app state dan orchestration
- Meta untuk transport

Begitu mental model itu nempel, phase berikutnya akan jauh lebih gampang kebaca.
