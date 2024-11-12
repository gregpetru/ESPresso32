# ESPresso32 ☕️
# RFID Coffee Machine  ☕💳

Un'applicazione per la gestione di una **macchina del caffè** controllata tramite **tag RFID**. Gli utenti possono utilizzare un tag RFID per accedere alla macchina e incrementare il conteggio dei caffè consumati. 🛠️

## Descrizione 🌟

Questo progetto consente a un sistema basato su **RFID** di gestire l'accesso e il conteggio dei caffè consumati tramite un **tag RFID** unico per ogni utente. Le funzionalità principali includono:

- **Verifica del Tag RFID**: il sistema verifica se un tag RFID è autorizzato e restituisce il numero di caffè consumati dall'utente. ✅
- **Incremento del Conteggio Caffè**: consente di incrementare il conteggio dei caffè consumati per un determinato tag RFID. ⬆️☕
- **Modalità Sincronizzazione**: se il sistema è in modalità sincronizzazione, i tag non autorizzati vengono messi in attesa. ⏳

## Funzionalità 🚀

### 1. **Verifica RFID (`check_rfid`)** 🕵️‍♂️
Questa funzione accetta un tag RFID e verifica se il tag è autorizzato. Se il tag è autorizzato, restituisce il numero di caffè consumati. Se il tag non è autorizzato, la risposta dipende dalla modalità del sistema (sincronizzazione o meno).

### 2. **Incremento Conteggio Caffè (`increment_coffe`)** 🍵
Questa funzione incrementa il numero di caffè consumati per un tag RFID specifico. Se il tag è valido, il conteggio verrà aggiornato nel database.

---

## Struttura del Progetto 🗂️

Il progetto è organizzato come segue:

  ├── server.js # File principale del server 💻 

  ├── utils.js # Funzioni di utilità 🛠️ 

  └── README.md # Questo file 📄


- **server.js**: Gestisce le richieste HTTP e interagisce con il database SQLite per verificare e aggiornare i dati. 🖥️
- **utils.js**: Contiene funzioni di utilità come la gestione dei log e l'interazione con il database. 🔧

---

## Installazione 🛠️

1. **Clona il repository**:

```bash
git clone https://github.com/gregpetru/ESPresso32
cd ESPresso32
```

Installa le dipendenze:
```bash
npm install
```
Configura il database. Se stai usando SQLite, assicurati che il file del database (database.db) sia presente o configurato correttamente. 📂

Avvia il server:

```bash
npm start
```
Il server sarà in esecuzione su http://localhost:3000. 🌐

## API Endpoints 🛠️
### 1. **GET /check-rfid** 🔍
Verifica l'autorizzazione di un tag RFID.

- **Query Parameters:**

    - **taghash**: Il codice hash del tag RFID. 🏷️
    - **tag**: Il tag RFID. 💳

- **Risposta**:

    - **status**: 'authorized': Se il tag è autorizzato. ✅
    - **status**: 'denied': Se il tag non è autorizzato. ❌
    - **status**: 'sync': Se il sistema è in modalità sincronizzazione. ⏳
    - **coffeeCount**: Il numero di caffè consumati. ☕🎉
### 2. **POST /increment-coffee** 🔼☕
Incrementa il conteggio dei caffè consumati per un tag RFID.

- **Body:**

    - **tagId**: Il codice hash del tag RFID. 💳
- **Risposta**:

    - **coffeeCount**: Il nuovo conteggio dei caffè consumati. ☕🎯
---
### Log degli Eventi 📜
Ogni operazione viene registrata nei log, inclusi gli errori e le azioni effettuate. Questo consente di tracciare facilmente le operazioni eseguite sul sistema. 📝

---
### Licenza 📄
Distribuito sotto la Licenza MIT. Vedi il file [LICENSE](LICENSE) per maggiori informazioni. 📜

Questo progetto è in continua evoluzione. Sentiti libero di contribuire con nuove funzionalità o miglioramenti. 🌱💻
---
### 🔧 Tecnologie utilizzate:

    - Node.js: Il server backend 🖥️
    - SQLite: Il database utilizzato per memorizzare i tag RFID e i conteggi caffè 📊
    - Express: Il framework per la gestione delle rotte HTTP 🚀
### 🔍 Funzionalità principali:

    - Gestione delle autorizzazioni RFID ✅
    - Tracciamento del numero di caffè consumati ☕
    - Modalità di sincronizzazione 🕰️
Grazie per aver visitato il progetto! 🙌









