package api

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/setting"
	"github.com/grafana/grafana/pkg/web/webtest"
)

func TestAPI_FeatureToggles(t *testing.T) {
	readPerm := []accesscontrol.Permission{{Action: accesscontrol.ActionFeatureTogglesRead}}
	writePerm := []accesscontrol.Permission{{Action: accesscontrol.ActionFeatureTogglesWrite}}

	t.Run("rejects list and update without permission", func(t *testing.T) {
		manager := newProductionFeatureManager(t)
		server := featureToggleServer(t, manager)
		user := userWithPermissions(1, []accesscontrol.Permission{{Action: "wrong"}})

		res, err := server.Send(webtest.RequestWithSignedInUser(server.NewGetRequest("/api/admin/feature-toggles"), user))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, res.StatusCode)
		require.NoError(t, res.Body.Close())

		req := server.NewRequest(http.MethodPut, "/api/admin/feature-toggles/panelTitleSearch", bytes.NewReader([]byte(`{"enabled":true}`)))
		res, err = server.SendJSON(webtest.RequestWithSignedInUser(req, user))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, res.StatusCode)
		require.NoError(t, res.Body.Close())
		require.False(t, manager.IsEnabledGlobally(featuremgmt.FlagPanelTitleSearch))
	})

	t.Run("lists flags for a reader", func(t *testing.T) {
		server := featureToggleServer(t, newProductionFeatureManager(t))
		res, err := server.Send(webtest.RequestWithSignedInUser(
			server.NewGetRequest("/api/admin/feature-toggles"),
			userWithPermissions(1, readPerm),
		))
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, res.StatusCode)

		var toggles []featuremgmt.RuntimeToggle
		require.NoError(t, json.NewDecoder(res.Body).Decode(&toggles))
		require.NoError(t, res.Body.Close())

		var found *featuremgmt.RuntimeToggle
		for i := range toggles {
			if toggles[i].Name == featuremgmt.FlagPanelTitleSearch {
				found = &toggles[i]
				break
			}
		}
		require.NotNil(t, found)
		require.Equal(t, "Search for dashboards using panel title", found.Description)
		require.Equal(t, "preview", found.Stage)
		require.False(t, found.Enabled)
	})

	t.Run("persists a runtime toggle for later reads", func(t *testing.T) {
		manager := newProductionFeatureManager(t)
		server := featureToggleServer(t, manager)
		writer := userWithPermissions(1, writePerm)
		reader := userWithPermissions(1, readPerm)

		req := server.NewRequest(http.MethodPut, "/api/admin/feature-toggles/panelTitleSearch", bytes.NewReader([]byte(`{"enabled":true}`)))
		res, err := server.SendJSON(webtest.RequestWithSignedInUser(req, writer))
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, res.StatusCode)
		body, err := io.ReadAll(res.Body)
		require.NoError(t, err)
		require.NoError(t, res.Body.Close())
		require.JSONEq(t, `{
			"name": "panelTitleSearch",
			"description": "Search for dashboards using panel title",
			"stage": "preview",
			"enabled": true
		}`, string(body))
		require.True(t, manager.IsEnabledGlobally(featuremgmt.FlagPanelTitleSearch))

		res, err = server.Send(webtest.RequestWithSignedInUser(server.NewGetRequest("/api/admin/feature-toggles"), reader))
		require.NoError(t, err)
		var toggles []featuremgmt.RuntimeToggle
		require.NoError(t, json.NewDecoder(res.Body).Decode(&toggles))
		require.NoError(t, res.Body.Close())
		var enabled bool
		for _, toggle := range toggles {
			if toggle.Name == featuremgmt.FlagPanelTitleSearch {
				enabled = toggle.Enabled
			}
		}
		require.True(t, enabled)
	})

	t.Run("rejects an unknown flag and a dev-mode flag in production", func(t *testing.T) {
		manager := newProductionFeatureManager(t)
		server := featureToggleServer(t, manager)
		writer := userWithPermissions(1, writePerm)

		unknown := server.NewRequest(http.MethodPut, "/api/admin/feature-toggles/notARealFlag", bytes.NewReader([]byte(`{"enabled":true}`)))
		res, err := server.SendJSON(webtest.RequestWithSignedInUser(unknown, writer))
		require.NoError(t, err)
		require.Equal(t, http.StatusNotFound, res.StatusCode)
		require.NoError(t, res.Body.Close())

		devOnly := server.NewRequest(http.MethodPut, "/api/admin/feature-toggles/live.runAPIServer", bytes.NewReader([]byte(`{"enabled":true}`)))
		res, err = server.SendJSON(webtest.RequestWithSignedInUser(devOnly, writer))
		require.NoError(t, err)
		require.Equal(t, http.StatusBadRequest, res.StatusCode)
		require.NoError(t, res.Body.Close())
		require.False(t, manager.IsEnabledGlobally(featuremgmt.FlagLiveRunAPIServer))
	})
}

func newProductionFeatureManager(t *testing.T) *featuremgmt.FeatureManager {
	t.Helper()
	cfg := setting.NewCfg()
	cfg.Env = setting.Prod
	manager, err := featuremgmt.ProvideManagerService(cfg)
	require.NoError(t, err)
	return manager
}

func featureToggleServer(t *testing.T, manager *featuremgmt.FeatureManager) *webtest.Server {
	t.Helper()
	return SetupAPITestServer(t, func(hs *HTTPServer) {
		hs.Features = manager
	})
}
