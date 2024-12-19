
const utils= require ('./utils.js');
require('dotenv').config();

function indexHtml (req,res){
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
}
function login(req,res){
    res.sendFile(__dirname + '/public/login.html');  // Crea una pagina di login semplice
}
function check_auth(req,res){
    if (req.session.loggedIn && req.session.role === 'admin') {
        res.status(200).json({ authenticated: true });
    } else {
        res.status(401).json({ authenticated: false });
    }
}
function login_post(req,res){
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).send('Username e password sono obbligatori');
    }

    utils.db.get('SELECT * FROM users WHERE username = ?', [username], (err, user) => {
        if (err) {
            utils.logEvent('Errore durante la ricerca dell\'utente:', { error: err.message });
            return res.status(500).send('Errore durante il login');
        }

        if (!user) {
            return res.send(`
                <!DOCTYPE html>
                <html lang="it">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <link rel="icon" type="image/png" href="coffee.png"> 
                    <title>Credenziali Errate</title>
                    <style>
                        body {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            background-color: #f3f4f6;
                            font-family: Arial, sans-serif;
                        }
                        .error-container {
                            text-align: center;
                            background-color: #ffffff;
                            padding: 2rem;
                            border-radius: 10px;
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                        }
                        .error-container h2 {
                            font-size: 1.8rem;
                            color: #ff4d4d;
                            margin-bottom: 1rem;
                        }
                        .error-container p {
                            color: #777;
                            font-size: 1rem;
                        }
                    </style>
                </head>
                <body>
                    <div class="error-container">
                        <h2>Credenziali non valide!</h2>
                        <p>Riprova, sarai reindirizzato alla pagina di login tra 5 secondi.</p>
                    </div>
                    <script>
                        setTimeout(function() {
                            window.location.href = '/login';
                        }, 5000); // 15 secondi
                    </script>
                </body>
                </html>
            `);
        }

        utils.bcrypt.compare(password, user.password, (err, result) => {
            if (err) {
                utils.logEvent('Errore durante il confronto della password:', { error: err.message });
                return res.status(500).send('Errore durante il login');
            }
            console.log("ok");

            if (result && user.role === 'admin') {
                // Autenticazione riuscita e ruolo admin
                req.session.loggedIn = true;
                req.session.username = user.username;
                req.session.role = user.role;
                utils.logEvent('Accesso eseguito');
                res.redirect('/index.html');  // Redirect to index.html
            } else {
                return res.send(`
                    <!DOCTYPE html>
                    <html lang="it">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <link rel="icon" type="image/png" href="coffee.png"> 
                        <title>Credenziali Errate</title>
                        <style>
                            body {
                                display: flex;
                                align-items: center;
                                justify-content: center;
                                height: 100vh;
                                background-color: #f3f4f6;
                                font-family: Arial, sans-serif;
                            }
                            .error-container {
                                text-align: center;
                                background-color: #ffffff;
                                padding: 2rem;
                                border-radius: 10px;
                                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                            }
                            .error-container h2 {
                                font-size: 1.8rem;
                                color: #ff4d4d;
                                margin-bottom: 1rem;
                            }
                            .error-container p {
                                color: #777;
                                font-size: 1rem;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="error-container">
                            <h2>Credenziali non valide!</h2>
                            <p>Riprova, sarai reindirizzato alla pagina di login tra 5 secondi.</p>
                        </div>
                        <script>
                            setTimeout(function() {
                                window.location.href = '/login';
                            }, 5000); // 15 secondi
                        </script>
                    </body>
                    </html>
                `);
            
            }
        });
    });
}

function admin (req,res){
     utils.db.all('SELECT * FROM tags', (err, rows) => {
        if (err) {
            res.status(500).send('Errore nel recupero dei dati');
        } else {
            res.json(rows);
        }
    });
}

function syncTrue(req,res){
    const sync = req.query.sync;
    if (sync === 'true') {
        utils.eventsync = true;
        pendingTagId = null;
        utils.logEvent('Synchronization mode enabled');
        return res.status(200).json({ status: "ok" });
    } else {
        utils.eventsync = false;
        pendingTagId = null;
        return res.status(200).json({ status: "ok" });
    }
}

function checksync(req,res){
    if (pendingTagId) {
        const tagId = pendingTagId;
        pendingTagId = null; // Reset after reading

        res.json({ tagId: tagId });
    } else {
        res.json({ tagId: null });
    }
}
    
function sync(req,res){
    const { tagId } = req.body;
    if (!tagId) {
        utils.logEvent('Sync-tag request without tag ID');
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
            utils.logEvent('Tag read in sync mode', { tagId: cleanTagId, sessionId });
            found = true;
            break;
        }
    }

    if (found) {
        res.status(200).json({ status: 'Tag received in sync mode' });
    } else {
        utils.logEvent('Tag received but not in sync mode', { tagId: cleanTagId });
        res.status(400).json({ error: 'Not in sync mode' });
    }
}
function remove(req,res){
    const { id } = req.params;
    
    utils.logEvent('Richiesta eliminazione tag', { id: id });
    
    utils.db.run('DELETE FROM tags WHERE id = ?', [id], function(err) {
        if (err) {
            utils.logEvent('Errore eliminazione tag:', { error: err.message });
            return res.status(500).json({ error: 'Errore database' });
        }
        
        if (this.changes === 0) {
            return res.status(404).json({ error: 'Tag non trovato' });
        }
        
        utils.logEvent('Tag eliminato con successo', { id: id });
        res.json({ success: true });
    });
}
function authorize(req,res){
    const { id } = req.params;
    const { authorized } = req.body;
    
    if (typeof authorized !== 'boolean') {
        return res.status(400).json({ error: 'Stato autorizzazione non valido' });
    }
    
    utils.logEvent('Aggiornamento autorizzazione tag', { 
        id: id,
        authorized: authorized 
    });
    
    utils.db.run(
        'UPDATE tags SET authorized = ? WHERE id = ?',
        [authorized, id],
        function(err) {
            if (err) {
                utils.logEvent('Errore aggiornamento autorizzazione:', { error: err.message });
                return res.status(500).json({ error: 'Errore database' });
            }
            
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Tag non trovato' });
            }
            
            utils.logEvent('Autorizzazione tag aggiornata con successo', { 
                id: id,
                authorized: authorized 
            });
            res.json({ success: true });
        }
    );
}

function tags(req,res){
    utils.logEvent('Richiesta lista tag', { ip: req.ip });
    const timestamp = utils.getTimestamp();
    utils.db.all('SELECT * FROM tags ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            utils.logEvent('Errore recupero lista tag:', { error: err.message });
            return res.status(500).json({ error: 'Errore database' });
        }
        utils.logEvent('Lista tag recuperata con successo', { count: rows.length });
        res.json({tag:rows,timestamp});
    });
}

function tags_post(req,res){
    const { tag_id, description } = req.body;
    
    if (!tag_id) {
        utils.logEvent('Tentativo di aggiungere tag senza ID');
        return res.status(400).json({ error: 'Tag ID richiesto' });
    }

    const cleanTagId = tag_id.replace(/[^0-9A-Fa-f]/g, '');
    const tagHash = utils.generateMD5(cleanTagId);
    
    utils.logEvent('Aggiunta nuovo tag', { 
        tagId: cleanTagId,
        description: description 
    });

    utils.db.run(
        'INSERT INTO tags (tag_id, tag_hash, description) VALUES (?, ?, ?)',
        [cleanTagId, tagHash, description],
        function(err) {
            if (err) {
                utils.logEvent('Errore inserimento nuovo tag:', { error: err.message });
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return res.status(400).json({ error: 'Tag ID già esistente' });
                }
                return res.status(500).json({ error: 'Errore database' });
            }
            utils.logEvent('Nuovo tag aggiunto con successo', { 
                id: this.lastID,
                tagId: cleanTagId 
            });
            res.status(201).json({ id: this.lastID, tag_id: cleanTagId, description });
        }
    );
}

function update(req,res){
    const { tag_id, description,coffee_count } = req.body;

    if (!tag_id) {
        return res.status(400).json({ error: 'Tag ID is required' });
    }

    utils.db.run(
        'UPDATE tags SET description = ?, coffee_count = ? WHERE tag_id = ? ',
        [description, coffee_count,tag_id],
        function (err) {
            if (err) {
                utils.logEvent('Error updating tag description:', { error: err.message });
                return res.status(500).json({ error: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Tag not found' });
            }

            utils.logEvent('Tag description updated successfully', { tag_id: tag_id });
            res.json({ success: true });
        }
    );
}

function reset(req,res){
    const { timestamp } = req.body;
    if (!timestamp) {
        return res.status(400).json({ error: 'Timestamp is required' });
    }
    utils.saveTimestamp(timestamp);

    utils.db.run(
        'UPDATE tags SET coffee_count=0 ',
        function (err) {
            if (err) {
                utils.logEvent('Error updating tag description:', { error: err.message });
                return res.status(500).json({ error: 'Database error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Non resettato' });
            }

            utils.logEvent('Conteggio caffè resettato con successo');
            res.json({ success: true });
        }
    );
}
async function stats(req, res) {
    try {
        const now = new Date();

        // Query per i dati giornalieri
        const daily = await new Promise((resolve, reject) => {
            utils.db.all(
                `SELECT COUNT(*) AS count, DATE(consumption_time, 'localtime') AS date
                FROM coffee_consumptions 
                WHERE consumption_time >= date('now', '-7 days')
                GROUP BY DATE(consumption_time, 'localtime') 
                ORDER BY date ASC;`, 
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });

        // Query per i dati settimanali
        const weekly = await new Promise((resolve, reject) => {
            utils.db.all(
                `SELECT 
                    strftime('%Y-%W', consumption_time, 'localtime') AS week,
                    DATE(consumption_time, 'weekday 0', '-6 days', 'localtime') AS week_start,
                    COUNT(*) AS total
                FROM coffee_consumptions
                WHERE consumption_time >= date('now', '-28 days')
                GROUP BY week
                ORDER BY week ASC;`, 
                (err, rows) => {
                    if (err) return reject(err);
                    resolve(rows);
                }
            );
        });

        // Risposta JSON
        res.json({
            daily: daily.map(row => ({ date: row.date, count: row.count })),
            weekly: weekly.map(row => ({ 
                week: row.week, 
                week_start: row.week_start,  // Aggiungi questo campo
                total: row.total 
            }))
        });
    } catch (error) {
        utils.logEvent('Errore nel recupero delle statistiche:', { error: error.message });
        res.status(500).json({ error: 'Errore del server' });
    }
}

module.exports={
    indexHtml,
    login,
    check_auth,
    login_post,
    admin,
    syncTrue,
    checksync,
    sync,
    remove,
    authorize,
    tags,
    tags_post,
    update,
    reset,
    stats
}







