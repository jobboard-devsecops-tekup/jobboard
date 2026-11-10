const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');

// VULN-6 : upload sans filtre de type, sans limite de taille, nom d'origine conservé
const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, '..', 'uploads'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
  })
});

// POST /api/applications  (candidat)
router.post('/', auth, requireRole('candidat'), upload.single('cv'), async (req, res, next) => {
  try {
    const { job_id, cover_letter } = req.body;
    const cvPath = req.file ? req.file.path : null;
    const r = await db.query(
      'INSERT INTO applications (job_id,candidate_id,cover_letter,cv_path) VALUES ($1,$2,$3,$4) RETURNING id,job_id,status',
      [job_id, req.user.id, cover_letter, cvPath]
    );
    res.status(201).json(r.rows[0]);
  } catch (e) { next(e); }
});

// GET /api/applications/mine  (candidat)
router.get('/mine', auth, async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT a.id,a.status,a.created_at,j.title,j.company FROM applications a
       JOIN jobs j ON j.id=a.job_id WHERE a.candidate_id=$1 ORDER BY a.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch (e) { next(e); }
});

// GET /api/applications/received  (recruteur : ses offres ; admin : tout)
router.get('/received', auth, requireRole('recruteur', 'admin'), async (req, res, next) => {
  try {
    const base = `SELECT a.id,a.status,a.created_at,j.title,u.email AS candidate_email
                  FROM applications a JOIN jobs j ON j.id=a.job_id JOIN users u ON u.id=a.candidate_id`;
    const r = req.user.role === 'admin'
      ? await db.query(base + ' ORDER BY a.created_at DESC')
      : await db.query(base + ' WHERE j.recruiter_id=$1 ORDER BY a.created_at DESC', [req.user.id]);
    res.json(r.rows);
  } catch (e) { next(e); }
});

// GET /api/applications/:id
// VULN-2 : IDOR. Aucune vérification que la candidature appartient à l'utilisateur.
router.get('/:id', auth, async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT a.*,u.email AS candidate_email FROM applications a
       JOIN users u ON u.id=a.candidate_id WHERE a.id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Introuvable' });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;
