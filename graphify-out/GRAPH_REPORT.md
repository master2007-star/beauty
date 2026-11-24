# Graph Report - price-comparison-website  (2026-11-24)

## Corpus Check
- 143 files · ~139,531 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 2, .css 2, .example 1)

## Summary
- 1812 nodes · 4716 edges · 67 communities (47 shown, 20 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 237 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2ec60e72`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- add_tracked_product
- analyze_product_deal
- test_phase7_auth.py
- BaseRetailerAdapter
- test_phase8_integration.py
- api.ts
- os
- comparison_view.py
- 🎬 15-Step Live Demonstration Script
- schemas.py
- package.json
- .check_rate_limit
- get_products
- test_phase5_retailer_integrations_and_deals.py
- .has_valid_price
- get_connection
- App.tsx
- test_phase5_smart_advisor.py
- get_user_preferences
- NykaaAdapter
- Product
- auth_deps.py
- ProductDetailPage.tsx
- TestPhase6LivePriceEngine
- PriceWise AI Beauty — Pre-Phase 6 Complete Project Audit
- LiveComparisonEngine
- check-category-images.mjs
- User
- auth_service.py
- index.ts
- test_phase6a_foundation.py
- BrowserManager
- PHASE 6 VERIFICATION AUDIT REPORT
- PriceWise AI Beauty — Phase 7 Implementation Report
- BaseRetailerAdapter
- DiscoveryHomePage.tsx
- compilerOptions
- validate_browser_url
- get_user_by_id
- routine_service.py
- seed.py
- AmazonIndiaAdapter
- compilerOptions
- PHASE 6: AUTOMATIC LIVE RETAILER PRICE COMPARISON ENGINE
- api_add_watchlist
- TestPhase7AuthAndSecurity
- PRICEWISE AI BEAUTY — PHASE 6A IMPLEMENTATION REPORT
- TestFastApiBridge
- User
- PriceWise Beauty — Phase 1: Premium Frontend
- api_login
- PriceTrackingRecord
- CategoryGrid.tsx
- TestPhase7RoutinesAndConflictDetection
- test_phase7_api_and_services.py
- DEPLOYMENT.md
- TestPhase7WatchlistAndPersonalization
- .oxlintrc.json
- test_product_slug_generation_and_resolution
- TestDatabaseIntegrity
- .safe_navigate
- stores.ts
- tsconfig.json

## God Nodes (most connected - your core abstractions)
1. `get_connection()` - 112 edges
2. `Product` - 100 edges
3. `Offer` - 87 edges
4. `migrate_db()` - 77 edges
5. `get_products()` - 65 edges
6. `add_tracked_product()` - 52 edges
7. `register_user()` - 52 edges
8. `analyze_product_deal()` - 45 edges
9. `PricePoint` - 40 edges
10. `BaseRetailerAdapter` - 40 edges

## Surprising Connections (you probably didn't know these)
- `Session Token Cryptography` --references--> `get_current_user()`  [INFERRED]
  PHASE7_IMPLEMENTATION_REPORT.md → src/api/auth_deps.py
- `11. Security & Compliance Findings` --references--> `validate_browser_url()`  [INFERRED]
  PHASE6_VERIFICATION_AUDIT_REPORT.md → src/workers/security_policy.py
- `File & Folder Responsibilities:` --references--> `PriceAlert`  [INFERRED]
  PRE_PHASE6_PROJECT_AUDIT_REPORT.md → src/database/models.py
- `14. Phase 6 Integration Readiness Assessment` --references--> `Offer`  [INFERRED]
  PRE_PHASE6_PROJECT_AUDIT_REPORT.md → src/database/models.py
- `File & Folder Responsibilities:` --references--> `Offer`  [INFERRED]
  PRE_PHASE6_PROJECT_AUDIT_REPORT.md → src/database/models.py

## Import Cycles
- None detected.

## Communities (67 total, 20 thin omitted)

### Community 0 - "add_tracked_product"
Cohesion: 0.05
Nodes (48): PriceAlert, add_tracked_product(), evaluate_tracking_rules(), get_alert_history(), get_tracked_products(), get_tracking_by_id(), get_tracking_by_product_id(), get_tracking_summary_stats() (+40 more)

### Community 1 - "analyze_product_deal"
Cohesion: 0.06
Nodes (39): analyze_product_deal(), analyze_suspicious_discount(), calculate_deal_score(), calculate_price_trend(), DealAnalysis, DealVerdict, filter_observations_by_window(), get_deal_classification() (+31 more)

### Community 2 - "test_phase7_auth.py"
Cohesion: 0.15
Nodes (8): authenticate_user(), normalize_email(), test_p7_01_successful_registration(), test_p7_02_duplicate_email_rejection(), test_p7_03_email_normalization(), test_p7_04_successful_login(), test_p7_05_invalid_password_rejection(), test_p7_06_unknown_account_rejection()

### Community 3 - "BaseRetailerAdapter"
Cohesion: 0.14
Nodes (5): CapabilityStatus, ExtractedPriceResult, get_adapter_registry(), get_gemini_service(), test_retailer_registry_discovers_all_five_retailers()

### Community 4 - "test_phase8_integration.py"
Cohesion: 0.07
Nodes (21): register_user(), add_to_wishlist(), get_user_wishlist(), get_wishlist_count(), is_in_wishlist(), remove_from_wishlist(), update_wishlist_note(), render_demo_banner() (+13 more)

### Community 5 - "api.ts"
Cohesion: 0.08
Nodes (52): AuthContext, AuthContextType, AuthProvider(), COMMON_BRANDS, INGREDIENTS_AVOID, ProfilePage(), SKIN_CONCERNS, SKIN_TYPES (+44 more)

### Community 6 - "os"
Cohesion: 0.04
Nodes (33): init_db(), PlatformRatingSummary, ProductReview, WeightedReviewScore, generate_history_points(), seed_database(), add_product_review(), calculate_weighted_review_score() (+25 more)

### Community 7 - "comparison_view.py"
Cohesion: 0.10
Nodes (9): build_price_history_dataframe(), ComparisonSummary, remove_product_from_wishlist(), get_pill_class(), render_comparison_table(), render_price_history_chart(), render_real_deal_detector(), render_comparison_view() (+1 more)

### Community 8 - "🎬 15-Step Live Demonstration Script"
Cohesion: 0.04
Nodes (46): 🎬 15-Step Live Demonstration Script, 1. Terminal Startup, 2. Pre-Configured Demo Account, 💡 Examiner Q&A Cheat Sheet, 📋 Executive Viva Overview, PriceWise AI — Comprehensive Academic Demo & Viva Presentation Guide 🎓, 🔑 Quick-Start Credentials & Environment Setup, Step 10: Demonstrate Wishlist Functionality (+38 more)

### Community 9 - "schemas.py"
Cohesion: 0.09
Nodes (29): api_get_recommendations(), check_manual_url(), get_auto_live_comparison(), get_health(), get_product(), list_products(), _serialize_offer(), _serialize_product_detail() (+21 more)

### Community 10 - "package.json"
Cohesion: 0.06
Nodes (44): dependencies, autoprefixer@^10.6.2, clsx@^2.1.1, framer-motion@^14.9.0, lucide-react@^1.66.0, postcss@^8.5.32, react@^19.3.1, react-dom@^19.3.1 (+36 more)

### Community 12 - "get_products"
Cohesion: 0.05
Nodes (44): get_all_brands(), get_all_categories(), get_all_product_types(), get_all_skin_types(), get_all_stores(), get_product_by_id(), get_product_by_slug(), get_products() (+36 more)

### Community 13 - "test_phase5_retailer_integrations_and_deals.py"
Cohesion: 0.05
Nodes (27): API Inventory:, Store, AlternativeRecommendation, _extract_ingredient_set(), _extract_skin_types(), get_cheapest_alternatives(), calculate_deal_savings(), check_is_deal_expired() (+19 more)

### Community 14 - ".has_valid_price"
Cohesion: 0.14
Nodes (4): Model Alignment for Phase 6:, test_multi_retailer_unknown_shipping_not_assumed_zero(), test_landed_cost_undisclosed_shipping_returns_none(), test_landed_cost_with_known_shipping_and_coupon()

### Community 15 - "get_connection"
Cohesion: 0.08
Nodes (13): ensure_database_ready(), get_connection(), get_db_path(), migrate_db(), ProductUsageGuide, get_user_by_email(), get_product_usage_guide(), test_honest_insufficient_history_state() (+5 more)

### Community 16 - "App.tsx"
Cohesion: 0.17
Nodes (21): App(), AppContent(), AuthModal(), Footer(), Navbar(), PriceTrackingModal(), ScrollToTop(), WishlistDrawer() (+13 more)

### Community 17 - "test_phase5_smart_advisor.py"
Cohesion: 0.06
Nodes (32): AdvisorPreferences, evaluate_product_for_advisor(), evaluate_use_case_suitability(), extract_battery_hours(), extract_ram_gb(), extract_storage_gb(), get_purchase_recommendations(), has_4k_display() (+24 more)

### Community 18 - "get_user_preferences"
Cohesion: 0.09
Nodes (14): UserPreferences, get_available_stores(), get_user_preferences(), reset_user_preferences(), save_user_preferences(), render_preferences_view(), test_p7_16_save_preferences(), test_p7_17_retrieve_preferences() (+6 more)

### Community 19 - "NykaaAdapter"
Cohesion: 0.09
Nodes (6): File & Folder Responsibilities:, NykaaAdapter, TiraAdapter, test_adapter_rate_limiting(), test_adapters_configured_when_env_credentials_present(), test_adapters_unconfigured_when_env_credentials_missing()

### Community 20 - "Product"
Cohesion: 0.07
Nodes (23): _serialize_product_item(), Product, generate_comparison_summary(), validate_offer_compatibility(), available_savings(), test_comparison_summary_spread_and_savings(), test_lowest_price_calculation(), test_total_cost_with_shipping() (+15 more)

### Community 22 - "auth_deps.py"
Cohesion: 0.29
Nodes (3): extract_token_from_request(), get_current_user(), get_optional_current_user()

### Community 23 - "ProductDetailPage.tsx"
Cohesion: 0.15
Nodes (20): retailerHosts, verification, BeautyUsageGuide(), LiveRetailerPriceComparison(), LiveRetailerPriceComparisonProps, OfficialProductLink(), ProductDetailModal(), ReviewIntelligenceHub() (+12 more)

### Community 25 - "PriceWise AI Beauty — Pre-Phase 6 Complete Project Audit"
Cohesion: 0.06
Nodes (33): 10. Test Suite & Production Build Results, 11. Windows 11 Development Environment Compatibility, 12. Security & Reliability Audit, 13. Phase 1–5 Functionality Preservation Checklist, 14. Phase 6 Integration Readiness Assessment, 15. Phase 6 Implementation Plan, 1. Executive Summary, 1. Python Pytest Suite: (+25 more)

### Community 26 - "LiveComparisonEngine"
Cohesion: 0.10
Nodes (3): LiveComparisonEngine, LiveComparisonResult, LiveRetailerOfferItem

### Community 27 - "check-category-images.mjs"
Cohesion: 0.12
Nodes (14): allImages, baseArg, baseUrl, categories, entries, productProvenance, provenance, root (+6 more)

### Community 28 - "User"
Cohesion: 0.11
Nodes (14): api_add_routine_item(), api_create_routine(), api_get_profile(), api_list_routines(), api_reorder_routine(), api_sync_watchlist(), api_update_profile(), api_update_routine() (+6 more)

### Community 29 - "auth_service.py"
Cohesion: 0.17
Nodes (7): _base64url_decode(), _base64url_encode(), generate_session_token(), get_authenticated_user_from_token(), hash_password(), validate_email_format(), verify_session_token()

### Community 30 - "index.ts"
Cohesion: 0.10
Nodes (19): BeautyUsageGuideProps, PriceHistoryChartProps, TimeRange, ReviewIntelligenceHubProps, SUPPORTED_PLATFORMS, REVIEWS_DATA, FilterOptions, KeyActiveDetail (+11 more)

### Community 31 - "test_phase6a_foundation.py"
Cohesion: 0.15
Nodes (3): GeminiService, GeminiSKUExtractionResult, TestGeminiServiceFoundation

### Community 33 - "PHASE 6 VERIFICATION AUDIT REPORT"
Cohesion: 0.09
Nodes (21): 10. Database Preservation Audit, 11. Security & Compliance Findings, 12. Defects & Limitations Identified, 13. Fixes & Next Steps Recommended, 14. Final Readiness Decision, 1. Executive Summary, 2. Project & Service Status, 3. Files Inspected (+13 more)

### Community 34 - "PriceWise AI Beauty — Phase 7 Implementation Report"
Cohesion: 0.10
Nodes (20): 1. Executive Summary, 1. Full Repository Test Suite (Pytest), 2. Architecture & Data Model Additions, 2. Frontend Linter & Production Build, 3. Cryptographic Security & Authentication, 3. Live Server Endpoint Health, 4. Personalized Skincare Routines & Conflict Detection, 5. Non-Medical Cosmetic Disclaimer (+12 more)

### Community 35 - "BaseRetailerAdapter"
Cohesion: 0.11
Nodes (3): BaseRetailerAdapter, PurplleAdapter, RetailerAdapterRegistry

### Community 36 - "DiscoveryHomePage.tsx"
Cohesion: 0.12
Nodes (28): CategoryGrid(), DealSection(), DealSectionProps, DupesSection(), DupesSectionProps, Hero(), HeroProps, HowToUseSection() (+20 more)

### Community 37 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 38 - "validate_browser_url"
Cohesion: 0.12
Nodes (3): is_ip_blocked(), validate_browser_url(), TestBrowserSecurityPolicy

### Community 39 - "get_user_by_id"
Cohesion: 0.29
Nodes (4): change_password(), get_user_by_id(), update_user_profile(), test_p7_08_profile_update_and_password_change()

### Community 40 - "routine_service.py"
Cohesion: 0.16
Nodes (9): add_routine_item(), create_user_routine(), detect_ingredient_conflicts(), get_user_routine_by_id(), get_user_routines(), Routine, RoutineItem, seed_default_routines_for_user() (+1 more)

### Community 41 - "seed.py"
Cohesion: 0.20
Nodes (6): get_personalized_recommendations(), PersonalizedRecommendationsResult, RecommendedProductItem, get_user_profile(), save_user_profile(), UserProfile

### Community 43 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 44 - "PHASE 6: AUTOMATIC LIVE RETAILER PRICE COMPARISON ENGINE"
Cohesion: 0.12
Nodes (16): 1. Executive Summary, 1. Pytest Test Suite, 2. Architecture & System Flow, 2. Frontend Linting & Production Build, 3. Database Preservation, 3. Retailer Adapter Capabilities & Access Handling, 4. Live Running Services, 4. Product Matching & Pricing Distinction (+8 more)

### Community 45 - "api_add_watchlist"
Cohesion: 0.20
Nodes (4): api_add_watchlist(), api_get_watchlist(), WatchlistItemSchema, WishlistItem

### Community 47 - "PRICEWISE AI BEAUTY — PHASE 6A IMPLEMENTATION REPORT"
Cohesion: 0.14
Nodes (13): 1. Executive Summary, 2. Architecture & Service Status, 3. Database Preservation Verification, 4.1 SSRF & Navigation Security Policy (`src/workers/security_policy.py`), 4.2 Browser Isolation (`src/workers/browser_manager.py`), 4.3 Gemini GenAI Service Boundary (`src/services/gemini_service.py`), 4. Security & Compliance Implementation, 5. Automated Test Results (+5 more)

### Community 49 - "User"
Cohesion: 0.13
Nodes (7): api_delete_routine(), api_delete_routine_item(), api_remove_watchlist(), api_reset_profile(), reset_user_profile(), delete_routine_item(), delete_user_routine()

### Community 50 - "PriceWise Beauty — Phase 1: Premium Frontend"
Cohesion: 0.17
Nodes (10): 🔒 Demo Data Disclosure, 🎨 Design Identity & Palette, Development Server, Prerequisites, PriceWise Beauty — Phase 1: Premium Frontend, Production Build & Preview, 📁 Project Architecture, 🚀 Running the Frontend (+2 more)

### Community 51 - "api_login"
Cohesion: 0.23
Nodes (6): api_login(), api_logout(), api_me(), api_register(), AuthResponse, UserSchema

### Community 53 - "CategoryGrid.tsx"
Cohesion: 0.42
Nodes (7): CategoryGridProps, NavbarProps, CATEGORIES_DATA, CategoryInfo, DiscoveryHomePageProps, ProductCategory, Subcategory

### Community 58 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

## Knowledge Gaps
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_connection()` connect `get_connection` to `add_tracked_product`, `analyze_product_deal`, `test_phase7_auth.py`, `BaseRetailerAdapter`, `test_phase8_integration.py`, `os`, `comparison_view.py`, `schemas.py`, `get_products`, `get_user_preferences`, `NykaaAdapter`, `TestPhase6LivePriceEngine`, `PriceWise AI Beauty — Pre-Phase 6 Complete Project Audit`, `LiveComparisonEngine`, `User`, `auth_service.py`, `get_user_by_id`, `routine_service.py`, `seed.py`, `User`, `TestDatabaseIntegrity`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Are the 25 inferred relationships involving `Product` (e.g. with `analyze_product_deal()` and `_serialize_product_detail()`) actually correct?**
  _`Product` has 25 INFERRED edges - model-reasoned connections that need verification._
- **Should `add_tracked_product` be split into smaller, more focused modules?**
  _Cohesion score 0.0451419502733204 - nodes in this community are weakly interconnected._
- **Why does `Product` connect `Product` to `add_tracked_product`, `analyze_product_deal`, `test_phase8_integration.py`, `comparison_view.py`, `schemas.py`, `get_products`, `test_phase5_retailer_integrations_and_deals.py`, `test_phase5_smart_advisor.py`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **Are the 13 inferred relationships involving `Offer` (e.g. with `14. Phase 6 Integration Readiness Assessment` and `File & Folder Responsibilities:`) actually correct?**
  _`Offer` has 13 INFERRED edges - model-reasoned connections that need verification._
- **Should `analyze_product_deal` be split into smaller, more focused modules?**
  _Cohesion score 0.05542283803153368 - nodes in this community are weakly interconnected._
- **Why does `Offer` connect `analyze_product_deal` to `comparison_view.py`, `schemas.py`, `get_products`, `test_phase5_retailer_integrations_and_deals.py`, `.has_valid_price`, `test_phase5_smart_advisor.py`, `NykaaAdapter`, `Product`, `PriceWise AI Beauty — Pre-Phase 6 Complete Project Audit`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._