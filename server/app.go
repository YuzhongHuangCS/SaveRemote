package main

import (
	"fmt"
	"os"
	"io"
	"io/ioutil"
	"path"
	"path/filepath"
	"runtime"
	"net/http"
	"encoding/json"
)

// 1 GB
const MAX_UPLOAD_SIZE = 1024 * 1024 * 1024;
var addr = os.Getenv("ADDR")
var auth = os.Getenv("AUTH")

func uploadHandler(w http.ResponseWriter, r *http.Request) {
	if (r.Method == http.MethodPost) {
		r.Body = http.MaxBytesReader(w, r.Body, MAX_UPLOAD_SIZE)
		if err := r.ParseMultipartForm(MAX_UPLOAD_SIZE); err != nil {
			fmt.Println(err)
			http.Error(w, http.StatusText(http.StatusRequestEntityTooLarge), http.StatusRequestEntityTooLarge)
			return
		}

		file, _, err := r.FormFile("file")
		if err != nil {
			fmt.Println(err)
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		defer file.Close()

		if len(r.Form["auth"]) > 0 && r.Form["auth"][0] == auth && len(r.Form["path"]) > 0 {
			savePath := r.Form["path"][0]
			os.MkdirAll(path.Dir(savePath), os.ModePerm)
			dst, err := os.Create(savePath)
			if err != nil {
				fmt.Println(err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			defer dst.Close()

			_, err = io.Copy(dst, file)
			if err != nil {
				fmt.Println(err)
				http.Error(w, err.Error(), http.StatusInternalServerError)
				return
			}
			fmt.Println("Saved:", savePath)
			fmt.Fprintf(w, "Saved")
		} else {
			fmt.Println(r.Form)
			http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		}
	} else {
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
	}
}

func downloadHandler(w http.ResponseWriter, r *http.Request) {
	if (r.Method == http.MethodPost) {
		r.ParseForm()

		if len(r.Form["auth"]) > 0 && r.Form["auth"][0] == auth && len(r.Form["path"]) > 0 {
			readPath := r.Form["path"][0]
			fi, err := os.Stat(readPath)
			if err != nil {
				paths, _ := filepath.Glob(readPath)
				if len(paths) > 0 {
					w.Header().Set("content-type", "application/json")
					json.NewEncoder(w).Encode(map[string][]string {"files": paths})
					fmt.Println("Listed:", readPath)
				} else {
					fmt.Println("NotFound:", readPath)
					http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
				}
				return
			}

			switch mode := fi.Mode(); {
				case mode.IsRegular():
					fileBytes, _ := ioutil.ReadFile(readPath)
					w.Header().Set("content-type", "application/octet-stream")
					w.Write(fileBytes)
					fmt.Println("Downloaded:", readPath)
				case mode.IsDir():
					files, _ := ioutil.ReadDir(readPath)
					paths := []string {}
					for _, file := range files {
						paths = append(paths, path.Join(readPath, file.Name()));
					}

					w.Header().Set("content-type", "application/json")
					json.NewEncoder(w).Encode(map[string][]string {"files": paths})
					fmt.Println("Listed:", readPath)
				default:
					fmt.Println("NotFound:", readPath)
					http.Error(w, http.StatusText(http.StatusNotFound), http.StatusNotFound)
			}
		} else {
			fmt.Println(r.Form)
			http.Error(w, http.StatusText(http.StatusUnauthorized), http.StatusUnauthorized)
		}
	} else {
		http.Error(w, http.StatusText(http.StatusMethodNotAllowed), http.StatusMethodNotAllowed)
	}
}

func main() {
	runtime.GOMAXPROCS(1)
	if len(addr) == 0 {addr = ":8765"}

	fmt.Printf("Starting server with addr=%s, auth=%s\n", addr, auth)
	fmt.Println("Edit environment variable ADDR and AUTH to customize")
	http.HandleFunc("/upload", uploadHandler)
	http.HandleFunc("/download", downloadHandler)
	http.ListenAndServe(addr, nil)
}
