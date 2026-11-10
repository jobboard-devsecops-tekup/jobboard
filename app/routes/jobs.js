const router = require('express').Router();
const _ = require('lodash');
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');

// GET /api/jobs?q=...
router.get('/', async (req, res, next) => {
  try {
    const q = _.trim(req.query.q || '');
    // VULN-1 : injection SQL (requête construite par concaténation)
    const sql = `SELECT id,title,company,city,contract,created_at FROM jobs
                 WHERE title ILIKE '%${q}%' OR description ILIKE '%${q}%'
                 ORDER BY created_at DESC`;
    const r = await db.query(sql);
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const r = await db.query('SELECT * FROM jobs WHERE id=$1', [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Offre introuvable' });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

// POST /api/jobs (recruteur ou admin). VULN-6 : description non assainie (XSS stocké côté client)
router.post('/', auth, requireRole('recruteur', 'admin'), async (req, res, next) => {
  try {
    const { title, company, city, contract, description } = req.body;
    const r = await db.query(
      'INSERT INTO jobs (title,company,city,contract,description,recruiter_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
      [title, company, city, contract, description, req.user.id]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
