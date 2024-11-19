
const utils= require ('./utils.js');
// Existing routes remain the same...
function check_rfid(req,res){
    const tagHash = req.query.taghash;
    const tag = req.query.tag;

    if (!tagHash) {
        utils.logEvent('Request to /check-rfid without tag hash');
        return res.status(400).json({ error: 'Tag hash missing' });
    }

    const cleanTagHash = tagHash.replace(/[^0-9A-Fa-f]/g, '');

    utils.logEvent('RFID tag verification', { tagHash: cleanTagHash, ip: req.ip });

    utils.db.get(
        'SELECT authorized, coffee_count FROM tags WHERE tag_hash = ?',
        [cleanTagHash],
        (err, row) => {
            if (err) {
                utils.logEvent('Database error during tag verification:', { error: err.message });
                return res.status(500).json({ error: 'Database error' });
            }

            if (row && row.authorized) {
                utils.logEvent('Access authorized', { tagHash: cleanTagHash, coffeeCount: row.coffee_count });
                res.json({
                    status: 'authorized',
                    coffeeCount: row.coffee_count
                });
            } else {
                if (utils.eventsync) {
                    // Store the tag ID in pendingTagId
                    pendingTagId = tag.replace(/[^0-9A-Fa-f]/g, '');
                    utils.eventsync = false; // Exit sync mode

                    utils.logEvent('Tag read in sync mode', { tagId: pendingTagId });

                    res.json({ status: 'sync', coffeeCount: 0 });
                } else {
                    utils.logEvent('Access denied', { tagHash: cleanTagHash });
                    res.json({
                        status: 'denied',
                        coffeeCount: 0
                    });
                }
            }
        }
    );
}

function increment_coffe(req,res){
    const { tagId } = req.body;  // tagId is the hashed tag ID

    if (!tagId) {
        utils.logEvent('Richiesta increment-coffee senza tag hash');
        return res.status(400).json({ error: 'Tag hash mancante' });
    }

    const cleanTagHash = tagId.replace(/[^0-9A-Fa-f]/g, '');

    utils.logEvent('Incremento conteggio caffè', { 
        tagHash: cleanTagHash,
        ip: req.ip 
    });

    utils.db.run(
        'UPDATE tags SET coffee_count = coffee_count + 1, last_used = datetime(\'now\',\'localtime\') WHERE tag_hash = ?',
        [cleanTagHash],
        function(err) {
            if (err) {
                utils.logEvent('Errore incremento caffè:', { error: err.message });
                return res.status(500).json({ error: 'Errore database' });
            }
            
            utils.db.get(
                'SELECT coffee_count FROM tags WHERE tag_hash = ?',
                [cleanTagHash],
                (err, row) => {
                    if (err || !row) {
                        utils.logEvent('Errore lettura conteggio dopo incremento:', { error: err?.message });
                        return res.status(500).json({ error: 'Errore lettura conteggio' });
                    }
                    utils.logEvent('Caffè incrementato con successo', { 
                        tagHash: cleanTagHash,
                        newCount: row.coffee_count 
                    });
                    res.json({ coffeeCount: row.coffee_count });
                }
            );
            
        }
    );
    const now = new Date();
    utils.db.run(`INSERT INTO coffee_consumptions (tag_id) VALUES (?);`,[now],function(err) {
        if (err) {
            utils.logEvent('Errore incremento caffè:', { error: err.message });
            return res.status(500).json({ error: 'Errore database' });
        }else{
            utils.logEvent('consumazione caffè incrementata con successo', { 
                date: now
            });
        }
    });
}
module.exports={increment_coffe,check_rfid};