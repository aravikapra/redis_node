// require('dotenv').config()

// const Redis = require('ioredis');

// const redisDemo = async () => {
//   // Connect to Redis at 127.0.0.1, port 6379.
//   const redisClient = new Redis({
//     host: process.env.REDIS_HOST,
//     port: process.env.REDIS_PORT,
//   });

//   // Set key "myname" to have value "Simon Prickett".
//   await redisClient.set('myname', 'Simon Prickett');

//   // Get the value held at key "myname" and log it.
//   const value = await redisClient.get('myname');
//   console.log(value);

//   // Disconnect from Redis.
//   redisClient.quit();
// };

// redisDemo();

require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const Redis = require('ioredis');

const app = express();
const port = 3000;

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

app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/views/register.html');
});
// Rute untuk registrasi
app.post('/register', async (req, res) => {
  const { nama,alamat, email, no_hp } = req.body;

  try {
    // Simpan data ke PostgreSQL
    const query = `
      INSERT INTO tb_mahasiswa (nama, alamat, email, no_hp)
      VALUES ($1, $2, $3, $4)
    `;
    await pool.query(query, [nama,alamat, email, no_hp]);

    // Simpan data ke Redis
    //await redisClient.set(nama, JSON.stringify({ email, no_hp }));
    await redisClient.hmset("mahasiswa",'nama',nama, 'email', email, 'alamat', alamat, 'no_hp', no_hp)

    res.status(201).send('Registrasi berhasil.');
  } catch (error) {
    console.error('Error saat registrasi:', error);
    res.status(500).send('Terjadi kesalahan saat melakukan registrasi.');
  }
});

app.get('/user', async (req, res) => {
  const { nama } = req.params;

  try {
    // Mengambil data pengguna dari Redis
    const userData = await redisClient.hgetall("mahasiswa");

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

app.get('/user/name', async (req, res) => {
  const { nama } = req.params;

  try {
    // Mengambil data pengguna dari Redis
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
