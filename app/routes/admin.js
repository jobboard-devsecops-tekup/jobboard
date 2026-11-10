const router = require('express').Router();
const db = require('../db');
const { auth, requireRole } = require('../middleware/auth');

router.get('/users', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const r = await db.query('SELECT id,email,role,active,created_at FROM users ORDER BY id');
    res.json(r.rows);
  } catch (e) { next(e); }
});

router.get('/stats', auth, requireRole('admin'), async (req, res, next) => {
  try {
    const q = t => db.query(`SELECT COUNT(*)::int AS n FROM ${t}`);
    const [u, j, a] = await Promise.all([q('users'), q('jobs'), q('applications')]);
    res.json({ users: u.rows[0].n, jobs: j.rows[0].n, applications: a.rows[0].n });
  } catch (e) { next(e); }
});

// VULN-7 : contrôle d'accès défaillant. requireRole('admin') est oublié ici :
// tout utilisateur connecté peut désactiver n'importe quel compte.
router.patch('/users/:id/deactivate', auth, async (req, res, next) => {
  try {
    await db.query('UPDATE users SET active=FALSE WHERE id=$1', [req.params.id]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
