package setting

import (
	"regexp"
	"strings"
	"unicode"
	"unicode/utf8"

	"gopkg.in/ini.v1"
)

const maxEnvironmentIndicatorNameRunes = 64

// environmentIndicatorNamedColors are the only color names accepted for the
// environment banner. Values are hex so a name can never be passed through to CSS.
// "amber" is included because it is the usual non-production warning color; it is
// not a CSS keyword, so it is mapped like the others.
var environmentIndicatorNamedColors = map[string]string{
	"red":    "#ff0000",
	"orange": "#ffa500",
	"amber":  "#ffbf00",
	"yellow": "#ffff00",
	"green":  "#008000",
	"blue":   "#0000ff",
	"purple": "#800080",
	"pink":   "#ffc0cb",
	"gray":   "#808080",
	"grey":   "#808080",
	"black":  "#000000",
	"white":  "#ffffff",
}

var environmentIndicatorHex = regexp.MustCompile(`^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$`)

// EnvironmentIndicatorSettings is the optional banner shown in the app chrome.
// An empty Name hides the banner.
type EnvironmentIndicatorSettings struct {
	Name  string
	Color string
}

func (cfg *Cfg) readEnvironmentIndicatorSettings(iniFile *ini.File) {
	section := iniFile.Section("environment")
	cfg.EnvironmentIndicator = EnvironmentIndicatorSettings{
		Name:  valueAsString(section, "name", ""),
		Color: valueAsString(section, "color", ""),
	}.Sanitized()
}

// Sanitized returns the banner settings safe to expose to the frontend.
// A color with no label is dropped, because the UI hides the banner in that case.
func (s EnvironmentIndicatorSettings) Sanitized() EnvironmentIndicatorSettings {
	name := SanitizeEnvironmentIndicatorName(s.Name)
	color := ""
	if name != "" {
		color = SanitizeEnvironmentIndicatorColor(s.Color)
	}
	return EnvironmentIndicatorSettings{Name: name, Color: color}
}

// SanitizeEnvironmentIndicatorName returns the label safe to render as text.
// Control characters are removed so a value cannot break out of the banner, and
// the result is capped so a config value cannot fill the viewport.
func SanitizeEnvironmentIndicatorName(raw string) string {
	var b strings.Builder
	b.Grow(len(raw))
	for _, r := range raw {
		if unicode.IsControl(r) {
			continue
		}
		b.WriteRune(r)
	}

	name := strings.TrimSpace(b.String())
	if utf8.RuneCountInString(name) <= maxEnvironmentIndicatorNameRunes {
		return name
	}

	return strings.TrimSpace(string([]rune(name)[:maxEnvironmentIndicatorNameRunes]))
}

// SanitizeEnvironmentIndicatorColor returns a hex color, or "" when raw is not
// a #RGB/#RRGGBB hex or one of the allowed names. Anything else is dropped so
// it cannot be interpolated into CSS.
func SanitizeEnvironmentIndicatorColor(raw string) string {
	color := strings.TrimSpace(raw)
	if color == "" {
		return ""
	}
	if environmentIndicatorHex.MatchString(color) {
		return strings.ToLower(color)
	}
	if hex, ok := environmentIndicatorNamedColors[strings.ToLower(color)]; ok {
		return hex
	}
	return ""
}
