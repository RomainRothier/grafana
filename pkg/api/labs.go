package api

import (
	"errors"
	"net/http"

	"github.com/grafana/grafana/pkg/api/response"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/web"
)

type setFeatureToggleCmd struct {
	Enabled *bool `json:"enabled"`
}

func (hs *HTTPServer) AdminGetFeatureToggles(c *contextmodel.ReqContext) response.Response {
	editor, ok := hs.Features.(featuremgmt.RuntimeToggleEditor)
	if !ok {
		return response.Error(http.StatusNotImplemented, "Feature toggles cannot be listed", nil)
	}
	return response.JSON(http.StatusOK, editor.ListRuntimeToggles())
}

func (hs *HTTPServer) AdminUpdateFeatureToggle(c *contextmodel.ReqContext) response.Response {
	editor, ok := hs.Features.(featuremgmt.RuntimeToggleEditor)
	if !ok {
		return response.Error(http.StatusNotImplemented, "Feature toggles cannot be updated", nil)
	}

	name := web.Params(c.Req)[":name"]
	cmd := setFeatureToggleCmd{}
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "Invalid request", err)
	}
	if cmd.Enabled == nil {
		return response.Error(http.StatusBadRequest, "enabled is required", nil)
	}

	toggle, err := editor.SetRuntimeToggle(name, *cmd.Enabled)
	if err != nil {
		if errors.Is(err, featuremgmt.ErrUnknownFeatureToggle) {
			return response.Error(http.StatusNotFound, "Feature toggle not found", err)
		}
		if errors.Is(err, featuremgmt.ErrFeatureToggleDevMode) || errors.Is(err, featuremgmt.ErrFeatureToggleNotBoolean) {
			return response.Error(http.StatusBadRequest, err.Error(), err)
		}
		return response.Error(http.StatusInternalServerError, "Failed to update feature toggle", err)
	}
	return response.JSON(http.StatusOK, toggle)
}
