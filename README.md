# AutoCarWat Web — Frontend Angular 22

Plateforme e-commerce de vente de **pièces détachées automobiles** au Cameroun (**FCFA**, paiement **Orange Money** & **MTN Mobile Money** avec vérification de référence/preuve par l'administrateur).

## Stack technique

- **Angular 22** (Standalone Components, Signals, `@if` / `@for`, `withComponentInputBinding`, intercepteurs fonctionnels)
- **Tailwind CSS v4** (`@tailwindcss/postcss`, thème clair/sombre piloté par `data-theme`)
- **Vitest** (`ng test`)

## Fonctionnalités

### Boutique Client (`/`)
- **Accueil (`/`)** : Sélecteur de véhicule (Marque / Modèle / Année) mémorisé dans le navigateur, navigation par catégories, pièces populaires et guide d'achat.
- **Catalogue (`/pieces`)** : Recherche plein texte (nom, réf., OEM), filtrage par véhicule compatible, catégorie, disponibilité en stock, tri et pagination.
- **Fiche pièce (`/pieces/:id`)** : Vérification automatique de compatibilité avec le véhicule du client, copie du numéro OEM, liste des véhicules compatibles, ajout au panier et achat immédiat.
- **Panier (`/panier`)** : Gestion des quantités bornée par le stock réel, jauge de livraison offerte dès `100 000 FCFA`, simulateur de frais de livraison par ville camerounaise.
- **Commande & Paiement Mobile Money (`/commande`)** : Coordonnées de livraison + instructions marchands **Orange Money** / **MTN MoMo**, envoi immédiat ou différé de la référence SMS et capture justificative.
- **Suivi de commandes (`/commandes`, `/commandes/:id`)** : Timeline en 5 étapes, soumission ou renvoi de preuve de paiement (en cas de rejet motivé par l'admin), annulation de commande.

### Espace Administration (`/admin`)
- **Tableau de bord (`/admin`)** : KPIs (chiffre d'affaires validé, paiements à vérifier, commandes, alertes stock faible), validation rapide des paiements Mobile Money et suivi des ruptures.
- **Paiements (`/admin/paiements`)** : Filtrage par opérateur/statut, aperçu des captures justificatives, validation en un clic ou rejet motivé.
- **Commandes (`/admin/commandes`)** : Détail des articles et adresses clients, pilotage des statuts (`paid`, `preparing`, `shipped`, `delivered`, `cancelled`).
- **Catalogue & Véhicules (`/admin/catalogue`)** : CRUD complet des pièces détachées (prix FCFA, stock, OEM, véhicules compatibles) et gestion de la base de véhicules.

## Développement local & Connexion API Laravel

```bash
npm install
npm start
```

- Par défaut, `proxy.conf.json` redirige `/api/*` vers `http://127.0.0.1:8000/api/*` (votre serveur `php artisan serve`).
- **Mode démo automatique** : Si le backend Laravel local n'est pas lancé, l'intercepteur bascule automatiquement sur une base locale persistée dans `localStorage` permettant de tester l'intégralité des parcours client et admin.

### Comptes de démonstration (mode démo)
| Rôle | E-mail | Mot de passe |
| --- | --- | --- |
| **Client** | `client@autocarwat.cm` | `Client123456` |
| **Administrateur** | `admin@autocarwat.cm` | `Admin123456` |

## Endpoints REST Laravel attendus

- **Auth** : `POST /api/login`, `POST /api/register`, `GET /api/me`, `POST /api/logout`
- **Catalogue public** : `GET /api/vehicles`, `GET /api/parts`, `GET /api/parts/{id}`
- **Commandes & Paiements client** : `GET /api/orders`, `POST /api/orders`, `GET /api/orders/{id}`, `POST /api/orders/{id}/cancel`, `POST /api/orders/{id}/payment`
- **Administration** :
  - `GET /api/admin/stats`
  - `GET /api/admin/payments`, `POST /api/admin/payments/{id}/approve`, `POST /api/admin/payments/{id}/reject`
  - `GET /api/admin/orders`, `PATCH /api/admin/orders/{id}/status`
  - `GET /api/admin/parts`, `POST /api/admin/parts`, `PUT /api/admin/parts/{id}`, `DELETE /api/admin/parts/{id}`
  - `POST /api/admin/vehicles`, `DELETE /api/admin/vehicles/{id}`

## Build & Tests

```bash
npm run build
npx ng test --watch=false
```
