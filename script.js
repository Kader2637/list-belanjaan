import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

// Supabase config
const supabaseUrl = 'https://feriqnmbfzixgeedmvzw.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZlcmlxbm1iZnppeGdlZWRtdnp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2ODY3NTAsImV4cCI6MjA2NjI2Mjc1MH0.POc4TH7fATyb1lsWmMPmUZUww4vaH_5qgGCsD3MsW-E';
const supabase = createClient(supabaseUrl, supabaseKey);

// Nama tabel
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

// Format ke Rupiah
const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(angka);
};

// Hitung total otomatis
const hitungTotalOtomatis = () => {
    const stok = parseInt(stokEl.value) || 0;
    const harga = parseInt(hargaEl.value) || 0;
    const total = stok * harga;
    totalHargaEl.textContent = formatRupiah(total);
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

// Tampilkan data
const tampilkanData = (data) => {
    const sekarang = new Date();
    const bulanIniKey = sekarang.toLocaleString('id-ID', { month: 'long', year: 'numeric' });

    const adaBelanjaBulanIni = data.some(item => {
        const tglItem = new Date(item.tanggal);
        return tglItem.getMonth() === sekarang.getMonth() && tglItem.getFullYear() === sekarang.getFullYear();
    });

    notifAreaEl.innerHTML = adaBelanjaBulanIni ? "" : `
        <div class="bg-yellow-200 text-yellow-800 p-4 rounded-lg shadow">
            💡 Anda belum belanja di bulan ${bulanIniKey}.
        </div>
    `;

    if (data.length === 0) {
        hasilBelanjaEl.innerHTML = `<p class='text-gray-500 text-center'>Belum ada data belanja.</p>`;
        return;
    }

    const dataPerBulan = kelompokkanPerBulan(data);
    hasilBelanjaEl.innerHTML = Object.entries(dataPerBulan).map(([bulan, items]) => {
        const itemCards = items.map(item => `
            <div class="border p-4 rounded-md bg-white flex justify-between items-center">
                <div>
                    <p class="font-bold text-lg">${item.nama_barang}</p>
                    <p class="text-sm text-gray-500">${item.stok} x ${formatRupiah(item.harga)}</p>
                    <p class="text-sm"><span class="font-semibold">Tipe:</span> ${item.type_belanja}</p>
                </div>
                <div class="font-bold text-xl text-blue-600">
                    ${formatRupiah(item.total)}
                </div>
            </div>
        `).join('');

        return `
            <div class="bg-slate-50 p-4 rounded-xl shadow">
                <div class="flex justify-between items-center">
                    <h3 class="text-xl font-bold text-slate-700">${bulan}</h3>
                    <button onclick="toggleDetails('${bulan.replace(/\s+/g, '-')}')" class="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                        Lihat Detail
                    </button>
                </div>
                <div id="detail-${bulan.replace(/\s+/g, '-')}" class="mt-4 space-y-3 hidden">
                    ${itemCards}
                </div>
            </div>
        `;
    }).join('');
};

window.toggleDetails = (bulanId) => {
    const el = document.getElementById(`detail-${bulanId}`);
    el.classList.toggle('hidden');
};

// Load data
const loadData = async () => {
    const { data, error } = await supabase
        .from(TABLE_NAME)
        .select('*')
        .order('tanggal', { ascending: false });

    if (error) {
        console.error("Gagal memuat data:", error);
        hasilBelanjaEl.innerHTML = "<p class='text-red-500'>Gagal memuat data dari server.</p>";
    } else {
        tampilkanData(data);
    }
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
        tanggal: new Date().toISOString().split('T')[0] // YYYY-MM-DD
    };

    const { error } = await supabase.from(TABLE_NAME).insert(payload);
    if (error) {
        console.error("Gagal menyimpan data:", error);
        alert("Gagal menyimpan data!");
    } else {
        form.reset();
        totalHargaEl.textContent = formatRupiah(0);
        await loadData();
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    }
});

// Load awal
loadData();
