package featuremgmt

import (
	"context"
	"testing"

	"github.com/stretchr/testify/require"
)

func TestFeatureManager(t *testing.T) {
	t.Run("check testing stubs", func(t *testing.T) {
		ft := WithManager("a", "b", "c")
		require.True(t, ft.IsEnabledGlobally("a"))
		require.True(t, ft.IsEnabledGlobally("b"))
		require.True(t, ft.IsEnabledGlobally("c"))
		require.False(t, ft.IsEnabledGlobally("d"))

		require.Equal(t, map[string]bool{"a": true, "b": true, "c": true}, ft.GetEnabled(context.Background()))

		// Explicit values
		ft = WithManager("a", true, "b", false)
		require.True(t, ft.IsEnabledGlobally("a"))
		require.False(t, ft.IsEnabledGlobally("b"))
		require.Equal(t, map[string]bool{"a": true}, ft.GetEnabled(context.Background()))
	})

	t.Run("check description and stage configs", func(t *testing.T) {
		ft := FeatureManager{
			flags: map[string]*FeatureFlag{},
		}
		ft.registerFlags(FeatureFlag{
			Name:        "a",
			Description: "first",
		}, FeatureFlag{
			Name:        "a",
			Description: "second",
		}, FeatureFlag{
			Name:  "a",
			Stage: FeatureStagePrivatePreview,
		}, FeatureFlag{
			Name: "a",
		})
		flag := ft.flags["a"]
		require.Equal(t, "second", flag.Description)
		require.Equal(t, FeatureStagePrivatePreview, flag.Stage)
	})

	t.Run("check startup false flags", func(t *testing.T) {
		ft := FeatureManager{
			flags: map[string]*FeatureFlag{},
			startup: map[string]bool{
				"a": true,
				"b": false, // but default true
			},
		}
		ft.registerFlags(FeatureFlag{
			Name: "a",
		}, FeatureFlag{
			Name:       "b",
			Expression: "true",
		}, FeatureFlag{
			Name: "c",
		})
		require.True(t, ft.IsEnabledGlobally("a"))
		require.False(t, ft.IsEnabledGlobally("b"))
		require.False(t, ft.IsEnabledGlobally("c"))
	})

	t.Run("runtime override enables and disables a flag", func(t *testing.T) {
		ft := WithManager("a", false, "b", true)
		require.False(t, ft.IsEnabledGlobally("a"))
		require.True(t, ft.IsEnabledGlobally("b"))

		require.NoError(t, ft.SetEnabled("a", true))
		require.True(t, ft.IsEnabledGlobally("a"))
		require.True(t, ft.IsEnabledGlobally("b"))

		require.NoError(t, ft.SetEnabled("b", false))
		require.False(t, ft.IsEnabledGlobally("b"))
		require.True(t, ft.IsEnabledGlobally("a"))
	})

	t.Run("runtime override of unknown flag fails", func(t *testing.T) {
		ft := WithManager("a", true)
		require.ErrorIs(t, ft.SetEnabled("missing", true), ErrUnknownFeatureFlag)
		require.True(t, ft.IsEnabledGlobally("a"))
	})
}
