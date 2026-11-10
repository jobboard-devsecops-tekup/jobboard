const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const config = require('../config');

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    // VULN-3 : mass assignment. Le rôle vient du corps de la requête (ex. "role":"admin").
    const role = req.body.role || 'candidat';
    if (!email || !password) return res.status(400).json({ error: 'email et password requis' });
    const hash = await bcrypt.hash(password, 10);
    const r = await db.query(
      'INSERT INTO users (email, password_hash, role) VALUES ($1,$2,$3) RETURNING id,email,role',
      [email, hash, role]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { next(e); }
});

// POST /api/auth/login  (aucune limitation de tentatives : brute force possible)
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const r = await db.query('SELECT * FROM users WHERE email=$1', [email]);
    const u = r.rows[0];
    if (!u || !u.active || !(await bcrypt.compare(password || '', u.password_hash)))
      return res.status(401).json({ error: 'Identifiants invalides' });
    const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, config.JWT_SECRET);
    res.json({ token });
  } catch (e) { next(e); }
});

module.exports = router;
