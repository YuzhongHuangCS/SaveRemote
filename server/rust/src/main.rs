use std::{env, str, fs, fs::File, io::{Read, Write}, path::Path, net::SocketAddr};
use bytes::Bytes;
use axum::{Router, routing::post, http::StatusCode, Form, Json, extract::Multipart, response::IntoResponse};
use serde::{Deserialize, Serialize};
use glob::glob;

#[derive(Deserialize)]
struct DownloadRequest {
    auth: String,
    path: String,
}

#[derive(Serialize, Debug)]
struct DownloadResponse {
    files: Vec<String>,
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let port = env::var("PORT").unwrap_or("8765".to_string()).parse::<u16>().unwrap();
    let auth = env::var("AUTH").unwrap_or("".to_string());
    let auth2 = auth.clone();
    println!("Starting server with port={port}, auth={auth}");
    println!("Edit environment variable PORT and AUTH to customize");

    // build our application with a route
    let app = Router::new().route("/upload", post(|mut multipart: Multipart| async move {
        let mut token = String::new();
        let mut path = String::new();
        let mut buffer = Bytes::new();

        while let Some(field) = multipart.next_field().await.unwrap() {
            let name = field.name().unwrap().to_string();
            let data = field.bytes().await.unwrap();

            match &name[..] {
                "auth" => {token = str::from_utf8(& data).unwrap().to_string()},
                "path" => {path = str::from_utf8(& data).unwrap().to_string()},
                "file" => {buffer = data},
                _ => {},
            }
        }

        if token.len() > 0 && path.len() > 0 && buffer.len() > 0 {
            if token == auth {
                fs::create_dir_all(Path::new(&path).parent().unwrap()).unwrap();
                match File::create(path.clone()) {
                    Ok(mut file) => {
                        match file.write_all(&buffer) {
                            Ok(_) => {
                                println!("Saved: {path}");
                                return Ok("Saved");
                            }
                            Err(e) => {println!("Error: {e:?}"); return Err(StatusCode::INTERNAL_SERVER_ERROR)}
                        }
                    }
                    Err(e) => {println!("Error: {e:?}"); return Err(StatusCode::INTERNAL_SERVER_ERROR)}
                }
            } else {
                return Err(StatusCode::UNAUTHORIZED);
            }
        } else {
            return Err(StatusCode::BAD_REQUEST);
        }
    })).route("/download", post(|Form(req): Form<DownloadRequest>| async move {
        if req.auth == auth2 {
            let path = Path::new(&req.path);
            if path.is_file() {
                let mut file = File::open(path).unwrap();
                let mut buffer = Vec::<u8>::new();
                file.read_to_end(&mut buffer).unwrap();
                println!("Downloaded: {0}", req.path);
                return buffer.into_response();
            } else {
                if path.is_dir() {
                    let paths = path.read_dir().unwrap().map(|f| f.unwrap().path().to_str().unwrap().to_string()).collect::<Vec<String>>();
                    println!("Listed: {0}", req.path);
                    return Json(DownloadResponse {files: paths}).into_response();
                } else {
                    let paths = glob(&req.path).unwrap().map(|f| f.unwrap().as_path().to_str().unwrap().to_string()).collect::<Vec<String>>();
                    if paths.len() > 0 {
                        println!("Listed: {0}", req.path);
                        return Json(DownloadResponse {files: paths}).into_response();
                    } else {
                        return StatusCode::NOT_FOUND.into_response();
                    }
                }
            }
        } else {
            return StatusCode::UNAUTHORIZED.into_response();
        }
    }));

    // run it
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Listening on {addr}");
    axum::Server::bind(&addr).serve(app.into_make_service()).await.unwrap();
}
