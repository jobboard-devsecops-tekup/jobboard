// Crée 3 comptes de test et 3 offres. Usage : npm run seed
const bcrypt = require('bcryptjs');
const db = require('../db');

(async () => {
  const users = [
    ['admin@jobboard.test', 'Admin123!', 'admin'],
    ['recruteur@jobboard.test', 'Recruiter123!', 'recruteur'],
    ['candidat@jobboard.test', 'Candidate123!', 'candidat']
  ];
  for (const [email, pwd, role] of users) {
    await db.query(
      'INSERT INTO users (email,password_hash,role) VALUES ($1,$2,$3) ON CONFLICT (email) DO NOTHING',
      [email, await bcrypt.hash(pwd, 10), role]);
  }
  const rec = (await db.query("SELECT id FROM users WHERE email='recruteur@jobboard.test'")).rows[0].id;
  const jobs = [
    ['Développeur Node.js', 'Acme Tunisie', 'Tunis', 'CDI', 'Développement d\'API REST en Node.js et PostgreSQL.'],
    ['Ingénieur DevOps', 'CloudCo', 'Sfax', 'CDI', 'CI/CD, conteneurs et Kubernetes.'],
    ['Stage Cybersécurité', 'SecureIT', 'Tunis', 'Stage', 'Tests d\'intrusion et sécurité applicative.']
  ];
  for (const j of jobs)
    await db.query('INSERT INTO jobs (title,company,city,contract,description,recruiter_id) VALUES ($1,$2,$3,$4,$5,$6)', [...j, rec]);
  console.log('Seed terminé.');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
