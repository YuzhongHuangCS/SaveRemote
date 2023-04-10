use std::{env, str, fs, fs::File, io::Write, path::Path, net::SocketAddr};
use bytes::Bytes;
use axum::{Router, routing::post, http::StatusCode, extract::Multipart};

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let port = env::var("PORT").unwrap_or("8765".to_string()).parse::<u16>().unwrap();
    let auth = env::var("AUTH").unwrap_or("".to_string());
    println!("Starting server with port={port}, auth={auth}");
    println!("Edit environment variable PORT and AUTH to customize");

    // build our application with a route
    let app = Router::new().route("/", post(|mut multipart: Multipart| async move {
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
    }));

    // run it
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Listening on {addr}");
    axum::Server::bind(&addr).serve(app.into_make_service()).await.unwrap();
}
