/* ================================================================
   APP.JS - OTAK APLIKASI (PENGHUBUNG)  [aplikasi v1.3.1]
   Tugas file ini: menyimpan "keadaan" aplikasi (bulan, tab aktif),
   memasang semua event (klik, submit), membuka form, lalu memanggil
   Data (storage.js) dan fungsi render (ui.js, halaman.js).

   Tips edit lewat HP: cari nama bagian + " START".

   Daftar bagian:
   STATE | RENDER & TAB | NOTIFIKASI | FORM TRANSAKSI | FORM UMUM |
   FORM-FORM | CADANGAN | AKSI KLIK | AKSI SUBMIT | MULAI
   ================================================================ */


/* ===== STATE START =====
   Keadaan aplikasi yang berubah-ubah.
   ================================================================ */
const state = {
  tab: "home",               // halaman yang tampil
  bulan: bulanSekarang(),    // bulan yang sedang dilihat, contoh "2026-11"
  filter: "semua",           // filter transaksi: semua | masuk | keluar | transfer
  cari: "",                  // teks pencarian transaksi
  arus: "keluar",            // sub-halaman Arus Kas: masuk | keluar | utang
  sub: "dompet",             // sub-halaman Kekayaan: dompet | aset | utang
  terbuka: {},               // grup kategori di Pengaturan yang sedang dibuka
  data: null,                // salinan data terbaru dari Data.ambilSemua()
  editId: null,              // id transaksi yang sedang diubah (null = baru)
  utangId: null,             // kalau diisi: transaksi ini pembayaran utang
  umum: null,                // aksi dialog umum yang sedang terbuka
  dompetTerakhir: "",        // dompet yang terakhir dipakai (jadi pilihan awal)
  promptPasang: null         // penawaran "pasang aplikasi" dari browser (kalau ada)
};

const JUDUL_HALAMAN = {
  home: "Home", arus: "Arus Kas", transaksi: "Transaksi",
  kekayaan: "Kekayaan", goals: "Goals", pengaturan: "Pengaturan"
};

const SUB_HALAMAN = {
  home: "Ringkasan keuanganmu bulan ini",
  arus: "Income, expenses dan liabilitas: budget lawan realisasi",
  transaksi: "Catat dan cari uang masuk dan keluar",
  kekayaan: "Dompet, aset investasi dan utang di satu tempat",
  goals: "Tabungan dan target keuanganmu",
  pengaturan: "Tampilan, anggaran, kategori dan data"
};

/* Halaman yang memakai pemilih bulan */
const TAB_BULAN = ["home", "arus", "transaksi"];

/* Ubah teks input menjadi angka bulat ("25.000" -> 25000) */
const angka = (teks) => Number(String(teks || "").replace(/\D/g, "")) || 0;
/* ===== STATE END ===== */


/* ===== RENDER & TAB START =====
   Menggambar ulang semua halaman dan berpindah tab.
   ================================================================ */
async function muatUlang() {
  state.data = await Data.ambilSemua();
  render();
}

function render() {
  terapkanTema(state.data.pengaturan);
  $("#labelBulan").textContent = namaBulan(state.bulan);
  renderHome(state.data, state.bulan);
  renderArus(state.data, state.bulan, state.arus);
  renderTransaksi(state.data, state.bulan, state.filter, state.cari);
  renderKekayaan(state.data, state.sub);
  renderGoals(state.data);
  renderPengaturan(state.data, state.terbuka, infoPasang());
  isiPreviewUang(document);
}

const LABEL_FAB = {
  home: "Tambah transaksi", arus: "Tambah transaksi", transaksi: "Tambah transaksi", goals: "Tambah goal"
};
function labelFab() {
  if (state.tab === "kekayaan") {
    return state.sub === "aset" ? "Tambah aset" : state.sub === "utang" ? "Tambah utang" : "Tambah dompet";
  }
  return LABEL_FAB[state.tab] || "Tambah";
}

/* Teks pendek untuk tombol tambah di header (layar lebar) */
function labelAtas() {
  if (state.tab === "kekayaan") return state.sub === "aset" ? "Aset" : state.sub === "utang" ? "Utang" : "Dompet";
  return state.tab === "goals" ? "Goal" : "Transaksi";
}

function perbaruiFab() {
  const sembunyi = state.tab === "pengaturan";
  $("#fabTambah").hidden = sembunyi;
  $("#fabTambah").setAttribute("aria-label", labelFab());
  $("#btnTambahAtas").hidden = sembunyi;
  $("#btnTambahAtas").setAttribute("aria-label", labelFab());
  $("#labelTambahAtas").textContent = labelAtas();
}

function pindahTab(nama) {
  state.tab = nama;

  $$(".view").forEach((v) => v.classList.toggle("is-active", v.id === "view-" + nama));
  $$(".nav-btn").forEach((b) => {
    const aktif = b.dataset.tab === nama;
    b.classList.toggle("is-active", aktif);
    b.setAttribute("aria-current", aktif ? "page" : "false");
  });

  $("#judulHalaman").textContent = JUDUL_HALAMAN[nama] || "";
  $("#subHalaman").textContent = SUB_HALAMAN[nama] || "";
  $("#monthNav").hidden = !TAB_BULAN.includes(nama);
  perbaruiFab();
  window.scrollTo(0, 0);
}
/* ===== RENDER & TAB END ===== */


/* ===== NOTIFIKASI START =====
   Pesan kecil di bawah layar, dan pembungkus pengaman error.
   ================================================================ */
let timerToast = null;

function toast(pesan, galat) {
  const el = $("#toast");
  el.textContent = pesan;
  el.classList.toggle("is-error", Boolean(galat));
  el.classList.add("is-show");
  clearTimeout(timerToast);
  timerToast = setTimeout(() => el.classList.remove("is-show"), 2800);
}

/* Jalankan fungsi; kalau error, tampilkan pesannya sebagai notifikasi */
async function aman(fn) {
  try {
    await fn();
  } catch (error) {
    console.error(error);
    toast(error && error.message ? error.message : "Terjadi kesalahan", true);
  }
}
/* ===== NOTIFIKASI END ===== */


/* ===== FORM TRANSAKSI START =====
   Dialog untuk menambah / mengubah / menghapus transaksi.
   Tipe (masuk/keluar) menentukan daftar kategori yang muncul.
   Kalau dibuka dari tombol "bayar" di Utang, tipe dikunci ke
   pengeluaran dan transaksinya ditandai sebagai pembayaran utang.
   ================================================================ */
function isiKategori(tipe, pilih) {
  const sel = $("#fKategori");
  sel.innerHTML = state.data.kategori
    .filter((k) => k.tipe === tipe)
    .map((k) => '<option value="' + esc(k.id) + '">' + esc(k.nama) + "</option>")
    .join("");
  if (pilih) sel.value = pilih;
}

function isiDompet(pilih) {
  const sel = $("#fDompet");
  sel.innerHTML = state.data.dompet
    .map((d) => '<option value="' + esc(d.id) + '">' + esc(d.nama) + "</option>")
    .join("");
  if (pilih) sel.value = pilih;
}

function perbaruiPreview() {
  const n = angka($("#fJumlah").value);
  $("#fJumlahPreview").textContent = n > 0 ? rupiah(n) : "";
}

/* id kosong/null = transaksi baru; ada id = ubah transaksi itu.
   opsi.utangId = bayar utang itu. */
function bukaForm(id, opsi) {
  opsi = opsi || {};
  const data = state.data;
  const t = id ? data.transaksi.find((x) => x.id === id) : null;
  state.editId = t ? t.id : null;
  state.utangId = t && t.utangId ? t.utangId : (opsi.utangId || null);

  const utang = state.utangId ? data.utang.find((u) => u.id === state.utangId) : null;
  const form = $("#formTransaksi");
  const tipe = t ? t.tipe : "keluar";

  $("#judulForm").textContent = utang ? "Bayar utang" : t ? "Ubah transaksi" : "Transaksi baru";
  form.elements.tipe.value = tipe;
  $("#segTipe").hidden = Boolean(utang);

  const info = $("#infoUtang");
  info.hidden = !utang;
  if (utang) {
    const sisa = Math.max(0, utang.pokok - terbayarUtang(data, utang.id) + (t ? t.jumlah : 0));
    info.textContent = utang.nama + " (" + namaKategori(data, utang.kategoriId) + ") - sisa " + rupiah(sisa);
  }

  let kategoriPilih = t ? t.kategoriId : "";
  if (utang && !t) {
    const cocok = data.kategori.find((k) => k.tipe === "keluar" && /debt|install|cicil|utang|angsur/i.test(k.nama));
    kategoriPilih = cocok ? cocok.id : "";
  }
  isiKategori(tipe, kategoriPilih);
  $("#fKategori").disabled = Boolean(t && t.utangId);   // kategori pembayaran utang dikunci
  isiDompet(t ? t.dompetId : state.dompetTerakhir);

  $("#fJumlah").value = t ? String(t.jumlah) : "";
  $("#fTanggal").value = t ? t.tanggal : (state.bulan === bulanSekarang() ? hariIni() : state.bulan + "-01");
  $("#fCatatan").value = t ? t.catatan : "";
  $("#btnHapusTransaksi").hidden = !t;
  perbaruiPreview();

  bukaDialog($("#dialogTransaksi"));
}

async function simpanTransaksi() {
  const t = {
    kategoriId: $("#fKategori").value,
    dompetId: $("#fDompet").value,
    jumlah: angka($("#fJumlah").value),
    tanggal: $("#fTanggal").value,
    catatan: $("#fCatatan").value
  };
  if (state.utangId) t.utangId = state.utangId;

  if (state.editId) await Data.ubahTransaksi(state.editId, t);
  else await Data.tambahTransaksi(t);

  state.dompetTerakhir = t.dompetId;
  state.bulan = t.tanggal.slice(0, 7);   // lompat ke bulan transaksinya
  tutupForm();
  toast("tersimpan");
  await muatUlang();
}

async function hapusTransaksiAktif() {
  if (!state.editId) return;
  if (!confirm("Hapus transaksi ini?")) return;
  await Data.hapusTransaksi(state.editId);
  tutupForm();
  toast("transaksi dihapus");
  await muatUlang();
}

function bukaDialog(dialog) {
  if (typeof dialog.showModal === "function") dialog.showModal();
  else dialog.setAttribute("open", "");
}

function tutupForm() {
  ["#dialogTransaksi", "#dialogUmum"].forEach((s) => {
    const d = $(s);
    if (typeof d.close === "function") { if (d.open) d.close(); }
    else d.removeAttribute("open");
  });
  state.umum = null;
}

function pasangDialog() {
  ["#dialogTransaksi", "#dialogUmum"].forEach((s) => {
    const dialog = $(s);
    /* Ketuk area gelap di luar dialog = tutup */
    dialog.addEventListener("click", (e) => { if (e.target === dialog) tutupForm(); });
  });

  /* Ganti tipe masuk/keluar = ganti daftar kategori */
  $("#formTransaksi").addEventListener("change", (e) => {
    if (e.target.name === "tipe") isiKategori(e.target.value, "");
  });

  /* Pratinjau "Rp ..." saat mengetik jumlah */
  $("#fJumlah").addEventListener("input", perbaruiPreview);
}
/* ===== FORM TRANSAKSI END ===== */


/* ===== FORM UMUM START =====
   Satu dialog serbaguna untuk form selain transaksi.
   bukaFormUmum({ judul, info, fields, simpan, hapus, labelSimpan })
   field: { nama, label, tipe: text|uang|select|date, nilai, opsi,
            placeholder, maks, wajib, opsional, separuh }
   simpan(nilai) dan hapus() boleh async; dialog tertutup hanya
   kalau berhasil (kalau error, pesannya tampil dan form tetap).
   ================================================================ */
function htmlField(f) {
  const id = "u_" + f.nama;
  const wajib = f.wajib ? " required" : "";
  let input;

  if (f.tipe === "select") {
    input = '<select id="' + id + '" name="' + f.nama + '"' + wajib + ">" +
      f.opsi.map((o) => '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(f.nilai) ? " selected" : "") + ">" + esc(o[1]) + "</option>").join("") +
      "</select>";
  } else if (f.tipe === "uang") {
    input = '<input type="text" id="' + id + '" name="' + f.nama + '" inputmode="numeric" data-uang placeholder="' + esc(f.placeholder || "0") +
      '" value="' + esc(f.nilai === undefined || f.nilai === null || f.nilai === "" ? "" : f.nilai) + '"' + wajib + ">" + '<p class="preview"></p>';
  } else if (f.tipe === "date") {
    input = '<input type="date" id="' + id + '" name="' + f.nama + '" value="' + esc(f.nilai || "") + '"' + wajib + ">";
  } else {
    input = '<input type="text" id="' + id + '" name="' + f.nama + '" maxlength="' + (f.maks || 40) + '" placeholder="' +
      esc(f.placeholder || "") + '" value="' + esc(f.nilai || "") + '"' + wajib + ">";
  }
  return '<div class="field"><label for="' + id + '">' + esc(f.label) + "</label>" + input + "</div>";
}

function htmlFields(fields) {
  let html = "";
  for (let i = 0; i < fields.length; i++) {
    if (fields[i].separuh && fields[i + 1] && fields[i + 1].separuh) {
      html += '<div class="field-row">' + htmlField(fields[i]) + htmlField(fields[i + 1]) + "</div>";
      i++;
    } else {
      html += htmlField(fields[i]);
    }
  }
  return html;
}

function bukaFormUmum(cfg) {
  state.umum = cfg;
  $("#judulUmum").textContent = cfg.judul;
  const info = $("#infoUmum");
  info.hidden = !cfg.info;
  info.textContent = cfg.info || "";
  $("#isiUmum").innerHTML = htmlFields(cfg.fields);
  $("#btnHapusUmum").hidden = !cfg.hapus;
  $("#btnSimpanUmum").textContent = cfg.labelSimpan || "simpan";
  isiPreviewUang($("#isiUmum"));
  bukaDialog($("#dialogUmum"));
}

function bacaFormUmum(cfg) {
  const form = $("#formUmum");
  const nilai = {};
  cfg.fields.forEach((f) => {
    const raw = form.elements[f.nama].value;
    if (f.tipe === "uang") nilai[f.nama] = f.opsional && raw.trim() === "" ? "" : angka(raw);
    else nilai[f.nama] = raw;
  });
  return nilai;
}

async function kirimFormUmum() {
  const cfg = state.umum;
  if (!cfg) return;
  await cfg.simpan(bacaFormUmum(cfg));
  tutupForm();
  toast(cfg.pesan || "tersimpan");
  await muatUlang();
}

async function hapusFormUmum() {
  const cfg = state.umum;
  if (!cfg || !cfg.hapus) return;
  if (!confirm(cfg.konfirmasiHapus || "Hapus data ini?")) return;
  await cfg.hapus();
  tutupForm();
  toast("dihapus");
  await muatUlang();
}

/* Isi teks "Rp ..." di bawah kolom uang (di dalam wadah tertentu) */
function isiPreviewUang(wadah) {
  wadah.querySelectorAll("input[data-uang]").forEach((el) => {
    const p = el.nextElementSibling;
    if (p && p.classList.contains("preview")) {
      const n = angka(el.value);
      p.textContent = n > 0 ? rupiah(n) : "";
    }
  });
}
/* ===== FORM UMUM END ===== */


/* ===== FORM-FORM START =====
   Isi tiap form: dompet, transfer, aset, nilai aset, utang,
   goal, tambah dana goal, kategori, budget.
   ================================================================ */
const opsiDompet = () => state.data.dompet.map((d) => [d.id, d.nama + " (" + namaJenis(d.jenis) + ")"]);
const opsiKategori = (tipe) => state.data.kategori.filter((k) => k.tipe === tipe).map((k) => [k.id, k.nama]);
const tanggalAwal = () => (state.bulan === bulanSekarang() ? hariIni() : state.bulan + "-01");

/* --- Dompet --- */
function formDompet(id) {
  const d = id ? state.data.dompet.find((x) => x.id === id) : null;
  bukaFormUmum({
    judul: d ? "Ubah dompet" : "Dompet baru",
    info: d ? "Saldo awal = equity awal. Saldo sekarang = saldo awal + transaksi + transfer." : "",
    fields: [
      { nama: "nama", label: "nama akun (misal Dana, BRI)", tipe: "text", nilai: d ? d.nama : "", maks: 20, wajib: true },
      { nama: "jenis", label: "kategori", tipe: "select", nilai: d ? d.jenis : "ewallet", opsi: JENIS_DOMPET.map((j) => [j.id, j.nama]) },
      { nama: "saldoAwal", label: "saldo awal / equity (Rp)", tipe: "uang", nilai: d ? d.saldoAwal : "" }
    ],
    simpan: (v) => (d ? Data.ubahDompet(d.id, v) : Data.tambahDompet(v)),
    hapus: d ? () => Data.hapusDompet(d.id) : null,
    konfirmasiHapus: "Hapus dompet ini?",
    pesan: d ? "dompet diubah" : "dompet ditambahkan"
  });
}

/* --- Transfer antar dompet --- */
function formTransfer(id) {
  const t = id ? state.data.transfer.find((x) => x.id === id) : null;
  const dompet = opsiDompet();
  bukaFormUmum({
    judul: t ? "Ubah transfer" : "Transfer antar dompet",
    info: "Transfer tidak dihitung sebagai income atau expenses.",
    fields: [
      { nama: "dariId", label: "dari", tipe: "select", nilai: t ? t.dariId : dompet[0][0], opsi: dompet, separuh: true },
      { nama: "keId", label: "ke", tipe: "select", nilai: t ? t.keId : (dompet[1] || dompet[0])[0], opsi: dompet, separuh: true },
      { nama: "jumlah", label: "jumlah (Rp)", tipe: "uang", nilai: t ? t.jumlah : "", wajib: true },
      { nama: "tanggal", label: "tanggal", tipe: "date", nilai: t ? t.tanggal : tanggalAwal(), wajib: true },
      { nama: "catatan", label: "catatan (opsional)", tipe: "text", nilai: t ? t.catatan : "", maks: 80 }
    ],
    simpan: (v) => (t ? Data.ubahTransfer(t.id, v) : Data.tambahTransfer(v)),
    hapus: t ? () => Data.hapusTransfer(t.id) : null,
    konfirmasiHapus: "Hapus transfer ini?",
    pesan: "transfer tersimpan"
  });
}

/* --- Aset --- */
function formAset(id) {
  const a = id ? state.data.aset.find((x) => x.id === id) : null;
  const kat = opsiKategori("aset");
  if (kat.length === 0) throw new Error("Belum ada jenis aset. Tambah dulu di Pengaturan");

  const fields = [
    { nama: "nama", label: "nama aset (misal BBCA, Emas Antam)", tipe: "text", nilai: a ? a.nama : "", maks: 30, wajib: true },
    { nama: "kategoriId", label: "jenis aset", tipe: "select", nilai: a ? a.kategoriId : kat[0][0], opsi: kat },
    { nama: "modal", label: "modal / harga beli (Rp)", tipe: "uang", nilai: a ? a.modal : "", wajib: true }
  ];
  if (!a) {
    fields.push(
      { nama: "nilai", label: "nilai sekarang (Rp, kosong = sama dengan modal)", tipe: "uang", opsional: true },
      { nama: "tanggal", label: "tanggal beli", tipe: "date", nilai: tanggalAwal(), wajib: true },
      { nama: "sumber", label: "potong dari dompet (opsional)", tipe: "select", nilai: "",
        opsi: [["", "tidak dicatat sebagai pengeluaran"]].concat(opsiDompet()) }
    );
  }
  fields.push({ nama: "catatan", label: "catatan (opsional)", tipe: "text", nilai: a ? a.catatan : "", maks: 80 });

  bukaFormUmum({
    judul: a ? "Ubah aset" : "Aset baru",
    info: a ? "Untuk mengubah nilai sekarang, pakai tombol 'update nilai'." :
      "Kalau memilih dompet, modal otomatis dicatat sebagai pengeluaran Invest & Savings. Nilai aset masuk ke Total Assets.",
    fields: fields,
    simpan: (v) => (a ? Data.ubahAset(a.id, v) : Data.tambahAset(v, v.sumber)),
    hapus: a ? () => Data.hapusAset(a.id) : null,
    konfirmasiHapus: "Hapus aset ini? (transaksi pembeliannya tidak ikut terhapus)",
    pesan: a ? "aset diubah" : "aset ditambahkan"
  });
}

function formNilaiAset(id) {
  const a = state.data.aset.find((x) => x.id === id);
  if (!a) return;
  bukaFormUmum({
    judul: "Update nilai: " + a.nama,
    info: "Nilai sekarang " + rupiah(nilaiAsetKini(a)) + ". Setiap update disimpan sebagai riwayat untuk grafik net worth.",
    fields: [
      { nama: "nilai", label: "nilai terbaru (Rp)", tipe: "uang", nilai: nilaiAsetKini(a), wajib: true },
      { nama: "tanggal", label: "per tanggal", tipe: "date", nilai: hariIni(), wajib: true }
    ],
    simpan: (v) => Data.catatNilaiAset(a.id, v.nilai, v.tanggal),
    pesan: "nilai diperbarui"
  });
}

/* --- Utang --- */
function formUtang(id) {
  const u = id ? state.data.utang.find((x) => x.id === id) : null;
  const kat = opsiKategori("utang");
  if (kat.length === 0) throw new Error("Belum ada kategori liabilitas. Tambah dulu di Pengaturan");

  bukaFormUmum({
    judul: u ? "Ubah utang" : "Utang baru",
    info: u ? "" : "Pembayaran dicatat lewat tombol 'bayar' dan otomatis jadi pengeluaran.",
    fields: [
      { nama: "nama", label: "nama utang (misal KPR, Kartu Kredit)", tipe: "text", nilai: u ? u.nama : "", maks: 30, wajib: true },
      { nama: "kategoriId", label: "kategori liabilitas", tipe: "select", nilai: u ? u.kategoriId : kat[0][0], opsi: kat },
      { nama: "pokok", label: "jumlah utang (Rp)", tipe: "uang", nilai: u ? u.pokok : "", wajib: true },
      { nama: "tanggal", label: "tanggal mulai", tipe: "date", nilai: u ? u.tanggal : tanggalAwal(), wajib: true },
      { nama: "catatan", label: "catatan (opsional)", tipe: "text", nilai: u ? u.catatan : "", maks: 80 }
    ],
    simpan: (v) => (u ? Data.ubahUtang(u.id, v) : Data.tambahUtang(v)),
    hapus: u ? () => Data.hapusUtang(u.id) : null,
    konfirmasiHapus: "Hapus utang ini?",
    pesan: u ? "utang diubah" : "utang ditambahkan"
  });
}

/* --- Goals --- */
function formGoal(id) {
  const g = id ? state.data.goals.find((x) => x.id === id) : null;
  bukaFormUmum({
    judul: g ? "Ubah goal" : "Goal baru",
    info: "Isi tenggat kalau mau dihitung berapa yang perlu ditabung per bulan.",
    fields: [
      { nama: "nama", label: "nama goal (misal Dana Darurat)", tipe: "text", nilai: g ? g.nama : "", maks: 30, wajib: true },
      { nama: "target", label: "target (Rp)", tipe: "uang", nilai: g ? g.target : "", wajib: true },
      { nama: "awal", label: "sudah terkumpul (Rp)", tipe: "uang", nilai: g ? g.awal : "" },
      { nama: "tenggat", label: "tenggat (opsional)", tipe: "date", nilai: g ? g.tenggat : "" },
      { nama: "catatan", label: "catatan (opsional)", tipe: "text", nilai: g ? g.catatan : "", maks: 80 }
    ],
    simpan: (v) => (g ? Data.ubahGoal(g.id, v) : Data.tambahGoal(v)),
    hapus: g ? () => Data.hapusGoal(g.id) : null,
    konfirmasiHapus: "Hapus goal ini beserta riwayat dananya?",
    pesan: g ? "goal diubah" : "goal dibuat"
  });
}

function formSetoran(goalId) {
  const g = state.data.goals.find((x) => x.id === goalId);
  if (!g) return;
  const i = infoGoal(g);
  bukaFormUmum({
    judul: "Tambah dana: " + g.nama,
    info: "Terkumpul " + rupiah(i.terkumpul) + " dari " + rupiah(g.target) + ". Pilih dompet kalau uangnya diambil dari dompet (dicatat sebagai pengeluaran Invest & Savings).",
    fields: [
      { nama: "jumlah", label: "jumlah (Rp)", tipe: "uang", nilai: i.perBulan || "", wajib: true },
      { nama: "tanggal", label: "tanggal", tipe: "date", nilai: hariIni(), wajib: true },
      { nama: "dompetId", label: "ambil dari dompet (opsional)", tipe: "select", nilai: "",
        opsi: [["", "tidak dicatat sebagai pengeluaran"]].concat(opsiDompet()) },
      { nama: "catatan", label: "catatan (opsional)", tipe: "text", maks: 80 }
    ],
    simpan: (v) => Data.tambahSetoran(g.id, v, v.dompetId),
    pesan: "dana ditambahkan"
  });
}

/* --- Kategori & budget --- */
const NAMA_TIPE = { masuk: "Income", keluar: "Expenses", utang: "Liabilitas", aset: "Jenis aset" };

function formKategori(id) {
  const k = state.data.kategori.find((x) => x.id === id);
  if (!k) return;
  bukaFormUmum({
    judul: "Ubah kategori",
    info: NAMA_TIPE[k.tipe] + ". Kategori yang sudah dipakai tidak bisa dihapus.",
    fields: [{ nama: "nama", label: "nama kategori", tipe: "text", nilai: k.nama, maks: 30, wajib: true }],
    simpan: (v) => Data.ubahKategori(k.id, v.nama),
    hapus: () => Data.hapusKategori(k.id),
    konfirmasiHapus: "Hapus kategori ini?",
    pesan: "kategori diubah"
  });
}

function formBatas(id) {
  const k = state.data.kategori.find((x) => x.id === id);
  if (!k) return;
  bukaFormUmum({
    judul: "Budget: " + k.nama,
    info: NAMA_TIPE[k.tipe] + " - batas per bulan, berlaku untuk semua bulan. Isi 0 untuk menghapus budget.",
    fields: [{ nama: "batas", label: "budget per bulan (Rp)", tipe: "uang", nilai: k.batas > 0 ? k.batas : "" }],
    simpan: (v) => Data.setBatas(k.id, v.batas),
    pesan: "budget disimpan"
  });
}
/* ===== FORM-FORM END ===== */


/* ===== CADANGAN START =====
   Ekspor / impor / reset data. Karena data hanya tersimpan di
   browser ini, ekspor JSON secara berkala itu PENTING.
   ================================================================ */
function unduh(namaFile, teks, mime) {
  const blob = new Blob([teks], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = namaFile;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* Bungkus teks untuk CSV; awalan = + - @ diberi tanda ' agar tidak
   dijalankan sebagai rumus saat dibuka di Excel / Google Sheets */
function selCSV(nilai) {
  let s = String(nilai);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
}

function buatCSV(data) {
  const baris = [["tanggal", "tipe", "kategori", "dompet", "jumlah", "catatan"].join(",")];
  const semua = data.transaksi.map((t) => ({
    tanggal: t.tanggal, tipe: t.tipe, kategori: namaKategori(data, t.kategoriId),
    dompet: namaDompet(data, t.dompetId), jumlah: t.jumlah, catatan: t.catatan
  })).concat(data.transfer.map((t) => ({
    tanggal: t.tanggal, tipe: "transfer", kategori: "",
    dompet: namaDompet(data, t.dariId) + " -> " + namaDompet(data, t.keId), jumlah: t.jumlah, catatan: t.catatan
  })));
  semua.sort((a, b) => (a.tanggal < b.tanggal ? -1 : a.tanggal > b.tanggal ? 1 : 0)).forEach((t) => {
    baris.push([t.tanggal, t.tipe, selCSV(t.kategori), selCSV(t.dompet), t.jumlah, selCSV(t.catatan)].join(","));
  });
  return "﻿" + baris.join("\r\n");   // ﻿ = agar Excel membaca UTF-8
}

async function eksporJSON() {
  unduh("keuangan-" + hariIni() + ".json", await Data.eksporJSON(), "application/json");
  toast("cadangan JSON diunduh");
}

function eksporCSV() {
  unduh("keuangan-" + hariIni() + ".csv", buatCSV(state.data), "text/csv;charset=utf-8");
  toast("file CSV diunduh");
}

async function imporDariFile(file) {
  if (!file) return;
  if (!confirm("Impor akan MENGGANTI semua data yang ada sekarang. Lanjut?")) return;
  await Data.imporJSON(await file.text());
  toast("data berhasil diimpor");
  await muatUlang();
}

async function resetData() {
  if (!confirm("Hapus SEMUA data dan mulai dari awal? Pastikan sudah ekspor cadangan.")) return;
  await Data.resetSemua();
  toast("data direset");
  await muatUlang();
}
/* ===== CADANGAN END ===== */


/* ===== PWA START =====
   Agar web ini bisa dipasang seperti aplikasi & jalan offline.
   File terkait: manifest.webmanifest, sw.js, folder icons/.
   Data tetap di localStorage perangkat, tidak dikirim ke mana pun.
   ================================================================ */
function sudahTerpasang() {
  try {
    return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
  } catch (e) { return false; }
}

/* Dipakai halaman Pengaturan untuk memilih petunjuk yang pas */
function infoPasang() {
  const ua = navigator.userAgent || "";
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return { terpasang: sudahTerpasang(), bisa: Boolean(state.promptPasang), ios: ios };
}

/* Browser menawarkan pemasangan: simpan, tampilkan tombol di Pengaturan */
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  state.promptPasang = e;
  if (state.data) renderPengaturan(state.data, state.terbuka, infoPasang());
});

window.addEventListener("appinstalled", () => {
  state.promptPasang = null;
  toast("aplikasi terpasang");
  if (state.data) renderPengaturan(state.data, state.terbuka, infoPasang());
});

async function pasangAplikasi() {
  const p = state.promptPasang;
  if (!p) return;
  p.prompt();
  await p.userChoice;
  state.promptPasang = null;
  renderPengaturan(state.data, state.terbuka, infoPasang());
}

/* Daftarkan service worker (hanya jalan lewat http/https, bukan file://) */
function daftarkanSW() {
  if (!("serviceWorker" in navigator) || !/^https?:$/.test(location.protocol)) return;
  navigator.serviceWorker.register("sw.js").catch((e) => console.warn("service worker gagal:", e));
}
/* ===== PWA END ===== */


/* ===== AKSI KLIK START =====
   Setiap elemen ber-atribut data-aksi="nama" memicu fungsi di bawah.
   Mau menambah tombol baru? Beri data-aksi di HTML, lalu daftarkan
   namanya di sini.
   ================================================================ */
/* Baca keempat kolom warna kustom di Pengaturan */
function bacaWarnaKustom() {
  const nilai = { preset: "kustom" };
  $$("input[data-warna]").forEach((el) => { nilai[el.dataset.warna] = el.value; });
  return nilai;
}

async function simpanPengaturan(p, pesan) {
  await Data.setPengaturan(p);
  if (pesan) toast(pesan);
  await muatUlang();
}

const AKSI = {
  "bulan-sebelum": () => { state.bulan = geserBulan(state.bulan, -1); render(); },
  "bulan-berikut": () => { state.bulan = geserBulan(state.bulan, 1); render(); },
  "bulan-ini":     () => { state.bulan = bulanSekarang(); render(); },

  "tab": (el) => pindahTab(el.dataset.tab),

  /* Tombol + : fungsinya mengikuti halaman yang terbuka */
  "fab": () => {
    if (state.tab === "kekayaan") {
      if (state.sub === "aset") formAset(null);
      else if (state.sub === "utang") formUtang(null);
      else formDompet(null);
    } else if (state.tab === "goals") {
      formGoal(null);
    } else {
      bukaForm(null);
    }
  },

  "filter": (el) => {
    state.filter = el.dataset.tipe;
    $$("#view-transaksi .chip").forEach((c) => c.classList.toggle("is-active", c === el));
    renderTransaksi(state.data, state.bulan, state.filter, state.cari);
  },

  "sub-arus":     (el) => { state.arus = el.dataset.tipe; renderArus(state.data, state.bulan, state.arus); },
  "sub-kekayaan": (el) => { state.sub = el.dataset.sub; renderKekayaan(state.data, state.sub); perbaruiFab(); },

  "edit-transaksi": (el) => bukaForm(el.dataset.id),
  "edit-transfer":  (el) => formTransfer(el.dataset.id),
  "tutup-dialog":   () => tutupForm(),
  "hapus-transaksi": () => hapusTransaksiAktif(),
  "hapus-umum":      () => hapusFormUmum(),

  "edit-dompet": (el) => formDompet(el.dataset.id),
  "transfer":    () => formTransfer(null),
  "edit-aset":   (el) => formAset(el.dataset.id),
  "nilai-aset":  (el) => formNilaiAset(el.dataset.id),
  "edit-utang":  (el) => formUtang(el.dataset.id),
  "bayar-utang": (el) => bukaForm(null, { utangId: el.dataset.id }),

  "edit-goal":  (el) => formGoal(el.dataset.id),
  "setor-goal": (el) => formSetoran(el.dataset.id),
  "hapus-setoran": async (el) => {
    if (!confirm("Hapus catatan dana ini? (pengeluaran terkait ikut terhapus)")) return;
    await Data.hapusSetoran(el.dataset.goal, el.dataset.id);
    toast("dana dihapus");
    await muatUlang();
  },

  "atur-batas":    (el) => formBatas(el.dataset.id),
  "edit-kategori": (el) => formKategori(el.dataset.id),

  "set-mode":   (el) => simpanPengaturan({ mode: el.dataset.mode }),
  /* Pilih palet siap pakai: aksen, latar, dan cahaya ikut berganti */
  "set-preset": (el) => {
    const w = PRESET_WARNA.find((x) => x.id === el.dataset.preset);
    if (!w) return;
    return simpanPengaturan({ preset: w.id, aksen: w.hex, latar: w.latar, cahaya1: w.g1, cahaya2: w.g2 }, "palet " + w.nama);
  },
  /* Pakai warna kustom yang sedang tampil di kolom warna */
  "set-kustom": () => simpanPengaturan(bacaWarnaKustom(), "palet kustom dipakai"),
  /* Tombol bulan di header: bergantian terang <-> gelap */
  "ganti-tema": () => simpanPengaturan({ mode: modeGelap(state.data.pengaturan.mode) ? "terang" : "gelap" }),

  "ekspor-json": () => eksporJSON(),
  "ekspor-csv":  () => eksporCSV(),
  "impor":       () => $("#inputImpor").click(),
  "reset-data":  () => resetData(),
  "pasang-app":  () => pasangAplikasi()
};

document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-aksi]");
  if (!el) return;
  const fn = AKSI[el.dataset.aksi];
  if (fn) aman(() => fn(el));
});
/* ===== AKSI KLIK END ===== */


/* ===== AKSI SUBMIT START =====
   Setiap <form data-submit="nama"> diproses oleh fungsi di bawah.
   Form dialog umum (#formUmum) diproses sebagai "umum".
   ================================================================ */
const SUBMIT = {
  "transaksi": () => simpanTransaksi(),
  "umum": () => kirimFormUmum(),

  "kategori": async (form) => {
    await Data.tambahKategori(form.elements.nama.value, form.dataset.tipe);
    state.terbuka[form.dataset.tipe] = true;
    toast("kategori ditambahkan");
    await muatUlang();
  },

  "batas": async (form) => {
    await Data.setBatas(form.dataset.id, angka(form.elements.batas.value));
    toast("budget disimpan");
    await muatUlang();
  }
};

document.addEventListener("submit", (e) => {
  const form = e.target.closest("form[data-submit], #formUmum");
  if (!form) return;
  e.preventDefault();
  const fn = SUBMIT[form.id === "formUmum" ? "umum" : form.dataset.submit];
  if (fn) aman(() => fn(form));
});

/* Pratinjau "Rp ..." di kolom uang mana pun */
document.addEventListener("input", (e) => {
  if (e.target.matches && e.target.matches("input[data-uang]")) {
    const p = e.target.nextElementSibling;
    if (p && p.classList.contains("preview")) {
      const n = angka(e.target.value);
      p.textContent = n > 0 ? rupiah(n) : "";
    }
  }
  if (e.target.id === "inputCari") {
    state.cari = e.target.value;
    renderTransaksi(state.data, state.bulan, state.filter, state.cari);
  }
  /* Warna kustom: langsung terlihat, disimpan saat selesai memilih */
  if (e.target.dataset && e.target.dataset.warna) {
    terapkanTema(Object.assign({}, state.data.pengaturan, bacaWarnaKustom()));
  }
});

document.addEventListener("change", (e) => {
  if (e.target.dataset && e.target.dataset.warna) {
    aman(() => simpanPengaturan(bacaWarnaKustom(), "warna tema diubah"));
  }
});

/* Ingat grup kategori yang dibuka di Pengaturan (event toggle tidak
   menggelembung, jadi dipasang di fase capture) */
document.addEventListener("toggle", (e) => {
  const el = e.target;
  if (el && el.dataset && el.dataset.grup) state.terbuka[el.dataset.grup] = el.open;
}, true);
/* ===== AKSI SUBMIT END ===== */


/* ===== MULAI START =====
   Dijalankan sekali saat halaman dibuka.
   ================================================================ */
document.addEventListener("DOMContentLoaded", () => {
  aman(async () => {
    pasangDialog();

    /* Pilih file cadangan untuk diimpor */
    $("#inputImpor").addEventListener("change", (e) => {
      const file = e.target.files[0];
      e.target.value = "";   // supaya file yang sama bisa dipilih lagi
      aman(() => imporDariFile(file));
    });

    /* Mode "otomatis" mengikuti pengaturan terang/gelap perangkat */
    try {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const ganti = () => { if (state.data && state.data.pengaturan.mode === "auto") terapkanTema(state.data.pengaturan); };
      if (mq.addEventListener) mq.addEventListener("change", ganti);
    } catch (e) { /* abaikan */ }

    /* Tahun hak cipta otomatis */
    $("#tahunCopyright").textContent = new Date().getFullYear();
    $$(".versi-app").forEach((el) => { el.textContent = "v" + VERSI_APP; });

    await muatUlang();
    pindahTab("home");
    if (Data.dimigrasi) toast("data lama berhasil dipindah ke versi baru");

    daftarkanSW();

    /* Minta browser agar tidak menghapus data otomatis saat memori penuh */
    try {
      if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
    } catch (e) { /* abaikan */ }
  });
});
/* ===== MULAI END ===== */
