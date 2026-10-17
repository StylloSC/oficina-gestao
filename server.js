const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function initDb() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS usuarios (
                user_name VARCHAR(50) PRIMARY KEY,
                senha VARCHAR(100) NOT NULL,
                tipo VARCHAR(20) NOT NULL
            );
            CREATE TABLE IF NOT EXISTS empresas (
                user_name VARCHAR(50) PRIMARY KEY,
                razao TEXT,
                cnpj VARCHAR(30),
                endereco TEXT,
                contato TEXT,
                logo TEXT
            );
            CREATE TABLE IF NOT EXISTS ordens_servico (
                id BIGINT PRIMARY KEY,
                user_name VARCHAR(50),
                dados JSONB
            );
        `);
        
        const adminCheck = await pool.query("SELECT * FROM usuarios WHERE user_name = 'styllo'");
        if (adminCheck.rows.length === 0) {
            await pool.query("INSERT INTO usuarios (user_name, senha, tipo) VALUES ('styllo', 'SSContabilidade1*', 'admin')");
        }
        console.log("Banco de dados conectado e tabelas prontas!");
    } catch (err) {
        console.error("Erro ao inicializar o banco de dados:", err);
    }
}
initDb();

app.post('/api/login', async (req, res) => {
    const { user, senha } = req.body;
    const u = user ? user.trim().toLowerCase() : '';
    try {
        const result = await pool.query("SELECT * FROM usuarios WHERE user_name = $1", [u]);
        if (result.rows.length > 0 && result.rows[0].senha === senha) {
            res.json({ success: true, tipo: result.rows[0].tipo, user: u });
        } else {
            res.status(401).json({ success: false, message: 'Usuário ou senha incorretos' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get('/api/admin/dados', async (req, res) => {
    try {
        const usersRes = await pool.query("SELECT user_name, senha, tipo FROM usuarios");
        const empRes = await pool.query("SELECT * FROM empresas");
        const osRes = await pool.query("SELECT * FROM ordens_servico");

        let credenciais = {};
        usersRes.rows.forEach(u => { credenciais[u.user_name] = { senha: u.senha, tipo: u.tipo }; });

        let empresas = {};
        empRes.rows.forEach(e => { empresas[e.user_name] = { razao: e.razao, cnpj: e.cnpj, endereco: e.endereco, contato: e.contato, logo: e.logo }; });

        let os = osRes.rows.map(o => o.dados);

        res.json({ credenciais, empresas, os });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/admin/oficina', async (req, res) => {
    const { user, senha, razao, cnpj, endereco, contato } = req.body;
    const u = user.trim().toLowerCase();
    try {
        await pool.query(
            "INSERT INTO usuarios (user_name, senha, tipo) VALUES ($1, $2, 'oficina') ON CONFLICT (user_name) DO UPDATE SET senha = $2",
            [u, senha]
        );
        await pool.query(
            "INSERT INTO empresas (user_name, razao, cnpj, endereco, contato, logo) VALUES ($1, $2, $3, $4, $5, '') ON CONFLICT (user_name) DO UPDATE SET razao = $2, cnpj = $3, endereco = $4, contato = $5",
            [u, razao, cnpj, endereco, contato]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.delete('/api/admin/oficina/:user', async (req, res) => {
    const { user } = req.params;
    try {
        await pool.query("DELETE FROM usuarios WHERE user_name = $1", [user]);
        await pool.query("DELETE FROM empresas WHERE user_name = $1", [user]);
        await pool.query("DELETE FROM ordens_servico WHERE user_name = $1", [user]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/os', async (req, res) => {
    const os = req.body;
    try {
        await pool.query(
            "INSERT INTO ordens_servico (id, user_name, dados) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET dados = $3",
            [os.id, os.user, JSON.stringify(os)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});