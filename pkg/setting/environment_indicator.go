package setting

import (
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"

	"gopkg.in/ini.v1"
)

const environmentIndicatorNameMaxLen = 64

// environmentIndicatorColorPattern matches an opaque hex color or a named banner color.
// The value is later placed in CSS, so anything else is rejected.
var environmentIndicatorColorPattern = regexp.MustCompile(`^#(?:[0-9a-f]{3}|[0-9a-f]{6})$|^(?:red|orange|yellow|green|blue|purple)$`)

// SanitizeEnvironmentIndicatorName returns the label shown on the environment banner.
// An empty input is valid and means the banner stays hidden. A value that contains
// characters outside the label set, or that is longer than 64 runes, is rejected.
func SanitizeEnvironmentIndicatorName(raw string) (string, bool) {
	name := strings.TrimSpace(raw)
	if name == "" {
		return "", true
	}
	if utf8.RuneCountInString(name) > environmentIndicatorNameMaxLen {
		return "", false
	}

	hasLetterOrNumber := false
	for _, r := range name {
		switch {
		case r == ' ' || isEnvironmentIndicatorPunctuation(r):
			continue
		case unicode.IsLetter(r) || unicode.IsNumber(r):
			hasLetterOrNumber = true
		default:
			return "", false
		}
	}
	if !hasLetterOrNumber {
		return "", false
	}
	return name, true
}

func (cfg *Cfg) readEnvironmentIndicator(iniFile *ini.File) {
	section := iniFile.Section("environment")
	name, nameOK := SanitizeEnvironmentIndicatorName(valueAsString(section, "indicator_name", ""))
	if !nameOK {
		cfg.Logger.Warn("ignoring invalid [environment] indicator_name")
	}
	cfg.EnvironmentIndicatorName = name

	color, colorOK := SanitizeEnvironmentIndicatorColor(valueAsString(section, "indicator_color", ""))
	if !colorOK {
		cfg.Logger.Warn("ignoring invalid [environment] indicator_color")
	}
	cfg.EnvironmentIndicatorColor = color
}

func isEnvironmentIndicatorPunctuation(r rune) bool {
	switch r {
	case '-', '_', '.', ',', '/', '(', ')', '&', '+', ':':
		return true
	default:
		return false
	}
}

// SanitizeEnvironmentIndicatorColor returns a CSS color for the environment banner.
// An empty input is valid and means the banner uses its default color.
// Accepted values are #RGB, #RRGGBB, and red, orange, yellow, green, blue, or purple.
func SanitizeEnvironmentIndicatorColor(raw string) (string, bool) {
	color := strings.ToLower(strings.TrimSpace(raw))
	if color == "" {
		return "", true
	}
	if !environmentIndicatorColorPattern.MatchString(color) {
		return "", false
	}
	return color, true
}
