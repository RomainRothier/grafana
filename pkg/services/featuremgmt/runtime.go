package featuremgmt

import (
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/open-feature/go-sdk/openfeature"
	"github.com/open-feature/go-sdk/openfeature/memprovider"

	"github.com/grafana/grafana/pkg/setting"
)

var (
	// ErrUnknownFeatureToggle is returned when a name is not a registered flag.
	ErrUnknownFeatureToggle = errors.New("unknown feature toggle")
	// ErrFeatureToggleDevMode is returned when a flag cannot be enabled outside dev mode.
	ErrFeatureToggleDevMode = errors.New("feature toggle requires dev mode")
	// ErrFeatureToggleNotBoolean is returned when a flag's configured value is not a boolean.
	ErrFeatureToggleNotBoolean = errors.New("feature toggle is not boolean")
)

// RuntimeToggle is one feature flag plus its current process-wide value.
type RuntimeToggle struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Stage       string `json:"stage"`
	Enabled     bool   `json:"enabled"`
}

// RuntimeToggleEditor lists feature flags and changes their in-memory value.
type RuntimeToggleEditor interface {
	ListRuntimeToggles() []RuntimeToggle
	SetRuntimeToggle(name string, enabled bool) (RuntimeToggle, error)
}

// ListRuntimeToggles returns every registered flag, sorted by name.
func (fm *FeatureManager) ListRuntimeToggles() []RuntimeToggle {
	fm.mu.RLock()
	defer fm.mu.RUnlock()

	toggles := make([]RuntimeToggle, 0, len(fm.flags))
	for _, flag := range fm.flags {
		toggles = append(toggles, runtimeToggleFromFlag(flag, fm.enabled[flag.Name]))
	}
	slices.SortFunc(toggles, func(a, b RuntimeToggle) int {
		return strings.Compare(a.Name, b.Name)
	})
	return toggles
}

// SetRuntimeToggle changes a flag for this process. The value is not written
// back to config, so a restart restores the startup value. When OpenFeature is
// using the static in-memory provider, that copy is rebuilt too — otherwise
// IsEnabled and openfeature.Boolean would disagree.
func (fm *FeatureManager) SetRuntimeToggle(name string, enabled bool) (RuntimeToggle, error) {
	fm.mu.Lock()
	defer fm.mu.Unlock()

	flag, ok := fm.flags[name]
	if !ok {
		return RuntimeToggle{}, ErrUnknownFeatureToggle
	}
	if enabled && flag.RequiresDevMode && !fm.isDevMod {
		return RuntimeToggle{}, ErrFeatureToggleDevMode
	}

	if fm.startup == nil {
		fm.startup = map[string]bool{}
	}
	if fm.runtime == nil {
		fm.runtime = map[string]bool{}
	}

	prevStartup, hadStartup := fm.startup[name]
	prevRuntime, hadRuntime := fm.runtime[name]
	fm.startup[name] = enabled
	fm.runtime[name] = enabled
	fm.updateLocked()

	if err := fm.syncOpenFeatureLocked(); err != nil {
		if hadStartup {
			fm.startup[name] = prevStartup
		} else {
			delete(fm.startup, name)
		}
		if hadRuntime {
			fm.runtime[name] = prevRuntime
		} else {
			delete(fm.runtime, name)
		}
		fm.updateLocked()
		return RuntimeToggle{}, err
	}

	return runtimeToggleFromFlag(flag, fm.enabled[flag.Name]), nil
}

func runtimeToggleFromFlag(flag *FeatureFlag, enabled bool) RuntimeToggle {
	return RuntimeToggle{
		Name:        flag.Name,
		Description: flag.Description,
		Stage:       flag.Stage.String(),
		Enabled:     enabled,
	}
}

func (fm *FeatureManager) syncOpenFeatureLocked() error {
	if fm.cfg == nil || len(fm.runtime) == 0 {
		return nil
	}
	// A remote provider is the source of truth for that deployment. Replacing
	// it would drop targeting rules that this process cannot reconstruct.
	if openfeature.ProviderMetadata().Name != "InMemoryProvider" {
		return nil
	}

	flags, err := buildStaticFlagsMapFromCfg(fm.cfg)
	if err != nil {
		return err
	}
	for name, enabled := range fm.runtime {
		if err := applyBooleanOverride(flags, name, enabled); err != nil {
			return err
		}
	}
	return openfeature.SetProviderAndWait(memprovider.NewInMemoryProvider(flags))
}

func applyBooleanOverride(flags map[string]memprovider.InMemoryFlag, name string, enabled bool) error {
	flag, ok := flags[name]
	if !ok {
		flags[name] = setting.NewInMemoryFlag(name, enabled)
		return nil
	}

	flag.State = memprovider.Enabled
	variant := flag.DefaultVariant
	if variant == "" {
		variant = setting.DefaultVariantName
		flag.DefaultVariant = variant
	}
	if flag.Variants == nil {
		flag.Variants = map[string]any{}
	}
	if existing, exists := flag.Variants[variant]; exists {
		if _, isBool := existing.(bool); !isBool {
			return fmt.Errorf("%w: %s", ErrFeatureToggleNotBoolean, name)
		}
	}
	flag.Variants[variant] = enabled
	flags[name] = flag
	return nil
}
