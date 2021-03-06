﻿var argv = require('optimist').argv,
    sys = require('util'),
    MessagesService = require("./messages.service");

var Service = function () {

    this.options = null;
    this.messages = MessagesService;

    this.init = function () {
        sys.log("Service is here to do something..");
    };

    this.set = function (options) {
        this.init();
        this.options = options;
    };

    this.call = function (servicename, method, id, params) {
        sys.log("call " + servicename + " " + method);
        return this[servicename](method, id, params);
    };

    this.dataSource = function (ds) {
        this.ds = ds;
    };

    this.getMessages = function () {
        return {test: "foo"};
    };

    this.sendSms = function (input, callback) {
    };

    // service methods

    this.hello = function (method, id, params) {
        return {msg: 'Hi there!', method: method, id: id, params: params};
    };

};

exports.Service = Service;
