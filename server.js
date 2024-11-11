const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const morgan = require('morgan');
const crypto = require('crypto');
const fs = require('fs');
const session = require('express-session');

const path = require('path');
var eventsync = false;
var pendingTagId = null;


const app = express();
const port = 3000;

app.use(session({
    secret: 'mySecretKey',  // Sostituisci con una chiave sicura
    resave: false,
    saveUninitialized: true
}));



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

// Middleware setup
app.use(morgan('combined', { stream: accessLogStream }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

function generateMD5(text) {
    return crypto.createHash('md5').update(text).digest('hex');
}


const pathReset = './timestamp.json';  // Definisci il percorso del file

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


const bcrypt = require('bcrypt');
const { log } = require('console');

function allowOnlyFromEsp32(req, res, next) {
    const esp32Ip = '130.136.3.252'; // Replace with the actual IP of your ESP32
    const clientIp = req.ip.replace('::ffff:', ''); // Remove IPv6 prefix if present
    if (clientIp === esp32Ip) {
        next();
    } else {
        logEvent('Accesso non autorizzato tentato da IP:', { ip: clientIp });
        res.status(403).send('Accesso vietato');
    }
}

function allowOnlyFromLocalhost(req, res, next) {
    const esp32Ip = '127.0.0.1'; // Replace with the actual IP of your ESP32
    const clientIp = req.ip.replace('::ffff:', ''); // Remove IPv6 prefix if present
    if (clientIp === esp32Ip) {
        next();
    } else {
        logEvent('Accesso non autorizzato tentato da IP:', { ip: clientIp });
        res.status(403).send('Accesso vietato');
    }
}



app.get('/index.html', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('login', (req, res) => {
    res.sendFile(__dirname + '/public/login.html');  // Crea una pagina di login semplice
});

// API endpoint to check authentication status
app.get('/api/check-auth', (req, res) => {
    if (req.session.loggedIn && req.session.role === 'admin') {
        res.status(200).json({ authenticated: true });
    } else {
        res.status(401).json({ authenticated: false });
    }
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).send('Username e password sono obbligatori');
    }

    db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            logEvent('Errore durante la ricerca dell\'utente:', { error: err.message });
            return res.status(500).send('Errore durante il login');
        }

        if (!user) {
            return res.send('Credenziali non valide!');
        }

        bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                logEvent('Errore durante il confronto della password:', { error: err.message });
                return res.status(500).send('Errore durante il login');
            }

            if (result && user.role === 'admin') {
                // Autenticazione riuscita e ruolo admin
                req.session.loggedIn = true;
                req.session.username = user.username;
                req.session.role = user.role;
                logEvent('Accesso eseguito');
                res.redirect('/index.html');  // Redirect to index.html
            } else {
                res.send('Credenziali non valide o accesso non autorizzato!');
            }
        });
    });
});

// Middleware per proteggere le rotte admin
function requireAdmin(req, res, next) {
    if (req.session.loggedIn && req.session.role === 'admin') {
        return next();  // Se l'utente è admin, permette l'accesso
    } else {
        return res.status(403).send('Accesso vietato! Solo per amministratori.');
    }
}

// Rotta admin per gestire i tag e visualizzare il conteggio caffè
app.get('/admin', requireAdmin, (req, res) => {
    db.all('SELECT * FROM tags', (err, rows) => {
        if (err) {
            res.status(500).send('Errore nel recupero dei dati');
        } else {
            res.json(rows);
        }
    });
});
// Define eventsync and pendingTagId in session
app.get('/api/tags/synctrue',[allowOnlyFromLocalhost,requireAdmin], (req, res) => {
    const sync = req.query.sync;
    if (sync === 'true') {
        eventsync = true;
        pendingTagId = null;
        logEvent('Synchronization mode enabled');
        return res.status(200).json({ status: "ok" });
    } else {
        eventsync = false;
        pendingTagId = null;
        return res.status(200).json({ status: "ok" });
    }
});



// Nuova rotta per registrare il nuovo tag inviato dall'ESP32
// Adjust /api/tags/sync to handle sessions
// New endpoint to check for the tag
app.get('/api/tags/checksync',[allowOnlyFromLocalhost,requireAdmin], (req, res) => {
    if (pendingTagId) {
        const tagId = pendingTagId;
        pendingTagId = null; // Reset after reading

        res.json({ tagId: tagId });
    } else {
        res.json({ tagId: null });
    }
});



app.post('/api/tags/sync',[allowOnlyFromLocalhost,requireAdmin], (req, res) => {
    const { tagId } = req.body;
    if (!tagId) {
        logEvent('Sync-tag request without tag ID');
        return res.status(400).json({ error: 'Tag ID missing' });
    }

    const cleanTagId = tagId.replace(/[^0-9A-Fa-f]/g, '');

    // Find the session with eventsync=true
    const sessions = req.sessionStore.sessions;
    let found = false;
    for (let sessionId in sessions) {
        let session = JSON.parse(sessions[sessionId]);
        if (session.eventsync) {
            session.pendingTagId = cleanTagId;
            session.eventsync = false;
            req.sessionStore.set(sessionId, session, () => {});
            logEvent('Tag read in sync mode', { tagId: cleanTagId, sessionId });
            found = true;
            break;
        }
    }

    if (found) {
        res.status(200).json({ status: 'Tag received in sync mode' });
    } else {
        logEvent('Tag received but not in sync mode', { tagId: cleanTagId });
        res.status(400).json({ error: 'Not in sync mode' });
    }
});

// Database setup with proper schema
const db = new sqlite3.Database('rfid.db', (err) => {
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
            const password = '*';  // Sostituisci con la password desiderata
    
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



// Existing routes remain the same...
app.get('/check-rfid', allowOnlyFromEsp32, (req, res) => {
    const tagHash = req.query.taghash;
    const tag = req.query.tag;

    if (!tagHash) {
        logEvent('Request to /check-rfid without tag hash');
        return res.status(400).json({ error: 'Tag hash missing' });
    }

    const cleanTagHash = tagHash.replace(/[^0-9A-Fa-f]/g, '');

    logEvent('RFID tag verification', { tagHash: cleanTagHash, ip: req.ip });

    db.get(
        'SELECT authorized, coffee_count FROM tags WHERE tag_hash = ?',
        [cleanTagHash],
        (err, row) => {
            if (err) {
                logEvent('Database error during tag verification:', { error: err.message });
                return res.status(500).json({ error: 'Database error' });
            }

            if (row && row.authorized) {
                logEvent('Access authorized', { tagHash: cleanTagHash, coffeeCount: row.coffee_count });
                res.json({
                    status: 'authorized',
                    coffeeCount: row.coffee_count
                });
            } else {
                if (eventsync) {
                    // Store the tag ID in pendingTagId
                    pendingTagId = tag.replace(/[^0-9A-Fa-f]/g, '');
                    eventsync = false; // Exit sync mode

                    logEvent('Tag read in sync mode', { tagId: pendingTagId });

                    res.json({ status: 'sync', coffeeCount: 0 });
                } else {
                    logEvent('Access denied', { tagHash: cleanTagHash });
                    res.json({
                        status: 'denied',
                        coffeeCount: 0
                    });
                }
            }
        }
    );
});



app.post('/increment-coffee', allowOnlyFromEsp32, (req, res) => {
    const { tagId } = req.body;  // tagId is the hashed tag ID

    if (!tagId) {
        logEvent('Richiesta increment-coffee senza tag hash');
        return res.status(400).json({ error: 'Tag hash mancante' });
    }

    const cleanTagHash = tagId.replace(/[^0-9A-Fa-f]/g, '');

    logEvent('Incremento conteggio caffè', { 
        tagHash: cleanTagHash,
        ip: req.ip 
    });

    db.run(
        'UPDATE tags SET coffee_count = coffee_count + 1, last_used = CURRENT_TIMESTAMP WHERE tag_hash = ?',
        [cleanTagHash],
        function(err) {
            if (err) {
                logEvent('Errore incremento caffè:', { error: err.message });
                return res.status(500).json({ error: 'Errore database' });
            }
            
            db.get(
                'SELECT coffee_count FROM tags WHERE tag_hash = ?',
                [cleanTagHash],
                (err, row) => {
                    if (err || !row) {
                        logEvent('Errore lettura conteggio dopo incremento:', { error: err?.message });
                        return res.status(500).json({ error: 'Errore lettura conteggio' });
                    }
                    logEvent('Caffè incrementato con successo', { 
                        tagHash: cleanTagHash,
                        newCount: row.coffee_count 
                    });
                    res.json({ coffeeCount: row.coffee_count });
                }
            );
        }
    );
});

// New routes for web interface
// Delete a tag
app.delete('/api/tags/:id', (req, res) => {
    const { id } = req.params;
    
    logEvent('Richiesta eliminazione tag', { id: id });
    
    db.run('DELETE FROM tags WHERE id = ?', [id], function(err) {
        if (err) {
            logEvent('Errore eliminazione tag:', { error: err.message });
            return res.status(500).json({ error: 'Errore database' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Tag non trovato' });
        }
        
        logEvent('Tag eliminato con successo', { id: id });
        res.json({ success: true });
    });
});

// Update tag authorization
app.put('/api/tags/:id/authorize', (req, res) => {
    const { id } = req.params;
    const { authorized } = req.body;
    
    if (typeof authorized !== 'boolean') {
        return res.status(400).json({ error: 'Stato autorizzazione non valido' });
    }
    
    logEvent('Aggiornamento autorizzazione tag', { 
        id: id,
        authorized: authorized 
    });
    
    db.run(
        'UPDATE tags SET authorized = ? WHERE id = ?',
        [authorized, id],
        function(err) {
            if (err) {
                logEvent('Errore aggiornamento autorizzazione:', { error: err.message });
                return res.status(500).json({ error: 'Errore database' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Tag non trovato' });
            }
            
            logEvent('Autorizzazione tag aggiornata con successo', { 
                id: id,
                authorized: authorized 
            });
            res.json({ success: true });
        }
    );
});

// Existing list and add tag routes remain the same...
app.get('/api/tags', (req, res) => {
    logEvent('Richiesta lista tag', { ip: req.ip });
    const timestamp = getTimestamp();
    db.all('SELECT * FROM tags ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            logEvent('Errore recupero lista tag:', { error: err.message });
            return res.status(500).json({ error: 'Errore database' });
        }
        logEvent('Lista tag recuperata con successo', { count: rows.length });
        res.json({tag:rows,timestamp});
    });
});

app.post('/api/tags', requireAdmin, (req, res) => {
    const { tag_id, description } = req.body;
    
    if (!tag_id) {
        logEvent('Tentativo di aggiungere tag senza ID');
        return res.status(400).json({ error: 'Tag ID richiesto' });
    }

    const cleanTagId = tag_id.replace(/[^0-9A-Fa-f]/g, '');
    const tagHash = generateMD5(cleanTagId);
    
    logEvent('Aggiunta nuovo tag', { 
        tagId: cleanTagId,
        description: description 
    });

    db.run(
        'INSERT INTO tags (tag_id, tag_hash, description) VALUES (?, ?, ?)',
        [cleanTagId, tagHash, description],
        function(err) {
            if (err) {
                logEvent('Errore inserimento nuovo tag:', { error: err.message });
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return res.status(400).json({ error: 'Tag ID già esistente' });
                }
                return res.status(500).json({ error: 'Errore database' });
            }
            logEvent('Nuovo tag aggiunto con successo', { 
                id: this.lastID,
                tagId: cleanTagId 
            });
            res.status(201).json({ id: this.lastID, tag_id: cleanTagId, description });
        }
    );
});
app.put('/api/tags/update', requireAdmin, (req, res) => {
    const { tag_id, description,coffee_count } = req.body;

    if (!tag_id) {
        return res.status(400).json({ error: 'Tag ID is required' });
    }

    db.run(
        'UPDATE tags SET description = ?, coffee_count = ? WHERE tag_id = ? ',
        [description, coffee_count,tag_id],
        function (err) {
            if (err) {
                logEvent('Error updating tag description:', { error: err.message });
                return res.status(500).json({ error: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Tag not found' });
            }

            logEvent('Tag description updated successfully', { tag_id: tag_id });
            res.json({ success: true });
        }
    );
});

app.put('/api/tags/reset', requireAdmin, (req, res) => {
    const { timestamp } = req.body;
    if (!timestamp) {
        return res.status(400).json({ error: 'Timestamp is required' });
    }
    saveTimestamp(timestamp);

    db.run(
        'UPDATE tags SET coffee_count=0 ',
        function (err) {
            if (err) {
                logEvent('Error updating tag description:', { error: err.message });
                return res.status(500).json({ error: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Non resettato' });
            }

            logEvent('Conteggio caffè resettato con successo');
            res.json({ success: true });
        }
    );
});


// Server startup code remains the same...
app.listen(port, '0.0.0.0', () => {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    const results = {};

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                if (!results[name]) {
                    results[name] = [];
                }
                results[name].push(net.address);
            }
        }
    }

    logEvent('Server avviato', { 
        port: port,
        interfaces: results 
    });

    console.log('Server in esecuzione su:');
    console.log(`- http://localhost:${port}`);
    for (const name of Object.keys(results)) {
        for (const ip of results[name]) {
            console.log(`- http://${ip}:${port}`);
        }
    }
});