import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabase = createClient(
    'https://feriqnmbfzixgeedmvzw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlcmlxbm1iZnppeGdlZWRtdnp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODY3NTAsImV4cCI6MjA2NjI2Mjc1MH0.POc4TH7fATyb1lsWmMPmUZUww4vaH_5qgGCsD3MsW-E'
  );
const TABLE_NAME = "catatan_penjualan";

// Elemen DOM
const form = document.getElementById("form-barang");
const namaBarangEl = document.getElementById("nama_barang");
const typeBelanjaEl = document.getElementById("type_belanja");
const stokEl = document.getElementById("stok");
const hargaEl = document.getElementById("harga");
const totalHargaEl = document.getElementById("total_harga");
const hasilBelanjaEl = document.getElementById("hasil-belanja");
const notifAreaEl = document.getElementById("notif-area");
const modal = document.getElementById("modal-detail");
const modalContent = document.getElementById("modal-content");
const modalTitle = document.getElementById("modal-title");

// Format ke Rupiah
const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(angka);

// Hitung Total Otomatis
const hitungTotalOtomatis = () => {
  const stok = parseInt(stokEl.value) || 0;
  const harga = parseInt(hargaEl.value) || 0;
  totalHargaEl.textContent = formatRupiah(stok * harga);
};
stokEl.addEventListener("input", hitungTotalOtomatis);
hargaEl.addEventListener("input", hitungTotalOtomatis);

// Grup berdasarkan bulan
const kelompokkanPerBulan = (data) => {
  return data.reduce((acc, item) => {
    const tanggal = new Date(item.tanggal);
    const key = tanggal.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
};

// Tampilkan Modal
window.tampilkanModal = (bulan, items) => {
  modal.classList.remove("hidden");
  modalTitle.textContent = `Belanja Bulan ${bulan}`;
  modalContent.innerHTML = items.map(item => `
    <div class="p-4 bg-white border border-slate-200 rounded-lg shadow hover:shadow-md transition">
      <div class="flex justify-between">
        <div>
          <p class="font-bold text-sky-700">${item.nama_barang}</p>
          <p class="text-sm text-gray-500">${item.stok} x ${formatRupiah(item.harga)}</p>
          <p class="text-sm"><strong>Tipe:</strong> ${item.type_belanja}</p>
        </div>
        <div class="text-right">
          <p class="font-bold text-pink-600 text-lg">${formatRupiah(item.total)}</p>
          <button onclick='editItem(${JSON.stringify(item).replace(/"/g, "&quot;")})' class="text-xs text-yellow-600 hover:underline">✏️</button>
          <button onclick='hapusItem(${item.id})' class="text-xs text-red-500 hover:underline">🗑️</button>
        </div>
      </div>
    </div>
  `).join("");
};

window.tutupModal = () => {
  modal.classList.add("hidden");
};

// Tampilkan Notif dan Kalender
const tampilkanData = (data) => {
  const sekarang = new Date();
  const bulanIniKey = sekarang.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

  notifAreaEl.innerHTML = data.some(item => {
    const tgl = new Date(item.tanggal);
    return tgl.getMonth() === sekarang.getMonth() && tgl.getFullYear() === sekarang.getFullYear();
  }) ? "" : `<div class="bg-yellow-100 text-yellow-700 p-4 rounded-lg shadow">💡 Anda belum belanja di bulan ${bulanIniKey}.</div>`;

  const dataPerBulan = kelompokkanPerBulan(data);
  hasilBelanjaEl.innerHTML = Object.entries(dataPerBulan).map(([bulan, items]) => `
    <div class="bg-white/60 backdrop-blur-md p-4 rounded-xl shadow hover:shadow-lg transition cursor-pointer" onclick='tampilkanModal("${bulan}", ${JSON.stringify(items).replace(/"/g, "&quot;")})'>
      <h3 class="text-xl font-bold text-sky-700 mb-2">${bulan}</h3>
      <p class="text-sm text-gray-500">${items.length} barang</p>
      <p class="text-pink-600 font-bold mt-1">${formatRupiah(items.reduce((sum, i) => sum + i.total, 0))}</p>
    </div>
  `).join("");
};

// Load data dari Supabase
const loadData = async () => {
  const { data, error } = await supabase.from(TABLE_NAME).select("*").order("tanggal", { ascending: false });
  if (!error) tampilkanData(data);
  else hasilBelanjaEl.innerHTML = "<p class='text-red-500'>Gagal memuat data.</p>";
};

// Simpan data baru
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const stok = parseInt(stokEl.value);
  const harga = parseInt(hargaEl.value);
  const total = stok * harga;
  const payload = {
    nama_barang: namaBarangEl.value,
    stok,
    harga,
    total,
    type_belanja: typeBelanjaEl.value,
    tanggal: new Date().toISOString().split('T')[0]
  };

  const { error } = await supabase.from(TABLE_NAME).insert(payload);
  if (!error) {
    form.reset();
    totalHargaEl.textContent = formatRupiah(0);
    await loadData();
  }
});

// Edit dan Hapus
window.editItem = async (item) => {
  const nama = prompt("Nama Barang:", item.nama_barang);
  if (nama === null) return;
  const stok = parseInt(prompt("Stok:", item.stok));
  const harga = parseInt(prompt("Harga Satuan:", item.harga));
  const tipe = prompt("Tipe Belanja (bulanan/mingguan):", item.type_belanja);
  if (!nama || isNaN(stok) || isNaN(harga) || !["bulanan", "mingguan"].includes(tipe)) {
      alert("Input tidak valid!");
      return;
  }
  const total = stok * harga;
  const { error } = await supabase.from(TABLE_NAME)
      .update({ nama_barang: nama, stok, harga, total, type_belanja: tipe })
      .eq('id', item.id);
  if (!error) loadData();
};

window.hapusItem = async (id) => {
  if (confirm("Yakin ingin menghapus item ini?")) {
    const { error } = await supabase.from(TABLE_NAME).delete().eq("id", id);
    if (!error) loadData();
  }
};

loadData();
