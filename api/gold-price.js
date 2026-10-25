export default async function handler(req, res) {
  try {
    const response = await fetch('https://thepalacejeweler.com/today-gold-price', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = await response.text();

    // Regex untuk mencari angka buyback (kolom BELI)
    // 24K: Mencari pola "24K(99,9%) ... angka"
    const match24 = html.match(/24K\(99,9%\)[\s\S]*?(\d{3,4})/i);
    // 18K: Mencari pola "18K(75%) ... angka"
    const match18 = html.match(/18K\(75%\)[\s\S]*?(\d{3,4})/i);
    // 9K: Mencari pola "9K(37,5%) ... angka" (mengambil harga buyback pertama)
    const match9 = html.match(/9K\(37,5%\)[\s\S]*?(\d{3,4})/i);

    // Konversi dari ribuan ke Rupiah penuh (contoh: 2269 -> 2.269.000)
    const harga24K = match24 ? parseFloat(match24[1]) * 1000 : 0;
    const harga18K = match18 ? parseFloat(match18[1]) * 1000 : 0;
    const harga9K = match9 ? parseFloat(match9[1]) * 1000 : 0;

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