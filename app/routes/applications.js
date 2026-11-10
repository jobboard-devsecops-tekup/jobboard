const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');

const STATUTS = ['Nouvelle', 'En cours de sélection', 'Entretien demandé', 'Admis', 'Refusé', 'Informations manquantes'];

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

// GET /api/applications/mine  (candidat) : statut + message du recruteur
router.get('/mine', auth, requireRole('candidat'), async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT a.id,a.status,a.recruiter_message,a.created_at,j.title,j.company FROM applications a
       JOIN jobs j ON j.id=a.job_id WHERE a.candidate_id=$1 ORDER BY a.created_at DESC`, [req.user.id]);
    res.json(r.rows);
  } catch (e) { next(e); }
});

// GET /api/applications/received  (recruteur : ses offres ; admin : tout)
router.get('/received', auth, requireRole('recruteur', 'admin'), async (req, res, next) => {
  try {
    const base = `SELECT a.id,a.status,a.recruiter_message,a.created_at,j.title,u.email AS candidate_email
                  FROM applications a JOIN jobs j ON j.id=a.job_id JOIN users u ON u.id=a.candidate_id`;
    const r = req.user.role === 'admin'
      ? await db.query(base + ' ORDER BY a.created_at DESC')
      : await db.query(base + ' WHERE j.recruiter_id=$1 ORDER BY a.created_at DESC', [req.user.id]);
    res.json(r.rows);
  } catch (e) { next(e); }
});

// PATCH /api/applications/:id/status  (recruteur propriétaire de l'offre, ou admin)
router.patch('/:id/status', auth, requireRole('recruteur', 'admin'), async (req, res, next) => {
  try {
    const { status, message } = req.body;
    if (!STATUTS.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
    if (message != null && typeof message !== 'string')
      return res.status(400).json({ error: 'Message invalide' });
    const a = await db.query(
      'SELECT j.recruiter_id FROM applications a JOIN jobs j ON j.id=a.job_id WHERE a.id=$1', [req.params.id]);
    if (!a.rows[0]) return res.status(404).json({ error: 'Introuvable' });
    if (req.user.role !== 'admin' && a.rows[0].recruiter_id !== req.user.id)
      return res.status(403).json({ error: 'Accès interdit' });
    const r = await db.query(
      'UPDATE applications SET status=$1, recruiter_message=$2 WHERE id=$3 RETURNING id,status,recruiter_message',
      [status, message || null, req.params.id]);
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

// GET /api/applications/:id  (profil du candidat : e-mail, lettre, offre, statut)
// VULN-2 : IDOR. Aucune vérification que la candidature appartient à l'utilisateur.
router.get('/:id', auth, async (req, res, next) => {
  try {
    const r = await db.query(
      `SELECT a.*,u.email AS candidate_email,j.title,j.company FROM applications a
       JOIN users u ON u.id=a.candidate_id JOIN jobs j ON j.id=a.job_id WHERE a.id=$1`, [req.params.id]);
    if (!r.rows[0]) return res.status(404).json({ error: 'Introuvable' });
    res.json(r.rows[0]);
  } catch (e) { next(e); }
});

module.exports = router;