import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Supabase config
const supabaseUrl = 'https://feriqnmbfzixgeedmvzw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlcmlxbm1iZnppeGdlZWRtdnp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODY3NTAsImV4cCI6MjA2NjI2Mjc1MH0.POc4TH7fATyb1lsWmMPmUZUww4vaH_5qgGCsD3MsW-E';
const supabase = createClient(supabaseUrl, supabaseKey);
const TABLE_NAME = "catatan_penjualan";

// DOM Elements
const form = document.getElementById("form-barang");
const namaBarangEl = document.getElementById("nama_barang");
const typeBelanjaEl = document.getElementById("type_belanja");
const stokEl = document.getElementById("stok");
const hargaEl = document.getElementById("harga");
const totalHargaEl = document.getElementById("total_harga");
const hasilBelanjaEl = document.getElementById("hasil-belanja");
const notifAreaEl = document.getElementById("notif-area");

// Format ke Rupiah
const formatRupiah = (angka) => new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', minimumFractionDigits: 0
}).format(angka);

// Hitung total otomatis
const hitungTotalOtomatis = () => {
    const stok = parseInt(stokEl.value) || 0;
    const harga = parseInt(hargaEl.value) || 0;
    totalHargaEl.textContent = formatRupiah(stok * harga);
};
stokEl.addEventListener('input', hitungTotalOtomatis);
hargaEl.addEventListener('input', hitungTotalOtomatis);

// Kelompokkan per bulan
const kelompokkanPerBulan = (data) => {
    return data.reduce((acc, item) => {
        const tanggal = new Date(item.tanggal);
        const key = tanggal.toLocaleString('id-ID', { month: 'long', year: 'numeric' });
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});
};

// === FITUR HAPUS dan EDIT ===
window.hapusItem = async (id) => {
    if (confirm("Yakin ingin menghapus item ini?")) {
        const { error } = await supabase.from(TABLE_NAME).delete().eq('id', id);
        if (!error) loadData();
    }
};

window.hapusBulan = async (bulan, items) => {
    if (confirm(`Hapus semua data belanja di bulan ${bulan}?`)) {
        const ids = items.map(i => i.id);
        const { error } = await supabase.from(TABLE_NAME).delete().in('id', ids);
        if (!error) loadData();
    }
};

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

// === Tampilkan data ===
const tampilkanData = (data) => {
    const sekarang = new Date();
    const bulanIniKey = sekarang.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    notifAreaEl.innerHTML = data.some(item => {
        const tgl = new Date(item.tanggal);
        return tgl.getMonth() === sekarang.getMonth() && tgl.getFullYear() === sekarang.getFullYear();
    }) ? "" : `<div class="bg-yellow-200 text-yellow-800 p-4 rounded-lg shadow">💡 Anda belum belanja di bulan ${bulanIniKey}.</div>`;

    if (data.length === 0) {
        hasilBelanjaEl.innerHTML = `<p class='text-gray-500 text-center'>Belum ada data belanja.</p>`;
        return;
    }

    const dataPerBulan = kelompokkanPerBulan(data);
    hasilBelanjaEl.innerHTML = Object.entries(dataPerBulan).map(([bulan, items]) => {
        const itemCards = items.map(item => `
          <div class="border border-pink-100 p-4 rounded-xl bg-white/80 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition duration-300 hover:shadow-lg">
            <div>
              <p class="font-bold text-lg text-sky-700">${item.nama_barang}</p>
              <p class="text-sm text-gray-500">${item.stok} x ${formatRupiah(item.harga)}</p>
              <p class="text-sm"><span class="font-semibold">Tipe:</span> ${item.type_belanja}</p>
            </div>
            <div class="flex flex-col items-end space-y-1 text-right">
              <span class="font-bold text-xl text-pink-500">${formatRupiah(item.total)}</span>
              <button onclick="editItem(${JSON.stringify(item).replace(/"/g, '&quot;')})" class="text-sm text-yellow-600 hover:underline">✏️ Edit</button>
              <button onclick="hapusItem(${item.id})" class="text-sm text-red-500 hover:underline">🗑️ Hapus</button>
            </div>
          </div>
        `).join('');

        return `
          <div class="bg-white/60 backdrop-blur-md p-6 rounded-2xl shadow-lg">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
              <h3 class="text-xl font-bold text-sky-800">${bulan}</h3>
              <div class="space-x-2">
                <button onclick="toggleDetails('${bulan.replace(/\s+/g, '-')})" class="bg-sky-500 text-white px-3 py-1 rounded-lg hover:bg-sky-600 transition">Lihat Detail</button>
                <button onclick='hapusBulan("${bulan}", ${JSON.stringify(items).replace(/"/g, '&quot;')})' class="bg-pink-500 text-white px-3 py-1 rounded-lg hover:bg-pink-600 transition">Hapus Bulan</button>
              </div>
            </div>
            <div id="detail-${bulan.replace(/\s+/g, '-')}" class="mt-4 space-y-3 hidden">
              ${itemCards}
            </div>
          </div>
        `;
      }).join("");
};

window.toggleDetails = (bulanId) => {
    const el = document.getElementById(`detail-${bulanId}`);
    el.classList.toggle('hidden');
};

// === Load Data ===
const loadData = async () => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('tanggal', { ascending: false });

    if (!error) tampilkanData(data);
    else hasilBelanjaEl.innerHTML = "<p class='text-red-500'>Gagal memuat data.</p>";
};

// === Simpan Data Baru ===
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
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
});

loadData();
