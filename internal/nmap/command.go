package nmap

import "github.com/krisarmstrong/maple/internal/scanner"

func BuildPreview(nmapPath string, request scanner.ScanRequest) (scanner.CommandPreview, error) {
	request.NmapPath = nmapPath
	command, profile, targets, err := previewCommandParts(request)
	if err != nil {
		return scanner.CommandPreview{}, err
	}
	return scanner.CommandPreview{
		Executable: command.Path,
		Args:       append([]string(nil), command.Args...),
		Targets:    targets,
		Profile:    profile,
	}, nil
}
