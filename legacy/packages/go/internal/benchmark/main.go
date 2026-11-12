package main

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"os"
	"runtime"
	"sort"
	"strconv"
	"time"

	orderedjson "github.com/polyspec/ordered-json/packages/go"
)

func digest(value []byte) string { sum := sha256.Sum256(value); return hex.EncodeToString(sum[:]) }
func iterations() int { return setting("OJ_BENCH_ITERATIONS", 1000) }

// setting returns the fallback when the variable is unset. A value that is not a positive integer stops the run: a silent
// default would measure a different workload than the one asked for (P8).
func setting(name string, fallback int) int {
	text, set := os.LookupEnv(name)
	if !set {
		return fallback
	}
	n, err := strconv.Atoi(text)
	if err != nil || n < 1 {
		panic(fmt.Sprintf("%s must be a positive integer, got %q", name, text))
	}
	return n
}

type stats struct {
	Median  float64   `json:"median"`
	P95     float64   `json:"p95"`
	Samples []float64 `json:"samples"`
}

func measure(fn func() []byte, iterations, warmup, warmupMs, samples int) (stats, []byte) {
	// A process runs below its steady speed until it has been busy for a while,
	// and a warm-up counted in iterations ends in microseconds on a small
	// input, so the count is a floor and the duration decides.
	warming := time.Now()
	for {
		for i := 0; i < warmup; i++ {
			fn()
		}
		if time.Since(warming) >= time.Duration(warmupMs)*time.Millisecond {
			break
		}
	}
	values := make([]float64, 0, samples)
	var out []byte
	for sample := 0; sample < samples; sample++ {
		start := time.Now()
		for i := 0; i < iterations; i++ {
			out = fn()
		}
		values = append(values, float64(time.Since(start).Nanoseconds())/float64(iterations))
	}
	sort.Float64s(values)
	return stats{values[len(values)/2], values[minInt(len(values)-1, int((float64(len(values))*0.95+0.999999))-1)], values}, out
}
func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}
func main() {
	n := iterations()
	warmup, samples := setting("OJ_BENCH_WARMUP", 1000), setting("OJ_BENCH_SAMPLES", 9)
	warmupMs := setting("OJ_BENCH_WARMUP_MS", 50)
	var sink any
	for _, file := range os.Args[1:] {
		source, err := os.ReadFile(file)
		if err != nil {
			panic(err)
		}
		parseOrdered := func() *orderedjson.Value {
			v, err := orderedjson.ParseBytes(source)
			if err != nil {
				panic(err)
			}
			return v
		}
		parseStats, _ := measure(func() []byte { sink = parseOrdered(); runtime.KeepAlive(sink); return nil }, n, warmup, warmupMs, samples)
		value := parseOrdered()
		stringifyStats, output := measure(func() []byte {
			out, err := value.Compact()
			if err != nil {
				panic(err)
			}
			return []byte(out)
		}, n, warmup, warmupMs, samples)
		roundtripStats, _ := measure(func() []byte {
			out, err := parseOrdered().Compact()
			if err != nil {
				panic(err)
			}
			return []byte(out)
		}, n, warmup, warmupMs, samples)
		var nativeValue any
		nativeParseStats, _ := measure(func() []byte {
			if err := json.Unmarshal(source, &nativeValue); err != nil {
				panic(err)
			}
			runtime.KeepAlive(nativeValue)
			return nil
		}, n, warmup, warmupMs, samples)
		nativeValue, err = func() (any, error) { var value any; err := json.Unmarshal(source, &value); return value, err }()
		if err != nil {
			panic(err)
		}
		nativeStringifyStats, nativeOutput := measure(func() []byte {
			out, err := json.Marshal(nativeValue)
			if err != nil {
				panic(err)
			}
			return out
		}, n, warmup, warmupMs, samples)
		nativeRoundtripStats, _ := measure(func() []byte {
			var value any
			if err := json.Unmarshal(source, &value); err != nil {
				panic(err)
			}
			out, err := json.Marshal(value)
			if err != nil {
				panic(err)
			}
			return out
		}, n, warmup, warmupMs, samples)
		statsJSON := func(p, s, r stats) string {
			b, err := json.Marshal(map[string]any{"parse": p.Samples, "stringify": s.Samples, "roundtrip": r.Samples})
			if err != nil {
				panic(err)
			}
			return string(b)
		}
		fmt.Printf("%s\tordered-json\t%f\t%f\t%f\t%f\t%f\t%f\t%s\t%s\t%d\t%d\n", file, parseStats.Median, stringifyStats.Median, roundtripStats.Median, parseStats.P95, stringifyStats.P95, roundtripStats.P95, statsJSON(parseStats, stringifyStats, roundtripStats), digest(output), len(source), len(output))
		fmt.Printf("%s\tnative-json\t%f\t%f\t%f\t%f\t%f\t%f\t%s\t%s\t%d\t%d\n", file, nativeParseStats.Median, nativeStringifyStats.Median, nativeRoundtripStats.Median, nativeParseStats.P95, nativeStringifyStats.P95, nativeRoundtripStats.P95, statsJSON(nativeParseStats, nativeStringifyStats, nativeRoundtripStats), digest(nativeOutput), len(source), len(nativeOutput))
	}
}
