# Govee Light Bar Segments

Pilotez une barre lumineuse Govee RGBIC depuis Gladys sur votre réseau local,
avec une couleur distincte pour chaque segment. Pas de compte Govee, pas de clé
d'API, pas de cloud.

## Ce que vous obtenez

Un appareil avec ces commandes :

- **Marche/arrêt**, **Luminosité**, **Couleur** (toute la barre) et
  **Température de couleur** ;
- une commande de couleur **Segment N** par segment de la barre.

## Installation

1. Dans l'application **Govee Home**, ouvrez les réglages de la barre lumineuse
   et activez le **contrôle LAN**.
2. Repérez l'adresse IP de la barre (votre routeur la liste) et donnez-lui une
   adresse fixe pour qu'elle ne change pas.
3. Dans l'onglet **Configuration** de cette intégration, saisissez l'adresse IP
   et le nombre de segments de votre barre, puis enregistrez.
4. Ouvrez l'onglet **Découverte** et ajoutez l'appareil.

## Scènes

L'action **Peindre un dégradé** dégrade les segments d'une couleur à une autre.
Les deux couleurs s'écrivent comme `#ff8800`.

## Bon à savoir

- La barre ne renvoie pas son état à Gladys : les commandes affichent ce que
  vous avez envoyé en dernier, pas ce que fait la barre si vous la changez
  depuis l'application Govee.
- Régler la couleur de toute la barre ou la température de couleur remplace
  les couleurs des segments.
- Testé sur le H6056 (barre Flow Plus). D'autres modèles RGBIC peuvent avoir un
  autre nombre de segments ou ignorer les commandes de segment.

## Dépannage

Si rien ne se passe, vérifiez que le contrôle LAN est activé, que l'adresse IP
est correcte et que la barre et Gladys sont sur le même réseau. L'intégration
journalise chaque commande ; lisez-les depuis l'interface de Gladys.
