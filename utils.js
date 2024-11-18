const pathReset = 'file/timestamp.json';  // Definisci il percorso del file
const path = require('path');
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const fs = require('fs');
var  eventsync = false;
var pendingTagId = null;
// Middleware per proteggere le rotte admin
function requireAdmin(req, res, next) {
    if (req.session.loggedIn && req.session.role === 'admin') {
        return next();  // Se l'utente è admin, permette l'accesso
    } else {
        return res.status(403).send('Accesso vietato! Solo per amministratori.');
    }
}


function allowOnlyFromEsp32(req, res, next) {
    const esp32Ip = process.env.IpESPNAT; // Replace with the actual IP of your ESP32
    logEvent('l ip è: ',esp32Ip);
    const clientIp = req.ip.replace('::ffff:', ''); // Remove IPv6 prefix if present
    if (clientIp === esp32Ip) {
        next();
    } else {
        logEvent('Accesso non autorizzato tentato da IP:', { ip: clientIp });
        res.status(403).send('Accesso vietato');
    }
}

// Funzione per ottenere il timestamp salvato
const getTimestamp = () => {
    try {
        const data = fs.readFileSync(pathReset, 'utf8');
        const jsonData = JSON.parse(data);
        return jsonData.timestamp;
    } catch (err) {
        console.error('Errore nella lettura del file:', err);
        return null;
    }
};

// Funzione per salvare il timestamp
const saveTimestamp = (timestamp) => {
    const data = { timestamp };
    try {
        fs.writeFileSync(pathReset, JSON.stringify(data), 'utf8');
    } catch (err) {
        console.error('Errore nella scrittura del file:', err);
    }
};

function generateMD5(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}

// Logging configuration remains the same...
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const accessLogStream = fs.createWriteStream(
    path.join(logDir, 'access.log'), 
    { flags: 'a' }
);

const eventLogStream = fs.createWriteStream(
    path.join(logDir, 'events.log'), 
    { flags: 'a' }
);

function logEvent(message, data = {}) {
    const timestamp = new Date().toISOString();
    const logEntry = {
        timestamp,
        message,
        ...data
    };
    eventLogStream.write(JSON.stringify(logEntry) + '\n');
    console.log(`[${timestamp}] ${message}`, data);
}

const db = new sqlite3.Database('file/rfid.db', (err) => {
    if (err) {
        logEvent('Errore nella connessione al database:', { error: err.message });
    } else {
        logEvent('Connesso al database SQLite');
        initDatabase();
    }
});

function initDatabase() {
    // Creazione della tabella tags
     /* db.run(`
        DROP TABLE users
    `, (err) => {
        if (err) {
            logEvent('Errore inizializzazione database tags:', { error: err.message });
        } else {
            logEvent('Database tags inizializzato correttamente');
        }
    });  */
    db.run(`
        CREATE TABLE IF NOT EXISTS tags (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tag_id TEXT UNIQUE NOT NULL,
            tag_hash TEXT,
            description TEXT,
            authorized BOOLEAN DEFAULT true,
            last_used DATETIME,
            coffee_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT datetime('now','localtime')
        )
    `, (err) => {
        if (err) {
            logEvent('Errore inizializzazione database tags:', { error: err.message });
        } else {
            logEvent('Database tags inizializzato correttamente');
        }
    });

    // Creazione della tabella users per l'autenticazione
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT DEFAULT 'user',  -- nuovo campo per il ruolo
            created_at DATETIME DEFAULT datetime(\'now\',\'localtime\')
        )
    `, (err) => {
        if (err) {
            logEvent('Errore inizializzazione database users:', { error: err.message });
        } else {
            logEvent('Database users inizializzato correttamente');
        }
    });

    db.get('SELECT * FROM users WHERE username = ?', ['admin'], (err, row) => {
        if (err) {
            console.error('Errore durante la verifica dell\'utente admin:', err);
        } else if (!row) {
            // Se l'utente admin non esiste, lo creiamo
            const password = process.env.Password-admin;  // Sostituisci con la password desiderata
    
            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) {
                    console.log('Errore nel creare la password hash:', err);
                } else {
                    // Inserisce l'utente admin
                    db.run('INSERT INTO users (username, password, role) VALUES (?, ?, ?)', 
                        ['admin', hashedPassword, 'admin'], (err) => {
                            if (err) {
                                console.error('Errore durante l\'inserimento dell\'utente admin:', err);
                            } else {
                                console.log('Utente admin creato con successo!');
                            }
                        });
                }
            });
        }
    });
}

module.exports={logEvent,
    eventLogStream,
    accessLogStream,
    logDir,
    generateMD5,
    saveTimestamp,
    getTimestamp,
    allowOnlyFromEsp32,
    requireAdmin,
    db,
    bcrypt,
    pendingTagId,
    eventsync};