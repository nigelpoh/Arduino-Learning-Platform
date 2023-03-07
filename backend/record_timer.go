package main

import (
	"fmt"
	"log"
	"sync"
	"time"
)

type AutoCommittingRecordHandler struct {
	mux *sync.Mutex
	rh *RecordHandler
	timeout int64
	increment int64
	errors chan error
	sigchan chan bool
	hasUncommitted bool
}

func NewAutoCommittingRecordHandler(options *RecordHandlerOptions, timeout int64, errors chan error) (*AutoCommittingRecordHandler, error) {
	rh, err := NewRecordHandler(options)
	if err != nil {
		return nil, err
	}

	sigchan := make(chan bool)

	acrh := &AutoCommittingRecordHandler {
		&sync.Mutex{},
		rh,
		timeout,
		timeout,
		errors,
		sigchan,
		false,
	}

	go acrh.CommitLoop()

	return acrh, nil
}

func (acrh *AutoCommittingRecordHandler) WriteRecord(record string) error {
	acrh.mux.Lock()
	err := acrh.rh.WriteRecord(record)
	if err != nil {
		return err
	}

	acrh.hasUncommitted = true
	acrh.timeout += acrh.increment
	acrh.mux.Unlock()

	return nil
}

func (acrh *AutoCommittingRecordHandler) Close() {
	acrh.sigchan <- true
}

func (acrh *AutoCommittingRecordHandler) CommitLoop() {
	for {
		select {
			case <-acrh.sigchan:
				break
			default:
				acrh.mux.Lock()
				acrh.timeout -= 1
				if acrh.timeout < 0 {
					acrh.timeout = acrh.increment
					if acrh.hasUncommitted {
						err := acrh.rh.CommitRecord(fmt.Sprintf("update: record file at %s", time.Now().Format("2006/01/02 15:04:05")))
						if err != nil {
							log.Println(err)
							acrh.errors <- err
						}

						acrh.hasUncommitted = false
					}
				}
				acrh.mux.Unlock()
		}

		time.Sleep(time.Second)
	}
}
