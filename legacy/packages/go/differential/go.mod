// The module of the differential test of the legacy Go package and the binding (make test-differential-go, T3.25-4): it
// requires both from the checkout, so that neither module of a package names the other.
module github.com/polyspec/json/legacy/packages/go/differential

go 1.27.3

require (
	github.com/polyspec/json/packages/go v0.0.0
	github.com/polyspec/ordered-json/packages/go v0.0.0
)

replace (
	github.com/polyspec/json/packages/go => ../../../../packages/go
	github.com/polyspec/ordered-json/packages/go => ..
)
