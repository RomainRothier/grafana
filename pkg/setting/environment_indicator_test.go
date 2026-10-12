package setting

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestSanitizeEnvironmentIndicatorName(t *testing.T) {
	t.Run("empty and whitespace hide the banner", func(t *testing.T) {
		name, ok := SanitizeEnvironmentIndicatorName("")
		assert.True(t, ok)
		assert.Empty(t, name)

		name, ok = SanitizeEnvironmentIndicatorName("   ")
		assert.True(t, ok)
		assert.Empty(t, name)
	})

	t.Run("keeps a normal label", func(t *testing.T) {
		name, ok := SanitizeEnvironmentIndicatorName("  staging  ")
		assert.True(t, ok)
		assert.Equal(t, "staging", name)

		name, ok = SanitizeEnvironmentIndicatorName("dev-eu (1)")
		assert.True(t, ok)
		assert.Equal(t, "dev-eu (1)", name)

		name, ok = SanitizeEnvironmentIndicatorName("préprod")
		assert.True(t, ok)
		assert.Equal(t, "préprod", name)
	})

	t.Run("rejects markup, control characters, and overlong labels", func(t *testing.T) {
		_, ok := SanitizeEnvironmentIndicatorName("<script>alert(1)</script>")
		assert.False(t, ok)

		_, ok = SanitizeEnvironmentIndicatorName("dev\nstaging")
		assert.False(t, ok)

		_, ok = SanitizeEnvironmentIndicatorName(strings.Repeat("a", environmentIndicatorNameMaxLen+1))
		assert.False(t, ok)

		name, ok := SanitizeEnvironmentIndicatorName(strings.Repeat("a", environmentIndicatorNameMaxLen))
		assert.True(t, ok)
		assert.Equal(t, strings.Repeat("a", environmentIndicatorNameMaxLen), name)
	})
}

func TestSanitizeEnvironmentIndicatorColor(t *testing.T) {
	t.Run("empty uses the default color", func(t *testing.T) {
		color, ok := SanitizeEnvironmentIndicatorColor("  ")
		assert.True(t, ok)
		assert.Empty(t, color)
	})

	t.Run("accepts hex and named colors", func(t *testing.T) {
		color, ok := SanitizeEnvironmentIndicatorColor("#ABC")
		assert.True(t, ok)
		assert.Equal(t, "#abc", color)

		color, ok = SanitizeEnvironmentIndicatorColor("  #112233 ")
		assert.True(t, ok)
		assert.Equal(t, "#112233", color)

		color, ok = SanitizeEnvironmentIndicatorColor("Red")
		assert.True(t, ok)
		assert.Equal(t, "red", color)
	})

	t.Run("rejects values that are not a single color", func(t *testing.T) {
		for _, raw := range []string{
			"red;background:url(https://evil.test)",
			"#1122334455",
			"#xyz",
			"expression(alert(1))",
			"rgb(1,2,3)",
		} {
			color, ok := SanitizeEnvironmentIndicatorColor(raw)
			assert.False(t, ok, raw)
			assert.Empty(t, color, raw)
		}
	})
}

func TestEnvironmentIndicatorFromINI(t *testing.T) {
	t.Run("unset when the section is missing", func(t *testing.T) {
		cfg, err := NewCfgFromBytes([]byte(""))
		require.NoError(t, err)
		assert.Empty(t, cfg.EnvironmentIndicatorName)
		assert.Empty(t, cfg.EnvironmentIndicatorColor)
	})

	t.Run("reads a label and color", func(t *testing.T) {
		cfg, err := NewCfgFromBytes([]byte(`
[environment]
indicator_name = staging
indicator_color = #1A73E8
`))
		require.NoError(t, err)
		assert.Equal(t, "staging", cfg.EnvironmentIndicatorName)
		assert.Equal(t, "#1a73e8", cfg.EnvironmentIndicatorColor)
	})

	t.Run("drops invalid values instead of passing them to the frontend", func(t *testing.T) {
		cfg, err := NewCfgFromBytes([]byte(`
[environment]
indicator_name = <script>alert(1)</script>
indicator_color = red; } body { display: none }
`))
		require.NoError(t, err)
		assert.Empty(t, cfg.EnvironmentIndicatorName)
		assert.Empty(t, cfg.EnvironmentIndicatorColor)
	})
}

func TestEnvironmentIndicatorEnvOverride(t *testing.T) {
	t.Setenv("GF_ENVIRONMENT_INDICATOR_NAME", "dev")
	t.Setenv("GF_ENVIRONMENT_INDICATOR_COLOR", "#abc")

	cfg := NewCfg()
	err := cfg.Load(CommandLineArgs{HomePath: "../../"})
	require.NoError(t, err)

	assert.Equal(t, "dev", cfg.EnvironmentIndicatorName)
	assert.Equal(t, "#abc", cfg.EnvironmentIndicatorColor)
}
