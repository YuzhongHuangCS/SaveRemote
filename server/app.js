'use strict';

const http = require('http');
const fs = require('fs')
const multer = require('multer');
const upload = multer({storage: multer.memoryStorage()});
const single = upload.single('file');

const requestListener = (req, res) => {
    if (req.method == "POST") {
        single(req, {}, function (err) {
            if (err || req.body.auth !== "nOgjXyCG68tq2E8" || !req.body.path) {
                console.error(err);
                res.writeHead(400);
                res.end("Error");
            } else {
                let savePath = "/home1/yuzhongh/surface_recon/" + req.body.path;
                fs.writeFile(savePath, req.file.buffer, (err) => {
                    if (err) {
                        console.error(err);
                        res.writeHead(400);
                        res.end("Error");
                    } else {
                        console.log("Saved: " + savePath);
                        res.writeHead(200);
                        res.end("Saved");
                    }
                })
            }
        })
    } else {
        res.writeHead(400);
        res.end("Error");
    }
}

const server = http.createServer(requestListener);
server.listen(8765);
console.log("Server Started")
