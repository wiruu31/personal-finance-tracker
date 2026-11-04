/* ================================================================
   HALAMAN.JS - MENGGAMBAR SEMUA HALAMAN  [baru di versi 2]
   Tiap fungsi render menerima data (dan bulan / pilihan) lalu
   mengisi HTML ke wadahnya. File ini TIDAK menyimpan data dan
   TIDAK memasang event (itu tugas storage.js dan app.js).

   Tips edit lewat HP: cari nama bagian + " START".

   Daftar bagian:
   KOMPONEN | HOME | ARUS KAS | TRANSAKSI | KEKAYAAN (dompet, aset,
   utang) | GOALS | PENGATURAN
   ================================================================ */


/* ===== KOMPONEN START =====
   Potongan HTML yang dipakai berulang.
   ================================================================ */
const JUDUL_ARUS = { masuk: "Income", keluar: "Expenses", utang: "Liabilitas" };

function kartu(judul, isi, kelas) {
  return '<article class="card ' + (kelas || "") + '">' +
    (judul ? '<h2 class="card-title">' + judul + "</h2>" : "") + isi + "</article>";
}

function tile(label, nilai, kelasNilai, sub, kelasTile) {
  return '<div class="stat ' + (kelasTile || "") + '"><span class="stat-label">' + label + "</span>" +
    '<span class="stat-value ' + (kelasNilai || "") + '">' + nilai + "</span>" +
    (sub ? '<span class="stat-sub">' + sub + "</span>" : "") + "</div>";
}

/* Baris "label ........ nilai" */
function barisInfo(label, nilai, kelasNilai) {
  return '<div class="row"><span>' + label + '</span><strong class="' + (kelasNilai || "") + '">' + nilai + "</strong></div>";
}

function chipsHTML(daftar, aktif, aksi, atribut) {
  return '<div class="chips">' + daftar.map((c) =>
    '<button type="button" class="chip' + (c[0] === aktif ? " is-active" : "") + '" data-aksi="' + aksi +
    '" data-' + atribut + '="' + c[0] + '">' + c[1] + "</button>"
  ).join("") + "</div>";
}

const kelasSelisih = (tipe, s) => (s === null ? "muted" : s >= 0 ? "is-masuk" : tipe === "masuk" ? "is-warn" : "is-keluar");
/* ===== KOMPONEN END ===== */


/* ===== HOME START =====
   Net worth, total assets, cash, wallets & bank, liabilities,
   grafik donat, income vs expenses, tren, kesehatan keuangan.
   ================================================================ */
function renderHome(data, bulan) {
  const p = posisi(data, batasTanggal(bulan));
  const bulanLalu = geserBulan(bulan, -1);
  const lalu = posisi(data, bulanLalu + "-31");
  const delta = p.netWorth - lalu.netWorth;
  const t = totalBulan(data, bulan);
  const selisih = t.masuk - t.keluar;
  const sh = kesehatan(data, bulan);

  /* --- Net Worth (kartu utama bergaya uang kertas) --- */
  const hero =
    '<section class="hero">' +
      '<div class="hero-isi">' +
        '<p class="hero-label">NET WORTH</p>' +
        '<p class="hero-nilai">' + rupiah(p.netWorth) + "</p>" +
        '<p class="hero-delta ' + (delta >= 0 ? "is-naik" : "is-turun") + '">' +
          (delta === 0 ? "sama seperti" : (delta > 0 ? "&#9650; " : "&#9660; ") + rupiahTanda(delta) + " dari") +
          " akhir " + esc(namaBulan(bulanLalu)) + "</p>" +
      "</div>" +
      '<div class="koin" aria-hidden="true"><span>Rp</span></div>' +
      '<p class="hero-seri">TOTAL ASSETS &minus; LIABILITIES &middot; ' + esc(bulan.replace("-", " / ")) + "</p>" +
    "</section>";

  /* --- Ringkasan angka --- */
  const ringkas =
    '<div class="stat-grid">' +
      tile("Total Assets", rupiah(p.totalAset), "", "cash + wallet + investasi", "stat--besar") +
      tile("Liabilities", rupiah(p.liabilitas), "is-keluar", "sisa utang", "stat--besar") +
      tile("Cash on Hand", rupiah(p.tunai)) +
      tile("Digital Wallets &amp; Bank", rupiah(p.digital)) +
      tile("Investasi", rupiah(p.investasi), "", "saham, kripto, emas, dll") +
    "</div>";

  /* --- Donat: Cash vs Wallets & Bank vs Liabilities --- */
  const irisA = [
    { label: "Cash on Hand", nilai: p.tunai, warna: PALET[0] },
    { label: "Digital Wallets & Bank", nilai: p.digital, warna: PALET[1] },
    { label: "Liabilities", nilai: p.liabilitas, warna: PALET[2] }
  ];
  const donatA = kartu("Cash vs Wallet &amp; Bank vs Liabilities",
    donutSVG(irisA, { tengah: rupiahRingkas(p.netWorth), sub: "net worth", judul: "perbandingan cash, wallet dan bank, liabilitas" }) +
    legendaHTML(irisA));

  /* --- Donat: Income vs Expenses bulan ini --- */
  const irisB = [
    { label: "Total Income", nilai: t.masuk, warna: PALET[0] },
    { label: "Total Expenses", nilai: t.keluar, warna: PALET[2] }
  ];
  const donatB = kartu("Income vs Expenses &middot; " + esc(namaBulan(bulan)),
    donutSVG(irisB, { tengah: rupiahRingkas(selisih), sub: "selisih", judul: "perbandingan income dan expenses" }) +
    legendaHTML(irisB) +
    barisInfo("Selisih", rupiahTanda(selisih), selisih >= 0 ? "is-masuk" : "is-keluar"));

  /* --- Tren net worth --- */
  const tren = trenNetWorth(data, bulan, 6).map((x) => ({ label: singkatBulan(x.bulan), nilai: x.nilai }));
  const kartuTren = kartu("Tren Net Worth &middot; 6 bulan", '<div class="garis-wrap">' + garisSVG(tren) + "</div>");

  /* --- Kesehatan keuangan --- */
  const pct = (x) => (x === null ? "-" : Math.round(x * 100) + "%");
  const metrik = (label, nilai, ket, kelas) =>
    '<div class="metrik"><div class="metrik-atas"><span>' + label + '</span><strong class="' + (kelas || "") + '">' + nilai + "</strong></div>" +
    '<small class="muted">' + ket + "</small></div>";
  const kartuSehat = kartu("Kesehatan keuangan",
    metrik("Savings rate", pct(sh.rasioTabung), "(income &minus; expenses) &divide; income bulan ini",
           sh.rasioTabung === null ? "" : sh.rasioTabung >= 0.2 ? "is-masuk" : sh.rasioTabung >= 0 ? "is-warn" : "is-keluar") +
    metrik("Debt to assets", pct(sh.rasioUtang), "liabilities &divide; total assets",
           sh.rasioUtang === null ? "" : sh.rasioUtang <= 0.3 ? "is-masuk" : sh.rasioUtang <= 0.5 ? "is-warn" : "is-keluar") +
    metrik("Dana darurat", sh.danaDarurat === null ? "-" : new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(sh.danaDarurat) + " bulan",
           "cash + wallet &amp; bank &divide; rata-rata expenses 3 bulan",
           sh.danaDarurat === null ? "" : sh.danaDarurat >= 6 ? "is-masuk" : sh.danaDarurat >= 3 ? "is-warn" : "is-keluar"));

  /* --- Perhatian: budget expenses yang hampir / sudah lewat --- */
  const peringatan = anggaran(data, bulan, "keluar").baris.filter((x) => x.persen !== null && x.persen >= 80);
  const kartuPerhatian = peringatan.length === 0 ? "" : kartu("Perhatian budget",
    peringatan.map((x) => {
      const st = statusAnggaran("keluar", x.persen);
      return '<div class="row"><span>' + esc(x.kategori.nama) + '</span><strong class="is-' + (st === "over" ? "keluar" : "warn") + '">' +
        x.persen + "% " + (st === "over" ? "lewat" : "hampir") + "</strong></div>";
    }).join(""));

  /* --- Goals (ringkas) --- */
  const goalAktif = data.goals.map((g) => ({ g: g, i: infoGoal(g) })).filter((x) => !x.i.selesai)
    .sort((a, b) => b.i.persen - a.i.persen).slice(0, 3);
  const kartuGoal = kartu("Goals",
    goalAktif.length === 0
      ? kosong(data.goals.length ? "semua goal tercapai" : "belum ada goal") +
        '<button type="button" class="mini-btn" data-aksi="tab" data-tab="goals">buka goals</button>'
      : goalAktif.map((x) =>
          '<div class="goal-mini"><div class="row row--rapat"><span>' + esc(x.g.nama) + "</span><strong>" + x.i.persen + "%</strong></div>" +
          meterHTML(x.i.persen, "ok") + "</div>").join("") +
        '<button type="button" class="mini-btn" data-aksi="tab" data-tab="goals">semua goals</button>');

  $("#isi-home").innerHTML = hero + ringkas +
    '<div class="grid">' + donatA + donatB + kartuTren + kartuSehat + kartuPerhatian + kartuGoal + "</div>";
}
/* ===== HOME END ===== */


/* ===== ARUS KAS START =====
   Income / Expenses / Liabilitas: budget, actual, selisih, dan
   dua donat berdampingan (budget kiri, actual kanan).
   Ketuk satu kategori untuk mengubah budget-nya.
   ================================================================ */
function barisAnggaranHTML(data, tipe, x) {
  const status = statusAnggaran(tipe, x.persen);
  const warna = warnaKategori(data, x.kategori);
  return (
    '<button type="button" class="angg" data-aksi="atur-batas" data-id="' + esc(x.kategori.id) + '">' +
      '<span class="angg-atas"><i class="titik" style="background:' + warna + '"></i>' +
        '<strong class="angg-nama">' + esc(x.kategori.nama) + "</strong>" +
        '<span class="angg-persen is-' + status + '">' + (x.persen === null ? "no budget" : x.persen + "%") + "</span></span>" +
      (x.persen === null ? "" : meterHTML(x.persen, status)) +
      '<span class="angg-tiga">' +
        "<span><small>Budget</small><b>" + (x.batas > 0 ? rupiah(x.batas) : "-") + "</b></span>" +
        "<span><small>Actual</small><b>" + rupiah(x.aktual) + "</b></span>" +
        "<span><small>Selisih</small><b class=\"" + kelasSelisih(tipe, x.selisih) + '">' + (x.selisih === null ? "-" : rupiahTanda(x.selisih)) + "</b></span>" +
      "</span>" +
    "</button>"
  );
}

function renderArus(data, bulan, tipe) {
  const chips = chipsHTML([["masuk", "Income"], ["keluar", "Expenses"], ["utang", "Liabilitas"]], tipe, "sub-arus", "tipe");
  const a = anggaran(data, bulan, tipe);

  if (a.baris.length === 0) {
    $("#isi-arus").innerHTML = chips + kartu("",
      kosong("belum ada kategori " + JUDUL_ARUS[tipe].toLowerCase() + ". Tambah dulu di Pengaturan.") +
      '<button type="button" class="mini-btn" data-aksi="tab" data-tab="pengaturan">buka pengaturan</button>');
    return;
  }

  const irisBudget = a.baris.filter((x) => x.batas > 0)
    .map((x) => ({ label: x.kategori.nama, nilai: x.batas, warna: warnaKategori(data, x.kategori) }));
  const irisAktual = a.baris.filter((x) => x.aktual > 0)
    .map((x) => ({ label: x.kategori.nama, nilai: x.aktual, warna: warnaKategori(data, x.kategori) }));

  const ketSelisih = tipe === "masuk" ? "Selisih (actual &minus; budget)" : "Selisih (sisa budget)";
  const ringkas = kartu(esc(JUDUL_ARUS[tipe]) + " &middot; " + esc(namaBulan(bulan)),
    barisInfo("Total Budget", rupiah(a.totalBatas)) +
    barisInfo("Total Actual", rupiah(a.totalAktual), tipe === "masuk" ? "is-masuk" : tipe === "keluar" ? "is-keluar" : "") +
    barisInfo(ketSelisih, a.totalBatas > 0 ? rupiahTanda(a.totalSelisih) : "-", a.totalBatas > 0 ? kelasSelisih(tipe, a.totalSelisih) : "muted"));

  const duo = kartu("Budget vs Actual",
    '<div class="duo">' +
      '<div class="duo-kol"><p class="duo-judul">Budget</p>' +
        donutSVG(irisBudget, { tengah: rupiahRingkas(a.totalBatas), judul: "donat budget " + JUDUL_ARUS[tipe] }) + terbesarHTML(irisBudget) + "</div>" +
      '<div class="duo-kol"><p class="duo-judul">Actual</p>' +
        donutSVG(irisAktual, { tengah: rupiahRingkas(a.totalAktual), judul: "donat actual " + JUDUL_ARUS[tipe] }) + terbesarHTML(irisAktual) + "</div>" +
    "</div>");

  const detail = kartu("Detail kategori",
    '<p class="hint">ketuk kategori untuk mengubah budget. diurutkan dari yang terbesar.</p>' +
    '<div class="angg-daftar">' + a.baris.map((x) => barisAnggaranHTML(data, tipe, x)).join("") + "</div>");

  $("#isi-arus").innerHTML = chips + '<div class="grid">' + ringkas + duo + "</div>" + detail;
}
/* ===== ARUS KAS END ===== */


/* ===== TRANSAKSI START =====
   Daftar transaksi + transfer per tanggal (terbaru di atas).
   filterTipe: semua | masuk | keluar | transfer.  cari: teks.
   ================================================================ */
function renderTransaksi(data, bulan, filterTipe, cari) {
  const wadah = $("#listTransaksi");
  const q = String(cari || "").trim().toLowerCase();

  let item = [];
  data.transaksi.forEach((t, i) => {
    if (t.tanggal.slice(0, 7) !== bulan) return;
    if (filterTipe !== "semua" && filterTipe !== t.tipe) return;
    const utang = t.utangId ? data.utang.find((u) => u.id === t.utangId) : null;
    const teks = [namaKategori(data, t.kategoriId), namaDompet(data, t.dompetId), t.catatan, utang ? utang.nama : ""].join(" ").toLowerCase();
    if (q && teks.indexOf(q) < 0) return;
    item.push({ jenis: "trx", t: t, urut: i });
  });
  data.transfer.forEach((t, i) => {
    if (t.tanggal.slice(0, 7) !== bulan) return;
    if (filterTipe !== "semua" && filterTipe !== "transfer") return;
    const teks = [namaDompet(data, t.dariId), namaDompet(data, t.keId), t.catatan, "transfer"].join(" ").toLowerCase();
    if (q && teks.indexOf(q) < 0) return;
    item.push({ jenis: "transfer", t: t, urut: i });
  });

  item.sort((a, b) => (a.t.tanggal < b.t.tanggal ? 1 : a.t.tanggal > b.t.tanggal ? -1 : b.urut - a.urut));

  if (item.length === 0) {
    wadah.innerHTML = kosong(q ? "tidak ada yang cocok dengan pencarian" : "belum ada transaksi di sini. ketuk + untuk menambah");
    return;
  }

  let html = "";
  let tanggalTerakhir = "";
  item.forEach((x) => {
    const t = x.t;
    if (t.tanggal !== tanggalTerakhir) {
      tanggalTerakhir = t.tanggal;
      html += '<h3 class="day-head">' + esc(formatTanggal(t.tanggal)) + "</h3>";
    }
    const catatan = t.catatan ? esc(t.catatan) + " &middot; " : "";

    if (x.jenis === "transfer") {
      html +=
        '<button type="button" class="trx" data-aksi="edit-transfer" data-id="' + esc(t.id) + '">' +
          '<span class="trx-ico trx-ico--transfer" aria-hidden="true">&#8644;</span>' +
          '<span class="trx-main"><span class="trx-title">Transfer</span>' +
            '<span class="trx-sub">' + catatan + esc(namaDompet(data, t.dariId)) + " &rarr; " + esc(namaDompet(data, t.keId)) + "</span></span>" +
          '<span class="trx-amt">' + rupiah(t.jumlah) + "</span></button>";
      return;
    }

    const utang = t.utangId ? data.utang.find((u) => u.id === t.utangId) : null;
    const sub = (utang ? "bayar " + esc(utang.nama) + " &middot; " : catatan) + esc(namaDompet(data, t.dompetId));
    html +=
      '<button type="button" class="trx" data-aksi="edit-transaksi" data-id="' + esc(t.id) + '">' +
        '<span class="trx-ico trx-ico--' + t.tipe + '" aria-hidden="true">' + (t.tipe === "masuk" ? "&#8595;" : "&#8593;") + "</span>" +
        '<span class="trx-main"><span class="trx-title">' + esc(namaKategori(data, t.kategoriId)) + "</span>" +
          '<span class="trx-sub">' + sub + "</span></span>" +
        '<span class="trx-amt ' + (t.tipe === "masuk" ? "is-masuk" : "is-keluar") + '">' +
          (t.tipe === "masuk" ? "+" : "-") + rupiah(t.jumlah) + "</span></button>";
  });
  wadah.innerHTML = html;
}
/* ===== TRANSAKSI END ===== */


/* ===== KEKAYAAN START =====
   Tiga sub-halaman: Dompet (cash, bank, e-wallet), Aset
   (investasi, properti, dll), Utang (liabilitas).
   Angka di sini selalu posisi TERKINI (tidak per bulan).
   ================================================================ */
function renderKekayaan(data, sub) {
  const chips = chipsHTML([["dompet", "Dompet"], ["aset", "Aset"], ["utang", "Utang"]], sub, "sub-kekayaan", "sub");
  const isi = sub === "aset" ? htmlAset(data) : sub === "utang" ? htmlUtang(data) : htmlDompet(data);
  $("#isi-kekayaan").innerHTML = chips + isi;
}

/* --- Dompet --- */
function htmlDompet(data) {
  const p = posisi(data, "9999-12-31");
  const irisan = p.dompet.map((x, i) => ({ label: x.dompet.nama, nilai: x.saldo, warna: PALET[i % PALET.length] }));
  const total = p.tunai + p.digital;
  const positif = jumlahArray(irisan.filter((x) => x.nilai > 0), (x) => x.nilai);

  const ringkas = kartu("Ringkasan",
    barisInfo("Cash on Hand", rupiah(p.tunai)) +
    barisInfo("Digital Wallets &amp; Bank", rupiah(p.digital)) +
    barisInfo("Total", rupiah(total), "is-total"));

  const donat = kartu("Perbandingan semua akun",
    donutSVG(irisan, { tengah: rupiahRingkas(total), sub: "total kas", judul: "perbandingan saldo semua dompet" }));

  const daftar = kartu("Akun &amp; equity",
    p.dompet.map((x, i) =>
      '<button type="button" class="baris-btn" data-aksi="edit-dompet" data-id="' + esc(x.dompet.id) + '">' +
        '<span class="baris-kiri"><span class="baris-judul"><i class="titik" style="background:' + PALET[i % PALET.length] + '"></i>' +
          "<strong>" + esc(x.dompet.nama) + '</strong></span><small class="muted">' + esc(namaJenis(x.dompet.jenis)) +
          (x.saldo > 0 && positif > 0 ? " &middot; " + persenDari(x.saldo, positif) + "%" : "") + "</small></span>" +
        '<span class="baris-kanan"><strong class="' + (x.saldo < 0 ? "is-keluar" : "") + '">' + rupiah(x.saldo) + "</strong>" +
          '<small class="muted">equity</small></span></button>'
    ).join("") +
    '<div class="aksi-baris"><button type="button" class="mini-btn" data-aksi="transfer">transfer antar dompet</button></div>');

  return '<div class="grid">' + ringkas + donat + "</div>" + daftar;
}

/* --- Aset --- */
function htmlAset(data) {
  const p = posisi(data, "9999-12-31");
  const modal = jumlahArray(data.aset, (a) => a.modal);
  const gain = p.investasi - modal;
  const gainPct = modal > 0 ? Math.round((gain / modal) * 100) : 0;

  const kategoriAset = data.kategori.filter((k) => k.tipe === "aset");
  const irisan = kategoriAset.map((k) => ({
    label: k.nama, warna: warnaKategori(data, k),
    nilai: jumlahArray(p.aset.filter((x) => x.aset.kategoriId === k.id), (x) => x.nilai)
  }));

  const ringkas = kartu("Total investasi &amp; aset",
    barisInfo("Nilai sekarang", rupiah(p.investasi), "is-total") +
    barisInfo("Modal", rupiah(modal)) +
    barisInfo("Untung / rugi", rupiahTanda(gain) + (modal > 0 ? " (" + (gain > 0 ? "+" : "") + gainPct + "%)" : ""), gain >= 0 ? "is-masuk" : "is-keluar") +
    '<p class="hint hint--atas">nilai ini otomatis masuk ke Total Assets di Home.</p>');

  const donat = kartu("Alokasi aset",
    donutSVG(irisan, { tengah: rupiahRingkas(p.investasi), sub: "investasi", judul: "alokasi aset per kategori" }) + legendaHTML(irisan));

  let grup = "";
  kategoriAset.forEach((k) => {
    const isi = p.aset.filter((x) => x.aset.kategoriId === k.id);
    if (!isi.length) return;
    const sub = jumlahArray(isi, (x) => x.nilai);
    grup += '<h3 class="sub-head sub-head--garis"><span><i class="titik" style="background:' + warnaKategori(data, k) + '"></i> ' +
      esc(k.nama) + "</span><span>" + rupiah(sub) + "</span></h3>";
    isi.forEach((x) => {
      const a = x.aset;
      const g = x.nilai - a.modal;
      const gp = a.modal > 0 ? Math.round((g / a.modal) * 100) : 0;
      grup += '<article class="card card--rapat">' +
        '<button type="button" class="baris-btn" data-aksi="edit-aset" data-id="' + esc(a.id) + '">' +
          '<span class="baris-kiri"><strong>' + esc(a.nama) + "</strong>" + (a.catatan ? '<small class="muted">' + esc(a.catatan) + "</small>" : "") + "</span>" +
          '<span class="baris-kanan"><strong>' + rupiah(x.nilai) + '</strong><small class="' + (g >= 0 ? "is-masuk" : "is-keluar") + '">' +
            (g > 0 ? "+" : "") + gp + "%</small></span></button>" +
        '<div class="aset-bawah"><small class="muted">modal ' + rupiah(a.modal) + " &middot; " + rupiahTanda(g) + "</small>" +
          '<button type="button" class="mini-btn" data-aksi="nilai-aset" data-id="' + esc(a.id) + '">update nilai</button></div>' +
      "</article>";
    });
  });
  if (!grup) grup = kartu("", kosong("belum ada aset. ketuk + untuk menambah (saham, kripto, emas, properti, dll)"));

  return '<div class="grid">' + ringkas + donat + "</div>" + grup;
}

/* --- Utang --- */
function htmlUtang(data) {
  const p = posisi(data, "9999-12-31");
  const pokok = jumlahArray(data.utang, (u) => u.pokok);
  const terbayar = pokok - p.liabilitas;

  const kategoriUtang = data.kategori.filter((k) => k.tipe === "utang");
  const irisan = kategoriUtang.map((k) => ({
    label: k.nama, warna: warnaKategori(data, k),
    nilai: jumlahArray(p.utang.filter((x) => x.utang.kategoriId === k.id), (x) => x.sisa)
  }));

  const ringkas = kartu("Total liabilitas",
    barisInfo("Sisa utang", rupiah(p.liabilitas), "is-keluar") +
    barisInfo("Total pokok", rupiah(pokok)) +
    barisInfo("Sudah dibayar", rupiah(terbayar) + " (" + persenDari(terbayar, pokok) + "%)", "is-masuk"));

  const donat = kartu("Liabilitas per kategori",
    donutSVG(irisan, { tengah: rupiahRingkas(p.liabilitas), sub: "sisa", judul: "sisa utang per kategori" }) + legendaHTML(irisan));

  if (kategoriUtang.length === 0) {
    return kartu("", kosong("belum ada kategori liabilitas (misal KPR, Kartu Kredit, Pinjol). Tambah dulu di Pengaturan, lalu catat utangnya di sini.") +
      '<button type="button" class="mini-btn" data-aksi="tab" data-tab="pengaturan">buka pengaturan</button>');
  }

  const daftar = p.utang.length === 0 ? kartu("", kosong("belum ada utang tercatat. ketuk + untuk menambah")) :
    p.utang.map((x) => {
      const u = x.utang;
      const lunas = x.sisa === 0;
      const persen = persenDari(u.pokok - x.sisa, u.pokok);
      return '<article class="card">' +
        '<div class="row row--rapat"><div class="baris-kiri"><strong>' + esc(u.nama) + "</strong>" +
          '<small class="muted">' + esc(namaKategori(data, u.kategoriId)) + " &middot; sejak " + esc(formatTanggalPanjang(u.tanggal)) +
          (u.catatan ? " &middot; " + esc(u.catatan) : "") + "</small></div>" +
          '<div class="baris-kanan"><strong class="' + (lunas ? "is-masuk" : "is-keluar") + '">' + (lunas ? "lunas" : rupiah(x.sisa)) + "</strong>" +
          '<small class="muted">dari ' + rupiah(u.pokok) + "</small></div></div>" +
        meterHTML(persen, "ok") +
        '<div class="aksi-baris"><small class="muted">' + persen + "% terbayar</small><span class=\"aksi-grup\">" +
          (lunas ? "" : '<button type="button" class="mini-btn" data-aksi="bayar-utang" data-id="' + esc(u.id) + '">bayar</button>') +
          '<button type="button" class="mini-btn mini-btn--abu" data-aksi="edit-utang" data-id="' + esc(u.id) + '">ubah</button></span></div>' +
      "</article>";
    }).join("");

  return '<div class="grid">' + ringkas + donat + "</div>" + daftar;
}
/* ===== KEKAYAAN END ===== */


/* ===== GOALS START =====
   Target tabungan: ada target, tenggat (opsional), dan setoran.
   Kalau ada tenggat, dihitung perlu menabung berapa per bulan.
   ================================================================ */
function renderGoals(data) {
  const infos = data.goals.map((g) => ({ g: g, i: infoGoal(g) }));
  const totalTarget = jumlahArray(data.goals, (g) => g.target);
  const totalKumpul = jumlahArray(infos, (x) => Math.min(x.i.terkumpul, x.g.target));
  const tercapai = infos.filter((x) => x.i.selesai).length;

  const ringkas = kartu("Ringkasan goals",
    barisInfo("Jumlah goal", data.goals.length + (tercapai ? " (" + tercapai + " tercapai)" : "")) +
    barisInfo("Total target", rupiah(totalTarget)) +
    barisInfo("Terkumpul", rupiah(totalKumpul) + " (" + persenDari(totalKumpul, totalTarget) + "%)", "is-masuk"));

  if (infos.length === 0) {
    $("#isi-goals").innerHTML = kartu("", kosong("belum ada goal. ketuk + untuk membuat (dana darurat, liburan, beli motor, dll)"));
    return;
  }

  const daftar = infos.map((x) => {
    const g = x.g, i = x.i;
    const status = i.selesai ? "ok" : i.lewat ? "over" : "ok";
    let ket = "sisa " + rupiah(i.sisa);
    if (g.tenggat) {
      ket += " &middot; tenggat " + esc(formatTanggalPanjang(g.tenggat));
      if (!i.selesai) {
        if (i.lewat) ket += ' &middot; <span class="is-keluar">lewat tenggat</span>';
        else ket += " (" + (i.bulanLagi <= 0 ? "bulan ini" : i.bulanLagi + " bulan lagi") + ") &middot; perlu <strong>" + rupiah(i.perBulan) + "</strong>/bulan";
      }
    }
    const riwayat = g.setoran.slice().sort((a, b) => (a.tanggal < b.tanggal ? 1 : -1));
    const riwayatHTML = (g.awal > 0 ? '<div class="row row--rapat"><span class="muted">saldo awal</span><span>' + rupiah(g.awal) + "</span></div>" : "") +
      riwayat.map((s) =>
        '<div class="row row--rapat"><span>' + esc(formatTanggal(s.tanggal)) + (s.catatan ? ' <small class="muted">' + esc(s.catatan) + "</small>" : "") +
        '</span><span class="row-end">' + rupiah(s.jumlah) +
        '<button type="button" class="x-btn" data-aksi="hapus-setoran" data-goal="' + esc(g.id) + '" data-id="' + esc(s.id) + '" aria-label="Hapus setoran">&times;</button></span></div>'
      ).join("");

    return '<article class="card goal' + (i.selesai ? " goal--selesai" : "") + '">' +
      '<div class="goal-atas"><strong>' + esc(g.nama) + "</strong>" +
        '<span class="goal-persen ' + (i.selesai ? "is-masuk" : "") + '">' + (i.selesai ? "tercapai &#10003;" : i.persen + "%") + "</span></div>" +
      meterHTML(i.persen, status) +
      '<p class="goal-angka"><strong>' + rupiah(i.terkumpul) + '</strong> <span class="muted">/ ' + rupiah(g.target) + "</span></p>" +
      '<p class="goal-ket muted">' + ket + (g.catatan ? " &middot; " + esc(g.catatan) : "") + "</p>" +
      '<div class="aksi-baris"><span></span><span class="aksi-grup">' +
        '<button type="button" class="mini-btn" data-aksi="setor-goal" data-id="' + esc(g.id) + '">tambah dana</button>' +
        '<button type="button" class="mini-btn mini-btn--abu" data-aksi="edit-goal" data-id="' + esc(g.id) + '">ubah</button></span></div>' +
      (riwayatHTML ? '<details class="riwayat"><summary>riwayat dana (' + (riwayat.length + (g.awal > 0 ? 1 : 0)) + ")</summary>" + riwayatHTML + "</details>" : "") +
    "</article>";
  }).join("");

  $("#isi-goals").innerHTML = ringkas + '<div class="grid">' + daftar + "</div>";
}
/* ===== GOALS END ===== */


/* ===== PENGATURAN START =====
   Tampilan (mode & warna), anggaran + kategori, cadangan data.
   terbuka = { masuk: true, ... } grup mana yang sedang dibuka.
   ================================================================ */
function renderPengaturan(data, terbuka, pasang) {
  const p = data.pengaturan;
  pasang = pasang || { terpasang: true };

  /* --- Tampilan --- */
  const mode = chipsHTML([["auto", "otomatis"], ["terang", "terang"], ["gelap", "gelap"]], p.mode, "set-mode", "mode");
  const swatch = PRESET_WARNA.map((w) =>
    '<button type="button" class="swatch' + (p.aksen.toLowerCase() === w.hex.toLowerCase() ? " is-active" : "") + '" style="--sw:' + w.hex +
    '" data-aksi="set-preset" data-preset="' + w.id + '" data-hex="' + w.hex + '" aria-label="Warna ' + w.nama + '" title="' + w.nama + '"></button>'
  ).join("");
  const tampilan = kartu("Tampilan",
    '<p class="sub-head sub-head--atas">mode</p>' + mode +
    '<p class="sub-head">warna tema</p><div class="swatch-baris">' + swatch +
    '<label class="swatch swatch--kustom" title="Warna bebas"><input type="color" id="warnaKustom" value="' + esc(p.aksen) + '" aria-label="Pilih warna bebas"><span>+</span></label></div>');

  /* --- Anggaran & kategori --- */
  const grup = (tipe, judul, adaBudget) => {
    const daftar = data.kategori.filter((k) => k.tipe === tipe);
    const totalBatas = jumlahArray(daftar, (k) => k.batas);
    const baris = daftar.map((k) =>
      '<div class="kat-baris"><div class="kat-atas"><i class="titik" style="background:' + warnaKategori(data, k) + '"></i>' +
        '<span class="kat-nama">' + esc(k.nama) + "</span>" +
        '<button type="button" class="x-btn x-btn--aksen" data-aksi="edit-kategori" data-id="' + esc(k.id) + '" aria-label="Ubah kategori ' + esc(k.nama) + '">&#9998;</button></div>' +
        (adaBudget ? '<form class="budget-set" data-submit="batas" data-id="' + esc(k.id) + '" autocomplete="off">' +
          '<input type="text" inputmode="numeric" name="batas" data-uang placeholder="budget per bulan (Rp)" value="' + (k.batas > 0 ? new Intl.NumberFormat("id-ID").format(k.batas) : "") + '">' +
          '<button type="submit" class="mini-btn">simpan</button></form>' : "") +
      "</div>"
    ).join("");

    return '<details class="grup" data-grup="' + tipe + '"' + (terbuka[tipe] ? " open" : "") + ">" +
      "<summary><strong>" + judul + '</strong><small class="muted">' + daftar.length + " kategori" +
      (adaBudget && totalBatas > 0 ? " &middot; budget " + rupiahRingkas(totalBatas) : "") + "</small></summary>" +
      (baris || kosong("belum ada kategori")) +
      '<form class="inline-form" data-submit="kategori" data-tipe="' + tipe + '" autocomplete="off">' +
        '<input type="text" name="nama" placeholder="kategori baru" maxlength="30" required>' +
        '<button type="submit" class="mini-btn">tambah</button></form>' +
    "</details>";
  };

  const anggaranKartu = kartu("Anggaran &amp; kategori",
    '<p class="hint">isi budget per bulan untuk tiap kategori (kosongkan lalu simpan untuk menghapus). ketuk &#9998; untuk ganti nama atau hapus kategori.</p>' +
    grup("masuk", "Income", true) + grup("keluar", "Expenses", true) +
    grup("utang", "Liabilitas", true) + grup("aset", "Jenis aset &amp; investasi", false));

  /* --- Cadangan --- */
  const cadangan = kartu("Data &amp; cadangan",
    '<p class="hint">Data tersimpan di browser perangkat ini saja. Kalau data browser dibersihkan atau ganti HP, data hilang. ' +
    "Ekspor JSON secara berkala sebagai cadangan.</p>" +
    '<div class="btn-grid">' +
      '<button type="button" class="btn" data-aksi="ekspor-json">ekspor JSON</button>' +
      '<button type="button" class="btn" data-aksi="impor">impor JSON</button>' +
      '<button type="button" class="btn" data-aksi="ekspor-csv">ekspor CSV</button>' +
      '<button type="button" class="btn btn--danger" data-aksi="reset-data">reset semua</button></div>');

  /* --- Pasang aplikasi (disembunyikan kalau sudah terpasang) --- */
  let kartuPasang = "";
  if (!pasang.terpasang) {
    const petunjuk = pasang.bisa
      ? '<button type="button" class="btn btn--solid" data-aksi="pasang-app">pasang sekarang</button>'
      : pasang.ios
        ? '<p class="hint">Buka halaman ini di <strong>Safari</strong>, ketuk tombol <strong>Bagikan</strong>, lalu pilih <strong>Tambah ke Layar Utama</strong>.</p>' +
          '<p class="hint">Catatan: aplikasi di layar utama punya penyimpanan terpisah dari Safari. Kalau sudah punya data di Safari, ' +
          "ekspor JSON dulu lalu impor di aplikasinya.</p>"
        : '<p class="hint">Chrome Android: buka menu &#8942; lalu pilih <strong>Instal aplikasi</strong> atau <strong>Tambahkan ke layar utama</strong>. ' +
          "Di komputer: klik ikon pasang di address bar.</p>";
    kartuPasang = kartu("Pasang aplikasi",
      '<p class="hint">Pasang di layar utama supaya terbuka seperti aplikasi biasa dan tetap bisa dipakai tanpa internet. Datamu tetap hanya di perangkat ini.</p>' +
      petunjuk);
  }

  $("#isi-pengaturan").innerHTML = '<div class="grid">' + tampilan + cadangan + kartuPasang + "</div>" + anggaranKartu;
}
/* ===== PENGATURAN END ===== */
