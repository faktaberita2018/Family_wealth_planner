export default async function handler(req, res) {
  try {
    // 1. Ambil halaman HTML Pegadaian
    const response = await fetch('https://pegadaian.co.id/harga-emas');
    const html = await response.text();

    // 2. Ekstrak Harga Jual (Buyback) Tabungan Emas per 0,01 gr
    // Regex mencari teks "Jual Emas" lalu mengambil angka setelahnya
    const jualTabMatch = html.match(/Jual Emas[\s\S]*?Rp\s*([\d\.]+)\s*\/\s*0,01 gr/i);
    
    const jualTab01 = jualTabMatch ? parseFloat(jualTabMatch[1].replace(/\./g, '')) : 0;
    
    // Konversi ke harga per gram (dikali 100)
    const hargaBuybackPerGram = jualTab01 * 100;

    // 3. Kirim data ke aplikasi Anda
    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      pegadaian: {
        jualPerGram: hargaBuybackPerGram // Contoh: 2.315.000
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: 'Gagal mengambil harga' });
  }
}