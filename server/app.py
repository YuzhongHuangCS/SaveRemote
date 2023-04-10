import os
import asyncio
import tornado.web

PORT = os.environ.get("PORT", "8765")
AUTH = os.environ.get("AUTH", "")

class MainHandler(tornado.web.RequestHandler):
    def post(self):
        auth = self.get_body_argument("auth")
        path = self.get_body_argument("path")
        if auth == AUTH:
            with open(path, 'wb') as fout:
                fout.write(self.request.files['file'][0]['body'])
            print("Saved:", path)
            self.finish("Saved")
        else:
            raise tornado.web.HTTPError(status_code=401)

async def main():
    app = tornado.web.Application([
        (r"/", MainHandler),
    ])
    app.listen(PORT)
    await asyncio.Event().wait()

if __name__ == "__main__":
    print(f"Starting server with port={PORT}, auth={AUTH}")
    print("Edit environment variable PORT and AUTH to customize")
    asyncio.run(main())
