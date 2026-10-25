export default async function handler(req, res) {
  try {
    // Tambahkan User-Agent agar tidak diblokir
    const response = await fetch('https://pegadaian.co.id/harga-emas', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    
    const html = await response.text();

    // Regex lebih fleksibel: Mencari kata "Jual Emas" lalu mengambil angka Rp pertama setelahnya
    const match = html.match(/Jual Emas[\s\S]*?Rp\s*([\d\.]+)/i);
    
    let hargaBuybackPerGram = 0;
    
    if (match && match[1]) {
      // Hapus titik (jika ada) dan ubah ke angka
      const angkaMentah = parseFloat(match[1].replace(/\./g, ''));
      
      // Jika angka di bawah 100.000 (misal 23.150), berarti itu harga per 0,01 gr. Kalikan 100.
      // Jika angkanya sudah besar (misal 2.315.000), berarti sudah per gram.
      hargaBuybackPerGram = angkaMentah < 100000 ? angkaMentah * 100 : angkaMentah;
    }

    // Jika gagal dapat angka, kirim status gagal
    if (hargaBuybackPerGram === 0) {
      throw new Error('Gagal menemukan harga di halaman Pegadaian');
    }

    res.status(200).json({
      success: true,
      timestamp: new Date().toISOString(),
      pegadaian: { jualPerGram: hargaBuybackPerGram }
    });

  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}