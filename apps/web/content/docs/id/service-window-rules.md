# Aturan Service Window

Customer care window 24 jam adalah salah satu rule compliance paling penting di produk ini.

## Rule simpelnya

Kalau customer mengirim pesan dalam 24 jam terakhir, Wabrix boleh kirim freeform reply. Kalau tidak, Wabrix harus fallback ke template yang approved.

## Yang dilacak Wabrix

- `lastInboundAt`
- `serviceWindowExpiresAt`
- state bot pause
- state handoff
- state opt-out

Field ini yang menentukan apakah automation boleh balas, apakah human boleh kirim freeform text, dan kapan UI harus mendorong fallback template.

## Behaviour produk

- Window masih open: bot dan manual freeform reply masih boleh lanjut kalau tidak ada guard lain yang blok
- Mau habis: dashboard harus kasih warning ke operator
- Sudah closed: freeform diblok dan template fallback jadi jalur aman

## Kenapa ini penting

Kalau rule ini dilanggar, produk bisa kirim pesan yang melanggar policy walaupun UI kelihatan benar. Makanya backend ngecek service window lagi tepat sebelum outbound send.

## Kesalahan yang sering kejadian

- mengira warning di UI saja sudah cukup
- lupa kalau retry juga harus cek service window sekali lagi
- kirim manual reply dari conversation yang sudah closed lalu mengira masalahnya cuma status conversation, padahal ada policy juga

## Rule operator yang praktis

Kalau customer balik lagi setelah lama diam, inbound message terbaru akan buka window lagi. Sebelum inbound itu ada, tetap stay di approved template.
