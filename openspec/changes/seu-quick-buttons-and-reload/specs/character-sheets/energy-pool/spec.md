# Spec Delta

## Purpose

Provides Standard Energy Unit (SEU) pool tracking, granular decrement and increment controls, and instant power pack reloading for character sheets.

## ADDED Requirements

### Requirement: Quick-Step SEU Adjustments
The system SHALL provide fixed stepper buttons for -5, -1, +1, and +5 SEU adjustments on the character sheet energy pool tracker.

#### Scenario: Decrementing SEU by 5
- **WHEN** user clicks the "-5" button
- **THEN** character current SEU decreases by 5 and changes are persisted

#### Scenario: Decrementing SEU by 1
- **WHEN** user clicks the "-1" button
- **THEN** character current SEU decreases by 1 and changes are persisted

#### Scenario: Incrementing SEU by 1
- **WHEN** user clicks the "+1" button
- **THEN** character current SEU increases by 1 and changes are persisted

#### Scenario: Incrementing SEU by 5
- **WHEN** user clicks the "+5" button
- **THEN** character current SEU increases by 5 and changes are persisted

### Requirement: One-Click SEU Reload
The system SHALL provide a dedicated Reload button that restores the character's current SEU to maximum SEU without affecting stamina or other character attributes.

#### Scenario: Reloading energy pool to max
- **WHEN** user clicks the "Reload" button in the SEU Energy Pool section
- **THEN** character current SEU is set equal to max SEU and changes are persisted

### Requirement: SEU Boundary Clamping
The system SHALL clamp character current SEU between 0 and max SEU across all quick-step and reload adjustments.

#### Scenario: Clamping below zero
- **WHEN** user applies an adjustment that would reduce current SEU below 0
- **THEN** current SEU is clamped at 0

#### Scenario: Clamping above maximum
- **WHEN** user applies an adjustment that would increase current SEU above max SEU
- **THEN** current SEU is clamped at max SEU
