package featuremgmt

import (
	"context"
	"testing"

	"github.com/open-feature/go-sdk/openfeature"
	"github.com/open-feature/go-sdk/openfeature/memprovider"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/setting"
)

func TestSetRuntimeToggle(t *testing.T) {
	cfg := setting.NewCfg()
	cfg.Env = setting.Prod
	fm, err := ProvideManagerService(cfg)
	require.NoError(t, err)

	require.False(t, fm.IsEnabledGlobally(FlagPanelTitleSearch))
	enabled, err := fm.SetRuntimeToggle(FlagPanelTitleSearch, true)
	require.NoError(t, err)
	require.Equal(t, RuntimeToggle{
		Name:        "panelTitleSearch",
		Description: "Search for dashboards using panel title",
		Stage:       "preview",
		Enabled:     true,
	}, enabled)
	require.True(t, fm.IsEnabledGlobally(FlagPanelTitleSearch))
	require.True(t, fm.GetEnabled(context.Background())[FlagPanelTitleSearch])

	disabled, err := fm.SetRuntimeToggle(FlagCloudWatchCrossAccountQuerying, false)
	require.NoError(t, err)
	require.False(t, disabled.Enabled)
	require.False(t, fm.IsEnabledGlobally(FlagCloudWatchCrossAccountQuerying))
	_, stillOn := fm.GetEnabled(context.Background())[FlagCloudWatchCrossAccountQuerying]
	require.False(t, stillOn)

	_, err = fm.SetRuntimeToggle("notARealFlag", true)
	require.ErrorIs(t, err, ErrUnknownFeatureToggle)
	require.False(t, fm.IsEnabledGlobally("notARealFlag"))

	_, err = fm.SetRuntimeToggle(FlagLiveRunAPIServer, true)
	require.ErrorIs(t, err, ErrFeatureToggleDevMode)
	require.False(t, fm.IsEnabledGlobally(FlagLiveRunAPIServer))
}

func TestSetRuntimeToggleUpdatesStaticOpenFeatureProvider(t *testing.T) {
	cfg := setting.NewCfg()
	fm, err := ProvideManagerService(cfg)
	require.NoError(t, err)

	flags, err := buildStaticFlagsMapFromCfg(cfg)
	require.NoError(t, err)
	require.NoError(t, openfeature.SetProviderAndWait(memprovider.NewInMemoryProvider(flags)))
	t.Cleanup(func() {
		openfeature.Shutdown()
	})

	client := openfeature.NewDefaultClient()
	before, err := client.BooleanValue(context.Background(), FlagPanelTitleSearch, true, openfeature.EvaluationContext{})
	require.NoError(t, err)
	require.False(t, before)

	_, err = fm.SetRuntimeToggle(FlagPanelTitleSearch, true)
	require.NoError(t, err)

	after, err := client.BooleanValue(context.Background(), FlagPanelTitleSearch, false, openfeature.EvaluationContext{})
	require.NoError(t, err)
	require.True(t, after)
}

func TestListRuntimeTogglesSortsByName(t *testing.T) {
	fm := WithManager("zeta", true, "alpha", false)
	fm.flags["zeta"].Description = "last"
	fm.flags["zeta"].Stage = FeatureStageGeneralAvailability
	fm.flags["alpha"].Description = "first"
	fm.flags["alpha"].Stage = FeatureStageExperimental

	require.Equal(t, []RuntimeToggle{
		{Name: "alpha", Description: "first", Stage: "experimental", Enabled: false},
		{Name: "zeta", Description: "last", Stage: "GA", Enabled: true},
	}, fm.ListRuntimeToggles())
}
