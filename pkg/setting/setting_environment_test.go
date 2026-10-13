package setting

import (
	"strings"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestEnvironmentIndicatorSettings(t *testing.T) {
	t.Run("is unset by default", func(t *testing.T) {
		cfg, err := NewCfgFromBytes([]byte(""))
		require.NoError(t, err)
		require.Empty(t, cfg.EnvironmentIndicator.Name)
		require.Empty(t, cfg.EnvironmentIndicator.Color)
	})

	t.Run("reads a name and hex color from the environment section", func(t *testing.T) {
		cfg, err := NewCfgFromBytes([]byte(`
[environment]
name = Staging
color = #FF8800
`))
		require.NoError(t, err)
		require.Equal(t, "Staging", cfg.EnvironmentIndicator.Name)
		require.Equal(t, "#ff8800", cfg.EnvironmentIndicator.Color)
	})

	t.Run("maps an allowed color name to hex", func(t *testing.T) {
		cfg, err := NewCfgFromBytes([]byte(`
[environment]
name = Production
color = Red
`))
		require.NoError(t, err)
		require.Equal(t, "Production", cfg.EnvironmentIndicator.Name)
		require.Equal(t, "#ff0000", cfg.EnvironmentIndicator.Color)
	})

	t.Run("keeps the name and drops an unsafe color", func(t *testing.T) {
		cfg, err := NewCfgFromBytes([]byte(`
[environment]
name = Production
color = red;background:url(https://evil.test)
`))
		require.NoError(t, err)
		require.Equal(t, "Production", cfg.EnvironmentIndicator.Name)
		require.Empty(t, cfg.EnvironmentIndicator.Color)
	})

	t.Run("treats a blank name as unset", func(t *testing.T) {
		cfg, err := NewCfgFromBytes([]byte(`
[environment]
name =    
color = blue
`))
		require.NoError(t, err)
		require.Empty(t, cfg.EnvironmentIndicator.Name)
		require.Empty(t, cfg.EnvironmentIndicator.Color)
	})

	t.Run("keeps markup in the name and caps it at 64 characters", func(t *testing.T) {
		cfg, err := NewCfgFromBytes([]byte(`
[environment]
name = Staging<script>
`))
		require.NoError(t, err)
		require.Equal(t, "Staging<script>", cfg.EnvironmentIndicator.Name)

		long := strings.Repeat("é", 80)
		cfg, err = NewCfgFromBytes([]byte("[environment]\nname = " + long + "\n"))
		require.NoError(t, err)
		require.Equal(t, strings.Repeat("é", 64), cfg.EnvironmentIndicator.Name)
	})

	t.Run("overrides name and color from environment variables", func(t *testing.T) {
		t.Setenv("GF_ENVIRONMENT_NAME", "Production")
		t.Setenv("GF_ENVIRONMENT_COLOR", "#00aa00")

		cfg := NewCfg()
		err := cfg.Load(CommandLineArgs{HomePath: "../../"})
		require.NoError(t, err)
		require.Equal(t, "Production", cfg.EnvironmentIndicator.Name)
		require.Equal(t, "#00aa00", cfg.EnvironmentIndicator.Color)
	})

	t.Run("drops an unsafe color supplied by an environment variable", func(t *testing.T) {
		t.Setenv("GF_ENVIRONMENT_NAME", "Production")
		t.Setenv("GF_ENVIRONMENT_COLOR", "expression(alert(1))")

		cfg := NewCfg()
		err := cfg.Load(CommandLineArgs{HomePath: "../../"})
		require.NoError(t, err)
		require.Equal(t, "Production", cfg.EnvironmentIndicator.Name)
		require.Empty(t, cfg.EnvironmentIndicator.Color)
	})
}

func TestSanitizeEnvironmentIndicatorName(t *testing.T) {
	require.Equal(t, "Staging", SanitizeEnvironmentIndicatorName("Sta\nging\t"))
	require.Equal(t, "Staging<script>", SanitizeEnvironmentIndicatorName(" Staging<script> "))
	require.Empty(t, SanitizeEnvironmentIndicatorName(" \n\t "))
}

func TestSanitizeEnvironmentIndicatorColor(t *testing.T) {
	require.Equal(t, "#abc", SanitizeEnvironmentIndicatorColor("  #AbC "))
	require.Equal(t, "#ffbf00", SanitizeEnvironmentIndicatorColor("amber"))
	require.Equal(t, "#808080", SanitizeEnvironmentIndicatorColor("grey"))
	require.Empty(t, SanitizeEnvironmentIndicatorColor("#ff00"))
	require.Empty(t, SanitizeEnvironmentIndicatorColor("rgb(255,0,0)"))
	require.Empty(t, SanitizeEnvironmentIndicatorColor("#ff0000;"))
	require.Empty(t, SanitizeEnvironmentIndicatorColor("javascript:alert(1)"))
}
