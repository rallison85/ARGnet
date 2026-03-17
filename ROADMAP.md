# ARG Studio Product Roadmap

## Overview

| Metric | Value |
|--------|-------|
| Total Chunks | 69 |
| Phases | 12 (0-11) |
| Est. Time | 40-60 hours |

### Progress Summary
<!-- Update these counts as you complete chunks -->
- [ ] **Phase 0**: 0/1 complete
- [ ] **Phase 1**: 0/12 complete
- [ ] **Phase 2**: 0/8 complete
- [ ] **Phase 3**: 0/12 complete
- [ ] **Phase 4**: 0/6 complete
- [ ] **Phase 5**: 0/6 complete
- [ ] **Phase 6**: 0/8 complete _(MVP milestone)_
- [ ] **Phase 7**: 0/7 complete
- [ ] **Phase 8**: 0/4 complete
- [ ] **Phase 9**: 0/3 complete
- [ ] **Phase 10**: 0/2 complete
- [ ] **Phase 11**: 0/6 complete

---

## Critical Path Dependencies

```
Phase 0 (Dependencies)
    └── Phase 1 (Data Model) ─── Foundation for all features
            └── Phase 2 (Trail Map) ─── Core navigation system
                    └── Phase 3 (UI Updates) ─── Enhanced forms
                            ├── Phase 4 (Players) ─── Player tracking
                            │       └── Phase 5 (Communications) ─── Messaging
                            │               └── Phase 6 (Command Center) ─── Live ops [MVP]
                            │                       └── Phase 7 (Integrations)
                            │                               └── Phase 8 (Analytics)
                            └── Phase 9 (Testing & QA)
                                    └── Phase 10 (Scheduling)
                                            └── Phase 11 (Polish)
```

---

## Phase 0: Dependencies
_Install all required packages upfront_

- [ ] **0.1** Install All Dependencies - Install npm packages for all phases (reactflow, fullcalendar, leaflet, tiptap, nodemailer, etc.)

---

## Phase 1: Data Model & Foundation
_Establish data structures everything else depends on_

- [ ] **1.1** Content Linking Schema - Create junction tables for many-to-many relationships between content types
- [ ] **1.2** Character Relationships Schema - Enable relationship mapping between characters
- [ ] **1.3** Enhanced Story Beat Fields - Expand story beats with trigger conditions and delivery tracking
- [ ] **1.4** Enhanced Puzzle Fields - Expand puzzles with testing, timing, and accessibility fields
- [ ] **1.5** Structured Hints Schema - Replace single hints field with structured progressive hint system
- [ ] **1.6** Enhanced Character Fields - Expand characters with voice guides and operational fields
- [ ] **1.7** Enhanced Location Fields - Expand locations with GPS, accessibility, and operational data
- [ ] **1.8** Enhanced Event Fields - Expand events with full production management fields
- [ ] **1.9** Enhanced Digital Properties Fields - Expand digital properties with operational tracking
- [ ] **1.10** Enhanced Asset Fields - Expand assets with metadata, versioning, and workflow fields
- [ ] **1.11** Enhanced Lore Fields - Expand lore entries with organization and visibility tracking
- [ ] **1.12** Enhanced Task Fields - Expand tasks with assignments, dates, and dependencies

---

## Phase 2: Trail Map Rebuild
_Critical rebuild of the narrative flow system_

- [ ] **2.1** Trail Map Node Schema Redesign - Create enhanced node schema supporting complex ARG flows
- [ ] **2.2** Trail Map Edges Schema - Create edge/connection schema for node relationships
- [ ] **2.3** Physical Trail Map Layer Schema - Add GPS-based physical location layer to trail map
- [ ] **2.4** Trail Map API Endpoints - Create API endpoints for trail map CRUD operations
- [ ] **2.5** Trail Map Canvas Component - Basic - Create foundational visual canvas using React Flow
- [ ] **2.6** Trail Map Canvas - Node Interactions - Add node creation, editing, and deletion to canvas
- [ ] **2.7** Trail Map Canvas - Edge Interactions - Add edge creation and editing to canvas
- [ ] **2.8** Trail Map Page Integration - Integrate new trail map canvas into existing page

---

## Phase 3: UI Updates for Enhanced Schemas
_Update existing UIs to use new fields_

- [ ] **3.1** Story Beat Form Enhancement - Update story beat creation/edit form with new fields
- [ ] **3.2** Story Beat Content Linking UI - Add UI for linking story beats to other content
- [ ] **3.3** Character Form Enhancement - Update character form with new fields (tabs: Basic, Voice, Operations)
- [ ] **3.4** Character Relationship Editor - Add visual relationship mapping between characters
- [ ] **3.5** Puzzle Form Enhancement - Update puzzle form with new fields and structured hints
- [ ] **3.6** Puzzle Dependency Editor - Add UI for puzzle prerequisites and unlocks
- [ ] **3.7** Event Form Enhancement - Update event form with new fields and connections
- [ ] **3.8** Event Calendar View - Add calendar visualization for events using FullCalendar
- [ ] **3.9** Location Form Enhancement - Update location form with GPS and operational fields
- [ ] **3.10** Location Map View - Add map visualization for physical locations using Leaflet
- [ ] **3.11** Digital Properties Form Enhancement - Update digital properties form with new fields
- [ ] **3.12** Asset Management Enhancement - Improve asset upload and management UI

---

## Phase 4: Player Management System
_New module for tracking players_

- [ ] **4.1** Player Schema - Create database schema for player tracking (players, teams, progress)
- [ ] **4.2** Player Communication Log Schema - Create schema for tracking player interactions
- [ ] **4.3** Player Management API - Create API endpoints for player management
- [ ] **4.4** Player List Page - Create player management list view with filters and stats
- [ ] **4.5** Player Detail Page - Create individual player detail view with journey tracking
- [ ] **4.6** Player Import/Export - Add bulk player management capabilities (CSV/JSON)

---

## Phase 5: Communications Hub
_Unified messaging system_

- [ ] **5.1** Communication Templates Schema - Create schema for reusable message templates
- [ ] **5.2** Communications Hub API - Create API endpoints for communications management
- [ ] **5.3** Communications Hub Page - Inbox - Create unified inbox view with filtering
- [ ] **5.4** Communications Hub - Compose & Reply - Add message composition and reply functionality
- [ ] **5.5** Communication Templates Manager - Create UI for managing message templates
- [ ] **5.6** Auto-Response Configuration - Create UI for configuring automated responses

---

## Phase 6: Puppet Master Command Center
_Live operation control panel_

> **MVP MILESTONE: After completing Phase 6, you have a functional ARG management system**

- [ ] **6.1** Command Center Dashboard Schema - Create schema for live ARG state tracking
- [ ] **6.2** Command Center API - Create API endpoints for live operation
- [ ] **6.3** Command Center Page - Main Dashboard - Create main Command Center dashboard
- [ ] **6.4** Command Center - Character Quick-Switch - Add rapid character switching for puppet masters
- [ ] **6.5** Command Center - Player Tracker - Add live player status tracking view
- [ ] **6.6** Command Center - Event Triggers - Add manual trigger controls for content
- [ ] **6.7** Command Center - Broadcast System - Add broadcast messaging to all/segments of players
- [ ] **6.8** Command Center - Shift Handoff - Add shift handoff functionality for PM teams

---

## Phase 7: Integrations Framework
_External platform connections_

- [ ] **7.0** Integration Testing Prerequisites - Manual setup of external accounts (Discord bot, SMTP, webhooks)
- [ ] **7.1** Integration Schema & Framework - Create foundation for external integrations
- [ ] **7.2** Integration Management API - Create API endpoints for managing integrations
- [ ] **7.3** Integration Settings UI - Create UI for managing integrations
- [ ] **7.4** Discord Integration Implementation - Implement Discord bot integration
- [ ] **7.5** Email Integration Implementation - Implement SMTP email integration
- [ ] **7.6** Webhook Integration (Generic) - Implement generic webhook support for custom integrations

---

## Phase 8: Analytics & Monitoring
_Understanding player behavior and ARG health_

- [ ] **8.1** Analytics Schema - Create schema for analytics data and daily summaries
- [ ] **8.2** Analytics API & Event Tracking - Create API for analytics and event tracking
- [ ] **8.3** Analytics Dashboard Page - Create analytics visualization page with charts
- [ ] **8.4** Real-Time Activity Monitor - Add live activity feed for monitoring

---

## Phase 9: Testing & QA Module
_Quality assurance workflows_

- [ ] **9.1** Puzzle Testing Schema & Workflow - Create structured puzzle testing system
- [ ] **9.2** Puzzle Testing UI - Create UI for managing puzzle tests and external tester pages
- [ ] **9.3** Content Review Workflow - Create approval workflow for content

---

## Phase 10: Scheduling & Calendar
_Unified scheduling system_

- [ ] **10.1** Scheduling Schema & API - Create unified scheduling across content types
- [ ] **10.2** Calendar Page & Integration - Create unified calendar view with iCal export

---

## Phase 11: Polish & Quality of Life
_Refinements and improvements_

- [ ] **11.1** Global Search - Add search across all content types (Cmd/Ctrl+K)
- [ ] **11.2** Notifications System - Add in-app notifications
- [ ] **11.3** Activity Log & Audit Trail - Track all changes for accountability
- [ ] **11.4** User Preferences & Project Settings - Expand user and project configuration options
- [ ] **11.5** Keyboard Shortcuts - Add keyboard shortcuts for power users
- [ ] **11.6** Onboarding & Empty States - Improve new user experience with guided setup

---

## Timeline Estimates

| Phase | Description | Est. Hours |
|-------|-------------|------------|
| 0 | Dependencies | 0.5 |
| 1 | Data Model & Foundation | 6-8 |
| 2 | Trail Map Rebuild | 8-10 |
| 3 | UI Updates | 8-10 |
| 4 | Player Management | 4-6 |
| 5 | Communications Hub | 4-6 |
| 6 | Command Center | 6-8 |
| **MVP Total** | **Phases 0-6** | **~37-49 hrs** |
| 7 | Integrations | 6-8 |
| 8 | Analytics | 3-4 |
| 9 | Testing & QA | 2-3 |
| 10 | Scheduling | 2-3 |
| 11 | Polish | 4-6 |
| **Full Total** | **All Phases** | **~40-60 hrs** |

---

## Notes

- Each chunk is designed to be completable in a single Claude Code session (15-45 min)
- Chunks are independently testable and won't break existing functionality
- Phase 7.0 requires manual setup of external accounts before coding
- Twitter/X integration is marked "Coming Soon" due to API costs ($100+/month)
