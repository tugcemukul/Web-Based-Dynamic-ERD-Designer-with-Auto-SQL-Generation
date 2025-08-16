const express = require('express');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, '../../public')));
app.use(express.static(path.join(__dirname, '../../public/js')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/loginRegister.html'));
});

// /homepage URL'sinde index.html dosyasını göster
app.get('/homepage', (req, res) => {
    res.sendFile(path.join(__dirname, '/views/index.html'));
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
