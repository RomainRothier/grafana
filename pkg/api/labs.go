package api

import (
	"errors"
	"net/http"
	"sort"

	"github.com/grafana/grafana/pkg/api/response"
	contextmodel "github.com/grafana/grafana/pkg/services/contexthandler/model"
	"github.com/grafana/grafana/pkg/services/featuremgmt"
	"github.com/grafana/grafana/pkg/web"
)

type labsFeatureDTO struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Stage       string `json:"stage"`
	Enabled     bool   `json:"enabled"`
}

type labsFeaturesResponse struct {
	Features []labsFeatureDTO `json:"features"`
}

type labsFeatureToggleCommand struct {
	Enabled bool `json:"enabled"`
}

func (hs *HTTPServer) GetLabsFeatures(c *contextmodel.ReqContext) response.Response {
	fm, ok := hs.Features.(*featuremgmt.FeatureManager)
	if !ok {
		return response.Error(http.StatusInternalServerError, "Feature manager is not available", nil)
	}

	flags := fm.GetFlags()
	sort.Slice(flags, func(i, j int) bool {
		return flags[i].Name < flags[j].Name
	})

	features := make([]labsFeatureDTO, 0, len(flags))
	for _, flag := range flags {
		features = append(features, labsFeatureDTO{
			Name:        flag.Name,
			Description: flag.Description,
			Stage:       flag.Stage.String(),
			Enabled:     fm.IsEnabledGlobally(flag.Name),
		})
	}

	return response.JSON(http.StatusOK, labsFeaturesResponse{Features: features})
}

func (hs *HTTPServer) UpdateLabsFeature(c *contextmodel.ReqContext) response.Response {
	fm, ok := hs.Features.(*featuremgmt.FeatureManager)
	if !ok {
		return response.Error(http.StatusInternalServerError, "Feature manager is not available", nil)
	}

	var cmd labsFeatureToggleCommand
	if err := web.Bind(c.Req, &cmd); err != nil {
		return response.Error(http.StatusBadRequest, "bad request data", err)
	}

	name := web.Params(c.Req)[":name"]
	if name == "" {
		return response.Error(http.StatusBadRequest, "feature name is required", nil)
	}

	if err := fm.SetEnabled(name, cmd.Enabled); err != nil {
		if errors.Is(err, featuremgmt.ErrUnknownFeatureFlag) {
			return response.Error(http.StatusNotFound, "feature flag not found", err)
		}
		if errors.Is(err, featuremgmt.ErrFeatureNotAvailable) {
			return response.Error(http.StatusBadRequest, "feature cannot be toggled", err)
		}
		return response.Error(http.StatusInternalServerError, "failed to update feature flag", err)
	}

	return response.JSON(http.StatusOK, labsFeatureDTO{
		Name:    name,
		Enabled: cmd.Enabled,
	})
}
