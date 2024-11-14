const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const https = require('https');
const http=require('http');
const fs = require('fs');
const session = require('express-session');
const { log } = require('console');
const utils=require('./utils');
const apiFront=require('./apiFrontend');
const apiESP=require('./apiESP');
const RedisStore = require('connect-redis').default;
const redis = require('redis');

const app = express();
console.log(app._router);
const port = 443;

const privateKey = fs.readFileSync(process.env.PathKey, 'utf8');
const certificate = fs.readFileSync(process.env.PathCert, 'utf8');
const credentials = { key: privateKey, cert: certificate };
require('dotenv').config();

// Crea il client Redis
const redisClient = redis.createClient({
    url: 'redis://localhost:6379'  // Usa il formato URL per Redis v4
  });
  
  // Gestisci la connessione di Redis
  redisClient.connect()
    .then(() => {
      console.log('Connesso a Redis');
    })
    .catch((err) => {
      console.error('Errore di connessione a Redis:', err);
      process.exit(1);  // Esce con un errore se la connessione a Redis fallisce
    });

app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.Secret,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: true }  // Imposta su `true` se utilizzi HTTPS
}));

// Middleware setup
app.use(morgan('combined', { stream: utils.accessLogStream }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/index.html',  utils.requireAdmin, (req, res) => {
    apiFront.indexHtml(req,res);
});
app.get('/login', (req, res) => {
    apiFront.login(req,res);
});
// API endpoint to check authentication status
app.get('/api/check-auth', (req, res) => {
    apiFront.check_auth(req,res);
});

app.post('/login', (req, res) => {
    apiFront.login_post(req,res);
});
app.get('/admin', utils.requireAdmin, (req, res) => {
    apiFront.admin(req,res);
});
app.get('/api/tags/synctrue',[ utils.requireAdmin], (req, res) => {
    apiFront.syncTrue(req,res);
});
app.get('/api/tags/checksync',[ utils.requireAdmin], (req, res) => {
    apiFront.checksync(req,res);
});
app.post('/api/tags/sync',[ utils.requireAdmin], (req, res) => {
    apiFront.sync(req,res);
});
app.delete('/api/tags/:id', utils.requireAdmin,(req, res) => {
    apiFront.remove(req,res);
});
app.put('/api/tags/:id/authorize',utils.requireAdmin, (req, res) => {
    apiFront.authorize(req,res);
});
app.get('/api/tags', (req, res) => {
    apiFront.tags(req,res);
});
app.post('/api/tags',  utils.requireAdmin, (req, res) => {
    apiFront.tags_post(req,res);
});
app.put('/api/tags/update',  utils.requireAdmin, (req, res) => {
    apiFront.update(req,res);
});
app.put('/api/tags/reset',  utils.requireAdmin, (req, res) => {
    apiFront.reset(req,res);
});
app.get('/check-rfid', utils.allowOnlyFromEsp32,(req, res) => {
    apiESP.check_rfid(req,res);
});
app.post('/increment-coffee', utils.allowOnlyFromEsp32, (req, res) => {
    apiESP.increment_coffe(req,res);
});


https.createServer(credentials,app).listen(port, '0.0.0.0', () => {
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

    utils.logEvent('Server avviato', { 
        port: port,
        interfaces: results 
    });

    console.log('Server in esecuzione su:');
    console.log(`- https://localhost:${port}`);
    for (const name of Object.keys(results)) {
        for (const ip of results[name]) {
            console.log(`- https://${ip}:${port}`);
        }
    }
});

http.createServer((req, res) => {
    // Reindirizza alla versione HTTPS mantenendo l'URL di richiesta originale
    res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
    res.end();
}).listen(80, '0.0.0.0',() => {
    console.log('Server HTTP in ascolto sulla porta 80 per il reindirizzamento a HTTPS');
});
