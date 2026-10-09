package setting

import (
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"

	"gopkg.in/ini.v1"
)

const maxEnvironmentIndicatorLabelRunes = 64

// namedEnvironmentIndicatorColors are the only non-hex values accepted.
// The frontend maps the same names onto theme colors.
var namedEnvironmentIndicatorColors = map[string]struct{}{
	"blue":   {},
	"green":  {},
	"orange": {},
	"red":    {},
	"purple": {},
}

var environmentIndicatorHex = regexp.MustCompile(`^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$`)

// NormalizeEnvironmentIndicator prepares [environment] indicator_label and indicator_color.
// An empty label hides the banner, so an instance that never set one stays visually unchanged.
// Color is limited to hex and a few names so the value can only be used as a single CSS color.
// colorRejected is true when a non-empty color was dropped; the label is still returned.
func NormalizeEnvironmentIndicator(label, color string) (normalizedLabel, normalizedColor string, colorRejected bool) {
	label = strings.TrimSpace(stripControlChars(label))
	if label == "" {
		return "", "", false
	}
	if utf8.RuneCountInString(label) > maxEnvironmentIndicatorLabelRunes {
		label = string([]rune(label)[:maxEnvironmentIndicatorLabelRunes])
		label = strings.TrimSpace(label)
	}
	if label == "" {
		return "", "", false
	}

	color = strings.TrimSpace(color)
	if color == "" {
		return label, "", false
	}
	if _, ok := namedEnvironmentIndicatorColors[strings.ToLower(color)]; ok {
		return label, strings.ToLower(color), false
	}
	if environmentIndicatorHex.MatchString(color) {
		return label, color, false
	}
	return label, "", true
}

func stripControlChars(value string) string {
	return strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return -1
		}
		return r
	}, value)
}

func truncateForLog(value string) string {
	const limit = 80
	if utf8.RuneCountInString(value) <= limit {
		return value
	}
	return string([]rune(value)[:limit])
}

func (cfg *Cfg) readEnvironmentIndicatorSettings(iniFile *ini.File) {
	section := iniFile.Section("environment")
	rawLabel := valueAsString(section, "indicator_label", "")
	rawColor := valueAsString(section, "indicator_color", "")
	label, color, colorRejected := NormalizeEnvironmentIndicator(rawLabel, rawColor)
	if colorRejected {
		cfg.Logger.Warn("Ignoring invalid environment indicator_color", "color", truncateForLog(rawColor))
	}
	cfg.EnvironmentIndicatorLabel = label
	cfg.EnvironmentIndicatorColor = color
}
