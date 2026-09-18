package featuremgmt

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"sync"

	"github.com/grafana/grafana/pkg/infra/log"
)

var (
	_ FeatureToggles = (*FeatureManager)(nil)

	ErrUnknownFeatureFlag  = errors.New("unknown feature flag")
	ErrFeatureNotAvailable = errors.New("feature cannot be enabled")
)

type FeatureManager struct {
	isDevMod bool

	mu        sync.RWMutex
	flags     map[string]*FeatureFlag
	enabled   map[string]bool   // only the "on" values
	startup   map[string]bool   // the explicit values registered at startup
	overrides map[string]bool   // runtime values; take precedence over startup
	warnings  map[string]string // potential warnings about the flag
	log       log.Logger
}

// This will merge the flags with the current configuration
func (fm *FeatureManager) registerFlags(flags ...FeatureFlag) {
	for _, add := range flags {
		if add.Name == "" {
			continue // skip it with warning?
		}
		flag, ok := fm.flags[add.Name]
		if !ok {
			f := add // make a copy
			fm.flags[add.Name] = &f
			continue
		}

		// Selectively update properties
		if add.Description != "" {
			flag.Description = add.Description
		}
		if add.Expression != "" {
			flag.Expression = add.Expression
		}

		// The most recently defined state
		if add.Stage != FeatureStageUnknown {
			flag.Stage = add.Stage
		}

		// Only gets more restrictive
		if add.RequiresDevMode {
			flag.RequiresDevMode = true
		}

		if add.RequiresRestart {
			flag.RequiresRestart = true
		}
	}

	// This will evaluate all flags
	fm.mu.Lock()
	defer fm.mu.Unlock()
	fm.updateLocked()
}

// meetsRequirements checks if grafana is able to run the given feature due to dev mode or licensing requirements
func (fm *FeatureManager) meetsRequirements(ff *FeatureFlag) (bool, string) {
	if ff.RequiresDevMode && !fm.isDevMod {
		return false, "requires dev mode"
	}

	return true, ""
}

func (fm *FeatureManager) update() {
	fm.mu.Lock()
	defer fm.mu.Unlock()
	fm.updateLocked()
}

func (fm *FeatureManager) updateLocked() {
	enabled := make(map[string]bool)
	for _, flag := range fm.flags {
		// if grafana cannot run the feature, omit metrics around it
		ok, reason := fm.meetsRequirements(flag)
		if !ok {
			fm.warnings[flag.Name] = reason
			continue
		}

		track := 0.0
		isOn := false

		startup, ok := fm.startup[flag.Name]
		if startup || (!ok && flag.Expression == "true") {
			isOn = true
		}
		if override, hasOverride := fm.overrides[flag.Name]; hasOverride {
			isOn = override
		}
		if isOn {
			track = 1
			enabled[flag.Name] = true
		}

		featureToggleInfo.WithLabelValues(flag.Name).Set(track)
	}
	fm.enabled = enabled
}

// SetEnabled overrides a flag at runtime. The change is not persisted and is
// lost on process restart. Flags that require dev mode cannot be enabled in
// production.
func (fm *FeatureManager) SetEnabled(name string, enabled bool) error {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	flag, ok := fm.flags[name]
	if !ok {
		return ErrUnknownFeatureFlag
	}

	if ok, reason := fm.meetsRequirements(flag); !ok {
		return fmt.Errorf("%w: %s", ErrFeatureNotAvailable, reason)
	}

	if fm.overrides == nil {
		fm.overrides = make(map[string]bool)
	}
	fm.overrides[name] = enabled
	fm.updateLocked()
	return nil
}

// IsEnabled checks if a feature is enabled
func (fm *FeatureManager) IsEnabled(ctx context.Context, flag string) bool {
	fm.mu.RLock()
	defer fm.mu.RUnlock()
	return fm.enabled[flag]
}

// IsEnabledGlobally checks if a feature is for all tenants
func (fm *FeatureManager) IsEnabledGlobally(flag string) bool {
	fm.mu.RLock()
	defer fm.mu.RUnlock()
	return fm.enabled[flag]
}

// GetEnabled returns a map containing only the features that are enabled
func (fm *FeatureManager) GetEnabled(ctx context.Context) map[string]bool {
	fm.mu.RLock()
	defer fm.mu.RUnlock()
	enabled := make(map[string]bool, len(fm.enabled))
	for key, val := range fm.enabled {
		if val {
			enabled[key] = true
		}
	}
	return enabled
}

// GetFlags returns all flag definitions
func (fm *FeatureManager) GetFlags() []FeatureFlag {
	fm.mu.RLock()
	defer fm.mu.RUnlock()
	v := make([]FeatureFlag, 0, len(fm.flags))
	for _, value := range fm.flags {
		v = append(v, *value)
	}
	return v
}

// ############# Test Functions #############

func WithFeatures(spec ...any) FeatureToggles {
	return WithManager(spec...)
}

// WithFeatures is used to define feature toggles for testing.
// The arguments are a list of strings that are optionally followed by a boolean value for example:
// WithFeatures([]any{"my_feature", "other_feature"}) or WithFeatures([]any{"my_feature", true})
func WithManager(spec ...any) *FeatureManager {
	count := len(spec)
	features := make(map[string]*FeatureFlag, count)
	enabled := make(map[string]bool, count)

	idx := 0
	for idx < count {
		key := fmt.Sprintf("%v", spec[idx])
		val := true
		idx++
		if idx < count && reflect.TypeOf(spec[idx]).Kind() == reflect.Bool { // #nosec G602 -- bounds checked by `idx < count`
			val = spec[idx].(bool) // #nosec G602 -- bounds checked by `idx < count`
			idx++
		}

		features[key] = &FeatureFlag{Name: key}
		if val {
			enabled[key] = true
		}
	}

	return &FeatureManager{
		enabled:   enabled,
		flags:     features,
		startup:   enabled,
		overrides: map[string]bool{},
		warnings:  map[string]string{},
	}
}
