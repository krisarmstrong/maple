GOCACHE ?= $(CURDIR)/.cache/go-build
GO_PACKAGES := $(shell GOCACHE=$(GOCACHE) go list ./... | grep -v '/frontend/node_modules/')
GO_BUILD_TAGS ?= desktop,wv2runtime.download,production
GO_LDFLAGS ?= -w -s -extldflags '-framework UniformTypeIdentifiers'
WAILS ?= /Users/krisarmstrong/go/bin/wails
WAILS_LDFLAGS ?= -w -s
WAILS_BUILD_FLAGS ?= -clean -trimpath -tags "$(GO_BUILD_TAGS)"

.PHONY: build dev fmt fmt-check lint package-all package-dryrun package-linux package-linux-dryrun package-macos package-macos-dryrun package-windows package-windows-dryrun test test-go test-ui tidy

build:
	npm --prefix frontend run build
	GOCACHE=$(GOCACHE) go build -buildvcs=false -tags $(GO_BUILD_TAGS) -ldflags "$(GO_LDFLAGS)" -o build/bin/maple

dev:
	GOCACHE=$(GOCACHE) $(WAILS) dev

fmt:
	gofmt -w *.go internal
	npm --prefix frontend run format

fmt-check:
	test -z "$$(gofmt -l *.go internal)"
	npm --prefix frontend run format:check

lint:
	GOCACHE=$(GOCACHE) go test $(GO_PACKAGES)
	npm --prefix frontend run lint
	npm --prefix frontend run typecheck

test: test-go test-ui

test-go:
	GOCACHE=$(GOCACHE) go test $(GO_PACKAGES)

test-ui:
	npm --prefix frontend test

tidy:
	GOCACHE=$(GOCACHE) go mod tidy

package-macos:
	GOCACHE=$(GOCACHE) $(WAILS) build $(WAILS_BUILD_FLAGS) -ldflags "$(GO_LDFLAGS)" -platform darwin/arm64

package-macos-dryrun:
	GOCACHE=$(GOCACHE) $(WAILS) build -dryrun $(WAILS_BUILD_FLAGS) -ldflags "$(GO_LDFLAGS)" -platform darwin/arm64

package-windows:
	GOCACHE=$(GOCACHE) $(WAILS) build $(WAILS_BUILD_FLAGS) -ldflags "$(WAILS_LDFLAGS)" -platform windows/amd64 -webview2 download

package-windows-dryrun:
	GOCACHE=$(GOCACHE) $(WAILS) build -dryrun $(WAILS_BUILD_FLAGS) -ldflags "$(WAILS_LDFLAGS)" -platform windows/amd64 -webview2 download

package-linux:
	GOCACHE=$(GOCACHE) $(WAILS) build $(WAILS_BUILD_FLAGS) -ldflags "$(WAILS_LDFLAGS)" -platform linux/amd64

package-linux-dryrun:
	GOCACHE=$(GOCACHE) $(WAILS) build -dryrun $(WAILS_BUILD_FLAGS) -ldflags "$(WAILS_LDFLAGS)" -platform linux/amd64

package-all: package-macos package-windows package-linux

package-dryrun: package-macos-dryrun package-windows-dryrun package-linux-dryrun
