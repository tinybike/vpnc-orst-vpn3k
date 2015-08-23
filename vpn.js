#!/usr/bin/env node

"use strict";

var cp = require("child_process");
var vpnc = require("vpnc");
var chalk = require("chalk");
var db = require("mssql");
var config = require("./config");
var log = console.log;

/* uncomment the next line to use sheldon.forestry.oregonstate.edu */
// config.db.server = "sheldon.forestry.oregonstate.edu";

function doStuff() {

    /* insert commands you want to carry out while connected to the vpn here */

    var conn = new db.Connection(config.db, function (err) {
        if (err) throw err;

        var query = "SELECT TOP 1 * FROM metdat.dbo.phrsc_table2 ORDER BY tmstamp ASC";
        var request = conn.request();
        request.query(query, function (err, recordset) {
            if (err) throw err;
            console.dir(recordset);
            disconnect();
        });    
    });

    conn.on("error", function (err) {
        if (err) log("Database error:", err);
    });
}

function disconnect() {
    vpnc.disconnect(function (err, code) {
        if (err) {
            log("Error disconnecting VPN:", err);
        } else {
            log("VPN", chalk.yellow("disconnected [" + code + "]"));
            process.exit(0);
        }
    });
}

function connect() {
    vpnc.connect(config.vpn, function (err, code) {
        if (err) {
            log("Error connecting VPN:", err);
        } else {

            // did we connect to the VPN successfully?
            // (check for tun0, tun1, etc. using ifconfig)
            cp.exec("ifconfig tun", function (err, stdout) {
                if (err) {
                    log(chalk.red.bold("Unable to connect to VPN"));
                    disconnect();
                }
                log("VPN", chalk.cyan("connected [" + code + "]"));
                log(chalk.green(stdout));
                doStuff();
            });
        }
    });
}

vpnc.available(function (err, version) {
    if (err) {
        log("vpnc unavailable:", err);
    } else {
        log("Found vpnc:", chalk.gray(JSON.stringify(version, null, 2)));
        connect();
    }
});

process.on("exit", function (code) { if (code) disconnect(); });