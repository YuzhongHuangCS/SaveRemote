import os
import glob
import asyncio
import tornado.web

PORT = os.environ.get("PORT", "8765")
AUTH = os.environ.get("AUTH", "")

class UploadHandler(tornado.web.RequestHandler):
    def post(self):
        auth = self.get_body_argument("auth")
        path = self.get_body_argument("path")
        if auth == AUTH:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, 'wb') as fout:
                fout.write(self.request.files['file'][0]['body'])
            self.finish("Saved")
            print("Saved:", path)
        else:
            raise tornado.web.HTTPError(status_code=401)

class DownloadHandler(tornado.web.RequestHandler):
    def post(self):
        auth = self.get_body_argument("auth")
        path = self.get_body_argument("path")
        if auth == AUTH:
            if os.path.isfile(path):
                self.set_header('content-type', 'application/octet-stream')
                self.finish(open(path, 'rb').read())
                print("Downloaded:", path)
            elif os.path.isdir(path):
                self.finish({'files': [os.path.join(path, f) for f in os.listdir(path)]})
                print("Listed:", path)
            else:
                globs = glob.glob(path)
                if len(globs) > 0:
                    self.finish({'files': globs})
                    print("Listed:", path)
                else:
                    print("NotFound:", path)
                    raise tornado.web.HTTPError(status_code=404)
        else:
            raise tornado.web.HTTPError(status_code=401)

async def main():
    app = tornado.web.Application([
        (r"/upload", UploadHandler),
        (r"/download", DownloadHandler),
    ])
    app.listen(PORT)
    await asyncio.Event().wait()

if __name__ == "__main__":
    print(f"Starting server with port={PORT}, auth={AUTH}")
    print("Edit environment variable PORT and AUTH to customize")
    asyncio.run(main())
