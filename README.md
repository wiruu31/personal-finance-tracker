# keuangan | Personal Finance

Catatan keuangan pribadi yang jalan di browser: net worth, dompet, aset, utang, budget, goals. Bisa dipasang seperti aplikasi (PWA) dan jalan tanpa internet. Data tersimpan di perangkat, tidak dikirim ke mana pun.

**Versi: 1.4.1** (banyak akun, kategori baru Lifestyle & Entertainment)

## Fitur v1.4.0: banyak akun

- Tiap akun punya data sendiri: dompet, transaksi, kategori, budget, aset, utang, dan goals.
- Tombol akun ada di header (lingkaran huruf awal; di layar lebar tampil dengan nama). Ketuk untuk pindah akun, buat akun baru, atau ubah nama.
- Akun pertama bernama **Utama** dan memakai data yang sudah ada. Data lama tidak dipindah dan tidak hilang.
- Nama akun bisa diganti kapan saja (maksimal 20 karakter, tidak boleh kembar).
- Tema (mode terang/gelap dan palet warna) berlaku **global**: sama di semua akun.
- Ekspor JSON, impor JSON, ekspor CSV, dan reset hanya berlaku untuk akun yang sedang dibuka. Kalau akun lebih dari satu, nama file cadangan memuat nama akun, misalnya `keuangan-usaha-2026-11-15.json`.
- Hapus akun menghapus semua datanya dan tidak bisa dibatalkan. Akun terakhir tidak bisa dihapus.

> Catatan: ini pemisah data, bukan keamanan. Tidak ada login atau PIN, jadi siapa pun yang memegang perangkat bisa pindah akun.

## Susunan file

Semua file ada dalam satu folder (folder `icons/` tetap seperti sebelumnya).

| File | Isi |
| --- | --- |
| `keuangan.html` | Kerangka halaman |
| `keuangan.css` | Tampilan utama (tidak berubah selain nomor versi) |
| `akun.css` | **Baru.** Gaya tombol dan dialog akun |
| `storage.js` | Penyimpanan data (nama penyimpanan kini bisa berganti sesuai akun) |
| `ui.js` | Helper, hitungan, grafik, tema |
| `halaman.js` | Menggambar semua halaman |
| `app.js` | Penghubung dan event |
| `akun.js` | **Baru.** Daftar akun, pindah, tambah, ubah nama, hapus, tema global |
| `sw.js` | Service worker (offline) |
| `manifest.webmanifest` | Pengaturan PWA |

Urutan script di `keuangan.html` wajib: `storage.js`, `ui.js`, `halaman.js`, `app.js`, `akun.js`.

## Cara pasang (GitHub Pages)

1. Salin semua file ke repo. Timpa file lama dan tambahkan `akun.js` dan `akun.css`.
2. Pastikan folder `icons/` tetap ada.
3. Buka situsnya dan muat ulang. Kalau tampilan masih lama, tutup lalu buka lagi aplikasinya sekali supaya service worker memperbarui cache (versi cache sudah naik ke `keuangan-v1.4.1`).

## Penyimpanan di browser

| Kunci | Isi |
| --- | --- |
| `keuangan.v2` | Data akun Utama |
| `keuangan.v2.<id>` | Data akun lain |
| `keuangan.akun` | Daftar akun dan akun yang sedang aktif |
| `keuangan.tema` | Tema global |

Data hanya ada di browser perangkat ini. Kalau data browser dibersihkan atau ganti HP, data hilang, jadi **ekspor JSON tiap akun secara berkala**.

## Riwayat versi

- **1.4.1**: kategori Expenses baru **Lifestyle & Entertainment** (otomatis ditambahkan sekali ke akun yang sudah ada, dan ada di daftar awal akun baru; kalau dihapus tidak muncul lagi). Perbaikan tombol akun di HP yang tampil lonjong, kini bulat.
- **1.4.0**: banyak akun dengan data terpisah, nama akun bisa diganti, tema global.
- **1.3.1**: versi sebelumnya.

Dibuat oleh Muh Geris Wiruno Mandawa.
