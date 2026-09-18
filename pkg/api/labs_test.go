package api

import (
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/grafana/grafana/pkg/services/accesscontrol"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/web/webtest"
)

func TestAPI_GetLabsFeatures(t *testing.T) {
	fm := featuremgmt.WithManager("alpha", false, "beta", true)

	t.Run("returns flags for user with read permission", func(t *testing.T) {
		server := SetupAPITestServer(t, func(hs *HTTPServer) {
			hs.Features = fm
		})

		res, err := server.Send(webtest.RequestWithSignedInUser(
			server.NewGetRequest("/api/labs/features"),
			userWithPermissions(1, []accesscontrol.Permission{{Action: accesscontrol.ActionFeatureManagementRead}}),
		))
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, res.StatusCode)

		body, err := io.ReadAll(res.Body)
		require.NoError(t, err)
		require.NoError(t, res.Body.Close())

		var payload struct {
			Features []struct {
				Name    string `json:"name"`
				Enabled bool   `json:"enabled"`
				Stage   string `json:"stage"`
			} `json:"features"`
		}
		require.NoError(t, json.Unmarshal(body, &payload))
		require.Equal(t, []string{"alpha", "beta"}, []string{payload.Features[0].Name, payload.Features[1].Name})
		assert.False(t, payload.Features[0].Enabled)
		assert.True(t, payload.Features[1].Enabled)
		assert.Equal(t, "unknown", payload.Features[0].Stage)
	})

	t.Run("forbids user without read permission", func(t *testing.T) {
		server := SetupAPITestServer(t, func(hs *HTTPServer) {
			hs.Features = fm
		})

		res, err := server.Send(webtest.RequestWithSignedInUser(
			server.NewGetRequest("/api/labs/features"),
			userWithPermissions(1, nil),
		))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, res.StatusCode)
		require.NoError(t, res.Body.Close())
	})
}

func TestAPI_UpdateLabsFeature(t *testing.T) {
	t.Run("toggles a flag for user with write permission", func(t *testing.T) {
		fm := featuremgmt.WithManager("alpha", false)
		server := SetupAPITestServer(t, func(hs *HTTPServer) {
			hs.Features = fm
		})

		res, err := server.SendJSON(webtest.RequestWithSignedInUser(
			server.NewRequest(http.MethodPut, "/api/labs/features/alpha", strings.NewReader(`{"enabled":true}`)),
			userWithPermissions(1, []accesscontrol.Permission{{Action: accesscontrol.ActionFeatureManagementWrite}}),
		))
		require.NoError(t, err)
		require.Equal(t, http.StatusOK, res.StatusCode)
		require.NoError(t, res.Body.Close())
		require.True(t, fm.IsEnabledGlobally("alpha"))
	})

	t.Run("forbids user without write permission", func(t *testing.T) {
		fm := featuremgmt.WithManager("alpha", false)
		server := SetupAPITestServer(t, func(hs *HTTPServer) {
			hs.Features = fm
		})

		res, err := server.SendJSON(webtest.RequestWithSignedInUser(
			server.NewRequest(http.MethodPut, "/api/labs/features/alpha", strings.NewReader(`{"enabled":true}`)),
			userWithPermissions(1, []accesscontrol.Permission{{Action: accesscontrol.ActionFeatureManagementRead}}),
		))
		require.NoError(t, err)
		require.Equal(t, http.StatusForbidden, res.StatusCode)
		require.NoError(t, res.Body.Close())
		require.False(t, fm.IsEnabledGlobally("alpha"))
	})

	t.Run("returns 404 for unknown flag", func(t *testing.T) {
		fm := featuremgmt.WithManager("alpha", false)
		server := SetupAPITestServer(t, func(hs *HTTPServer) {
			hs.Features = fm
		})

		res, err := server.SendJSON(webtest.RequestWithSignedInUser(
			server.NewRequest(http.MethodPut, "/api/labs/features/missing", strings.NewReader(`{"enabled":true}`)),
			userWithPermissions(1, []accesscontrol.Permission{{Action: accesscontrol.ActionFeatureManagementWrite}}),
		))
		require.NoError(t, err)
		require.Equal(t, http.StatusNotFound, res.StatusCode)
		require.NoError(t, res.Body.Close())
	})
}
