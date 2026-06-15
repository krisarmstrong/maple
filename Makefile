GOCACHE ?= $(CURDIR)/.cache/go-build
GO_PACKAGES = $(shell GOCACHE=$(GOCACHE) go list ./... | grep -v '/frontend/node_modules/')
GO_BUILD_TAGS ?= desktop,wv2runtime.download,production
VERSION_PKG := github.com/krisarmstrong/maple/internal/version
VERSION ?= $(shell git describe --tags --always --dirty 2>/dev/null || echo dev)
COMMIT ?= $(shell git rev-parse --short=7 HEAD 2>/dev/null || echo unknown)
BUILD_TIME ?= $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
UI_BUILD_HASH = $(shell if [ -d "frontend/dist" ] && [ -n "$$(find frontend/dist -type f -print -quit 2>/dev/null)" ]; then \
	find frontend/dist -type f -exec md5 -q {} \; 2>/dev/null | sort | md5 -q 2>/dev/null || \
	find frontend/dist -type f -exec md5sum {} \; 2>/dev/null | sort | md5sum 2>/dev/null | cut -d' ' -f1; \
else echo unknown; fi)
VERSION_LDFLAGS = -X $(VERSION_PKG).Version=$(VERSION) -X $(VERSION_PKG).Commit=$(COMMIT) -X $(VERSION_PKG).BuildTime=$(BUILD_TIME) -X $(VERSION_PKG).UIBuildHash=$(UI_BUILD_HASH)
GO_BASE_LDFLAGS ?= -w -s -extldflags '-framework UniformTypeIdentifiers'
GO_LDFLAGS ?= $(GO_BASE_LDFLAGS) $(VERSION_LDFLAGS)
WAILS ?= wails
WAILS_BASE_LDFLAGS ?= -w -s
WAILS_LDFLAGS ?= $(WAILS_BASE_LDFLAGS) $(VERSION_LDFLAGS)
PACKAGE_BUILD_TAGS ?= $(GO_BUILD_TAGS)
WAILS_BUILD_FLAGS ?= -clean -trimpath -tags "$(PACKAGE_BUILD_TAGS)"
PACKAGE_PLATFORM ?= darwin/arm64
PACKAGE_LDFLAGS ?= $(WAILS_BASE_LDFLAGS)
WAILS_PLATFORM_FLAGS ?=
PACKAGE_VERSION ?= $(patsubst v%,%,$(VERSION))
PACKAGE_RELEASE ?= 1
PACKAGE_ARCH ?= amd64
PACKAGE_DEB_WEBKIT_DEP ?= libwebkit2gtk-4.1-0
PACKAGE_RPM_WEBKIT_DEP ?= webkit2gtk4.1
LINUX_PACKAGE_PLATFORM ?= linux/$(PACKAGE_ARCH)

.PHONY: build dev fmt fmt-check frontend-build lint package-all package-dryrun package-linux package-linux-amd64-dryrun package-linux-arm64-dryrun package-linux-deb package-linux-dryrun package-linux-installers package-linux-rpm package-macos package-macos-dryrun package-macos-installer package-macos-pkg package-platform package-windows package-windows-amd64-dryrun package-windows-arm64-dryrun package-windows-dryrun rc-check security test test-e2e test-go test-ui tidy

frontend-build:
	npm --prefix frontend run build

build: frontend-build
	GOCACHE=$(GOCACHE) go build -buildvcs=false -tags $(GO_BUILD_TAGS) -ldflags "$(GO_LDFLAGS)" -o build/bin/maple

dev:
	GOCACHE=$(GOCACHE) $(WAILS) dev

fmt:
	gofmt -w *.go internal
	npm --prefix frontend run format

fmt-check:
	test -z "$$(gofmt -l *.go internal)"
	npm --prefix frontend run format:check

lint: frontend-build
	GOCACHE=$(GOCACHE) go vet $(GO_PACKAGES)
	GOCACHE=$(GOCACHE) golangci-lint run
	npm --prefix frontend run lint
	npm --prefix frontend run typecheck

security: frontend-build
	GOCACHE=$(GOCACHE) govulncheck ./...
	GOCACHE=$(GOCACHE) gosec -quiet ./...
	gitleaks detect --no-banner --redact
	shellcheck scripts/*.sh

test: test-go test-ui

test-go: frontend-build
	GOCACHE=$(GOCACHE) go test $(GO_PACKAGES)

test-ui:
	npm --prefix frontend test

test-e2e:
	npm --prefix frontend run test:e2e

tidy:
	GOCACHE=$(GOCACHE) go mod tidy

package-platform: frontend-build
	GOCACHE=$(GOCACHE) $(WAILS) build $(WAILS_BUILD_FLAGS) -ldflags "$(PACKAGE_LDFLAGS) $(VERSION_LDFLAGS)" -platform $(PACKAGE_PLATFORM) $(WAILS_PLATFORM_FLAGS)

package-macos: frontend-build
	GOCACHE=$(GOCACHE) $(WAILS) build $(WAILS_BUILD_FLAGS) -ldflags "$(GO_LDFLAGS)" -platform darwin/arm64

package-macos-pkg:
	scripts/package-macos-pkg.sh "$(PACKAGE_VERSION)" "$(PACKAGE_ARCH)"

package-macos-installer: package-macos package-macos-pkg

package-macos-dryrun:
	GOCACHE=$(GOCACHE) $(WAILS) build -dryrun $(WAILS_BUILD_FLAGS) -ldflags "$(GO_LDFLAGS)" -platform darwin/arm64

package-windows: frontend-build
	GOCACHE=$(GOCACHE) $(WAILS) build $(WAILS_BUILD_FLAGS) -ldflags "$(WAILS_LDFLAGS)" -platform windows/amd64 -webview2 download

package-windows-dryrun: package-windows-amd64-dryrun

package-windows-amd64-dryrun:
	GOCACHE=$(GOCACHE) $(WAILS) build -dryrun $(WAILS_BUILD_FLAGS) -ldflags "$(WAILS_LDFLAGS)" -platform windows/amd64 -webview2 download

package-windows-arm64-dryrun:
	GOCACHE=$(GOCACHE) $(WAILS) build -dryrun $(WAILS_BUILD_FLAGS) -ldflags "$(WAILS_LDFLAGS)" -platform windows/arm64 -webview2 download

package-linux: frontend-build
	GOCACHE=$(GOCACHE) $(WAILS) build $(WAILS_BUILD_FLAGS) -ldflags "$(WAILS_LDFLAGS)" -platform $(LINUX_PACKAGE_PLATFORM)

package-linux-deb:
	mkdir -p dist
	MAPLE_DEB_WEBKIT_DEP=$(PACKAGE_DEB_WEBKIT_DEP) MAPLE_RPM_WEBKIT_DEP=$(PACKAGE_RPM_WEBKIT_DEP) MAPLE_PACKAGE_ARCH=$(PACKAGE_ARCH) MAPLE_PACKAGE_VERSION=$(PACKAGE_VERSION) MAPLE_PACKAGE_RELEASE=$(PACKAGE_RELEASE) nfpm package --config packaging/linux/nfpm.yaml --packager deb --target dist

package-linux-rpm:
	mkdir -p dist
	MAPLE_DEB_WEBKIT_DEP=$(PACKAGE_DEB_WEBKIT_DEP) MAPLE_RPM_WEBKIT_DEP=$(PACKAGE_RPM_WEBKIT_DEP) MAPLE_PACKAGE_ARCH=$(PACKAGE_ARCH) MAPLE_PACKAGE_VERSION=$(PACKAGE_VERSION) MAPLE_PACKAGE_RELEASE=$(PACKAGE_RELEASE) nfpm package --config packaging/linux/nfpm.yaml --packager rpm --target dist

package-linux-installers: package-linux package-linux-deb package-linux-rpm

package-linux-dryrun: package-linux-amd64-dryrun

package-linux-amd64-dryrun:
	GOCACHE=$(GOCACHE) $(WAILS) build -dryrun $(WAILS_BUILD_FLAGS) -ldflags "$(WAILS_LDFLAGS)" -platform linux/amd64

package-linux-arm64-dryrun:
	GOCACHE=$(GOCACHE) $(WAILS) build -dryrun $(WAILS_BUILD_FLAGS) -ldflags "$(WAILS_LDFLAGS)" -platform linux/arm64

package-all: package-macos package-windows package-linux

package-dryrun: package-macos-dryrun package-windows-amd64-dryrun package-windows-arm64-dryrun package-linux-amd64-dryrun package-linux-arm64-dryrun

rc-check: fmt-check lint test test-e2e security build package-dryrun
