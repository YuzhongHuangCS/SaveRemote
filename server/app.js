'use strict';

const http = require('http');
const fs = require('fs');
const multer = require('multer');
const upload = multer({storage: multer.memoryStorage()});
const single = upload.single('file');

const port = process.env.PORT || 8765;
const auth = process.env.AUTH || "";

function requestListener(req, res) {
    if (req.method == "POST") {
        single(req, {}, function (err) {
            if (err) {
                console.error(err);
                res.writeHead(400);
                res.end("Bad Request");
            } else {
                if (req.body.auth !== auth || !req.body.path) {
                    console.log(req.body);
                    res.writeHead(401);
                    res.end("Unauthorized");
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
            }
        })
    } else {
        res.writeHead(405);
        res.end("Method Not Allowed");
    }
}

console.log(`Starting server with port=${port}, auth=${auth}`)
console.log("Edit environment variable PORT and AUTH to customize")
const server = http.createServer(requestListener);
server.listen(port);
