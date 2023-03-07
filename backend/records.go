package main

import (
	"fmt"
	"io/ioutil"
	"log"
	"net"
	"os"
	"path/filepath"
	"time"

	"golang.org/x/crypto/ssh"
	git "github.com/go-git/go-git/v5"
	"github.com/go-git/go-git/v5/plumbing/object"
	gitssh "github.com/go-git/go-git/v5/plumbing/transport/ssh"
)

type RecordHandlerOptions struct {
	Name				string
	Email				string
	RepoPath		string
	RepoURL			string
	KeyFile			string
	RecordFile	string
}

type RecordHandler struct {
	auth				*gitssh.PublicKeys
	repo				*git.Repository
	worktree		*git.Worktree
	repoPath		string
	recordFile	string
	name				string
	email				string
}

func NewRecordHandler(options *RecordHandlerOptions) (*RecordHandler, error) {
	private_key, err := ioutil.ReadFile(options.KeyFile)
	if err != nil {
		return nil, err
	}

	signer, err := ssh.ParsePrivateKey(private_key)
	if err != nil {
		return nil, err
	}

	publicKeys := &gitssh.PublicKeys {
		User: "git",
		Signer: signer,
		HostKeyCallbackHelper: gitssh.HostKeyCallbackHelper {
			HostKeyCallback: func (hostname string, remote net.Addr, key ssh.PublicKey) error {
				return nil
			},
		},
	}

	repo, err := git.PlainOpen(options.RepoPath)
	if err != nil {
		log.Printf("No local git repository found at %s, cloning from %s", options.RepoPath, options.RepoURL)

		repo, err = git.PlainClone(options.RepoPath, false, &git.CloneOptions {
			Auth: publicKeys,
			URL: options.RepoURL,
			Progress: os.Stdout,
		})

		if err != nil {
			return nil, err
		}
	} else {
		log.Printf("Existing git repository at %s", options.RepoPath)
	}

	worktree, err := repo.Worktree()
	if err != nil {
		return nil, err
	}

	handler := &RecordHandler {
		publicKeys,
		repo,
		worktree,
		options.RepoPath,
		options.RecordFile,
		options.Name,
		options.Email,
	}

	return handler, nil
}

func (rh *RecordHandler) WriteRecord(record string) error {
	outputFile, err := os.OpenFile(filepath.Join(rh.repoPath, rh.recordFile), os.O_APPEND | os.O_CREATE | os.O_WRONLY, 0644)
	if err != nil {
		return err
	}

	defer outputFile.Close()

	if _, err := outputFile.WriteString(fmt.Sprintf("%s\n", record)); err != nil {
		return err
	}

	return nil
}

func (rh *RecordHandler) CommitRecord(message string) error {
	if _, err := rh.worktree.Add(rh.recordFile); err != nil {
		return err
	}

	_, err := rh.worktree.Commit(message, &git.CommitOptions {
		Author: &object.Signature {
			Name: rh.name,
			Email: rh.email,
			When: time.Now(),
		},
	})

	if err != nil {
		return err
	}

	err = rh.repo.Push(&git.PushOptions {
		Auth: rh.auth,
	})

	if err != nil {
		return err
	}

	return nil
}

// Not technically record stuff but it's git so ah well
func (rh *RecordHandler) Pull() error {
	return rh.worktree.Pull(&git.PullOptions {
		RemoteName: "origin",
	})
}
