﻿#!/usr/bin/env node

var argv = require('optimist').argv,            // handles console arguments
    sys = require('util'),                      // used for system logs
    fs = require('fs'),
    db = require('dirty')('./data/sms.db'),	// simple key value storage
    http = require('http'),
    express = require('express'),               // the application server
    journey = require('journey'),               // handles all service routes
    app = module.exports = express(),
    httpServer = http.createServer(app),
    io = require('socket.io').listen(httpServer),
    services = require('./services/sms');

io.set('log level', 1); // disables debugging. this is optional. you may remove it if desired.

// CREATE APP AND ROUTER

var router = new(journey.Router);
var service = new(services.Service);

// DEFINE Socket.IO API

io.sockets.on('connection', function (socket) {

    socket.on('hello', function (params) {
        app.set('hello-id', params.id);
        socket.emit('hello', params);
        socket.broadcast.emit('hello', params);
    });

});

// SET SERVER VARIABLES

app.set('env', argv.env || 'production');
app.set('static', argv.static || './static');
app.set('bin', argv.bin || './bin');
app.set('port', argv.port || 80);

// SET SERVER ENVIRONMENT

app.configure(function () {
    app.set('title', 'SMS Client');
    app.set('views', 'jade');
    app.set('view engine', 'jade');
});

// DEFINE MIDDLEWARE

app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());
app.use(express.session({ secret: 'smsclient' }));
//app.use(app.router);

app.use(express.static(app.get('static')));
//app.use(express.logger());

// DEFINE DATA SOURCES

service.dataSource(db);

// DEFINE JOURNEY ROUTES


router.get(/^service\/([a-z]+)(\/){0,1}([A-Za-z0-9]*)$/).bind(function (req, res, servicename, slash, id, params) {
    if (params) params.ip = req.headers['X-Forwarded-For'] || req.connection.remoteAddress;
    res.send( service.call(servicename, 'get', id, params) );
});
router.put(/^service\/([a-z]+)(\/){0,1}([A-Za-z0-9]*)$/).bind(function (req, res, servicename, slash, id, params) {
    if (params) params.ip = req.headers['X-Forwarded-For'] || req.connection.remoteAddress;
    res.send( service.call(servicename, 'put', id, params) );
});
router.del(/^service\/([a-z]+)(\/){0,1}([A-Za-z0-9]*)$/).bind(function (req, res, servicename, slash, id, params) {
    if (params) params.ip = req.headers['X-Forwarded-For'] || req.connection.remoteAddress;
    res.send( service.call(servicename, 'del', id, params) );
});
router.post(/^service\/([a-z]+)(\/){0,1}([A-Za-z0-9]*)$/).bind(function (req, res, servicename, slash, id, params) {
    if (req.body) req.body.ip = req.headers['X-Forwarded-For'] || req.connection.remoteAddress;
    var result = service.call(servicename, 'post', id, req.body);
    if (result.location) {
        app.set('location', result.location);
    }
    res.send( result );
});

// DEFINE EXPRESS ROUTES

app.get('/', function(req, res){
    res.render('client', { title: app.get('title') });
});

app.post('/', function(req, res) {
    var input = {
        to: '01000000',
        text: 'Hello world'
    };
    service.sendSms(input, function(param) {
        res.render('client', { title: app.get('title') });
    });
});

// REDIRECTS

app.get('/', function(req, res){
    res.redirect('index');
});

// DIRECT TO SERVICES

app.get('/service/*', function(req, res){
    routerHandle(req, res);
});
app.put('/service/*', function(req, res){
    routerHandle(req, res);
});
app.del('/service/*', function(req, res){
    routerHandle(req, res);
});
app.post('/service/*', function(req, res){
    routerHandle(req, res);
});

// START EXPRESS SERVER LISTENING ON PORT

httpServer.listen(app.get('port'));
//app.listen(app.get('port'));

sys.log("Start SERVER with environment " + app.get('env') + ' on port ' + app.get('port'));

// SOME METHODS

function routerHandle (req, res) {
    router.handle(req, '', function(obj){
        if (obj.status === 404) {
            return;
        } else {
            res.writeHead(obj.status, obj.headers);
            res.end(obj.body);
        }
    });
}

