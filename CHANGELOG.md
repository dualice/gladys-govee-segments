# Changelog

All notable changes to this integration are documented in this file. The format
follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
uses [semantic versioning](https://semver.org/).

Describe each change under `## [Unreleased]` as you make it. The Release
workflow moves that section under the version it ships, and the section becomes
the notes of the version's GitHub Release.

## [Unreleased]

### Added

- Scene action "Paint a gradient across both bars" (one gradient over every
  segment).
- Setting "Segments per bar" (default 6).

### Changed

- Segment controls are named by position ("Left bar 1 (bottom)").
- The default segment count is now 12.
- "Paint a gradient" repeats the gradient on every bar, bottom to top.

## [1.0.1] - 2026-11-05

### Added

- Local control of a Govee RGBIC light bar: power, brightness, whole-bar color,
  white temperature, and one color control per segment (tested on the H6056).
- Scene action "Paint a gradient" between two colors along the bar.

[Unreleased]: https://github.com/dualice/gladys-govee-segments/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/dualice/gladys-govee-segments/releases/tag/v1.0.1
