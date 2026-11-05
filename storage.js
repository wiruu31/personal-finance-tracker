/* ================================================================
   STORAGE.JS - URUSAN DATA (SIMPAN / AMBIL)  [aplikasi v1.3.1, data skema 2]
   Semua akses data aplikasi lewat objek "Data" di file ini.
   File lain (ui.js, halaman.js, app.js) TIDAK menyentuh localStorage.

   Semua fungsi dibuat async supaya nanti kalau pindah ke Supabase,
   cukup ganti ISI file ini. Nama fungsinya tetap.

   Data lama (versi 1, kunci "keuangan.v1") otomatis dimigrasi saat
   pertama kali dibuka. Data lama TIDAK dihapus.

   Tips edit lewat HP: cari nama bagian + " START".

   Daftar bagian:
   KONSTANTA | HELPER | VALIDASI | MIGRASI | OBJEK DATA
   ================================================================ */


/* ===== KONSTANTA START =====
   Data awal saat pertama kali dibuka. Boleh diubah.
   Tipe kategori:
     masuk  = Income          keluar = Expenses
     utang  = Liabilitas      aset   = jenis aset / investasi
   Semua ini juga bisa diubah dari halaman Pengaturan.
   ================================================================ */
const KUNCI_DATA = "keuangan.v2";
const KUNCI_LAMA = "keuangan.v1";

const VERSI_APP = "1.3.1";

const MODE_TEMA = ["auto", "terang", "gelap"];

/* Palet warna tema. Tiap palet: aksen (hex), latar gelap (latar),
   tiga cahaya sudut (g1, g2, g3). Pengguna juga bisa membuat palet
   kustom sendiri dari halaman Pengaturan. Palet pertama = bawaan. */
const PRESET_WARNA = [
  { id: "navy",    nama: "Tech Navy",  hex: "#38E3A0", latar: "#060912", g1: "#3B5BDB", g2: "#8B5CF6", g3: "#C99A3B" },
  { id: "zamrud",  nama: "Zamrud",     hex: "#2FD38B", latar: "#070F0A", g1: "#1E9E5B", g2: "#F2C14E", g3: "#14B8A6" },
  { id: "ungu",    nama: "Ungu Malam", hex: "#A78BFA", latar: "#09060F", g1: "#7C3AED", g2: "#EC4899", g3: "#38BDF8" },
  { id: "samudra", nama: "Samudra",    hex: "#38BDF8", latar: "#050D14", g1: "#0EA5E9", g2: "#6366F1", g3: "#34D399" },
  { id: "senja",   nama: "Senja",      hex: "#F5A623", latar: "#0F0906", g1: "#C2410C", g2: "#B45309", g3: "#F59E0B" }
];

/* Jenis dompet. "tunai" = Cash on Hand, sisanya = Digital Wallets & Bank */
const JENIS_DOMPET = [
  { id: "tunai",   nama: "Cash on Hand" },
  { id: "bank",    nama: "Bank" },
  { id: "ewallet", nama: "E-Wallet" }
];

const TIPE_KATEGORI = ["masuk", "keluar", "utang", "aset"];

const DOMPET_AWAL = [
  { nama: "Tunai", jenis: "tunai",   saldoAwal: 0 },
  { nama: "BRI",   jenis: "bank",    saldoAwal: 0 },
  { nama: "Dana",  jenis: "ewallet", saldoAwal: 0 }
];

const KATEGORI_AWAL = {
  masuk: ["Active Income", "Passive Income", "Other Income"],
  keluar: [
    "Rent", "Utilities", "Food", "Transportation", "School / Education",
    "Health & Insurance", "Debt / Installments", "Shopping", "Subscriptions",
    "Hobbies & Recreation", "Social & Charity", "Invest & Savings", "Other Expense"
  ],
  utang: [],   /* kategori liabilitas ditambah sendiri lewat Pengaturan */
  aset: [
    "Cryptocurrency", "Precious Metal", "Mutual Fund", "Fixed Income",
    "Bonds", "Stocks", "Forex", "Property", "Other Asset"
  ]
};
/* ===== KONSTANTA END ===== */


/* ===== HELPER START =====
   Fungsi kecil pendukung. Tidak perlu diedit.
   ================================================================ */
function buatId() {
  if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function salin(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function hariIniDB() {
  const d = new Date();
  const dua2 = (n) => String(n).padStart(2, "0");
  return d.getFullYear() + "-" + dua2(d.getMonth() + 1) + "-" + dua2(d.getDate());
}

const urutTanggal = (a, b) => (a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : 0);

const teksBersih = (x, maks) => String(x || "").trim().slice(0, maks);

/* Pastikan x bilangan bulat >= min, kalau tidak lempar Error(pesan) */
function intMin(x, min, pesan) {
  const n = Number(x);
  if (!Number.isInteger(n) || n < min) throw new Error(pesan);
  return n;
}

/* Pengaturan tampilan bawaan: gelap, palet pertama */
function pengaturanAwal() {
  const p = PRESET_WARNA[0];
  return { mode: "gelap", aksen: p.hex, preset: p.id, latar: p.latar, cahaya1: p.g1, cahaya2: p.g2 };
}

const HEX6 = /^#[0-9a-fA-F]{6}$/;

function rangka() {
  return {
    versi: 2,
    pengaturan: pengaturanAwal(),
    dompet: [],      // { id, nama, jenis, saldoAwal }
    kategori: [],    // { id, nama, tipe, batas }   batas = budget per bulan
    transaksi: [],   // { id, dompetId, kategoriId, tipe, jumlah, tanggal, catatan, utangId? }
    transfer: [],    // { id, dariId, keId, jumlah, tanggal, catatan }
    aset: [],        // { id, nama, kategoriId, modal, catatan, riwayat:[{tanggal,nilai}] }
    utang: [],       // { id, nama, kategoriId, pokok, tanggal, catatan }
    goals: []        // { id, nama, target, awal, tenggat, catatan, setoran:[{id,tanggal,jumlah,catatan,trxId?}] }
  };
}

function dataAwal() {
  const d = rangka();
  d.dompet = DOMPET_AWAL.map((x) => ({ id: buatId(), nama: x.nama, jenis: x.jenis, saldoAwal: x.saldoAwal }));
  TIPE_KATEGORI.forEach((tipe) => {
    KATEGORI_AWAL[tipe].forEach((nama) => d.kategori.push({ id: buatId(), nama: nama, tipe: tipe, batas: 0 }));
  });
  return d;
}

/* Cari kategori bawaan untuk transaksi otomatis (misal setoran goal).
   Cocokkan nama dengan pola; kalau tidak ada pakai yang pertama. */
function cariKategori(db, tipe, pola) {
  const daftar = db.kategori.filter((k) => k.tipe === tipe);
  const hasil = daftar.find((k) => pola.test(k.nama)) || daftar[0];
  if (!hasil) {
    throw new Error("Belum ada kategori " + (tipe === "keluar" ? "Expenses" : "Income") + ". Tambah dulu di Pengaturan");
  }
  return hasil;
}

/* Total pembayaran utang (boleh mengecualikan satu transaksi) */
function terbayarDb(db, utangId, kecualiTrxId) {
  return db.transaksi
    .filter((t) => t.utangId === utangId && t.id !== kecualiTrxId)
    .reduce((s, t) => s + t.jumlah, 0);
}
/* ===== HELPER END ===== */


/* ===== VALIDASI START =====
   Pemeriksaan data. Dipakai saat memuat, mengimpor, dan menyimpan.
   Uang selalu BILANGAN BULAT (rupiah), bukan desimal.
   ================================================================ */
function validTanggal(t) {
  if (typeof t !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return false;
  const [y, m, d] = t.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

const ok = Number.isInteger;

/* Mengembalikan pesan masalah, atau "" kalau data baik */
function cekData(d) {
  if (!d || typeof d !== "object") return "format bukan objek data";
  for (const kunci of ["dompet", "kategori", "transaksi", "transfer", "aset", "utang", "goals"]) {
    if (!Array.isArray(d[kunci])) return "bagian '" + kunci + "' tidak ada";
  }
  if (!d.pengaturan || typeof d.pengaturan !== "object") return "bagian 'pengaturan' tidak ada";
  if (d.dompet.length === 0) return "harus ada minimal satu dompet";

  const jenisOk = JENIS_DOMPET.map((j) => j.id);
  for (const x of d.dompet) {
    if (typeof x.id !== "string" || typeof x.nama !== "string" || !ok(x.saldoAwal) ||
        !jenisOk.includes(x.jenis)) return "data dompet rusak";
  }
  for (const x of d.kategori) {
    if (typeof x.id !== "string" || typeof x.nama !== "string" ||
        !TIPE_KATEGORI.includes(x.tipe) || !ok(x.batas) || x.batas < 0) return "data kategori rusak";
  }

  const idDompet = new Set(d.dompet.map((x) => x.id));
  const idKategori = new Set(d.kategori.map((x) => x.id));
  const idUtang = new Set(d.utang.map((x) => x.id));

  for (const x of d.transaksi) {
    if (typeof x.id !== "string" || !ok(x.jumlah) || x.jumlah <= 0 ||
        (x.tipe !== "masuk" && x.tipe !== "keluar") || !validTanggal(x.tanggal) ||
        !idDompet.has(x.dompetId) || !idKategori.has(x.kategoriId) ||
        (x.utangId !== undefined && !idUtang.has(x.utangId))) return "ada transaksi yang rusak";
  }
  for (const x of d.transfer) {
    if (typeof x.id !== "string" || !ok(x.jumlah) || x.jumlah <= 0 || !validTanggal(x.tanggal) ||
        !idDompet.has(x.dariId) || !idDompet.has(x.keId) || x.dariId === x.keId) return "ada transfer yang rusak";
  }
  for (const x of d.aset) {
    if (typeof x.id !== "string" || typeof x.nama !== "string" || !idKategori.has(x.kategoriId) ||
        !ok(x.modal) || x.modal < 0 || !Array.isArray(x.riwayat) || x.riwayat.length === 0 ||
        x.riwayat.some((r) => !validTanggal(r.tanggal) || !ok(r.nilai) || r.nilai < 0)) return "data aset rusak";
  }
  for (const x of d.utang) {
    if (typeof x.id !== "string" || typeof x.nama !== "string" || !idKategori.has(x.kategoriId) ||
        !ok(x.pokok) || x.pokok <= 0 || !validTanggal(x.tanggal)) return "data utang rusak";
  }
  for (const x of d.goals) {
    if (typeof x.id !== "string" || typeof x.nama !== "string" || !ok(x.target) || x.target <= 0 ||
        !ok(x.awal) || x.awal < 0 || !(x.tenggat === "" || validTanggal(x.tenggat)) ||
        !Array.isArray(x.setoran) ||
        x.setoran.some((s) => typeof s.id !== "string" || !ok(s.jumlah) || s.jumlah <= 0 || !validTanggal(s.tanggal))) {
      return "data goal rusak";
    }
  }
  return "";
}

/* Merapikan data sebelum dipakai (isi bagian yang kosong) */
function rapikanData(d) {
  d.versi = 2;
  const p = d.pengaturan || {};
  const awal = pengaturanAwal();
  const lengkap = HEX6.test(p.latar || "") && HEX6.test(p.cahaya1 || "") && HEX6.test(p.cahaya2 || "");
  d.pengaturan = {
    mode: MODE_TEMA.includes(p.mode) ? p.mode : awal.mode,
    aksen: HEX6.test(p.aksen || "") ? p.aksen : awal.aksen,
    preset: String(p.preset || awal.preset),
    latar: HEX6.test(p.latar || "") ? p.latar : awal.latar,
    cahaya1: HEX6.test(p.cahaya1 || "") ? p.cahaya1 : awal.cahaya1,
    cahaya2: HEX6.test(p.cahaya2 || "") ? p.cahaya2 : awal.cahaya2
  };
  /* Data dari versi sebelum palet (belum ada latar & cahaya): pakai palet bawaan.
     Warna kustom lama tetap dipertahankan sebagai aksen. */
  if (!lengkap) {
    if (p.preset === "kustom") d.pengaturan.preset = "kustom";
    else { d.pengaturan.aksen = awal.aksen; d.pengaturan.preset = awal.preset; }
  }
  d.transaksi.forEach((t) => { t.catatan = String(t.catatan || "").slice(0, 80); });
  d.transfer.forEach((t) => { t.catatan = String(t.catatan || "").slice(0, 80); });
  d.aset.forEach((a) => { a.catatan = String(a.catatan || "").slice(0, 80); a.riwayat.sort(urutTanggal); });
  d.utang.forEach((u) => { u.catatan = String(u.catatan || "").slice(0, 80); });
  d.goals.forEach((g) => {
    g.catatan = String(g.catatan || "").slice(0, 80);
    g.setoran.forEach((s) => { s.catatan = String(s.catatan || "").slice(0, 80); });
  });
  return d;
}
/* ===== VALIDASI END ===== */


/* ===== MIGRASI START =====
   Mengubah data versi 1 (tracker lama) menjadi versi 2.
   - dompet: jenis ditebak dari namanya (bisa diubah di Kekayaan)
   - kategori lama tetap ada; budget lama pindah ke kategori
   - kategori aset bawaan ditambahkan
   ================================================================ */
function tebakJenis(nama) {
  if (/tunai|cash|dompet/i.test(nama)) return "tunai";
  if (/bank|bca|bri|bni|mandiri|btn|cimb|jago|seabank/i.test(nama)) return "bank";
  return "ewallet";
}

function migrasiV1(lama) {
  const baru = rangka();
  baru.dompet = lama.dompet.map((d) => ({ id: d.id, nama: d.nama, jenis: tebakJenis(d.nama), saldoAwal: d.saldoAwal }));
  baru.kategori = lama.kategori.map((k) => ({ id: k.id, nama: k.nama, tipe: k.tipe, batas: 0 }));
  (lama.budget || []).forEach((b) => {
    const k = baru.kategori.find((x) => x.id === b.kategoriId);
    if (k) k.batas = b.batas;
  });
  baru.transaksi = lama.transaksi;
  KATEGORI_AWAL.aset.forEach((nama) => baru.kategori.push({ id: buatId(), nama: nama, tipe: "aset", batas: 0 }));
  return baru;
}

/* File impor bisa versi 1 atau 2 */
function bacaDataImpor(d) {
  if (d && d.versi === 2) return d;
  if (d && Array.isArray(d.dompet) && Array.isArray(d.kategori) && Array.isArray(d.transaksi)) return migrasiV1(d);
  return d;
}
/* ===== MIGRASI END ===== */


/* ===== OBJEK DATA START =====
   Satu-satunya pintu akses data. Semua fungsi async.
   Kalau ada yang tidak valid, fungsi melempar Error dengan pesan
   berbahasa Indonesia yang langsung bisa ditampilkan ke pengguna.
   ================================================================ */
const Data = {
  _db: null,          // salinan data di memori
  dimigrasi: false,   // true kalau barusan dimigrasi dari versi 1

  /* --- Memuat dari penyimpanan browser --- */
  _muat() {
    if (this._db) return this._db;

    let teks = null;
    try { teks = localStorage.getItem(KUNCI_DATA); } catch (e) { /* diblokir */ }

    if (teks) {
      try {
        const d = JSON.parse(teks);
        if (cekData(d) === "") {
          this._db = rapikanData(d);
          return this._db;
        }
      } catch (e) { /* JSON rusak */ }
      /* Data rusak: simpan salinannya dulu, jangan langsung ditimpa */
      try { localStorage.setItem(KUNCI_DATA + ".rusak", teks); } catch (e) { /* abaikan */ }
    } else {
      /* Belum ada data v2: coba ambil dari v1 */
      let lama = null;
      try { lama = localStorage.getItem(KUNCI_LAMA); } catch (e) { /* diblokir */ }
      if (lama) {
        try {
          const d = migrasiV1(JSON.parse(lama));
          if (cekData(d) === "") {
            this._db = rapikanData(d);
            this.dimigrasi = true;
            try { localStorage.setItem(KUNCI_DATA, JSON.stringify(this._db)); } catch (e) { /* abaikan */ }
            return this._db;
          }
        } catch (e) { /* data lama tidak bisa dibaca */ }
      }
    }

    this._db = dataAwal();
    try { localStorage.setItem(KUNCI_DATA, JSON.stringify(this._db)); } catch (e) { /* abaikan */ }
    return this._db;
  },

  /* --- Menulis ke penyimpanan browser (dicek dulu) --- */
  _tulis(db) {
    const masalah = cekData(db);
    if (masalah) throw new Error("Data tidak valid: " + masalah);
    try {
      localStorage.setItem(KUNCI_DATA, JSON.stringify(db));
    } catch (e) {
      throw new Error("Gagal menyimpan data (penyimpanan penuh atau diblokir browser)");
    }
    this._db = db;
  },

  /* --- Ubah data dengan aman ---
     fn mengubah SALINAN data. Hanya kalau berhasil disimpan,
     salinan itu menggantikan data lama. */
  _ubah(fn) {
    const db = salin(this._muat());
    const hasil = fn(db);
    this._tulis(db);
    return hasil;
  },

  /* ------------------------------------------------------------
     [DATA 1] BACA SEMUA
     ------------------------------------------------------------ */
  async ambilSemua() {
    return salin(this._muat());
  },

  /* ------------------------------------------------------------
     [DATA 2] TRANSAKSI
     Input: { dompetId, kategoriId, jumlah, tanggal, catatan, utangId? }
     "tipe" otomatis diambil dari kategorinya.
     utangId = transaksi ini adalah pembayaran utang (mengurangi sisa).
     ------------------------------------------------------------ */
  _cekTransaksi(db, t, idLama) {
    const jumlah = intMin(t.jumlah, 1, "Jumlah harus angka bulat lebih dari 0");
    if (!validTanggal(t.tanggal)) throw new Error("Tanggal tidak valid");

    const kategori = db.kategori.find((k) => k.id === t.kategoriId && (k.tipe === "masuk" || k.tipe === "keluar"));
    if (!kategori) throw new Error("Pilih kategori dulu");
    if (!db.dompet.some((d) => d.id === t.dompetId)) throw new Error("Pilih dompet dulu");

    const hasil = {
      dompetId: t.dompetId,
      kategoriId: t.kategoriId,
      tipe: kategori.tipe,
      jumlah: jumlah,
      tanggal: t.tanggal,
      catatan: teksBersih(t.catatan, 80)
    };

    if (t.utangId) {
      const u = db.utang.find((x) => x.id === t.utangId);
      if (!u) throw new Error("Utang tidak ditemukan");
      if (kategori.tipe !== "keluar") throw new Error("Pembayaran utang harus berupa pengeluaran");
      const sisa = u.pokok - terbayarDb(db, u.id, idLama);
      if (jumlah > sisa) {
        throw new Error("Melebihi sisa utang (Rp " + new Intl.NumberFormat("id-ID").format(sisa) + ")");
      }
      hasil.utangId = u.id;
    }
    return hasil;
  },

  async tambahTransaksi(t) {
    return this._ubah((db) => {
      const baru = this._cekTransaksi(db, t, null);
      baru.id = buatId();
      db.transaksi.push(baru);
      return baru;
    });
  },

  async ubahTransaksi(id, t) {
    return this._ubah((db) => {
      const i = db.transaksi.findIndex((x) => x.id === id);
      if (i < 0) throw new Error("Transaksi tidak ditemukan");
      const lama = db.transaksi[i];
      const masuk = Object.assign({}, t);
      if (lama.utangId) { masuk.utangId = lama.utangId; masuk.kategoriId = lama.kategoriId; }
      const baru = this._cekTransaksi(db, masuk, id);
      baru.id = id;
      db.transaksi[i] = baru;
      return baru;
    });
  },

  async hapusTransaksi(id) {
    return this._ubah((db) => {
      db.transaksi = db.transaksi.filter((x) => x.id !== id);
    });
  },

  /* ------------------------------------------------------------
     [DATA 3] TRANSFER ANTAR DOMPET
     Input: { dariId, keId, jumlah, tanggal, catatan }
     Tidak dihitung sebagai income / expense.
     ------------------------------------------------------------ */
  _cekTransfer(db, t) {
    const jumlah = intMin(t.jumlah, 1, "Jumlah harus angka bulat lebih dari 0");
    if (!validTanggal(t.tanggal)) throw new Error("Tanggal tidak valid");
    if (!db.dompet.some((d) => d.id === t.dariId)) throw new Error("Pilih dompet asal");
    if (!db.dompet.some((d) => d.id === t.keId)) throw new Error("Pilih dompet tujuan");
    if (t.dariId === t.keId) throw new Error("Dompet asal dan tujuan harus berbeda");
    return { dariId: t.dariId, keId: t.keId, jumlah: jumlah, tanggal: t.tanggal, catatan: teksBersih(t.catatan, 80) };
  },

  async tambahTransfer(t) {
    return this._ubah((db) => {
      const baru = this._cekTransfer(db, t);
      baru.id = buatId();
      db.transfer.push(baru);
    });
  },

  async ubahTransfer(id, t) {
    return this._ubah((db) => {
      const i = db.transfer.findIndex((x) => x.id === id);
      if (i < 0) throw new Error("Transfer tidak ditemukan");
      const baru = this._cekTransfer(db, t);
      baru.id = id;
      db.transfer[i] = baru;
    });
  },

  async hapusTransfer(id) {
    return this._ubah((db) => { db.transfer = db.transfer.filter((x) => x.id !== id); });
  },

  /* ------------------------------------------------------------
     [DATA 4] DOMPET (cash, bank, e-wallet)
     saldoAwal = equity awal; saldo sekarang dihitung dari transaksi.
     ------------------------------------------------------------ */
  _cekDompet(db, d, idLama) {
    const nama = teksBersih(d.nama, 20);
    if (!nama) throw new Error("Nama dompet tidak boleh kosong");
    if (!JENIS_DOMPET.some((j) => j.id === d.jenis)) throw new Error("Pilih jenis dompet");
    const saldoAwal = intMin(d.saldoAwal || 0, 0, "Saldo awal harus angka bulat");
    if (db.dompet.some((x) => x.id !== idLama && x.nama.toLowerCase() === nama.toLowerCase())) {
      throw new Error("Nama dompet sudah ada");
    }
    return { nama: nama, jenis: d.jenis, saldoAwal: saldoAwal };
  },

  async tambahDompet(d) {
    return this._ubah((db) => {
      const baru = this._cekDompet(db, d, null);
      baru.id = buatId();
      db.dompet.push(baru);
    });
  },

  async ubahDompet(id, d) {
    return this._ubah((db) => {
      const i = db.dompet.findIndex((x) => x.id === id);
      if (i < 0) throw new Error("Dompet tidak ditemukan");
      const baru = this._cekDompet(db, d, id);
      baru.id = id;
      db.dompet[i] = baru;
    });
  },

  async hapusDompet(id) {
    return this._ubah((db) => {
      if (db.dompet.length <= 1) throw new Error("Minimal harus ada satu dompet");
      const dipakai = db.transaksi.filter((t) => t.dompetId === id).length +
                      db.transfer.filter((t) => t.dariId === id || t.keId === id).length;
      if (dipakai > 0) throw new Error("Dompet masih dipakai " + dipakai + " transaksi/transfer");
      db.dompet = db.dompet.filter((d) => d.id !== id);
    });
  },

  /* ------------------------------------------------------------
     [DATA 5] KATEGORI + BUDGET
     batas = budget per bulan (untuk masuk / keluar / utang).
     batas 0 = tidak ada budget.
     ------------------------------------------------------------ */
  async tambahKategori(nama, tipe) {
    return this._ubah((db) => {
      const bersih = teksBersih(nama, 30);
      if (!bersih) throw new Error("Nama kategori tidak boleh kosong");
      if (!TIPE_KATEGORI.includes(tipe)) throw new Error("Tipe kategori tidak valid");
      if (db.kategori.some((k) => k.tipe === tipe && k.nama.toLowerCase() === bersih.toLowerCase())) {
        throw new Error("Kategori itu sudah ada");
      }
      db.kategori.push({ id: buatId(), nama: bersih, tipe: tipe, batas: 0 });
    });
  },

  async ubahKategori(id, nama) {
    return this._ubah((db) => {
      const k = db.kategori.find((x) => x.id === id);
      if (!k) throw new Error("Kategori tidak ditemukan");
      const bersih = teksBersih(nama, 30);
      if (!bersih) throw new Error("Nama kategori tidak boleh kosong");
      if (db.kategori.some((x) => x.id !== id && x.tipe === k.tipe && x.nama.toLowerCase() === bersih.toLowerCase())) {
        throw new Error("Kategori itu sudah ada");
      }
      k.nama = bersih;
    });
  },

  async hapusKategori(id) {
    return this._ubah((db) => {
      const dipakai = db.transaksi.filter((t) => t.kategoriId === id).length +
                      db.aset.filter((a) => a.kategoriId === id).length +
                      db.utang.filter((u) => u.kategoriId === id).length;
      if (dipakai > 0) throw new Error("Kategori masih dipakai " + dipakai + " data");
      db.kategori = db.kategori.filter((k) => k.id !== id);
    });
  },

  async setBatas(kategoriId, batas) {
    return this._ubah((db) => {
      const k = db.kategori.find((x) => x.id === kategoriId);
      if (!k || k.tipe === "aset") throw new Error("Kategori ini tidak punya budget");
      k.batas = intMin(batas || 0, 0, "Budget harus angka bulat");
    });
  },

  /* ------------------------------------------------------------
     [DATA 6] ASET (investasi, properti, dll)
     Input: { nama, kategoriId, modal, nilai, tanggal, catatan }
     modal = harga beli, nilai = nilai sekarang.
     sumberDompetId (opsional): kalau diisi, otomatis dicatat sebagai
     pengeluaran (kategori Invest & Savings) sebesar modal.
     Nilai terbaru disimpan di riwayat supaya grafik net worth
     bisa menampilkan nilai aset di bulan-bulan lalu.
     ------------------------------------------------------------ */
  _cekAset(db, a) {
    const nama = teksBersih(a.nama, 30);
    if (!nama) throw new Error("Nama aset tidak boleh kosong");
    if (!db.kategori.some((k) => k.id === a.kategoriId && k.tipe === "aset")) throw new Error("Pilih kategori aset");
    return { nama: nama, kategoriId: a.kategoriId, catatan: teksBersih(a.catatan, 80) };
  },

  async tambahAset(a, sumberDompetId) {
    return this._ubah((db) => {
      const baru = this._cekAset(db, a);
      baru.modal = intMin(a.modal, 1, "Modal harus angka bulat lebih dari 0");
      const nilai = intMin(a.nilai === "" || a.nilai == null ? a.modal : a.nilai, 0, "Nilai harus angka bulat");
      if (!validTanggal(a.tanggal)) throw new Error("Tanggal tidak valid");
      baru.id = buatId();
      baru.riwayat = [{ tanggal: a.tanggal, nilai: baru.modal }];
      if (nilai !== baru.modal) baru.riwayat.push({ tanggal: a.tanggal > hariIniDB() ? a.tanggal : hariIniDB(), nilai: nilai });
      db.aset.push(baru);

      if (sumberDompetId) {
        if (!db.dompet.some((d) => d.id === sumberDompetId)) throw new Error("Dompet sumber tidak ditemukan");
        const kat = cariKategori(db, "keluar", /invest|saving|tabung/i);
        db.transaksi.push({
          id: buatId(), dompetId: sumberDompetId, kategoriId: kat.id, tipe: "keluar",
          jumlah: baru.modal, tanggal: a.tanggal, catatan: ("beli " + baru.nama).slice(0, 80)
        });
      }
    });
  },

  async ubahAset(id, a) {
    return this._ubah((db) => {
      const x = db.aset.find((y) => y.id === id);
      if (!x) throw new Error("Aset tidak ditemukan");
      const baru = this._cekAset(db, a);
      x.nama = baru.nama; x.kategoriId = baru.kategoriId; x.catatan = baru.catatan;
      x.modal = intMin(a.modal, 1, "Modal harus angka bulat lebih dari 0");
    });
  },

  /* Catat nilai terbaru aset (menambah riwayat nilai) */
  async catatNilaiAset(id, nilai, tanggal) {
    return this._ubah((db) => {
      const x = db.aset.find((y) => y.id === id);
      if (!x) throw new Error("Aset tidak ditemukan");
      const n = intMin(nilai, 0, "Nilai harus angka bulat");
      if (!validTanggal(tanggal)) throw new Error("Tanggal tidak valid");
      x.riwayat = x.riwayat.filter((r) => r.tanggal !== tanggal);
      x.riwayat.push({ tanggal: tanggal, nilai: n });
      x.riwayat.sort(urutTanggal);
    });
  },

  async hapusAset(id) {
    return this._ubah((db) => { db.aset = db.aset.filter((a) => a.id !== id); });
  },

  /* ------------------------------------------------------------
     [DATA 7] UTANG / LIABILITAS
     Input: { nama, kategoriId, pokok, tanggal, catatan }
     Pembayaran dicatat sebagai transaksi dengan utangId
     (lihat tambahTransaksi). Sisa = pokok - total pembayaran.
     ------------------------------------------------------------ */
  _cekUtang(db, u) {
    const nama = teksBersih(u.nama, 30);
    if (!nama) throw new Error("Nama utang tidak boleh kosong");
    if (!db.kategori.some((k) => k.id === u.kategoriId && k.tipe === "utang")) {
      throw new Error("Pilih kategori liabilitas (tambah dulu di Pengaturan kalau belum ada)");
    }
    if (!validTanggal(u.tanggal)) throw new Error("Tanggal tidak valid");
    return {
      nama: nama, kategoriId: u.kategoriId, tanggal: u.tanggal,
      pokok: intMin(u.pokok, 1, "Jumlah utang harus angka bulat lebih dari 0"),
      catatan: teksBersih(u.catatan, 80)
    };
  },

  async tambahUtang(u) {
    return this._ubah((db) => {
      const baru = this._cekUtang(db, u);
      baru.id = buatId();
      db.utang.push(baru);
    });
  },

  async ubahUtang(id, u) {
    return this._ubah((db) => {
      const i = db.utang.findIndex((x) => x.id === id);
      if (i < 0) throw new Error("Utang tidak ditemukan");
      const baru = this._cekUtang(db, u);
      if (baru.pokok < terbayarDb(db, id, null)) throw new Error("Jumlah utang lebih kecil dari yang sudah dibayar");
      baru.id = id;
      db.utang[i] = baru;
    });
  },

  async hapusUtang(id) {
    return this._ubah((db) => {
      if (db.transaksi.some((t) => t.utangId === id)) {
        throw new Error("Utang ini sudah punya pembayaran. Hapus dulu pembayarannya di tab Transaksi");
      }
      db.utang = db.utang.filter((u) => u.id !== id);
    });
  },

  /* ------------------------------------------------------------
     [DATA 8] GOALS
     Input goal: { nama, target, awal, tenggat, catatan }
       awal = sudah terkumpul sebelum dicatat di sini
       tenggat = tanggal target ("" kalau tanpa tenggat)
     Setoran: { jumlah, tanggal, catatan }.
     Kalau dompetId diisi, setoran juga dicatat sebagai pengeluaran
     (kategori Invest & Savings) supaya saldo dompet ikut berkurang.
     ------------------------------------------------------------ */
  _cekGoal(g) {
    const nama = teksBersih(g.nama, 30);
    if (!nama) throw new Error("Nama goal tidak boleh kosong");
    const tenggat = g.tenggat || "";
    if (tenggat && !validTanggal(tenggat)) throw new Error("Tenggat tidak valid");
    return {
      nama: nama,
      target: intMin(g.target, 1, "Target harus angka bulat lebih dari 0"),
      awal: intMin(g.awal || 0, 0, "Terkumpul harus angka bulat"),
      tenggat: tenggat,
      catatan: teksBersih(g.catatan, 80)
    };
  },

  async tambahGoal(g) {
    return this._ubah((db) => {
      const baru = this._cekGoal(g);
      baru.id = buatId();
      baru.setoran = [];
      db.goals.push(baru);
    });
  },

  async ubahGoal(id, g) {
    return this._ubah((db) => {
      const x = db.goals.find((y) => y.id === id);
      if (!x) throw new Error("Goal tidak ditemukan");
      Object.assign(x, this._cekGoal(g));
    });
  },

  async hapusGoal(id) {
    return this._ubah((db) => { db.goals = db.goals.filter((g) => g.id !== id); });
  },

  async tambahSetoran(goalId, s, dompetId) {
    return this._ubah((db) => {
      const g = db.goals.find((x) => x.id === goalId);
      if (!g) throw new Error("Goal tidak ditemukan");
      const jumlah = intMin(s.jumlah, 1, "Jumlah harus angka bulat lebih dari 0");
      if (!validTanggal(s.tanggal)) throw new Error("Tanggal tidak valid");

      const setor = { id: buatId(), tanggal: s.tanggal, jumlah: jumlah, catatan: teksBersih(s.catatan, 80) };
      if (dompetId) {
        if (!db.dompet.some((d) => d.id === dompetId)) throw new Error("Dompet tidak ditemukan");
        const kat = cariKategori(db, "keluar", /invest|saving|tabung/i);
        const trxId = buatId();
        db.transaksi.push({
          id: trxId, dompetId: dompetId, kategoriId: kat.id, tipe: "keluar",
          jumlah: jumlah, tanggal: s.tanggal, catatan: ("goal: " + g.nama).slice(0, 80)
        });
        setor.trxId = trxId;
      }
      g.setoran.push(setor);
    });
  },

  async hapusSetoran(goalId, setoranId) {
    return this._ubah((db) => {
      const g = db.goals.find((x) => x.id === goalId);
      if (!g) throw new Error("Goal tidak ditemukan");
      const s = g.setoran.find((x) => x.id === setoranId);
      if (s && s.trxId) db.transaksi = db.transaksi.filter((t) => t.id !== s.trxId);
      g.setoran = g.setoran.filter((x) => x.id !== setoranId);
    });
  },

  /* ------------------------------------------------------------
     [DATA 9] PENGATURAN TAMPILAN
     p boleh berisi sebagian: { mode, aksen, latar, cahaya1, cahaya2, preset }
     ------------------------------------------------------------ */
  async setPengaturan(p) {
    return this._ubah((db) => {
      if (p.mode !== undefined) {
        if (!MODE_TEMA.includes(p.mode)) throw new Error("Mode tampilan tidak valid");
        db.pengaturan.mode = p.mode;
      }
      ["aksen", "latar", "cahaya1", "cahaya2"].forEach((k) => {
        if (p[k] === undefined) return;
        if (!HEX6.test(p[k])) throw new Error("Warna tidak valid");
        db.pengaturan[k] = p[k];
      });
      if (p.preset !== undefined) db.pengaturan.preset = String(p.preset);
    });
  },

  /* ------------------------------------------------------------
     [DATA 10] CADANGAN (EKSPOR / IMPOR / RESET)
     ------------------------------------------------------------ */
  async eksporJSON() {
    return JSON.stringify(this._muat(), null, 2);
  },

  async imporJSON(teks) {
    let d;
    try { d = JSON.parse(teks); } catch (e) { throw new Error("File bukan JSON yang valid"); }

    d = bacaDataImpor(d);
    const masalah = cekData(d);
    if (masalah) throw new Error("File cadangan tidak valid: " + masalah);

    /* Simpan data lama sebagai cadangan darurat sebelum diganti */
    try { localStorage.setItem(KUNCI_DATA + ".sebelum_impor", JSON.stringify(this._muat())); } catch (e) { /* abaikan */ }

    this._tulis(rapikanData(d));
  },

  async resetSemua() {
    const baru = dataAwal();
    baru.pengaturan = salin(this._muat().pengaturan);   // tema tetap
    this._tulis(baru);
  }
};
/* ===== OBJEK DATA END ===== */
