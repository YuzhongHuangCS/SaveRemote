'use strict';

const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const upload = multer({storage: multer.memoryStorage()});

const port = process.env.PORT || 8765;
const auth = process.env.AUTH || "";
const app = express();
app.use(express.urlencoded({extended: false}));


app.post('/upload', upload.single('file'), async (req, res) => {
    if (req.body.auth !== auth || !req.body.path || !req.file) {
        console.log(req.body);
        res.sendStatus(401);
    } else {
        let savePath = req.body.path;
        await fs.promises.mkdir(path.dirname(savePath), {recursive: true});
        fs.writeFile(savePath, req.file.buffer, (err) => {
            if (err) {
                console.error(err);
                res.sendStatus(500);
            } else {
                console.log(`Saved: ${savePath}`);
                res.end("Saved");
            }
        })
    }
})

app.post('/download', async (req, res) => {
    if (req.body.auth !== auth || !req.body.path) {
        console.log(req.body);
        res.sendStatus(401);
    } else {
        fs.stat(req.body.path, async (err, stats) => {
            if (err) {
                console.log(`NotFound: ${req.body.path}`)
                res.sendStatus(404);
            } else {
                if (stats.isFile()) {
                    res.sendFile(req.body.path, {dotfiles: "allow"});
                    console.log(`Downloaded: ${req.body.path}`);
                } else {
                    if (stats.isDirectory()) {
                        let files = await fs.promises.readdir(req.body.path);
                        res.json({
                            'files': files.map((f) => path.join(req.body.path, f))
                        })
                        console.log(`Listed: ${req.body.path}`);
                    } else {
                        console.log(`NotFound: ${req.body.path}`)
                        res.sendStatus(404);
                    }
                }
            }
        })
    }
})

console.log(`Starting server with port=${port}, auth=${auth}`)
console.log("Edit environment variable PORT and AUTH to customize")
app.listen(port, () => {
    console.log(`Listening on ${port}`)
})
