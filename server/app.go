package main

import (
	"fmt"
	"os"
	"io"
	"path"
	"runtime"
	"net/http"
)

// 10 MB
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024
var addr = os.Getenv("ADDR")
var auth = os.Getenv("AUTH")

func requestHandler(w http.ResponseWriter, r *http.Request) {
	if (r.Method == "POST") {
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

func main() {
	runtime.GOMAXPROCS(1)
	if len(addr) == 0 {addr = ":8765"}

	fmt.Printf("Starting server with addr=%s, auth=%s\n", addr, auth)
	fmt.Println("Edit environment variable ADDR and AUTH to customize")
	http.HandleFunc("/", requestHandler)
	http.ListenAndServe(addr, nil)
}
