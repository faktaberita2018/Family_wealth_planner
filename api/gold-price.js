export default async function handler(req, res) {
  try {
    const response = await fetch('https://thepalacejeweler.com/today-gold-price', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await response.text();

    // Fungsi helper untuk mencari dua angka dan mengambil angka KEDUA (Kolom BELI/Buyback)
    function extractBuyback(karatString) {
      // Mencari teks karat, lalu menangkap 2 kelompok angka yang dipisahkan koma/titik
      const regex = new RegExp(`${karatString}[\\s\\S]*?([\\d\\.,]+)[\\s\\S]*?([\\d\\.,]+)`, 'i');
      const match = html.match(regex);
      if (match && match[2]) {
        // Hapus koma/titik, lalu kalikan 1000 (karena di web tertulis 2,269 yang artinya 2.269.000)
        const angkaBersih = match[2].replace(/[.,]/g, '');
        return parseFloat(angkaBersih) * 1000;
      }
      return 0;
    }

    // Ambil harga Beli (Buyback) untuk masing-masing kadar
    const harga24K = extractBuyback('24K');
    const harga18K = extractBuyback('18K');
    const harga9K = extractBuyback('9K');

    if (harga24K === 0 && harga18K === 0 && harga9K === 0) {
      throw new Error('Gagal menemukan harga di halaman The Palace');
    }

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      palace: {
        '24K': harga24K,
        '18K': harga18K,
        '9K': harga9K
      }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}