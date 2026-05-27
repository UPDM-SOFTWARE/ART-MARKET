const express = require('express');
const path = require('path');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

// Fijar headers de seguridad
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  next();
});

// Logger para depuración
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Ruta de prueba
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'OK', database: 'Connected' });
  } catch (err) {
    res.status(500).json({ status: 'Error', database: 'Disconnected', error: err.message });
  }
});

// --- MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Acceso denegado' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token inválido' });
    req.user = user;
    next();
  });
};

// --- AUTH ROUTES ---

// Register
app.post('/api/auth/register', async (req, res) => {
  const { username, password, full_name, email, whatsapp } = req.body;

  if (!whatsapp || !whatsapp.match(/^\+\d{10,15}$/)) {
    return res.status(400).json({ message: 'El número de teléfono (WhatsApp) es obligatorio y debe incluir el código de país (ej. +52...)' });
  }

  try {
    // Check if user exists
    const userCheck = await pool.query('SELECT * FROM artists WHERE username = $1', [username]);
    if (userCheck.rows.length > 0) {
      return res.status(400).json({ message: 'El usuario ya existe' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert artist
    const newArtist = await pool.query(
      'INSERT INTO artists (username, password, full_name, email, whatsapp) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, full_name, whatsapp',
      [username, hashedPassword, full_name, email, whatsapp]
    );

    const token = jwt.sign({ id: newArtist.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: newArtist.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    const artist = await pool.query('SELECT * FROM artists WHERE username = $1 OR email = $1', [username]);
    
    if (artist.rows.length === 0) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, artist.rows[0].password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ id: artist.rows[0].id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: artist.rows[0].id,
        username: artist.rows[0].username,
        full_name: artist.rows[0].full_name,
        bio: artist.rows[0].bio,
        avatar_url: artist.rows[0].avatar_url,
        email: artist.rows[0].email,
        whatsapp: artist.rows[0].whatsapp,
        instagram: artist.rows[0].instagram,
        twitter: artist.rows[0].twitter,
        facebook: artist.rows[0].facebook,
        tiktok: artist.rows[0].tiktok,
        personal_web: artist.rows[0].personal_web
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Update Profile
app.put('/api/auth/profile', authenticateToken, async (req, res) => {
  const { full_name, bio, whatsapp, instagram, twitter, facebook, tiktok, personal_web, avatar_url } = req.body;
  const artist_id = req.user.id;

  try {
    const updatedArtist = await pool.query(
      `UPDATE artists 
       SET full_name = $1, bio = $2, whatsapp = $3, instagram = $4, twitter = $5, facebook = $6, tiktok = $7, personal_web = $8, avatar_url = $9
       WHERE id = $10 
       RETURNING id, username, full_name, bio, avatar_url, email, whatsapp, instagram, twitter, facebook, tiktok, personal_web`,
      [full_name, bio, whatsapp, instagram, twitter, facebook, tiktok, personal_web, avatar_url, artist_id]
    );

    if (updatedArtist.rows.length === 0) {
      return res.status(404).json({ message: 'Artista no encontrado' });
    }

    res.json(updatedArtist.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al actualizar el perfil');
  }
});

// --- ART ROUTES ---

// Create Art Piece
app.post('/api/art', authenticateToken, async (req, res) => {
  const { title, description, price, status, category, main_image_url, extra_images, currency, dimensions, technique } = req.body;
  const artist_id = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const newArt = await client.query(
      'INSERT INTO art_pieces (artist_id, title, description, price, status, category, main_image_url, currency, dimensions, technique) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *',
      [artist_id, title, description, price, status, category, main_image_url, currency, dimensions, technique]
    );
    
    const art_id = newArt.rows[0].id;

    if (extra_images && Array.isArray(extra_images)) {
      for (let i = 0; i < extra_images.length; i++) {
        await client.query(
          'INSERT INTO art_images (art_piece_id, image_url, "order") VALUES ($1, $2, $3)',
          [art_id, extra_images[i], i]
        );
      }
    }

    await client.query('COMMIT');
    res.json(newArt.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send('Error al guardar la obra');
  } finally {
    client.release();
  }
});

// Get My Art Pieces
app.get('/api/art/my', authenticateToken, async (req, res) => {
  const artist_id = req.user.id;

  try {
    const artPieces = await pool.query(
      'SELECT * FROM art_pieces WHERE artist_id = $1 ORDER BY created_at DESC',
      [artist_id]
    );
    res.json(artPieces.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener las obras');
  }
});

// Update Art Piece
app.put('/api/art/:id', authenticateToken, async (req, res) => {
  const { title, description, price, status, category, main_image_url, extra_images, currency, dimensions, technique } = req.body;
  const art_id = req.params.id;
  const artist_id = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    // Verificar propiedad
    const artCheck = await client.query('SELECT * FROM art_pieces WHERE id = $1 AND artist_id = $2', [art_id, artist_id]);
    if (artCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(403).json({ message: 'No tienes permiso para editar esta obra' });
    }

    const updatedArt = await client.query(
      `UPDATE art_pieces 
       SET title = $1, description = $2, price = $3, status = $4, category = $5, main_image_url = $6, currency = $7, dimensions = $8, technique = $9
       WHERE id = $10 AND artist_id = $11
       RETURNING *`,
      [title, description, price, status, category, main_image_url || artCheck.rows[0].main_image_url, currency, dimensions, technique, art_id, artist_id]
    );

    if (extra_images && Array.isArray(extra_images)) {
      // Clear old extra images
      await client.query('DELETE FROM art_images WHERE art_piece_id = $1', [art_id]);
      
      // Insert new ones
      for (let i = 0; i < extra_images.length; i++) {
        await client.query(
          'INSERT INTO art_images (art_piece_id, image_url, "order") VALUES ($1, $2, $3)',
          [art_id, extra_images[i], i]
        );
      }
    }

    await client.query('COMMIT');
    res.json(updatedArt.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).send('Error al actualizar la obra');
  } finally {
    client.release();
  }
});

// Delete Art Piece
app.delete('/api/art/:id', authenticateToken, async (req, res) => {
  const art_id = req.params.id;
  const artist_id = req.user.id;

  try {
    const result = await pool.query('DELETE FROM art_pieces WHERE id = $1 AND artist_id = $2', [art_id, artist_id]);
    
    if (result.rowCount === 0) {
      return res.status(403).json({ message: 'No tienes permiso para eliminar esta obra o no existe' });
    }

    res.json({ message: 'Obra eliminada exitosamente' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al eliminar la obra');
  }
});

// Get Single Art Piece with Artist Info and Images
app.get('/api/art/:id', async (req, res) => {
  const art_id = req.params.id;

  try {
    const artResult = await pool.query(
      `SELECT ap.*, a.full_name as artist_name, a.avatar_url as artist_avatar, a.bio as artist_bio, 
              a.instagram, a.whatsapp, a.facebook, a.twitter, a.tiktok, a.personal_web
       FROM art_pieces ap
       JOIN artists a ON ap.artist_id = a.id
       WHERE ap.id = $1`,
      [art_id]
    );

    if (artResult.rows.length === 0) {
      return res.status(404).json({ message: 'Obra no encontrada' });
    }

    const imagesResult = await pool.query(
      'SELECT * FROM art_images WHERE art_piece_id = $1 ORDER BY "order" ASC',
      [art_id]
    );

    const artPiece = artResult.rows[0];
    artPiece.extra_images = imagesResult.rows;

    res.json(artPiece);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener los detalles de la obra');
  }
});

// Get Artist's Public Pieces
app.get('/api/art/artist/:id', async (req, res) => {
  try {
    const artPieces = await pool.query(
      'SELECT * FROM art_pieces WHERE artist_id = $1 ORDER BY created_at DESC',
      [req.params.id]
    );
    res.json(artPieces.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener las obras del artista');
  }
});

// Get All Art Pieces (Public Gallery)
app.get('/api/art', async (req, res) => {
  try {
    const artPieces = await pool.query(
      `SELECT ap.*, a.full_name as artist_name 
       FROM art_pieces ap 
       JOIN artists a ON ap.artist_id = a.id 
       ORDER BY ap.created_at DESC`
    );
    res.json(artPieces.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al obtener las obras');
  }
});

// Serve static files from the React app
app.use(express.static(path.join(__dirname, '../dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 5001;

// Verificar conexión a la base de datos antes de arrancar
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Error conectando a la base de datos:', err.stack);
  }
  console.log('✅ Conexión a la base de datos exitosa');
  release();
});

const server = app.listen(PORT, () => console.log(`🚀 Servidor corriendo en el puerto ${PORT}`));

// Evitar que el servidor se apague por errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception thrown:', err);
});
