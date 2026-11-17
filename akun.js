/* ================================================================
   AKUN.JS - BANYAK AKUN, DATA TIAP AKUN TERPISAH  [aplikasi v1.4.6]
   Tiap akun punya penyimpanan sendiri di browser (localStorage).
   Akun pertama ("Utama") memakai penyimpanan lama "keuangan.v2",
   jadi data yang sudah ada tidak berpindah dan tidak hilang.
   Akun baru memakai "keuangan.v2.<id>".

   Cara kerja: file ini mengganti KUNCI_DATA (storage.js) sesuai akun
   aktif, mengosongkan salinan data di memori, lalu menggambar ulang.
   Tema (mode & warna) berlaku GLOBAL: sama di semua akun.

   Dimuat SETELAH app.js. Tips edit lewat HP: cari nama bagian + " START".

   Daftar bagian:
   KONSTANTA | PENYIMPANAN | AKUN AKTIF | TEMA GLOBAL | PINDAH, TAMBAH,
   UBAH, HAPUS | TAMPILAN | MULAI
   ================================================================ */


/* ===== KONSTANTA START ===== */
const KUNCI_INDEKS_AKUN = "keuangan.akun";    // daftar akun + akun aktif
const KUNCI_TEMA_GLOBAL = "keuangan.tema";    // tema yang dipakai semua akun
const KUNCI_V2_UTAMA = "keuangan.v2";
const MAKS_NAMA_AKUN = 20;
/* ===== KONSTANTA END ===== */


/* ===== PENYIMPANAN START =====
   Daftar akun: { versi, aktif, daftar: [{ id, nama, kunci, utama? }] }
   Kalau daftar hilang atau rusak, dibuat ulang dengan satu akun
   "Utama" yang menunjuk ke data lama.
   ================================================================ */
const Akun = (() => {
  let indeks = null;

  const akunUtama = () => ({ id: "utama", nama: "Utama", kunci: KUNCI_V2_UTAMA, utama: true });

  function valid(x) {
    return x && typeof x === "object" && typeof x.aktif === "string" && Array.isArray(x.daftar) &&
      x.daftar.length > 0 && x.daftar.every((a) => a && typeof a.id === "string" && typeof a.nama === "string" &&
        typeof a.kunci === "string" && a.kunci.indexOf("keuangan.v2") === 0) &&
      x.daftar.some((a) => a.id === x.aktif);
  }

  function muat() {
    if (indeks) return indeks;
    let x = null;
    try { x = JSON.parse(localStorage.getItem(KUNCI_INDEKS_AKUN)); } catch (e) { /* kosong / rusak */ }
    indeks = valid(x) ? x : { versi: 1, aktif: "utama", daftar: [akunUtama()] };
    return indeks;
  }

  function simpan() {
    try { localStorage.setItem(KUNCI_INDEKS_AKUN, JSON.stringify(muat())); }
    catch (e) { throw new Error("Gagal menyimpan daftar akun (penyimpanan penuh atau diblokir browser)"); }
  }

  const daftar = () => muat().daftar;
  const cari = (id) => daftar().find((a) => a.id === id) || null;
  const aktif = () => cari(muat().aktif) || daftar()[0];

  function nama(teks) {
    return String(teks || "").trim().replace(/\s+/g, " ").slice(0, MAKS_NAMA_AKUN);
  }

  function cekNama(teks, idLama) {
    const n = nama(teks);
    if (!n) throw new Error("Nama akun tidak boleh kosong");
    if (daftar().some((a) => a.id !== idLama && a.nama.toLowerCase() === n.toLowerCase())) {
      throw new Error("Nama akun sudah dipakai");
    }
    return n;
  }

  return {
    daftar: daftar, cari: cari, aktif: aktif, simpan: simpan,
    setAktif(id) { muat().aktif = id; simpan(); },
    tambah(teks) {
      const n = cekNama(teks, null);
      const id = buatId();
      const baru = { id: id, nama: n, kunci: KUNCI_V2_UTAMA + "." + id };
      muat().daftar.push(baru);
      simpan();
      return baru;
    },
    ubahNama(id, teks) {
      const a = cari(id);
      if (!a) throw new Error("Akun tidak ditemukan");
      a.nama = cekNama(teks, id);
      simpan();
    },
    buang(id) {
      muat().daftar = daftar().filter((a) => a.id !== id);
      simpan();
    }
  };
})();
/* ===== PENYIMPANAN END ===== */


/* ===== AKUN AKTIF START =====
   Arahkan storage.js ke penyimpanan milik akun yang dipilih.
   Akun selain "Utama" tidak boleh ikut memigrasi data versi 1.
   ================================================================ */
function pasangAkun(a) {
  KUNCI_DATA = a.kunci;
  KUNCI_LAMA = a.utama ? "keuangan.v1" : "keuangan.v1.tidak-dipakai";
  Data._db = null;
  Data.dimigrasi = false;
}

pasangAkun(Akun.aktif());   // langsung, sebelum data pertama dibaca
/* ===== AKUN AKTIF END ===== */


/* ===== TEMA GLOBAL START =====
   Tema disimpan di dalam data tiap akun (storage.js). Supaya sama di
   semua akun, salinannya disimpan terpisah, lalu dipasang ke akun yang
   baru dibuka atau dibuat. Perubahan tema selalu memperbarui salinan.
   ================================================================ */
function bacaTemaGlobal() {
  try {
    const t = JSON.parse(localStorage.getItem(KUNCI_TEMA_GLOBAL));
    return t && typeof t === "object" ? t : null;
  } catch (e) { return null; }
}

function simpanTemaGlobal(p) {
  if (!p) return;
  try { localStorage.setItem(KUNCI_TEMA_GLOBAL, JSON.stringify(p)); } catch (e) { /* abaikan */ }
}

const setPengaturanAsli = Data.setPengaturan.bind(Data);
const imporJSONAsli = Data.imporJSON.bind(Data);

/* Setiap perubahan tema ikut disimpan sebagai tema global */
Data.setPengaturan = async function (p) {
  const hasil = await setPengaturanAsli(p);
  simpanTemaGlobal((await Data.ambilSemua()).pengaturan);
  return hasil;
};

/* Impor cadangan tidak mengganti tema yang sedang dipakai */
Data.imporJSON = async function (teks) {
  await imporJSONAsli(teks);
  await pasangTemaGlobal();
};

async function pasangTemaGlobal() {
  const t = bacaTemaGlobal();
  if (!t) return;
  try { await setPengaturanAsli(t); } catch (e) { /* tema global rusak: pakai tema akun */ }
}

/* Nama file cadangan memuat nama akun (hanya kalau akun lebih dari satu) */
const unduhAsli = window.unduh;
if (typeof unduhAsli === "function") {
  window.unduh = function (namaFile, teks, mime) {
    if (Akun.daftar().length > 1) {
      const slug = Akun.aktif().nama.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "akun";
      namaFile = String(namaFile).replace(/^keuangan-/, "keuangan-" + slug + "-");
    }
    return unduhAsli(namaFile, teks, mime);
  };
}
/* ===== TEMA GLOBAL END ===== */


/* ===== PINDAH, TAMBAH, UBAH, HAPUS START =====
   Pindah akun = ganti penyimpanan + kosongkan pilihan sementara
   (filter, pencarian, form yang terbuka). Penggambaran ulang dilakukan
   pemanggil lewat muatUlang() (form umum melakukannya otomatis).
   ================================================================ */
function resetTampilan() {
  state.editId = null;
  state.utangId = null;
  state.umum = null;
  state.dompetTerakhir = "";
  state.filter = "semua";
  state.cari = "";
  state.arus = "keluar";
  state.sub = "dompet";
  state.terbuka = {};
  state.bulan = bulanSekarang();

  const cari = $("#inputCari");
  if (cari) cari.value = "";
  $$("#view-transaksi .chip").forEach((c) => c.classList.toggle("is-active", c.dataset.tipe === "semua"));
  perbaruiFab();
}

async function pindahKe(id) {
  const a = Akun.cari(id);
  if (!a) throw new Error("Akun tidak ditemukan");

  /* Pastikan tema akun yang ditinggalkan tersimpan sebagai tema global */
  if (!bacaTemaGlobal() && state.data) simpanTemaGlobal(state.data.pengaturan);

  Akun.setAktif(id);
  pasangAkun(a);
  resetTampilan();
  await pasangTemaGlobal();
  perbaruiTombolAkun();
}

async function tambahAkun(teks) {
  const baru = Akun.tambah(teks);
  try {
    await pindahKe(baru.id);
  } catch (e) {
    Akun.buang(baru.id);   // gagal pindah: batalkan akun barunya
    throw e;
  }
}

function hapusDataAkun(a) {
  [a.kunci, a.kunci + ".rusak", a.kunci + ".sebelum_impor"].forEach((k) => {
    try { localStorage.removeItem(k); } catch (e) { /* abaikan */ }
  });
}

async function hapusAkun(id) {
  const a = Akun.cari(id);
  if (!a) throw new Error("Akun tidak ditemukan");
  if (Akun.daftar().length <= 1) throw new Error("Minimal harus ada satu akun");

  /* Kalau yang dihapus sedang dipakai, pindah dulu ke akun lain */
  if (Akun.aktif().id === id) await pindahKe(Akun.daftar().find((x) => x.id !== id).id);

  Akun.buang(id);
  hapusDataAkun(a);
  perbaruiTombolAkun();
}
/* ===== PINDAH, TAMBAH, UBAH, HAPUS END ===== */


/* ===== TAMPILAN START =====
   Tombol akun di header + dialog daftar akun.
   Form tambah / ubah nama memakai dialog umum (bukaFormUmum).
   ================================================================ */
const hurufAwal = (teks) => (Array.from(String(teks).trim())[0] || "?").toUpperCase();

function perbaruiTombolAkun() {
  const a = Akun.aktif();
  const tombol = $("#btnAkun");
  if (!tombol) return;
  $("#akunNama").textContent = a.nama;
  $("#akunAvatar").textContent = hurufAwal(a.nama);
  tombol.setAttribute("aria-label", "Akun " + a.nama + ". Ketuk untuk ganti akun");
  tombol.title = "Akun: " + a.nama;
}

function gambarDaftarAkun() {
  const aktifId = Akun.aktif().id;
  $("#daftarAkun").innerHTML = Akun.daftar().map((a) =>
    '<div class="akun-baris' + (a.id === aktifId ? " is-aktif" : "") + '">' +
      '<button type="button" class="akun-pilih" data-akun="pilih" data-id="' + esc(a.id) + '"' +
        (a.id === aktifId ? ' aria-current="true"' : "") + ">" +
        '<span class="akun-avatar" aria-hidden="true">' + esc(hurufAwal(a.nama)) + "</span>" +
        '<span class="akun-info"><strong>' + esc(a.nama) + "</strong>" +
          '<small class="muted">' + (a.id === aktifId ? "sedang dipakai" : "ketuk untuk pindah") + "</small></span>" +
        (a.id === aktifId ? '<span class="akun-centang" aria-hidden="true">&#10003;</span>' : "") +
      "</button>" +
      '<button type="button" class="mini-btn mini-btn--abu" data-akun="ubah" data-id="' + esc(a.id) + '">ubah</button>' +
    "</div>"
  ).join("");
}

function tutupDialogAkun() {
  const d = $("#dialogAkun");
  if (typeof d.close === "function") { if (d.open) d.close(); }
  else d.removeAttribute("open");
}

function bukaDialogAkun() {
  gambarDaftarAkun();
  bukaDialog($("#dialogAkun"));
}

function formAkunBaru() {
  tutupDialogAkun();
  bukaFormUmum({
    judul: "Akun baru",
    info: "Akun baru mulai dari data kosong (dompet dan kategori bawaan). Tema tetap sama dengan akun lain.",
    fields: [{ nama: "nama", label: "nama akun (misal Pribadi, Usaha)", tipe: "text", nilai: "", maks: MAKS_NAMA_AKUN, wajib: true }],
    labelSimpan: "buat dan pindah",
    simpan: (v) => tambahAkun(v.nama),
    pesan: "akun dibuat"
  });
}

function formUbahAkun(id) {
  const a = Akun.cari(id);
  if (!a) return;
  const bisaHapus = Akun.daftar().length > 1;
  tutupDialogAkun();
  bukaFormUmum({
    judul: "Ubah akun",
    info: bisaHapus ? "Mengubah nama tidak mengubah data. Menghapus akun akan menghapus SEMUA datanya." : "Mengubah nama tidak mengubah data. Akun terakhir tidak bisa dihapus.",
    fields: [{ nama: "nama", label: "nama akun", tipe: "text", nilai: a.nama, maks: MAKS_NAMA_AKUN, wajib: true }],
    simpan: (v) => { Akun.ubahNama(id, v.nama); perbaruiTombolAkun(); },
    hapus: bisaHapus ? () => hapusAkun(id) : null,
    konfirmasiHapus: 'Hapus akun "' + a.nama + '" beserta SEMUA datanya? Tidak bisa dibatalkan. Pastikan sudah ekspor cadangan.',
    pesan: "akun diubah"
  });
}
/* ===== TAMPILAN END ===== */


/* ===== MULAI START ===== */
document.addEventListener("DOMContentLoaded", () => {
  perbaruiTombolAkun();

  $("#btnAkun").addEventListener("click", bukaDialogAkun);

  const dialog = $("#dialogAkun");
  /* Ketuk area gelap di luar dialog = tutup */
  dialog.addEventListener("click", (e) => { if (e.target === dialog) tutupDialogAkun(); });

  dialog.addEventListener("click", (e) => {
    const el = e.target.closest("[data-akun]");
    if (!el) return;
    const aksi = el.dataset.akun;

    if (aksi === "tutup") tutupDialogAkun();
    else if (aksi === "baru") aman(() => formAkunBaru());
    else if (aksi === "ubah") aman(() => formUbahAkun(el.dataset.id));
    else if (aksi === "pilih") {
      aman(async () => {
        const id = el.dataset.id;
        if (id !== Akun.aktif().id) {
          await pindahKe(id);
          await muatUlang();
          pindahTab("home");
          toast("pindah ke akun " + Akun.aktif().nama);
        }
        tutupDialogAkun();
      });
    }
  });
});
/* ===== MULAI END ===== */
