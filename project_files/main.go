package main

import (
	"net/http"
	"fmt"
	"database/sql"
	"time"
	"path"
	"os"
	"io/ioutil"
	"encoding/json"
	"html/template"

	"github.com/gorilla/mux"
	_ "github.com/lib/pq"
)

const (
  host     = "172.22.0.4"
  port     = 5432
  user     = "projectmailservice"
  password = "P@ssw0rd"
  dbname   = "projectmailservice"
)

type PartsList struct {
	PartName string `json:"part_name"`
	Quantity int `json:"quantity"`
}
type DownloadsList struct {
	Type string `json:"type"`
	Name string `json:"name"`
	Link string `json:"link"`
}
type Project struct {
	Id   string `json:"id"`
	Name   string `json:"name"`
	Logo    string `json:"logo"`
	Skills []string `json:"skills"`
	Precursors []string `json:"precursors"`
	Description string `json:"description"`
	Parts []PartsList `json:"parts"`
	Downloads []DownloadsList `json:"downloads"`
}
type Projects struct {
	Projects []Project `json:"projects"`
}

type FileServer struct {
	Fs http.Handler
}

func main() {
	r := mux.NewRouter()
	r.HandleFunc("/register", RegisterUser)
	fs_indi := http.FileServer(http.Dir("./public"))
	fileserver := &FileServer{Fs: fs_indi}
	r.HandleFunc("/projects/{page}", ProjectDisplayInfo)
	r.PathPrefix("/").Handler(http.HandlerFunc(fileserver.ServeStatic))
	http.ListenAndServe(":3000", r)
}
func (filserver *FileServer) ServeStatic(w http.ResponseWriter, req *http.Request) {
	if req.URL.Path == "/" {
			req.URL.Path = "/main.html"
	}else if ext := path.Ext(req.URL.Path); ext == "" {
		req.URL.Path += ".html"
	}else if ext := path.Ext(req.URL.Path); ext == ".html" {
		http.Redirect(w, req, req.URL.Path[0:len(req.URL.Path)-len(ext)], http.StatusSeeOther)
	}
	filserver.Fs.ServeHTTP(w, req)
}
func RegisterUser(w http.ResponseWriter, req *http.Request) {
	if err := req.ParseForm(); err != nil {
		fmt.Fprintf(w, "Error: %v", err)
	}
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", host, port, user, password, dbname)
	db, err := sql.Open("postgres", psqlInfo)
  if err != nil {
    panic(err)
  }
  defer db.Close()

  err = db.Ping()
  if err != nil {
    panic(err)
  }

	timeNow := time.Now()
	sqlStatement := `INSERT INTO registration (time_added, email) VALUES ($1, $2)`
	_, err = db.Exec(sqlStatement, timeNow.String(), req.FormValue("email"))
	if err != nil {
		panic(err)
	}
}

func ProjectDisplayInfo(w http.ResponseWriter, req *http.Request){
	pagereq := mux.Vars(req)
	projectsFile, err := os.Open("public/projects.json")
	if err != nil {
			fmt.Println(err)
	}
	defer projectsFile.Close()
	byteValue, _ := ioutil.ReadAll(projectsFile)
	var projects Projects
	json.Unmarshal(byteValue, &projects)
	for i := 0; i < len(projects.Projects); i++ { 
    if projects.Projects[i].Id == pagereq["page"] {
			tmpl := template.Must(template.ParseFiles("public/projectpage.html"))
			tmpl.Execute(w, projects.Projects[i])
		}
	}
	//http.Error(w, "Bad request", 400)
}