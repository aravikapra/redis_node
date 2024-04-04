require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const Redis = require('ioredis');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 5001;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Pool untuk koneksi ke PostgreSQL
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: process.env.POSTGRES_PORT,
});

// Connect to Redis
const redisClient = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
});

app.get('/', (req, res) => {
  res.redirect('/list-mahasiswa');
});

app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/views/register.html');
});

app.get('/list-mahasiswa', (req, res) => {
  res.sendFile(__dirname + '/views/data.html');
})

// Rute untuk registrasi
app.post('/register', async (req, res) => {
  const { nama, alamat, email, no_hp } = req.body;
  try {
    // Simpan data ke PostgreSQL dalam transaksi
    await pool.query('BEGIN');
    const insertQuery = `
      INSERT INTO tb_mahasiswa (nama, alamat, email, no_hp)
      VALUES ($1, $2, $3, $4)
    `;
    await pool.query(insertQuery, [nama, alamat, email, no_hp]);
    await pool.query('COMMIT');
  
    // Simpan data ke Redis dengan kunci unik
    const redisKey = `mahasiswa:${uuidv4()}`; // Menggunakan uuidv4() untuk membuat UUID unik
    await redisClient.hmset(redisKey, 'nama', nama, 'email', email, 'alamat', alamat, 'no_hp', no_hp);
  
    res.status(201).send('Registrasi berhasil.');
  } catch (error) {
    console.error('Error saat registrasi:', error);
    await pool.query('ROLLBACK'); // Gulung transaksi jika terjadi kesalahan
    res.status(500).send('Terjadi kesalahan saat melakukan registrasi.');
  }
});

app.get('/user', async (req, res) => {
  try {
  const allKeys = await redisClient.keys('mahasiswa:*');

  if (allKeys.length === 0) {
      res.status(404).send('Data mahasiswa tidak ditemukan.');
      return;
  }

  const allUserData = [];

  for (const key of allKeys) {
      const userData = await redisClient.hgetall(key);
      allUserData.push(userData);
  }

  res.json(allUserData);
  
  } catch (error) {
      console.error('Error saat mengambil data mahasiswa dari Redis:', error);
      res.status(500).send('Terjadi kesalahan saat mengambil data mahasiswa dari Redis.');
  }
});

app.get('/user/name', async (req, res) => {
  const { nama } = req.params;
  try {
      // Mengambil data pengguna dari DragonFly
      const userData = await redisClient.hget("mahasiswa",'nama');

      if (userData) {
      res.json(userData);
      } else {
      res.status(404).send('Pengguna tidak ditemukan.');
      }
  } catch (error) {
      console.error('Error saat mengambil data pengguna dari Redis:', error);
      res.status(500).send('Terjadi kesalahan saat mengambil data pengguna dari Redis.');
  }
});
// Server berjalan
app.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
