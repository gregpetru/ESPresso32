const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const https = require('https');
const fs = require('fs');
const session = require('express-session');
const { log } = require('console');
const utils=require('./utils');
const apiFront=require('./apiFrontend');
const apiESP=require('./apiEsp');

const app = express();
console.log(app._router);
const port = 3000;

const privateKey = fs.readFileSync(process.env.Path-key, 'utf8');
const certificate = fs.readFileSync(process.env.Path-cert, 'utf8');
const credentials = { key: privateKey, cert: certificate };
require('dotenv').config();

app.use(session({
    secret: process.env.Secret,  // Sostituisci con una chiave sicura
    resave: false,
    saveUninitialized: true
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
app.get('/api/tags/synctrue',[ utils.allowOnlyFromLocalhost,utils.requireAdmin], (req, res) => {
    apiFront.syncTrue(req,res);
});
app.get('/api/tags/checksync',[ utils.allowOnlyFromLocalhost,utils.requireAdmin], (req, res) => {
    apiFront.checksync(req,res);
});
app.post('/api/tags/sync',[ utils.allowOnlyFromLocalhost, utils.requireAdmin], (req, res) => {
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
