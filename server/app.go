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

		if len(r.Form["auth"]) > 0 && r.Form["auth"][0] == "nOgjXyCG68tq2E8" && len(r.Form["path"]) > 0 {
			savePath := "/home1/yuzhongh/surface_recon/" + r.Form["path"][0]

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
	http.HandleFunc("/", requestHandler)
	fmt.Println("Server Started")
	http.ListenAndServe(":8765", nil)
}
