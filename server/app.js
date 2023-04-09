'use strict';

const http = require('http');
const fs = require('fs');
const multer = require('multer');
const upload = multer({storage: multer.memoryStorage()});
const single = upload.single('file');

let port = 8765;
let auth = "";

console.log(`Usage: node app.js [port=]{${port}} [auth]{${auth}}`);
if (process.argv.length > 2) port = parseInt(process.argv[2]);
if (process.argv.length > 3) auth = process.argv[3];

function requestListener(req, res) {
    if (req.method == "POST") {
        single(req, {}, function (err) {
            if (err || req.body.auth !== auth || !req.body.path) {
                if (err) {
                    console.error(err);
                } else {
                    console.log(req.body);
                }
                res.writeHead(400);
                res.end("Bad Request");
            } else {
                let savePath = req.body.path;
                fs.writeFile(savePath, req.file.buffer, (err) => {
                    if (err) {
                        console.error(err);
                        res.writeHead(500);
                        res.end("Internal Server Error");
                    } else {
                        console.log(`Saved: ${savePath}`);
                        res.writeHead(200);
                        res.end("Saved");
                    }
                })
            }
        })
    } else {
        res.writeHead(405);
        res.end("Method Not Allowed");
    }
}

console.log(`Starting server with port=${port}, auth=${auth}`)
const server = http.createServer(requestListener);
server.listen(port);
