/* ================================================================
   UI.JS - HELPER, PERHITUNGAN, GRAFIK, TEMA  [versi 2]
   Isi file ini: helper format (rupiah, tanggal), fungsi hitung
   (net worth, aset, utang, budget vs actual), penggambar grafik
   (donat & garis, SVG murni tanpa library), dan penerap tema.
   File ini TIDAK menyimpan data dan TIDAK memasang event.

   Tips edit lewat HP: cari nama bagian + " START".

   Daftar bagian:
   HELPER | TANGGAL | HITUNG | GRAFIK | TEMA
   ================================================================ */


/* ===== HELPER START =====
   Pencari elemen, pengaman teks, format uang.
   ================================================================ */
const $  = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

/* WAJIB dipakai untuk setiap teks buatan pengguna (nama, catatan)
   sebelum dimasukkan ke HTML, supaya aman dari penyisipan kode. */
function esc(teks) {
  return String(teks).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* 25000 -> "Rp 25.000" ; negatif -> "-Rp 25.000" */
function rupiah(angka) {
  const teks = "Rp " + new Intl.NumberFormat("id-ID").format(Math.abs(angka));
  return angka < 0 ? "-" + teks : teks;
}

/* 12500000 -> "Rp 12,5 jt" (untuk tengah grafik donat) */
function rupiahRingkas(angka) {
  const a = Math.abs(angka);
  const f = (n, s) => new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n) + " " + s;
  let t;
  if (a >= 1e12) t = f(a / 1e12, "T");
  else if (a >= 1e9) t = f(a / 1e9, "M");
  else if (a >= 1e6) t = f(a / 1e6, "jt");
  else if (a >= 1e4) t = f(a / 1e3, "rb");
  else t = new Intl.NumberFormat("id-ID").format(a);
  return (angka < 0 ? "-" : "") + "Rp " + t;
}

/* +Rp 5.000 / -Rp 5.000 / Rp 0 */
function rupiahTanda(angka) {
  return (angka > 0 ? "+" : "") + rupiah(angka);
}

const persenDari = (bagian, total) => (total > 0 ? Math.round((bagian / total) * 100) : 0);
const jumlahArray = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

/* Tampilan kosong yang seragam */
const kosong = (teks) => '<p class="empty">' + esc(teks) + "</p>";
/* ===== HELPER END ===== */


/* ===== TANGGAL START =====
   Kunci bulan berbentuk "2026-11"; tanggal "2026-11-02" (jam lokal).
   ================================================================ */
const dua = (n) => String(n).padStart(2, "0");

function bulanSekarang() {
  const d = new Date();
  return d.getFullYear() + "-" + dua(d.getMonth() + 1);
}
function geserBulan(kunci, selisih) {
  const [y, m] = kunci.split("-").map(Number);
  const d = new Date(y, m - 1 + selisih, 1);
  return d.getFullYear() + "-" + dua(d.getMonth() + 1);
}
function namaBulan(kunci) {
  const [y, m] = kunci.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "long", year: "numeric" });
}
function singkatBulan(kunci) {
  const [y, m] = kunci.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("id-ID", { month: "short" });
}
function hariIni() {
  const d = new Date();
  return d.getFullYear() + "-" + dua(d.getMonth() + 1) + "-" + dua(d.getDate());
}
function formatTanggal(t) {
  const [y, m, d] = t.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });
}
function formatTanggalPanjang(t) {
  const [y, m, d] = t.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/* Sampai tanggal berapa data dihitung untuk bulan terpilih.
   Bulan lalu = akhir bulan itu. Bulan ini / depan = semuanya.
   (String "2026-10-31" cukup untuk dibandingkan dengan tanggal lain) */
function batasTanggal(bulan) {
  return bulan >= bulanSekarang() ? "9999-12-31" : bulan + "-31";
}

/* Berapa bulan dari sekarang sampai tenggat (0 = bulan ini, <0 = lewat) */
function bulanKeTenggat(tenggat) {
  const [ty, tm] = tenggat.split("-").map(Number);
  const [ny, nm] = bulanSekarang().split("-").map(Number);
  return (ty - ny) * 12 + (tm - nm);
}
/* ===== TANGGAL END ===== */


/* ===== HITUNG START =====
   Semua perhitungan keuangan. Fungsi murni: menerima data,
   mengembalikan angka. Tidak mengubah apa pun.
   ================================================================ */
const namaKategori = (data, id) => {
  const k = data.kategori.find((x) => x.id === id);
  return k ? k.nama : "(dihapus)";
};
const namaDompet = (data, id) => {
  const d = data.dompet.find((x) => x.id === id);
  return d ? d.nama : "(dihapus)";
};
const namaJenis = (id) => {
  const j = JENIS_DOMPET.find((x) => x.id === id);
  return j ? j.nama : id;
};

/* --- Dompet: saldo (equity) pada tanggal tertentu --- */
function saldoDompetPada(data, dompetId, tgl) {
  const dompet = data.dompet.find((d) => d.id === dompetId);
  if (!dompet) return 0;
  let saldo = dompet.saldoAwal;
  data.transaksi.forEach((t) => {
    if (t.dompetId === dompetId && t.tanggal <= tgl) saldo += t.tipe === "masuk" ? t.jumlah : -t.jumlah;
  });
  data.transfer.forEach((t) => {
    if (t.tanggal > tgl) return;
    if (t.keId === dompetId) saldo += t.jumlah;
    if (t.dariId === dompetId) saldo -= t.jumlah;
  });
  return saldo;
}

/* --- Aset: nilai pada tanggal tertentu (0 kalau belum dibeli) --- */
function nilaiAsetPada(aset, tgl) {
  let nilai = 0;
  aset.riwayat.forEach((r) => { if (r.tanggal <= tgl) nilai = r.nilai; });
  return nilai;
}
const nilaiAsetKini = (aset) => nilaiAsetPada(aset, "9999-12-31");

/* --- Utang: total yang sudah dibayar & sisa --- */
function terbayarUtang(data, utangId, tgl) {
  return data.transaksi
    .filter((t) => t.utangId === utangId && t.tanggal <= (tgl || "9999-12-31"))
    .reduce((s, t) => s + t.jumlah, 0);
}
function sisaUtangPada(data, utang, tgl) {
  if (utang.tanggal > tgl) return 0;
  return Math.max(0, utang.pokok - terbayarUtang(data, utang.id, tgl));
}

/* --- Posisi keuangan pada tanggal tertentu ---
   Cash on Hand        = dompet berjenis tunai
   Digital & Bank      = dompet berjenis bank / e-wallet
   Investasi           = total nilai aset
   Total Assets        = ketiganya
   Net Worth           = Total Assets - Liabilities                  */
function posisi(data, tgl) {
  const dompet = data.dompet.map((d) => ({ dompet: d, saldo: saldoDompetPada(data, d.id, tgl) }));
  const tunai = jumlahArray(dompet.filter((x) => x.dompet.jenis === "tunai"), (x) => x.saldo);
  const digital = jumlahArray(dompet.filter((x) => x.dompet.jenis !== "tunai"), (x) => x.saldo);

  const aset = data.aset.map((a) => ({ aset: a, nilai: nilaiAsetPada(a, tgl) }));
  const investasi = jumlahArray(aset, (x) => x.nilai);

  const utang = data.utang.map((u) => ({ utang: u, sisa: sisaUtangPada(data, u, tgl) }));
  const liabilitas = jumlahArray(utang, (x) => x.sisa);

  const totalAset = tunai + digital + investasi;
  return {
    tunai: tunai, digital: digital, investasi: investasi,
    totalAset: totalAset, liabilitas: liabilitas, netWorth: totalAset - liabilitas,
    dompet: dompet, aset: aset, utang: utang
  };
}

/* Net worth akhir tiap bulan untuk n bulan terakhir */
function trenNetWorth(data, bulanAkhir, n) {
  const hasil = [];
  for (let i = n - 1; i >= 0; i--) {
    const bulan = geserBulan(bulanAkhir, -i);
    hasil.push({ bulan: bulan, nilai: posisi(data, batasTanggal(bulan)).netWorth });
  }
  return hasil;
}

/* --- Income & Expenses per bulan --- */
function transaksiBulan(data, bulan) {
  return data.transaksi.filter((t) => t.tanggal.slice(0, 7) === bulan);
}
function totalBulan(data, bulan) {
  const hasil = { masuk: 0, keluar: 0 };
  transaksiBulan(data, bulan).forEach((t) => { hasil[t.tipe] += t.jumlah; });
  return hasil;
}
function trenArusKas(data, bulanAkhir, n) {
  const hasil = [];
  for (let i = n - 1; i >= 0; i--) {
    const bulan = geserBulan(bulanAkhir, -i);
    const t = totalBulan(data, bulan);
    hasil.push({ bulan: bulan, masuk: t.masuk, keluar: t.keluar });
  }
  return hasil;
}

/* --- Budget vs Actual ---
   tipe: "masuk" (Income) | "keluar" (Expenses) | "utang" (Liabilitas)
   Actual liabilitas = total pembayaran utang bulan itu per kategori.
   selisih: Income = actual - budget (plus = melebihi target)
            Expenses/Liabilitas = budget - actual (plus = masih sisa) */
function aktualKategori(data, bulan, kategori) {
  return transaksiBulan(data, bulan)
    .filter((t) => {
      if (kategori.tipe === "utang") {
        if (!t.utangId) return false;
        const u = data.utang.find((x) => x.id === t.utangId);
        return Boolean(u) && u.kategoriId === kategori.id;
      }
      return t.tipe === kategori.tipe && t.kategoriId === kategori.id;
    })
    .reduce((s, t) => s + t.jumlah, 0);
}

function anggaran(data, bulan, tipe) {
  const daftar = data.kategori.filter((k) => k.tipe === tipe);
  const baris = daftar.map((k, urutan) => {
    const aktual = aktualKategori(data, bulan, k);
    const selisih = tipe === "masuk" ? aktual - k.batas : k.batas - aktual;
    return {
      kategori: k, urutan: urutan, batas: k.batas, aktual: aktual,
      selisih: k.batas > 0 ? selisih : null,
      persen: k.batas > 0 ? Math.round((aktual / k.batas) * 100) : null
    };
  });
  /* Yang terbesar di atas; yang kosong tetap urut aslinya */
  baris.sort((a, b) => Math.max(b.aktual, b.batas) - Math.max(a.aktual, a.batas) || a.urutan - b.urutan);

  const totalBatas = jumlahArray(baris, (x) => x.batas);
  const totalAktual = jumlahArray(baris, (x) => x.aktual);
  return {
    baris: baris, totalBatas: totalBatas, totalAktual: totalAktual,
    totalSelisih: tipe === "masuk" ? totalAktual - totalBatas : totalBatas - totalAktual
  };
}

/* Status warna untuk meteran: "ok" | "warn" | "over" | "netral" */
function statusAnggaran(tipe, persen) {
  if (persen === null) return "netral";
  if (tipe === "masuk") return persen >= 100 ? "ok" : "netral";
  return persen > 100 ? "over" : persen >= 80 ? "warn" : "ok";
}

/* --- Kesehatan keuangan --- */
function kesehatan(data, bulan) {
  const tgt = batasTanggal(bulan);
  const p = posisi(data, tgt);
  const t = totalBulan(data, bulan);

  const rasioTabung = t.masuk > 0 ? (t.masuk - t.keluar) / t.masuk : null;
  const rasioUtang = p.totalAset > 0 ? p.liabilitas / p.totalAset : null;

  /* Dana darurat: kas (cash + bank + e-wallet) dibagi rata-rata pengeluaran 3 bulan */
  const bulanKeluar = trenArusKas(data, bulan, 3).filter((x) => x.keluar > 0);
  const rataKeluar = bulanKeluar.length ? jumlahArray(bulanKeluar, (x) => x.keluar) / bulanKeluar.length : 0;
  const kas = p.tunai + p.digital;
  const danaDarurat = rataKeluar > 0 ? kas / rataKeluar : null;

  return { rasioTabung: rasioTabung, rasioUtang: rasioUtang, danaDarurat: danaDarurat };
}

/* --- Goals --- */
function infoGoal(g) {
  const terkumpul = g.awal + jumlahArray(g.setoran, (s) => s.jumlah);
  const persen = Math.round((terkumpul / g.target) * 100);
  const sisa = Math.max(0, g.target - terkumpul);
  const selesai = terkumpul >= g.target;

  let perBulan = null;
  let lewat = false;
  let bulanLagi = null;
  if (!selesai && g.tenggat) {
    bulanLagi = bulanKeTenggat(g.tenggat);
    lewat = g.tenggat < hariIni();
    perBulan = lewat ? null : Math.ceil(sisa / Math.max(1, bulanLagi));
  }
  return { terkumpul: terkumpul, persen: persen, sisa: sisa, selesai: selesai, perBulan: perBulan, lewat: lewat, bulanLagi: bulanLagi };
}
/* ===== HITUNG END ===== */


/* ===== GRAFIK START =====
   Grafik SVG murni. Warna irisan diambil dari PALET di bawah
   (bisa diubah). Warna kategori selalu konsisten: urutan kategori
   di Pengaturan menentukan warnanya.
   ================================================================ */
const PALET = [
  "#2E9E5B", "#D4A62A", "#C8553D", "#8DA136", "#9C5A8B", "#E08A2E",
  "#3FB8A0", "#D96A8C", "#6B8F5E", "#B59A62", "#A8443F", "#7CC24A"
];

function warnaKategori(data, kategori) {
  const urut = data.kategori.filter((k) => k.tipe === kategori.tipe).findIndex((k) => k.id === kategori.id);
  return PALET[(urut < 0 ? 0 : urut) % PALET.length];
}

/* irisan: [{ label, nilai, warna }]
   opsi: { tengah: "teks besar", sub: "teks kecil", judul: "untuk pembaca layar" } */
function donutSVG(irisan, opsi) {
  opsi = opsi || {};
  const data = irisan.filter((x) => x.nilai > 0);
  const total = jumlahArray(data, (x) => x.nilai);
  const R = 15.9155;   // keliling = 100, jadi panjang garis = persen

  let svg = '<svg class="donut" viewBox="0 0 42 42" role="img" aria-label="' + esc(opsi.judul || "grafik donat") + '">';
  svg += '<circle class="donut-alas" cx="21" cy="21" r="' + R + '" fill="none" stroke-width="5.6"/>';

  let awal = 0;
  if (total > 0) {
    data.forEach((x) => {
      const p = (x.nilai / total) * 100;
      const garis = data.length > 1 ? Math.max(p - 0.8, 0.2) : p;   // celah kecil antar irisan
      svg +=
        '<circle class="donut-irisan" cx="21" cy="21" r="' + R + '" fill="none" stroke="' + x.warna +
        '" stroke-width="5.6" pathLength="100" stroke-dasharray="' + garis.toFixed(3) + " " + (100 - garis).toFixed(3) +
        '" stroke-dashoffset="' + (-awal).toFixed(3) + '" transform="rotate(-90 21 21)">' +
        "<title>" + esc(x.label) + ": " + rupiah(x.nilai) + " (" + Math.round(p) + "%)</title></circle>";
      awal += p;
    });
  }

  const tengah = total > 0 || opsi.tengah ? opsi.tengah || "" : "";
  svg += '<text class="donut-tengah" x="21" y="' + (opsi.sub ? 21 : 22.4) + '" text-anchor="middle">' + esc(tengah || (total > 0 ? "" : "-")) + "</text>";
  if (opsi.sub) svg += '<text class="donut-sub" x="21" y="25.4" text-anchor="middle">' + esc(opsi.sub) + "</text>";
  svg += "</svg>";
  return '<div class="donut-wrap">' + svg + "</div>";
}

/* Legenda untuk donat: titik warna + nama + nilai + persen */
function legendaHTML(irisan) {
  const data = irisan.filter((x) => x.nilai > 0);
  const total = jumlahArray(data, (x) => x.nilai);
  if (total <= 0) return kosong("belum ada data");
  return '<ul class="legenda">' + data.map((x) =>
    '<li><i class="titik" style="background:' + x.warna + '"></i>' +
    '<span class="legenda-nama">' + esc(x.label) + "</span>" +
    '<span class="legenda-nilai">' + rupiah(x.nilai) + ' <small class="muted">' + persenDari(x.nilai, total) + "%</small></span></li>"
  ).join("") + "</ul>";
}

/* Satu baris "terbesar: nama (xx%)" di bawah donat */
function terbesarHTML(irisan) {
  const data = irisan.filter((x) => x.nilai > 0).sort((a, b) => b.nilai - a.nilai);
  if (!data.length) return '<p class="terbesar muted">-</p>';
  const total = jumlahArray(data, (x) => x.nilai);
  return '<p class="terbesar">terbesar: <strong>' + esc(data[0].label) + "</strong> " + persenDari(data[0].nilai, total) + "%</p>";
}

/* Grafik garis (net worth dari bulan ke bulan)
   titik: [{ label, nilai }] */
function garisSVG(titik) {
  const W = 300, H = 140, L = 10, R = 10, T = 22, B = 24;
  const nilai = titik.map((t) => t.nilai);
  let min = Math.min.apply(null, nilai);
  let max = Math.max.apply(null, nilai);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12;
  min -= pad; max += pad;

  const x = (i) => L + (titik.length === 1 ? (W - L - R) / 2 : (i * (W - L - R)) / (titik.length - 1));
  const y = (v) => T + ((max - v) / (max - min)) * (H - T - B);
  const pts = titik.map((t, i) => [x(i), y(t.nilai)]);

  const garis = "M" + pts.map((p) => p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" L");
  const alas = H - B;
  const area = garis + " L" + pts[pts.length - 1][0].toFixed(1) + " " + alas + " L" + pts[0][0].toFixed(1) + " " + alas + " Z";

  let svg = '<svg class="garis" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="grafik net worth">';
  svg += '<line class="garis-dasar" x1="' + L + '" y1="' + alas + '" x2="' + (W - R) + '" y2="' + alas + '"/>';
  if (min < 0 && max > 0) {
    svg += '<line class="garis-nol" x1="' + L + '" y1="' + y(0).toFixed(1) + '" x2="' + (W - R) + '" y2="' + y(0).toFixed(1) + '"/>';
  }
  svg += '<path class="garis-area" d="' + area + '"/>';
  svg += '<path class="garis-jalur" d="' + garis + '" fill="none"/>';

  pts.forEach((p, i) => {
    const akhir = i === pts.length - 1;
    svg += '<circle class="garis-titik' + (akhir ? " is-akhir" : "") + '" cx="' + p[0].toFixed(1) + '" cy="' + p[1].toFixed(1) +
           '" r="' + (akhir ? 4 : 3) + '"><title>' + esc(titik[i].label) + ": " + rupiah(titik[i].nilai) + "</title></circle>";
    const jangkar = i === 0 && pts.length > 1 ? "start" : akhir && pts.length > 1 ? "end" : "middle";
    const px = i === 0 && pts.length > 1 ? L : akhir && pts.length > 1 ? W - R : p[0];
    svg += '<text class="garis-label' + (akhir ? " is-akhir" : "") + '" x="' + px.toFixed(1) + '" y="' + (H - 7) + '" text-anchor="' + jangkar + '">' + esc(titik[i].label) + "</text>";
  });

  const ak = pts[pts.length - 1];
  const ja = pts.length > 1 ? "end" : "middle";
  svg += '<text class="garis-nilai" x="' + (pts.length > 1 ? W - R : ak[0]).toFixed(1) + '" y="' + Math.max(12, ak[1] - 9).toFixed(1) + '" text-anchor="' + ja + '">' + esc(rupiahRingkas(titik[titik.length - 1].nilai)) + "</text>";
  svg += "</svg>";
  return svg;
}

/* Batang tipis berwarna (progress) */
function meterHTML(persen, status) {
  return '<span class="meter"><span class="meter-isi is-' + status + '" style="width:' + Math.max(0, Math.min(100, persen)) + '%"></span></span>';
}
/* ===== GRAFIK END ===== */


/* ===== TEMA START =====
   Menerapkan mode (auto/terang/gelap) dan warna aksen.
   Semua warna lain diturunkan dari --aksen lewat CSS.
   ================================================================ */
function luminan(hex) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function modeGelap(mode) {
  if (mode === "gelap") return true;
  if (mode === "terang") return false;
  return Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function terapkanTema(p) {
  const gelap = modeGelap(p.mode);
  const root = document.documentElement;
  root.dataset.tema = gelap ? "gelap" : "terang";
  root.style.setProperty("--aksen", p.aksen);
  root.style.setProperty("--aksen-teks", luminan(p.aksen) > 0.4 ? "#0B1A10" : "#FFFFFF");
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", gelap ? "#08140D" : "#EEF2E3");
}
/* ===== TEMA END ===== */
