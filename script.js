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
    }) ? "" : `<div style="background-color: #FFFBCC; color: #856404; padding: 10px; border-radius: 5px;">💡 Anda belum belanja di bulan ${bulanIniKey}.</div>`;

    if (data.length === 0) {
        hasilBelanjaEl.innerHTML = `<p style='color: gray; text-align: center;'>Belum ada data belanja.</p>`;
        return;
    }

    const dataPerBulan = kelompokkanPerBulan(data);
    hasilBelanjaEl.innerHTML = Object.entries(dataPerBulan).map(([bulan, items]) => {
        const itemCards = items.map(item => `
            <div style="border: 1px solid #FFC0CB; padding: 16px; border-radius: 8px; background-color: rgba(255, 255, 255, 0.8); display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <p style="font-weight: bold; color: #007BFF;">${item.nama_barang}</p>
                    <p style="color: #666;">${item.stok} x ${formatRupiah(item.harga)}</p>
                    <p><span style="font-weight: bold;">Tipe:</span> ${item.type_belanja}</p>
                </div>
                <div style="text-align: right;">
                    <span style="font-weight: bold; color: #e63946;">${formatRupiah(item.total)}</span>
                    <button onclick="editItem(${JSON.stringify(item).replace(/"/g, '&quot;')})" style="color: #FFC107; background: none; border: none; cursor: pointer;">✏️ Edit</button>
                    <button onclick="hapusItem(${item.id})" style="color: #DC3545; background: none; border: none; cursor: pointer;">🗑️ Hapus</button>
                </div>
            </div>
        `).join('');

        return `
            <div style="background-color: rgba(255, 255, 255, 0.7); padding: 24px; border-radius: 16px; margin-bottom: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="font-size: 1.5em; color: #007BFF;">${bulan}</h3>
                    <div>
                        <button onclick="toggleDetails('${bulan.replace(/\s+/g, '-')})" style="padding: 8px 12px; border-radius: 4px; background-color: #007BFF; color: white; border: none; cursor: pointer;">Lihat Detail</button>
                        <button onclick='hapusBulan("${bulan}", ${JSON.stringify(items).replace(/"/g, '&quot;')})' style="padding: 8px 12px; border-radius: 4px; background-color: #e63946; color: white; border: none; cursor: pointer;">Hapus Bulan</button>
                    </div>
                </div>
                <div id="detail-${bulan.replace(/\s+/g, '-')}" style="margin-top: 16px; display: none;">
                    ${itemCards}
                </div>
            </div>
        `;
    }).join("");
};

window.toggleDetails = (bulanId) => {
    const el = document.getElementById(`detail-${bulanId}`);
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

// === Load Data ===
const loadData = async () => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('tanggal', { ascending: false });

    if (!error) tampilkanData(data);
    else hasilBelanjaEl.innerHTML = "<p style='color: red;'>Gagal memuat data.</p>";
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
