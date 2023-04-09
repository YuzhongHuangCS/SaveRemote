package main

import (
	"fmt"
	"os"
	"io"
	"runtime"
	"net/http"
)

// 10 MB
const MAX_UPLOAD_SIZE = 10 * 1024 * 1024
var addr = ":8765"
var auth = ""

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

	fmt.Printf("Usage: %s [addr]{%s} [auth]{%s}\n", os.Args[0], addr, auth)
	if len(os.Args) > 1 { addr = os.Args[1] }
	if len(os.Args) > 2 { auth = os.Args[2] }

	fmt.Printf("Starting server with addr=%s, auth=%s\n", addr, auth)
	http.HandleFunc("/", requestHandler)
	http.ListenAndServe(addr, nil)
}
