/* ================================================================
   TUTORIAL.JS - TUR PENGENALAN + SKELETON LOADING  [aplikasi v1.5.1]
   Dua hal di file ini:
   1. Skeleton   : kerangka abu berdenyut selama data dimuat.
   2. Tutorial   : tur sorotan 13 langkah (fitur, cara pakai, setelan).

   Tur jalan otomatis saat pertama dibuka, dan bisa diulang lewat
   Pengaturan > Bantuan > "Lihat tutorial". Status "sudah lihat"
   disimpan GLOBAL di localStorage kunci "keuangan.tutorial"
   (tidak per akun), jadi akun baru tidak memunculkannya lagi.

   File ini TIDAK menyentuh data keuangan. Dia hanya memakai fungsi
   yang sudah ada: $, $$, state, pindahTab, toast.

   Dimuat PALING AKHIR (setelah akun.js).
   Tips edit lewat HP: cari nama bagian + " START".

   Daftar bagian:
   SKELETON | TUTORIAL: LANGKAH | TUTORIAL: MESIN
   ================================================================ */


/* ===== SKELETON START =====
   Skeleton.tampil()  isi semua halaman dengan kerangka loading
   Skeleton.akhir()   cabut penanda loading (dipanggil muatUlang)
   Skeleton.aktif()   true selama skeleton masih tampil
   Skeleton.html(tab) markup skeleton satu halaman

   Markup skeleton Home juga ditulis langsung di keuangan.html
   (salinan dari Skeleton.html("home")) supaya sudah tampil sebelum
   JavaScript jalan. Kalau bentuknya diubah di sini, ubah di sana.
   ================================================================ */
window.Skeleton = (() => {
  const WADAH = {
    home: "#isi-home",
    arus: "#isi-arus",
    transaksi: "#listTransaksi",
    kekayaan: "#isi-kekayaan",
    goals: "#isi-goals",
    pengaturan: "#isi-pengaturan"
  };

  /* Balok kosong: lebar, tinggi, kelas tambahan */
  const b = (w, h, k) => '<span class="skel' + (k ? " " + k : "") + '" style="width:' + w + ";height:" + h + '"></span>';
  const kolom = (isi) => '<div class="skel-kolom">' + isi + "</div>";
  const kartuS = (isi, k) => '<article class="card ' + (k || "") + '">' + isi + "</article>";
  const judul = () => b("42%", "14px", "skel-judul");
  const ulang = (n, fn) => Array.from({ length: n }, fn).join("");

  const stat = () => '<div class="stat">' + kolom(b("45%", "11px") + b("72%", "20px") + b("55%", "10px")) + "</div>";
  const baris = () => '<div class="skel-baris">' + b("38px", "38px", "skel-bulat") + kolom(b("55%", "13px") + b("35%", "10px")) + b("68px", "14px") + "</div>";
  const anggaran = () => kartuS(kolom(b("50%", "13px") + b("100%", "9px") + b("38%", "11px")), "card--rapat");
  const chips = (n) => '<div class="skel-chips">' + ulang(n, () => b("84px", "34px", "skel-pil")) + "</div>";
  const donat = () => kartuS(judul() + '<div class="skel-baris skel-donat">' + b("112px", "112px", "skel-bulat") +
    kolom(b("80%", "12px") + b("64%", "12px") + b("72%", "12px")) + "</div>");

  const BENTUK = {
    home: () =>
      '<section class="hero"><div class="hero-isi">' +
        kolom(b("96px", "11px") + b("64%", "46px") + b("48%", "13px") + b("70%", "10px")) +
      '</div><div class="hero-spark">' + b("100%", "70px") + "</div></section>" +
      '<div class="stat-grid">' + ulang(6, stat) + "</div>" +
      '<div class="grid">' + donat() + donat() + "</div>" +
      kartuS(judul() + b("100%", "150px")),

    arus: () => chips(3) + '<div class="angg-daftar">' + ulang(6, anggaran) + "</div>",

    transaksi: () => ulang(7, () => kartuS(baris(), "card--rapat")),

    kekayaan: () => chips(3) + '<div class="grid">' +
      ulang(4, () => kartuS(judul() + baris() + baris())) + "</div>",

    goals: () => kartuS(kolom(b("40%", "12px") + b("58%", "26px") + b("100%", "9px"))) +
      '<div class="grid">' + ulang(3, () => kartuS(judul() + kolom(b("66%", "22px") + b("100%", "10px") + b("45%", "12px")))) + "</div>",

    pengaturan: () => '<div class="grid">' +
      ulang(3, () => kartuS(judul() + kolom(b("100%", "12px") + b("86%", "12px") + b("100%", "38px") + b("100%", "38px")))) + "</div>"
  };

  function html(tab) {
    const isi = (BENTUK[tab] || BENTUK.home)();
    return '<div class="skel-wrap"><span class="skel-sr" role="status">Memuat data...</span>' +
      '<div aria-hidden="true">' + isi + "</div></div>";
  }

  function tampil() {
    document.body.classList.add("skel-aktif");
    const utama = document.querySelector("main");
    if (utama) utama.setAttribute("aria-busy", "true");
    Object.keys(WADAH).forEach((tab) => {
      const el = document.querySelector(WADAH[tab]);
      /* Yang sudah berisi skeleton dibiarkan (supaya denyutnya tidak mengulang) */
      if (el && !el.querySelector(".skel-wrap")) el.innerHTML = html(tab);
    });
  }

  function akhir() {
    document.body.classList.remove("skel-aktif");
    const utama = document.querySelector("main");
    if (utama) utama.removeAttribute("aria-busy");
  }

  const aktif = () => document.body.classList.contains("skel-aktif");

  return { tampil: tampil, akhir: akhir, aktif: aktif, html: html };
})();
/* ===== SKELETON END ===== */


/* ===== TUTORIAL: LANGKAH START =====
   Satu objek = satu langkah tur.
     tab     halaman yang dibuka dulu
     target  elemen yang disorot: daftar selector (yang pertama
             tampil dipakai) atau fungsi yang mengembalikan elemen.
             Kosong / tidak ketemu = kartu tampil di tengah layar.
     judul, isi  teks petunjuk (isi boleh memuat <strong>)
   Mau ubah isi tutorial? Edit daftar ini saja.
   ================================================================ */
const TUR_LANGKAH = (() => {
  const tab = (nama) => ['.nav-btn[data-tab="' + nama + '"]'];

  /* Kartu di halaman Pengaturan dicari dari judulnya */
  const kartuAtur = (awal) => {
    const h = $$("#isi-pengaturan .card-title").find((x) => x.textContent.trim().indexOf(awal) === 0);
    return h ? h.closest(".card") : null;
  };

  return [
    {
      tab: "home", target: null,
      judul: "Selamat datang di keuangan",
      isi: "Catat uang masuk dan keluar, lalu pantau net worth, aset, utang, budget, dan goals di satu tempat. " +
        "Tur singkat ini (sekitar 1 menit) menunjukkan fitur, cara pakai, dan setelannya. " +
        "<strong>Datamu hanya tersimpan di perangkat ini</strong>, tidak dikirim ke mana pun."
    },
    {
      tab: "home", target: ["#btnAkun"],
      judul: "Banyak akun",
      isi: "Tiap akun punya data sendiri, misalnya <strong>Pribadi</strong> dan <strong>Usaha</strong>. " +
        "Ketuk tombol ini untuk pindah akun, membuat akun baru, atau mengubah nama. Tema berlaku sama di semua akun."
    },
    {
      tab: "home", target: ["#monthNav"],
      judul: "Pilih bulan",
      isi: "Geser dengan tombol <strong>&lsaquo;</strong> dan <strong>&rsaquo;</strong>. Angka di Home, Arus Kas, dan Transaksi mengikuti bulan ini. " +
        "Ketuk nama bulan untuk kembali ke bulan sekarang."
    },
    {
      tab: "home", target: tab("home"),
      judul: "Home",
      isi: "Ringkasan keuanganmu: <strong>net worth</strong>, total assets, cash, dompet, liabilitas, dana goals, grafik, " +
        "dan <strong>kesehatan keuangan</strong> (savings rate dan dana darurat)."
    },
    {
      tab: "home", target: ["#btnTambahAtas", "#fabTambah"],
      judul: "Tambah data",
      isi: "Tombol ini menyesuaikan halaman. Di Home, Arus Kas, dan Transaksi dia menambah <strong>transaksi</strong>. " +
        "Di Goals menambah goal, di Kekayaan menambah dompet, aset, atau utang. " +
        "Transaksi kategori <strong>Invest &amp; Savings</strong> wajib memilih tujuannya (goal atau aset)."
    },
    {
      tab: "arus", target: tab("arus"),
      judul: "Arus Kas",
      isi: "Bandingkan <strong>budget lawan realisasi</strong> tiap kategori untuk Income, Expenses, dan Liabilitas. " +
        "Budget diisi di Pengaturan."
    },
    {
      tab: "transaksi", target: tab("transaksi"),
      judul: "Transaksi",
      isi: "Semua catatan di bulan terpilih. Saring lewat chip (income, expenses, transfer), cari lewat kolom pencarian, " +
        "dan ketuk satu baris untuk mengubah atau menghapusnya."
    },
    {
      tab: "kekayaan", target: tab("kekayaan"),
      judul: "Kekayaan",
      isi: "Tiga bagian: <strong>Dompet</strong> (tunai, bank, e-wallet), <strong>Aset</strong> (investasi dan nilainya), " +
        "dan <strong>Utang</strong> (termasuk pembayarannya). Semuanya masuk hitungan net worth."
    },
    {
      tab: "goals", target: tab("goals"),
      judul: "Goals",
      isi: "Buat target tabungan, lalu tambah dana ke goal dari salah satu dompet. " +
        "Uang di goal tetap dihitung sebagai <strong>Dana Goals</strong> di Total Assets, jadi net worth tidak turun saat kamu menabung."
    },
    {
      tab: "pengaturan",
      target: () => { const k = kartuAtur("Tampilan"); return k && (k.querySelector(".palet-grid") || k); },
      judul: "Setelan: tampilan",
      isi: "Pilih mode <strong>otomatis, terang, atau gelap</strong>, lalu pilih palet warna atau buat warna kustom sendiri. " +
        "Hasilnya langsung terlihat dan berlaku untuk semua akun."
    },
    {
      tab: "pengaturan",
      target: () => document.querySelector("#isi-pengaturan details.grup"),
      judul: "Setelan: anggaran dan kategori",
      isi: "Buka grup <strong>Income, Expenses, atau Liabilitas</strong> untuk mengisi budget per bulan di tiap kategori. " +
        "Ketuk &#9998; untuk mengganti nama atau menghapus kategori, dan tambah kategori baru di bagian bawah grup."
    },
    {
      tab: "pengaturan",
      target: () => { const k = kartuAtur("Data"); return k && (k.querySelector(".btn-grid") || k); },
      judul: "Setelan: data dan cadangan",
      isi: "<strong>Ekspor JSON</strong> untuk cadangan, <strong>impor JSON</strong> untuk memulihkan, dan ekspor CSV untuk spreadsheet. " +
        "Hanya berlaku untuk akun yang sedang dibuka. Kartu <strong>Pasang aplikasi</strong> di bawahnya membuat app bisa dipakai seperti aplikasi biasa, termasuk tanpa internet."
    },
    {
      tab: "pengaturan", target: null,
      judul: "Selesai",
      isi: "Satu tips penting: <strong>ekspor JSON tiap akun secara berkala</strong>, karena data hanya ada di browser ini. " +
        "Mau lihat tur ini lagi? Buka <strong>Pengaturan</strong>, lalu ketuk <strong>Lihat tutorial</strong> di kartu Bantuan."
    }
  ];
})();
/* ===== TUTORIAL: LANGKAH END ===== */


/* ===== TUTORIAL: MESIN START =====
   Tutorial.mulai()          jalankan tur (dari tombol di Pengaturan)
   Tutorial.mulaiOtomatis()  jalankan hanya kalau belum pernah lihat
   Tutorial.sudahLihat()     true kalau tur sudah pernah selesai / dilewati
   ================================================================ */
window.Tutorial = (() => {
  const KUNCI = "keuangan.tutorial";
  const PAD = 6;            // jarak sorotan dari elemen
  const JARAK = 12;         // jarak kartu dari tepi layar / elemen
  const LEBAR_MAKS = 380;

  let aktif = false;
  let ke = 0;
  let otomatis = false;
  let asalTab = "home";
  let fokusAwal = null;
  let sesiLihat = false;    // cadangan kalau localStorage diblokir
  let akar = null, sorot = null, kartu = null;

  /* ----- status "sudah lihat" ----- */
  function sudahLihat() {
    if (sesiLihat) return true;
    try {
      const x = JSON.parse(localStorage.getItem(KUNCI));
      return Boolean(x && x.selesai);
    } catch (e) { return false; }
  }

  function tandai() {
    sesiLihat = true;
    try {
      localStorage.setItem(KUNCI, JSON.stringify({ selesai: true, versi: VERSI_APP, waktu: new Date().toISOString() }));
    } catch (e) { /* diblokir / penuh: cukup untuk sesi ini */ }
  }

  /* ----- elemen target ----- */
  function tampak(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return false;
    const cs = getComputedStyle(el);
    return cs.display !== "none" && cs.visibility !== "hidden";
  }

  function cariTarget(t) {
    if (!t) return null;
    const calon = typeof t === "function" ? [t()] : t.map((s) => document.querySelector(s));
    return calon.find(tampak) || null;
  }

  /* ----- bagian halaman yang dikunci selama tur ----- */
  const dikunci = () => [document.querySelector(".isi-app"), document.querySelector(".nav"), document.getElementById("fabTambah")].filter(Boolean);
  const kunci = (ya) => dikunci().forEach((el) => { try { el.inert = ya; } catch (e) { /* abaikan */ } });

  /* ----- kerangka tur ----- */
  function bangun() {
    akar = document.createElement("div");
    akar.className = "tur";
    akar.innerHTML =
      '<div class="tur-sorot tur-sorot--kosong"></div>' +
      '<section class="tur-kartu" role="dialog" aria-modal="true" aria-labelledby="turJudul" aria-describedby="turIsi" tabindex="-1">' +
        '<p class="tur-ke"></p>' +
        '<h2 class="tur-judul" id="turJudul"></h2>' +
        '<p class="tur-isi" id="turIsi"></p>' +
        '<div class="tur-titik" aria-hidden="true">' + TUR_LANGKAH.map(() => "<i></i>").join("") + "</div>" +
        '<div class="tur-aksi">' +
          '<button type="button" class="tur-lewati" data-tur="lewati">Lewati</button>' +
          '<span class="tur-nav">' +
            '<button type="button" class="btn" data-tur="mundur">Kembali</button>' +
            '<button type="button" class="btn btn--solid" data-tur="maju">Lanjut</button>' +
          "</span>" +
        "</div>" +
      "</section>";
    sorot = akar.querySelector(".tur-sorot");
    kartu = akar.querySelector(".tur-kartu");

    akar.addEventListener("click", (e) => {
      const tombol = e.target.closest("[data-tur]");
      if (!tombol) return;
      const aksi = tombol.dataset.tur;
      if (aksi === "lewati") tutup();
      else if (aksi === "mundur") pergi(ke - 1);
      else if (aksi === "maju") (ke >= TUR_LANGKAH.length - 1 ? tutup() : pergi(ke + 1));
    });

    /* Cegah halaman di belakang ikut bergulir (kecuali kartu yang panjang) */
    const cegah = (e) => { if (!e.target.closest(".tur-kartu")) e.preventDefault(); };
    akar.addEventListener("wheel", cegah, { passive: false });
    akar.addEventListener("touchmove", cegah, { passive: false });
  }

  function isiKartu(l) {
    const jml = TUR_LANGKAH.length;
    kartu.querySelector(".tur-ke").textContent = (ke + 1) + " dari " + jml;
    kartu.querySelector(".tur-judul").textContent = l.judul;
    kartu.querySelector(".tur-isi").innerHTML = l.isi;
    Array.from(kartu.querySelectorAll(".tur-titik i")).forEach((t, i) => {
      t.classList.toggle("is-aktif", i === ke);
      t.classList.toggle("is-lewat", i < ke);
    });
    const mundur = kartu.querySelector('[data-tur="mundur"]');
    const maju = kartu.querySelector('[data-tur="maju"]');
    mundur.style.visibility = ke === 0 ? "hidden" : "visible";
    maju.textContent = ke >= jml - 1 ? "Selesai" : "Lanjut";
    kartu.querySelector('[data-tur="lewati"]').style.visibility = ke >= jml - 1 ? "hidden" : "visible";
  }

  const jepit = (n, min, maks) => Math.max(min, Math.min(maks, n));

  /* Letakkan sorotan di elemen dan kartu di sisi yang muat */
  function tata(target) {
    if (!aktif) return;
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const kl = Math.min(LEBAR_MAKS, vw - 2 * JARAK);
    kartu.style.width = kl + "px";
    kartu.style.maxHeight = (vh - 2 * JARAK) + "px";
    const kt = kartu.offsetHeight;

    let r = null;
    if (target && tampak(target)) {
      const bt = target.getBoundingClientRect();
      const x1 = Math.max(bt.left - PAD, 4), y1 = Math.max(bt.top - PAD, 4);
      const x2 = Math.min(bt.right + PAD, vw - 4), y2 = Math.min(bt.bottom + PAD, vh - 4);
      r = { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
    }

    sorot.classList.toggle("tur-sorot--kosong", !r);
    if (r) {
      sorot.style.left = r.x + "px"; sorot.style.top = r.y + "px";
      sorot.style.width = r.w + "px"; sorot.style.height = r.h + "px";
    } else {
      sorot.style.left = vw / 2 + "px"; sorot.style.top = vh / 2 + "px";
      sorot.style.width = "0px"; sorot.style.height = "0px";
    }

    let kiri, atas;
    if (!r) {
      kiri = (vw - kl) / 2;
      atas = (vh - kt) / 2;
    } else {
      const bawah = vh - (r.y + r.h) - 2 * JARAK;
      const kanan = vw - (r.x + r.w) - 2 * JARAK;
      const tengahX = jepit(r.x + r.w / 2 - kl / 2, JARAK, vw - kl - JARAK);
      if (vw >= 960 && kanan >= kl) {            // menu samping: kartu di sebelah kanan
        kiri = r.x + r.w + JARAK;
        atas = jepit(r.y + r.h / 2 - kt / 2, JARAK, vh - kt - JARAK);
      } else if (bawah >= kt) {                  // muat di bawah target
        kiri = tengahX; atas = r.y + r.h + JARAK;
      } else if (r.y - 2 * JARAK >= kt) {        // muat di atas target
        kiri = tengahX; atas = r.y - JARAK - kt;
      } else {                                   // target tinggi: jauhkan dari pusatnya
        kiri = (vw - kl) / 2;
        atas = (r.y + r.h / 2 > vh / 2) ? JARAK : vh - kt - JARAK;
      }
    }
    kartu.style.left = kiri + "px";
    kartu.style.top = atas + "px";
    akar.classList.add("tur-siap");   // animasi geser baru aktif setelah posisi pertama
  }

  function pergi(n) {
    ke = jepit(n, 0, TUR_LANGKAH.length - 1);
    const l = TUR_LANGKAH[ke];

    if (l.tab && state.tab !== l.tab) pindahTab(l.tab);
    isiKartu(l);

    const t = cariTarget(l.target);
    if (t && t.closest("main")) {
      try { t.scrollIntoView({ block: "center", inline: "nearest" }); } catch (e) { /* abaikan */ }
    }
    /* Dua frame: tunggu halaman selesai berpindah dan bergulir */
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!aktif) return;
      tata(t);
      kartu.focus({ preventScroll: true });
    }));
  }

  /* ----- keyboard & ukuran layar ----- */
  function tombol(e) {
    if (!aktif) return;
    if (e.key === "Escape") { e.preventDefault(); tutup(); }
    else if (e.key === "ArrowRight") { e.preventDefault(); ke >= TUR_LANGKAH.length - 1 ? tutup() : pergi(ke + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); pergi(ke - 1); }
    else if (e.key === "Tab") {
      /* Fokus berputar di dalam kartu saja */
      const daftar = Array.from(kartu.querySelectorAll("button")).filter((x) => x.style.visibility !== "hidden");
      if (!daftar.length) return;
      const awal = daftar[0], akhir = daftar[daftar.length - 1];
      if (!kartu.contains(document.activeElement) || document.activeElement === kartu) {
        e.preventDefault(); (e.shiftKey ? akhir : awal).focus();
      } else if (e.shiftKey && document.activeElement === awal) {
        e.preventDefault(); akhir.focus();
      } else if (!e.shiftKey && document.activeElement === akhir) {
        e.preventDefault(); awal.focus();
      }
    }
  }

  const ukuran = () => tata(cariTarget(TUR_LANGKAH[ke].target));

  /* ----- mulai & tutup ----- */
  function mulai(dariOtomatis) {
    if (aktif || !document.body) return;
    if (document.querySelector("dialog[open]")) return;   // jangan menimpa form yang sedang terbuka

    aktif = true;
    otomatis = Boolean(dariOtomatis);
    asalTab = state.tab || "home";
    fokusAwal = document.activeElement;

    bangun();
    document.body.appendChild(akar);
    document.body.classList.add("tur-aktif");
    kunci(true);
    document.addEventListener("keydown", tombol, true);
    window.addEventListener("resize", ukuran);
    pergi(0);
  }

  function tutup() {
    if (!aktif) return;
    aktif = false;
    document.removeEventListener("keydown", tombol, true);
    window.removeEventListener("resize", ukuran);
    if (akar) akar.remove();
    akar = sorot = kartu = null;
    document.body.classList.remove("tur-aktif");
    kunci(false);
    tandai();

    /* Pemakai baru kembali ke Home; yang mengulang kembali ke halaman asalnya */
    pindahTab(otomatis ? "home" : asalTab);
    try {
      if (fokusAwal && fokusAwal !== document.body && document.contains(fokusAwal)) fokusAwal.focus({ preventScroll: true });
    } catch (e) { /* abaikan */ }
    toast("tutorial ada di Pengaturan > Bantuan");
  }

  function mulaiOtomatis() {
    if (!sudahLihat()) mulai(true);
  }

  return { mulai: () => mulai(false), mulaiOtomatis: mulaiOtomatis, sudahLihat: sudahLihat };
})();
/* ===== TUTORIAL: MESIN END ===== */
