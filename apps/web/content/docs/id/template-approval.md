# Approval Template

Template adalah fallback aman saat service window 24 jam sudah tertutup.

## Hal yang harus dipahami operator

- Template harus benar-benar ada di Meta, bukan cuma lokal
- Status template bisa `approved`, `pending`, `rejected`, atau archived
- Kalau template ditolak, biasanya yang perlu diubah adalah copy atau strukturnya, bukan cuma sync ulang

## Flow yang recommended

1. Buat atau sync template dari halaman setup WhatsApp.
2. Tunggu approval Meta.
3. Pakai template approved dari inbox saat freeform reply diblok.
4. Pantau alasan reject kalau Meta menolak template.

## Kaitan ke inbox

Saat service window sudah tertutup:

- manual freeform reply harus diblok
- approved template reply tetap harus tersedia
- payload queue harus `template`, bukan `text`

## Penyebab reject yang umum

- copy pesan terlalu vague atau misleading
- variabel tanpa tujuan yang jelas
- konten terasa promosi tapi dibungkus seperti utility
- isi pesan tidak match dengan category yang dipilih

## Checklist operator

- Apakah template sudah tersync ke Wabrix?
- Apakah language code benar?
- Apakah statusnya `approved`?
- Apakah category-nya masih cocok untuk use case ini?
- Apakah fallback di inbox memilih template yang benar?

## Mindset debugging

Kalau template ada secara lokal tapi tidak bisa dikirim, cek sinkronisasi status dulu. Kalau template sudah approved di Meta tapi belum muncul di Wabrix, jalankan template sync lagi sebelum menyentuh kode queue.
