const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
app.use(express.json({ limit: '15mb' }));
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Conexão com o Banco PostgreSQL do Render (pega da variável de ambiente ou usa a URL direta)
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Criar tabelas se não existirem
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
                ref VARCHAR(20),
                user_name VARCHAR(50),
                dados JSONB
            );
        `);
        
        // Criar usuário admin padrão se não existir
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

// Rota de Login
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});