# Lifecycle WABA

Lifecycle WABA adalah cerita kesehatan real dari nomor WhatsApp. Jadi bukan cuma satu status doang.

## State yang paling penting

- Status approval: apakah setup bisnis inti sudah disetujui Meta
- Status verifikasi nomor: apakah nomor siap dipakai buat messaging yang trusted
- Review display name: apakah nama pengirim lolos review
- Messaging tier: berapa volume harian yang Meta kasih sekarang
- Blocker saat ini: apa saja yang masih menahan launch

## Cara baca secara operasional

- Kalau approval belum complete, jangan anggap nomor itu production-ready.
- Kalau display name masih pending atau rejected, jangan expect rollout mulus dulu.
- Kalau phone verification belum complete, beresin itu dulu sebelum debug delivery.
- Kalau masih ada blocker, selesaikan blocker dulu sebelum utak-atik logic bot.

## Behaviour di Wabrix

Wabrix menyimpan snapshot lifecycle supaya operator bisa lihat state langsung dari dashboard, bukan bolak-balik cek Meta terus. Ini penting karena onboarding, approval template, dan eligibility outbound saling nyambung.

## Habit operator yang bagus

Refresh lifecycle setelah:

- setup integrasi pertama
- OTP verification
- perubahan review template
- perubahan bisnis di sisi Meta
- sebelum promote config staging ke production

## Anti-pattern

- Menganggap `configured` sama dengan `fully approved`
- Nggak peduli messaging tier sampai outbound traffic mulai gagal
- Membiarkan display name rejected tanpa ditindak

## Rule eskalasi

Kalau blocker lifecycle masih ada padahal credential, verification, dan sync kelihatan benar, stop ubah kode produk dulu. Besar kemungkinan masalahnya ada di sisi akun Meta, bukan logic app.
