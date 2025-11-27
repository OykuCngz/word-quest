Word Quest – Multiplayer English Vocabulary Game

Word Quest, A1–A2 seviyesindeki İngilizce kelimeleri çok oyunculu bir ortamda tahmin etmeyi sağlayan canlı bir kelime oyunudur.
Bir oyuncu Moderatör olarak oyunu yönetir, diğerleri telefon veya bilgisayarlarından katılır.

Bu repo, oyunun tam backend + frontend kaynak kodlarını içerir.
Özellikler

✔ Gerçek zamanlı çok oyunculu oyun
✔ Moderatör (host) paneli
✔ A1–A2 düzeyinde 1000 kelimelik liste
✔ Hız bonusu
✔ Harf ve kelime tahmini
✔ Can sistemi (3 can)
✔ Oyuncuların anlık skor takibi
✔ Oyun sonunda tam sıralama (Leaderboard)
✔ Mobil uyumlu UI
Proje Yapısı
Word-quest-multi/
│
├── public/
│   ├── host.html          → Moderatör paneli
│   ├── player.html        → Oyuncu ekranı
│   ├── style.css          → Genel tasarım
│   └── data/
│       └── words-a1-a2.json
│
├── server.js              → Node.js + Socket.IO gerçek zamanlı sunucu
├── package.json
└── README.md

Kurulum
Projeyi indir
git clone https://github.com/OykuCngz/word-quest.git
cd word-quest
Alternatif: GitHub → Code → Download ZIP

Bağımlılıkları yükle
npm install

Sunucuyu çalıştır
node server.js

Terminalde şu görünmeli:
Server running on http://localhost:3000

Nasıl Oynanır?
Moderatör Paneli (Admin)

Moderatör girişi:
http://localhost:3000/admin-login.html
Moderatör giriş şifresi:
695802

Moderatör burada:
Oda oluşturur.
Oyunu başlatır.
Yeni soruyu geçer.
Anlık skor tablosunu izler.

Oyuncu Ekranı
Oyuncular şu adresten katılır:
http://localhost:3000/player.html
Katılmak için:
Oda kodu
Kullanıcı adı
yeterlidir.
Mobil ve İnternet Uyumluluğu

Word Quest tamamen responsive’dir:
Telefon
Tablet
Laptop
hepsiyle çalışır.
