# keuangan | Personal Finance

Catatan keuangan pribadi yang jalan di browser: net worth, dompet, aset, utang, budget, goals. Bisa dipasang seperti aplikasi (PWA) dan jalan tanpa internet. Data tersimpan di perangkat, tidak dikirim ke mana pun.

**Versi: 1.4.6** (Invest & Savings wajib punya tujuan)

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
3. Buka situsnya dan muat ulang. Kalau tampilan masih lama, tutup lalu buka lagi aplikasinya sekali supaya service worker memperbarui cache (versi cache sudah naik ke `keuangan-v1.4.6`).

## Tombol "pasang sekarang" (PWA)

- Di Pengaturan > Pasang aplikasi, tombol **pasang sekarang** memasang aplikasi sebagai PWA lewat browser (Chrome Android, Chrome/Edge di komputer). Setelah terpasang, aplikasi jalan offline lewat service worker.
- Kalau tombol tidak muncul, petunjuk manual tampil: menu Chrome > **Instal aplikasi** (Android), **Tambah ke Layar Utama** di Safari (iPhone/iPad).
- Tidak ada lagi file APK. Kalau kamu sudah memasang APK lama, datanya terpisah dari PWA: ekspor JSON dari APK lalu impor di PWA.

## Penyimpanan di browser

| Kunci | Isi |
| --- | --- |
| `keuangan.v2` | Data akun Utama |
| `keuangan.v2.<id>` | Data akun lain |
| `keuangan.akun` | Daftar akun dan akun yang sedang aktif |
| `keuangan.tema` | Tema global |

Data hanya ada di browser perangkat ini. Kalau data browser dibersihkan atau ganti HP, data hilang, jadi **ekspor JSON tiap akun secara berkala**.

## Riwayat versi

- **1.4.6**: transaksi kategori **Invest & Savings** lewat form Transaksi kini punya kolom wajib **masuk ke** (pilih Goal atau Aset). Goal: jadi setoran goal dan masuk Dana Goals. Aset: modal dan nilai aset bertambah sebesar jumlahnya. Net worth tidak lagi turun saat menabung. Transaksi yang tertaut dikunci (hanya bisa dihapus; menghapus otomatis mengurangi dana goal / modal aset). Transaksi Invest & Savings lama yang belum tertaut bisa ditautkan dengan mengetuknya lalu memilih tujuan. Daftar transaksi menampilkan "ke goal / aset ...". Cache service worker naik ke `keuangan-v1.4.6`.
- **1.4.5**: tombol **pasang sekarang** kembali memasang PWA (bisa offline), tidak lagi mengunduh file APK. Kode dan keterangan APK dihapus (`FILE_APK`, deteksi WebView, aturan APK di service worker, gaya `a.btn`).
- **1.4.4**: uang di goal kini masuk **Total Assets** sebagai **Dana Goals**, jadi net worth tidak turun lagi saat menabung ke goal. Form tambah dana goal **wajib memilih dompet** (opsi "tidak dicatat sebagai pengeluaran" dihapus). Setoran mengurangi saldo dompet (pengeluaran Invest & Savings) lalu nilainya ditambahkan lagi lewat Dana Goals. Yang dihitung adalah transaksi yang tertaut ke setoran. Form **aset baru** juga **wajib memilih dompet** (opsi "tidak dicatat sebagai pengeluaran" dihapus), supaya net worth tidak naik tanpa sebab. **Saldo awal goal** dan **setoran lama tanpa dompet** tidak dihitung karena uangnya masih ada di dompet. Menghapus goal = uangnya dianggap terpakai (keluar dari Total Assets); menghapus satu setoran mengembalikan uang ke dompet. Grafik tren net worth ikut memakai Dana Goals per tanggal. Kartu baru "Dana Goals" di Home dan baris "Masuk Total Assets" di Goals.
- **1.4.3**: perbaikan rumus **Kesehatan keuangan** di Home. Pengeluaran ke kategori **Invest & Savings** (termasuk setoran goal dan beli aset yang dipotong dari dompet) tidak lagi dihitung sebagai pengeluaran di **Savings rate** dan **Dana darurat**, karena uangnya masuk tabungan / investasi. Savings rate = (income - expenses di luar Invest & Savings) / income. Dana darurat = kas / rata-rata expenses 3 bulan (tanpa Invest & Savings). Kategori dikenali dari nama yang mengandung "invest", "saving", atau "tabung". Tidak ada perubahan data; cache service worker naik ke `keuangan-v1.4.3`.
- **1.4.2**: tombol **pasang sekarang** di Pengaturan (Android) mengunduh file `personal-finance.apk`. Tombol disembunyikan di dalam aplikasi APK. Service worker tidak menyimpan file APK di cache.
- **1.4.1**: kategori Expenses baru **Lifestyle & Entertainment** (otomatis ditambahkan sekali ke akun yang sudah ada, dan ada di daftar awal akun baru; kalau dihapus tidak muncul lagi). Perbaikan tombol akun di HP yang tampil lonjong, kini bulat.
- **1.4.0**: banyak akun dengan data terpisah, nama akun bisa diganti, tema global.
- **1.3.1**: versi sebelumnya.

Dibuat oleh Muh Geris Wiruno Mandawa.
