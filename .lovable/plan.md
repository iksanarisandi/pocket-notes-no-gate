# Aplikasi Catatan Lokal

## Yang akan dibuat
- Halaman catatan berbahasa Indonesia yang langsung terbuka tanpa akun.
- Membuat, mengedit, menghapus, mencari, dan menyematkan catatan.
- Menyimpan perubahan otomatis di penyimpanan browser pengguna.
- Tampilan daftar catatan dan editor yang nyaman pada layar kecil maupun besar.

## Pendekatan teknis
- Implementasikan halaman utama di rute `/` menggunakan React dan kontrol desain yang sudah tersedia.
- Gunakan `localStorage` melalui efek React, bukan akses browser saat render, agar aman saat halaman dirender di server.
- Tambahkan pengujian untuk perilaku inti penyimpanan dan pengelolaan catatan.
- Perbarui metadata halaman dan catat keputusan penyimpanan lokal di `AGENTS.md`.
