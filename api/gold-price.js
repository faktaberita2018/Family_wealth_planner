export default async function handler(req, res) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch('https://thepalacejeweler.com/today-gold-price', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
                      '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      signal: controller.signal
    });

    if (!response.ok) {
      return res.status(502).json({
        success: false,
        error: `Sumber merespons HTTP ${response.status}`
      });
    }

    const html = await response.text();

    function extractBuyback(karatString) {
      const regex = new RegExp(`${karatString}[\\s\\S]*?([\\d\\.,]+)[\\s\\S]*?([\\d\\.,]+)`, 'i');
      const match = html.match(regex);
      if (match && match[2]) {
        const angkaBersih = match[2].replace(/[.,]/g, '');
        const num = parseFloat(angkaBersih);
        return Number.isFinite(num) ? num * 1000 : 0;
      }
      return 0;
    }

    const harga24K = extractBuyback('24K');
    const harga18K = extractBuyback('18K');
    const harga9K  = extractBuyback('9K');

    if (harga24K === 0 && harga18K === 0 && harga9K === 0) {
      return res.status(502).json({
        success: false,
        error: 'Format halaman sumber berubah — harga tidak ditemukan'
      });
    }

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      palace: { '24K': harga24K, '18K': harga18K, '9K': harga9K }
    });
  } catch (error) {
    const message = error?.name === 'AbortError'
      ? 'Timeout saat mengakses sumber The Palace'
      : (error?.message || 'Kesalahan tidak diketahui');
    res.status(500).json({ success: false, error: message });
  } finally {
    clearTimeout(timer);
  }
}