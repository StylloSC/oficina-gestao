const express = require('express');
const path = require('path');
const cors = require('cors');
const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Banco de dados em memória temporário (ou integrado)
let dbCredenciais = {
    'styllo': { senha: 'SSContabilidade1*', tipo: 'admin' }
};
let dbEmpresas = {};
let dbOs = [];

app.post('/api/login', (req, res) => {
    const { user, senha } = req.body;
    const u = user ? user.trim().toLowerCase() : '';
    if (dbCredenciais[u] && dbCredenciais[u].senha === senha) {
        res.json({ success: true, tipo: dbCredenciais[u].tipo, user: u });
    } else {
        res.status(401).json({ success: false, message: 'Usuário ou senha incorretos' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});