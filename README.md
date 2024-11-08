# Caffe-adm

## Architettura
Il sistema consiste di due componenti principali:
 * lettore di badge
 * server

### Lettore di badge
Il lettore di badge è composto di una scheda ESP32, lettore di RFID a bassa frequenza e due relé. 
Quando un utente passa il badge sopra il lettore, il badge viene letto per ottenere l'ID. L'ID viene hashato con MD5 e comunicato al server. In base alla risposta del server, i relé vengono sbloccati oppure no.
I due relé comandano rispettivamente l'alimentazione della macchina da caffé e il pulsante di erogazione. All'arrivo dell'autorizzazione, vengono aperti entrambi. Una volta erogato il caffé, viene bloccato il secondo, una volta trascorsi 5 minuti senza erogazione di caffé anche il primo viene chiuso.

### Server
Il server offre diversi servizi: controllo dell'autorizzazione, autenticazione alla piattaforma di caricamento crediti e piattaforma di caricamento crediti.

Quando l'ESP32 comunica un hash al server, il server controlla che l'hash sia in database (associato ad un utente). Se questo è il caso risponde positivamente alla scheda di controllo e aumenta il contatore dei caffé relativo all'utente. 
*...continua*