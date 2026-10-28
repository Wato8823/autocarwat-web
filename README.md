# AutoCarWat Web

Application Angular de vente de pièces automobiles au Cameroun, avec paiement Orange Money ou MTN Mobile Money en FCFA. Le frontend utilise le contrat de l'API Laravel fourni pour Autocarwat / Autowerwat.

## Parcours de paiement

1. Le client choisit **son opérateur** et saisit **son propre numéro Mobile Money** (9 chiffres commençant par 6, éventuellement précédés de `+237`). Il n'a pas à saisir les coordonnées de la boutique.
2. Le frontend crée la commande avec `POST /api/orders` et un corps `{ "items": [{ "part_id": 4, "quantity": 2 }] }`.
3. Il initie le paiement avec `POST /api/orders/{id}/payment` et `{ "provider": "orange" | "mtn", "phone": "..." }`. Le montant, le numéro de caisse, le code USSD et les instructions affichés viennent **exclusivement de la réponse de l'API** ; aucune coordonnée marchande n'est configurée dans le frontend.
4. Après le transfert sur son téléphone, le client saisit la référence reçue par SMS. Celle-ci est envoyée séparément à `POST /api/orders/{id}/payment/reference` avec `{ "transaction_reference": "..." }`.
5. La commande reste `awaiting_payment` jusqu'à la vérification manuelle par un administrateur (`POST /api/admin/payments/{payment}/confirm`). La référence envoyée ne signifie pas que le paiement est confirmé. Le code PIN ne doit jamais être saisi dans l'application.

Si l'initiation échoue après la création, le panier est vidé pour éviter de recréer la commande et l'utilisateur peut reprendre depuis son détail. Les instructions de paiement et l'indication d'envoi de référence sont conservées dans l'onglet courant pour faciliter la reprise, mais **le statut officiel est toujours celui de l'API**. Sur un autre appareil ou après perte de la session, une référence peut toujours être soumise depuis une commande `awaiting_payment`. Évitez de refaire un transfert déjà effectué.

## Fonctionnalités

- Catalogue paginé, recherche par nom/référence/OEM et filtre par véhicule compatible. Le sélecteur charge toutes les pages de véhicules.
- Panier local et commande : le montant affiché avant création est indicatif ; le stock et le total sont confirmés par le serveur.
- Suivi des commandes, reprise du paiement, soumission de référence et annulation lorsque l'API l'autorise.
- Administration : listes paginées de commandes et paiements, confirmation/rejet des paiements, transitions de statut autorisées, création/modification/suppression des pièces et synchronisation des véhicules compatibles.
- Le formulaire d'administration demande les **identifiants** de catégorie et de marque pour créer une pièce : le contrat fourni ne documente pas d'endpoint de liste de ces référentiels.

L'API documentée ne prévoit pas de champs d'adresse, de frais de livraison, de justificatif image ou de motif de rejet. Le frontend ne prétend donc pas enregistrer ces informations ni les ajouter au total. Les anciens filtres par nom de catégorie, tri et stock ainsi que la création/suppression de véhicules ne sont pas exposés non plus : leurs endpoints ou référentiels ne figurent pas dans la documentation. Ces fonctions pourront être ajoutées lorsque le backend les prendra en charge.

## Développement et connexion à Laravel

```bash
npm ci
npm start
```

L'application est servie sur le port `4200`. En développement, `proxy.conf.json` transmet `/api/*` et `/storage/*` au serveur Laravel local sur `127.0.0.1:8000`. Dans le navigateur, les requêtes restent relatives au domaine de l'application ; les URL d'images `localhost` renvoyées par Laravel sont réécrites vers `/storage/`.

En production, configurez votre reverse proxy pour transmettre `/api` et `/storage` à votre déploiement Laravel. Le serveur doit notamment configurer les numéros de caisse Mobile Money ; l'API peut renvoyer `503` si un moyen de paiement n'est pas configuré.

### Mode démonstration local, explicite

En développement uniquement, le bouton **Activer la démonstration** sur l'accueil utilise une base fictive dans le navigateur. Aucun transfert réel n'est effectué et aucun lien téléphonique n'est proposé. Les paniers, jetons et véhicules de démonstration sont séparés de ceux de l'API réelle. Le changement de mode efface la session et le panier courants. Pour revenir à l'API, utilisez **Réessayer l'API** dans le bandeau.

| Rôle | E-mail | Mot de passe |
| --- | --- | --- |
| Client démo | `client@autocarwat.cm` | `Client123456` |
| Administrateur démo | `admin@autocarwat.cm` | `Admin123456` |

Le mode démo est désactivé en production et **ne s'active jamais automatiquement** en cas de panne réseau ou de réponse `503` : une erreur réelle de paiement ne doit pas être présentée comme une transaction simulée réussie.

## Routes API utilisées

- Authentification : `POST /api/register`, `POST /api/login`, `GET /api/me`, `POST /api/logout`.
- Catalogue : `GET /api/parts`, `GET /api/parts/{id}`, `GET /api/vehicles`.
- Client : `GET /api/orders`, `POST /api/orders`, `GET /api/orders/{id}`, `POST /api/orders/{id}/cancel`, `POST /api/orders/{id}/payment`, `POST /api/orders/{id}/payment/reference`.
- Administration : `GET /api/admin/orders`, `PATCH /api/admin/orders/{id}/status`, `GET /api/admin/payments`, `POST /api/admin/payments/{id}/confirm`, `POST /api/admin/payments/{id}/reject`, `POST /api/admin/parts`, `PUT /api/admin/parts/{id}`, `PUT /api/admin/parts/{id}/vehicles`, `DELETE /api/admin/parts/{id}`.

## Vérifications

```bash
npm run build
npx ng test --watch=false
```

Les tests couvrent notamment les contrats HTTP, la validation des numéros, la pagination, les erreurs de paiement, la reprise d'une commande et la confirmation manuelle en mode démo.
