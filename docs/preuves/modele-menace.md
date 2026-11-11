# Modèle de menace — JobBoard (méthode STRIDE)

| Catégorie STRIDE | Signification | Menace sur JobBoard | Faille liée |
|---|---|---|---|
| **S**poofing (usurpation d'identité) | Se faire passer pour quelqu'un d'autre | Un attaquant s'inscrit avec un rôle admin et usurpe les privilèges d'un administrateur | VULN-3 |
| **T**ampering (altération) | Modifier des données sans autorisation | Un attaquant modifie la requête de recherche pour injecter du SQL et altérer les résultats renvoyés | VULN-1 |
| **R**epudiation (répudiation) | Nier avoir fait une action, faute de traçabilité | Les actions sensibles (désactivation d'un compte, modification d'une candidature) ne sont pas journalisées : impossible de prouver qui a fait quoi | VULN-7 |
| **I**nformation disclosure (divulgation d'information) | Accès à des données qu'on ne devrait pas voir | Un utilisateur lit le CV et la candidature de quelqu'un d'autre en devinant un numéro | VULN-2 |
| **D**enial of service (déni de service) | Rendre le service indisponible | Upload de fichiers sans limite de taille ni de type : un attaquant peut saturer le disque du serveur | VULN-6 |
| **E**levation of privilege (élévation de privilège) | Obtenir plus de droits que prévu | Un candidat désactive un compte admin via une route censée être réservée aux admins | VULN-7 |

## Biens à protéger
- Données personnelles des candidats (CV, lettres de motivation)
- Identifiants et mots de passe (hashés) des utilisateurs
- Intégrité des offres et des candidatures
- Disponibilité du service

## Acteurs malveillants envisagés
- Visiteur anonyme non authentifié
- Candidat authentifié cherchant à accéder aux données d'un autre
- Recruteur authentifié cherchant à accéder aux données d'un autre recruteur ou à des droits admin
