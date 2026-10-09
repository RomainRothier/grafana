package setting

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestNormalizeEnvironmentIndicator(t *testing.T) {
	t.Run("empty label hides the banner and drops a color", func(t *testing.T) {
		label, color, rejected := NormalizeEnvironmentIndicator("   ", "#ff0000")
		require.Empty(t, label)
		require.Empty(t, color)
		require.False(t, rejected)
	})

	t.Run("trims the label and keeps a blank color", func(t *testing.T) {
		label, color, rejected := NormalizeEnvironmentIndicator("  staging  ", "  ")
		require.Equal(t, "staging", label)
		require.Empty(t, color)
		require.False(t, rejected)
	})

	t.Run("strips control characters from the label", func(t *testing.T) {
		label, color, rejected := NormalizeEnvironmentIndicator("sta\nge\ting", "")
		require.Equal(t, "staging", label)
		require.Empty(t, color)
		require.False(t, rejected)
	})

	t.Run("truncates the label to 64 characters", func(t *testing.T) {
		label, _, rejected := NormalizeEnvironmentIndicator(strings.Repeat("é", 65), "")
		require.Equal(t, strings.Repeat("é", 64), label)
		require.False(t, rejected)
	})

	t.Run("accepts a hex color and a named color", func(t *testing.T) {
		label, color, rejected := NormalizeEnvironmentIndicator("production", "#E02F44")
		require.Equal(t, "production", label)
		require.Equal(t, "#E02F44", color)
		require.False(t, rejected)

		label, color, rejected = NormalizeEnvironmentIndicator("dev", "Red")
		require.Equal(t, "dev", label)
		require.Equal(t, "red", color)
		require.False(t, rejected)
	})

	t.Run("drops an invalid color and keeps the label", func(t *testing.T) {
		label, color, rejected := NormalizeEnvironmentIndicator("dev", "expression(alert(1))")
		require.Equal(t, "dev", label)
		require.Empty(t, color)
		require.True(t, rejected)
	})
}

func TestEnvironmentIndicatorFromINI(t *testing.T) {
	skipStaticRootValidation = true

	t.Run("defaults leave the banner unset", func(t *testing.T) {
		cfg, err := NewCfgFromBytes([]byte(""))
		require.NoError(t, err)
		require.Empty(t, cfg.EnvironmentIndicatorLabel)
		require.Empty(t, cfg.EnvironmentIndicatorColor)
	})

	t.Run("reads a label and color", func(t *testing.T) {
		cfg, err := NewCfgFromBytes([]byte(`
[environment]
indicator_label = staging
indicator_color = #abc
`))
		require.NoError(t, err)
		require.Equal(t, "staging", cfg.EnvironmentIndicatorLabel)
		require.Equal(t, "#abc", cfg.EnvironmentIndicatorColor)
	})

	t.Run("ignores an invalid color", func(t *testing.T) {
		cfg, err := NewCfgFromBytes([]byte(`
[environment]
indicator_label = production
indicator_color = not-a-color
`))
		require.NoError(t, err)
		require.Equal(t, "production", cfg.EnvironmentIndicatorLabel)
		require.Empty(t, cfg.EnvironmentIndicatorColor)
	})
}
