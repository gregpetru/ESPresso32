# ESPresso32 ☕️

<div align="center">

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg?cacheSeconds=2592000)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Node](https://img.shields.io/badge/Node.js-43853D?style=flat&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-404D59?style=flat)
![SQLite](https://img.shields.io/badge/SQLite-07405E?style=flat&logo=sqlite&logoColor=white)

**Trasforma la tua macchina del caffè in un sistema smart con controllo RFID** 

[Panoramica](#panoramica) • 
[Come Iniziare](#come-iniziare) • 
[Documentazione](#documentazione)

</div>

## Cos'è ESPresso32? 

È un sistema smart che trasforma una normale macchina del caffè in un distributore intelligente usando un ESP32 e la tecnologia RFID. Immaginalo come un sistema di "caffè card" fatto in casa 🎯

**Funzionalità**:
- Tenere traccia di chi beve quanto caffè ☕️
- Gestire gli accessi alla macchinetta del caffè in modo intelligente 🔐
- Vedere statistiche in tempo reale sui consumi ⚡️
- Tutto questo con un'interfaccia web moderna e responsive! 💻

## Come Funziona? 🤔

# Coffee Flow™

Un sistema innovativo per gestire l'accesso alla macchina del caffè tramite tecnologia RFID.

## 🎯 Overview

Coffee Flow™ è un sistema intelligente che permette di:
- Controllare gli accessi alla macchina del caffè
- Monitorare il consumo di caffè per utente
- Gestire le autorizzazioni in modo sicuro

## ⚙️ Come Funziona

### Il Processo del Caffè (Coffee Flow™)

#### 1. Autenticazione 🔑
- Avvicina il tuo badge RFID alla macchina
- Il sistema legge il tag e verifica la tua identità
- Un LED ti indica subito lo stato dell'operazione

#### 2. Elaborazione ⚡
- Generazione sicura dell'identificativo
- Comunicazione crittografata con il server
- Verifica immediata delle autorizzazioni

#### 3. Risultato ✨

**Utente autorizzato:**
- Attivazione della macchina ✅
- Registrazione dell'erogazione 📊
- LED verde di conferma 💚
- Preparazione del caffè ☕

**Utente non autorizzato:**
- Macchina non operativa ⛔
- LED rosso lampeggiante 🚫
- Registrazione del tentativo 📝

## 🔒 Sicurezza

Il sistema utilizza:
- Comunicazione HTTPS
- Hashing sicuro dei tag RFID
- Logging di tutti i tentativi di accesso

## 📱 Interfaccia

- LED multicolore per feedback immediato
- Sistema intuitivo "tap and go"
- Nessuna configurazione richiesta da parte dell'utente

## 🛠️ Tecnologie Utilizzate

- ESP32 per il controllo hardware
- RFID reader
- Server sicuro per l'autenticazione
- Sistema di logging avanzato

### Modalità Speciali 🌟

1. **Modalità Sync** 🔄
   - Per aggiungere nuovi tag
   - Cliccando nella pagina di admin l'apposito pulsante per la sincronizzazione
   - Perfetta per configurare nuovi utenti

2. **Modalità Admin** 👑
   - Dashboard web completa
   - Gestione utenti 

## La Parte Tecnica  🛠

### Hardware Necessario

1. **Il Cervello** 🧠
   - ESP32 DevKit
   - Flash memory per il firmware
   - WiFi integrato per la connettività

2. **Gli Occhi** 👀
   - Lettore RFID RDM6300 (125KHz)
   - Range di lettura ottimale: 3-5cm

3. **I Muscoli** 💪
   - Relè 5V per controllare la macchina
   - Può gestire carichi fino a 10A

4. **Le Luci** 💡
   - LED RGB (comune catodo)
   - 3x resistenze 220Ω
   - Effetti luminosi personalizzabili

5. **Il Cuore** ❤️
   - Alimentatore 5V/2A
   - Protezione da sovratensioni

### Schema Collegamenti

```
ESP32 Pin   |  Componente
------------|-------------
GPIO16 (RX) |  RDM6300 TX
GPIO17 (TX) |  RDM6300 RX
GPIO18      |  Relè IN
GPIO19      |  LED R
GPIO20      |  LED G
GPIO21      |  LED B
GND         |  GND comune
5V          |  VCC componenti
```

### Software Stack 📚

1. **Backend** 🏢
   - Node.js + Express 
   - API RESTful 
   - SQLite per i dati 
   - Redis per le sessioni (veloce come un caffè espresso)

2. **Frontend** 🎨
   - HTML5 + CSS3
   - Design responsive
   - Dark mode 

3. **Firmware ESP32** ⚡️
   - Arduino framework
   - Watchdog timer 
   - Power management

## Database Schema 📊

```sql
-- La tabella principale per i tag RFID
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_id TEXT UNIQUE NOT NULL,     -- ID univoco del tag
    tag_hash TEXT,                   -- Hash per sicurezza
    description TEXT,                -- Chi sei?
    authorized BOOLEAN DEFAULT true, -- Puoi bere caffè?
    last_used DATETIME,             -- Ultimo caffè
    coffee_count INTEGER DEFAULT 0,  -- Quanti ne hai bevuti?
    created_at DATETIME DEFAULT datetime('now','localtime')
);
```

## API Endpoints 🔌

### Per l'ESP32
- `GET /api/check-rfid`: Verifica autorizzazione
- `POST /api/increment-coffee`: Aggiorna contatore

### Per l'Admin
- `GET /api/tags`: Lista tag
- `POST /api/tags`: Nuovo tag
- `PUT /api/tags/:id/authorize`: Gestione permessi
- `DELETE /api/tags/:id`: Rimozione tag
- `GET /api/stats`: Statistiche 

## Sicurezza  🔒

1. **Crittografia** 🔐
   - HTTPS per tutte le comunicazioni
   - Certificati SSL/TLS
   - Hash dei tag RFID

2. **Autenticazione** 👤
   - Session based con Redis
   - Timeout automatico
   - Protezione CSRF

3. **Validazione** ✅
   - Sanitizzazione input
   - Rate limiting
   - IP whitelisting per ESP32

## Funzionalità Extra 🌈

1. **Statistiche Avanzate** 📊
   - Grafici di consumo
   - Ore di punta
   - Previsioni (basate su ML, perché no?)

2. **Notifiche** 📱
   - Promemoria pulizia


## Come Iniziare 🚀

1. **Setup Hardware**
   ```bash
   # Collega tutto secondo lo schema
   
   ```

2. **Setup Software**
   ```bash
   git clone [https://github.com/tuouser/espresso32](https://github.com/gregpetru/ESPresso32.git)
   cd espresso32
   npm install
   # Fatti un caffè mentre installa
   ```

3. **Configurazione**
   ```bash
   cp .env.example .env
   # Modifica le variabili d'ambiente
   nano .env
   ```

4. **Avvio**
   ```bash
   npm start
   # Profit! ☕️
   ```

## Troubleshooting 🔧

1. Attendere almeno 2 minuti alla prima accensione



## Licenza 📜

Questo progetto è rilasciato sotto [Licenza MIT](LICENSE)  - usalo come vuoi, ma offri un caffè a chi lo ha creato! 😉

## Collaboratori
 - Andrea Iannoli - https://github.com/AndreaIannoli/PollDB
 - Mario Sabatini - https://github.com/MarioSabatini


<div align=center>
Made with ❤️ and way too much ☕️
</div>

