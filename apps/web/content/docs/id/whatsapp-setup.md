# Setup WhatsApp

Halaman ini adalah panduan operator cepat untuk menghubungkan satu organisasi ke satu nomor WhatsApp real.

## Yang harus sudah ada dulu

- Meta app yang sudah jalan
- WhatsApp Business Account
- Nomor telepon yang sudah attach ke WABA itu
- Bot profile di Wabrix
- URL ingress staging atau production yang mengarah ke `/webhooks/whatsapp`

## Value yang perlu kamu siapin

- `phoneNumberId`
- `businessAccountId`
- `accessToken`
- `appSecret`
- `verifyToken`

Value ini beda fungsi. `phoneNumberId` dipakai buat send message dan mapping status. `businessAccountId` dipakai buat sync template dan lifecycle. `appSecret` dipakai buat validasi signature. `verifyToken` cuma dipakai buat handshake challenge webhook.

## Urutan setup yang recommended

1. Bikin atau cek bot profile dulu di Bot Studio.
2. Buka halaman setup WhatsApp di organisasi yang benar.
3. Simpan `phoneNumberId`, `businessAccountId`, dan semua secret.
4. Copy webhook URL yang ditampilin app.
5. Paste webhook URL itu ke Meta dan isi `verifyToken` yang sama.
6. Jalankan lifecycle refresh dan template sync sekali.

## Tanda setup berhasil

- Status integrasi `configured`
- Verifikasi webhook berhasil
- Data lifecycle kebaca sesuai status real
- Template bisa di-sync dari Meta
- Inbound message baru masuk ke `whatsappWebhookEvents`

## Salah kaprah yang sering kejadian

- Simpan credential sebelum bot profile ada
- Pakai nomor yang salah saat satu WABA punya lebih dari satu nomor
- Lupa set `NEXT_PUBLIC_INGRESS_URL` di environment web
- Campur credential staging dengan webhook URL production
- Expect secret muncul lagi di UI setelah save. Wabrix sengaja nyembunyiin secret setelah save.

## Troubleshooting cepat

- Kalau challenge Meta gagal, cek `verifyToken` dulu.
- Kalau signature POST gagal, cek `appSecret`.
- Kalau message nggak kemapping ke conversation, pastikan nomor di payload cocok sama `phoneNumberId` yang tersimpan.
- Kalau template nggak muncul, pastikan `businessAccountId` benar dan token punya scope yang sesuai.
