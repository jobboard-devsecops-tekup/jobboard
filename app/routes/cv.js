const router = require('express').Router();
const db = require('../db');
const { auth } = require('../middleware/auth');

// GET /api/cv/:id  (id = id de la candidature)
// VULN-2 : IDOR. N'importe quel utilisateur connecté peut télécharger le CV de n'importe qui.
router.get('/:id', auth, async (req, res, next) => {
  try {
    const r = await db.query('SELECT cv_path FROM applications WHERE id=$1', [req.params.id]);
    if (!r.rows[0] || !r.rows[0].cv_path) return res.status(404).json({ error: 'CV introuvable' });
    res.sendFile(r.rows[0].cv_path);
  } catch (e) { next(e); }
});

module.exports = router;
