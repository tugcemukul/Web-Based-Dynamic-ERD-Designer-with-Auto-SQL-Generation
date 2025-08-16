// .env dosyasındaki çevresel değişkenleri uygulamaya yükler
require('dotenv').config();

// Gerekli modülleri import ediyoruz
const express = require('express'); // Express.js, Node.js için hızlı bir web çerçevesidir
const bodyParser = require('body-parser'); // HTTP isteklerinin gövdesini ayrıştırmak için kullanılır
const bcrypt = require('bcrypt'); // Şifre hashleme ve doğrulama için kullanılır
const jwt = require('jsonwebtoken'); // JSON Web Token (JWT) oluşturma ve doğrulama için kullanılır
const { Pool } = require('pg'); // PostgreSQL bağlantısı için kullanılan kütüphane
const cors = require('cors'); // CORS (Cross-Origin Resource Sharing) işlemlerini yönetmek için

// Express uygulamasını başlatıyoruz
const app = express();

// CORS ayarları
const corsOptions = {
    origin: 'http://localhost:3000', // API'ye hangi adreslerin erişebileceğini belirtir
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // API'nin izin verdiği HTTP yöntemleri
    credentials: true // Çerezlerin kullanılmasını sağlar
};
app.use(cors(corsOptions)); // CORS middleware'i uygulamaya ekleniyor

// JSON formatındaki istek gövdelerini ayrıştırmak için middleware ekleniyor
app.use(express.json());
app.use(bodyParser.json()); // bodyParser, JSON formatını ayrıştırır

// PostgreSQL veritabanı bağlantısını yönetmek için bir havuz oluşturuyoruz
const pool = new Pool({
    user: process.env.DB_USER, // Veritabanı kullanıcı adı
    host: process.env.DB_HOST, // Veritabanı sunucusu adresi
    database: process.env.DB_NAME, // Veritabanı adı
    password: process.env.DB_PASS, // Veritabanı şifresi
    port: process.env.DB_PORT // Veritabanı bağlantı portu
});

// Sunucuyu belirli bir portta başlatıyoruz
const PORT = process.env.PORT || 5007; // Port numarası .env dosyasından alınır veya varsayılan olarak 5007 kullanılır
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`); // Sunucunun hangi adreste çalıştığını konsola yazdırır
});

// Kullanıcı Kaydı Endpoint'i
app.post('/api/register', async (req, res) => {
    // Kullanıcıdan gelen bilgileri ayrıştırıyoruz
    const { username, email, password } = req.body;

    try {
        // Şifreyi hashliyoruz (10 iterasyon ile güvenli bir şekilde)
        const passwordHash = await bcrypt.hash(password, 10);

        // Kullanıcıyı veritabanına ekliyoruz ve sadece id ile username alanlarını döndürüyoruz
        const result = await pool.query(
            'INSERT INTO public."users" (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username',
            [username, email, passwordHash]
        );

        // Başarılı işlem durumunda kullanıcı bilgilerini döndür
        res.status(201).json({ user: result.rows[0] });
    } catch (error) {
        // Hata durumunda istemciye hata mesajı gönder
        res.status(400).json({ error: error.message });
    }
});

// Kullanıcı Girişi Endpoint'i
app.post('/api/login', async (req, res) => {
    const { email, password } = req.body; // İstek gövdesinden e-posta ve şifre bilgilerini al

    try {
        // Veritabanında kullanıcıyı e-posta ile ara
        const result = await pool.query('SELECT * FROM public."users" WHERE email = $1', [email]);

        // Kullanıcı bulunamazsa hata mesajı döndür
        if (result.rows.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

        const user = result.rows[0]; // Bulunan kullanıcı bilgilerini al

        // Kullanıcının gönderdiği şifreyi hashlenmiş şifre ile karşılaştır
        const isValidPassword = await bcrypt.compare(password, user.password_hash);

        // Şifre yanlışsa hata mesajı döndür
        if (!isValidPassword) return res.status(400).json({ error: 'Invalid credentials' });

        // Şifre doğruysa bir JWT token oluştur TOKEN İÇİNE USER ID GÖMÜYORUZ Kİ KULLANICI SADECE KENDİ DİYAGRAMLARINI LİSTEDE GÖRSÜN
        const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Token'ı istemciye gönder
        res.json({ token });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Kullanıcıya Ait Diyagramları Listeleme Endpoint'i
app.get('/api/diagrams', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; // Authorization başlığından JWT token al

    // Token eksikse "Unauthorized" hatası döndür
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Token doğrula ve kullanıcı kimliğini al
        const { userId } = jwt.verify(token, process.env.JWT_SECRET); //KULLANICININ SADECE KENDİ DİYAGRAMLARINA ERİŞEBİLMESİ İÇİN YAPIYORUZ

        // Kullanıcının diyagramlarını sorgula ve oluşturulma tarihine göre sırala
        const result = await pool.query('SELECT * FROM public."diagrams" WHERE user_id = $1 ORDER BY created_at DESC', [userId]);

        // Diyagramları döndür
        res.json(result.rows);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Diyagram Kaydetme veya Güncelleme Endpoint'i
app.post('/api/diagrams', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; // Authorization başlığından JWT token al

    // Token eksikse "Unauthorized" hatası döndür
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Token doğrula ve kullanıcı kimliğini al
        const { userId } = jwt.verify(token, process.env.JWT_SECRET);
        const { name, content } = req.body; // Diyagram ismi ve içeriğini isteğin gövdesinden al

        // Aynı isimde bir diyagram olup olmadığını kontrol et
        const existingDiagram = await pool.query(
            'SELECT id FROM public."diagrams" WHERE user_id = $1 AND name = $2',
            [userId, name]
        );

        if (existingDiagram.rows.length > 0) {
            // Eğer diyagram varsa, güncelle
            const updatedDiagram = await pool.query(
                'UPDATE public."diagrams" SET content = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, updated_at',
                [content, existingDiagram.rows[0].id]
            );

            return res.status(200).json(updatedDiagram.rows[0]);
        } else {
            // Eğer diyagram yoksa, yeni bir diyagram oluştur
            const newDiagram = await pool.query(
                'INSERT INTO public."diagrams" (user_id, name, content) VALUES ($1, $2, $3) RETURNING id, name, created_at',
                [userId, name, content]
            );

            return res.status(201).json(newDiagram.rows[0]);
        }
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Belirli Bir Diyagramı Yükleme Endpoint'i
app.get('/api/diagrams/:id', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; // Authorization başlığından JWT token al

    // Token eksikse "Unauthorized" hatası döndür
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Token doğrula ve kullanıcı kimliğini al
        const { userId } = jwt.verify(token, process.env.JWT_SECRET);
        const diagramId = req.params.id; // Diyagram ID'si URL parametresinden alınır

        // Kullanıcının belirli bir diyagramını sorgula
        const result = await pool.query('SELECT * FROM public."diagrams" WHERE id = $1 AND user_id = $2', [diagramId, userId]);

        // Diyagram bulunamazsa "Not Found" hatası döndür
        if (result.rows.length === 0) return res.status(404).json({ error: 'Diagram not found' });

        // Diyagramı döndür
        res.json(result.rows[0]);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});


// Diyagram Silme Endpoint'i
app.delete('/api/diagrams/:id', async (req, res) => {
    const token = req.headers.authorization?.split(' ')[1]; // Authorization başlığından JWT token al

    // Token eksikse "Unauthorized" hatası döndür
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Token doğrula ve kullanıcı kimliğini al
        const { userId } = jwt.verify(token, process.env.JWT_SECRET);
        const { id } = req.params; // Silinecek diyagramın ID'sini URL parametrelerinden al

        // Diyagramın mevcut olup olmadığını kontrol et ve kullanıcıya ait olduğunu doğrula
        const existingDiagram = await pool.query(
            'SELECT id FROM public."diagrams" WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        if (existingDiagram.rows.length === 0) {
            return res.status(404).json({ error: 'Diagram not found or not authorized to delete' });
        }

        // Diyagramı sil
        await pool.query(
            'DELETE FROM public."diagrams" WHERE id = $1 AND user_id = $2',
            [id, userId]
        );

        res.status(200).json({ message: 'Diagram deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});
