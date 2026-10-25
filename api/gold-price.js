export default async function handler(req, res) {
  try {
    // 1. Ambil halaman HTML Pegadaian
    const response = await fetch('https://pegadaian.co.id/harga-emas');
    const html = await response.text();

    // 2. Ekstrak Harga Tabungan Emas (per 0,01 gr)
    const jualTabMatch = html.match(/Jual Emas[\s\S]*?Rp\s*([\d\.]+)\s*\/\s*0,01 gr/i);
    const beliTabMatch = html.match(/Beli Emas[\s\S]*?Rp\s*([\d\.]+)\s*\/\s*0,01 gr/i);
    
    const jualTab01 = jualTabMatch ? parseFloat(jualTabMatch[1].replace(/\./g, '')) : 0;
    const beliTab01 = beliTabMatch ? parseFloat(beliTabMatch[1].replace(/\./g, '')) : 0;

    // 3. Ekstrak Harga Emas Batangan 1 Gram (Galeri 24, ANTAM, UBS)
    // Mencari baris yang mengandung "1 gram" diikuti oleh 3 harga
    const batanganMatch = html.match(/1 gram[\s\S]*?Rp\s*([\d\.]+)[\s\S]*?Rp\s*([\d\.]+)[\s\S]*?Rp\s*([\d\.]+)/i);
    
    const galeri24 = batanganMatch ? parseFloat(batanganMatch[1].replace(/\./g, '')) : 0;
    const antam = batanganMatch ? parseFloat(batanganMatch[2].replace(/\./g, '')) : 0;
    const ubs = batanganMatch ? parseFloat(batanganMatch[3].replace(/\./g, '')) : 0;

    // 4. Kirim data ke aplikasi Anda dalam format JSON
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      pegadaian: {
        beliPerGram: beliTab01 * 100,
        jualPerGram: jualTab01 * 100 // Buyback Pegadaian
      },
      antam: antam,
      ubs: ubs,
      galeri24: galeri24
    });

  } catch (error) {
    // Jika Pegadaian error atau berubah struktur webnya
    res.status(500).json({ success: false, error: 'Gagal mengambil harga' });
  }
}