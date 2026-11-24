# Graph Report - price-comparison-website  (2026-11-25)

## Corpus Check
- 153 files · ~147,166 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 2, .css 2, .example 1)

## Summary
- 1903 nodes · 4907 edges · 75 communities (51 shown, 24 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 209 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `39b3040e`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- add_tracked_product
- analyze_product_deal
- auth_service.py
- json
- add_to_wishlist
- api.ts
- test_phase8_integration.py
- app.py
- 🎬 15-Step Live Demonstration Script
- schemas.py
- package.json
- .check_rate_limit
- get_products
- live_comparison_engine.py
- postgres.py
- services/__init__.py
- App.tsx
- test_phase5_smart_advisor.py
- GeminiService
- services
- Product
- .clean_price_text
- main.py
- ProductDetailPage.tsx
- TestPhase6LivePriceEngine
- PriceWise AI Beauty — Pre-Phase 6 Complete Project Audit
- LiveComparisonEngine
- check-category-images.mjs
- Any
- User
- index.ts
- shopping.py
- BrowserManager
- PHASE 6 VERIFICATION AUDIT REPORT
- PriceWise AI Beauty — Phase 7 Implementation Report
- BaseRetailerAdapter
- DiscoveryHomePage.tsx
- compilerOptions
- validate_browser_url
- deal_service.py
- routine_service.py
- _serialize_product_item
- test_deployed_backend.py
- compilerOptions
- PHASE 6: AUTOMATIC LIVE RETAILER PRICE COMPARISON ENGINE
- api_add_watchlist
- TestPhase7AuthAndSecurity
- PRICEWISE AI BEAUTY — PHASE 6A IMPLEMENTATION REPORT
- TestFastApiBridge
- User
- PriceWise Beauty — Phase 1: Premium Frontend
- post
- PriceTrackingRecord
- DiscoveryHomePage.tsx
- TestPhase7RoutinesAndConflictDetection
- test_phase7_api_and_services.py
- DEPLOYMENT.md
- TestPhase7WatchlistAndPersonalization
- .oxlintrc.json
- TestBrowserSecurityPolicy
- TestDatabaseIntegrity
- WishlistContext.tsx
- get_connection
- stores.ts
- tsconfig.json
- verify_password

## God Nodes (most connected - your core abstractions)
1. `get_connection()` - 120 edges
2. `Product` - 98 edges
3. `Offer` - 87 edges
4. `migrate_db()` - 78 edges
5. `get_products()` - 65 edges
6. `register_user()` - 53 edges
7. `add_tracked_product()` - 52 edges
8. `analyze_product_deal()` - 45 edges
9. `PricePoint` - 40 edges
10. `BaseRetailerAdapter` - 40 edges

## Surprising Connections (you probably didn't know these)
- `Session Token Cryptography` --references--> `get_current_user()`  [INFERRED]
  PHASE7_IMPLEMENTATION_REPORT.md → src/api/auth_deps.py
- `11. Security & Compliance Findings` --references--> `validate_browser_url()`  [INFERRED]
  PHASE6_VERIFICATION_AUDIT_REPORT.md → src/workers/security_policy.py
- `API Inventory:` --references--> `authenticate_user()`  [INFERRED]
  PRE_PHASE6_PROJECT_AUDIT_REPORT.md → src/services/auth_service.py
- `File & Folder Responsibilities:` --references--> `PriceAlert`  [INFERRED]
  PRE_PHASE6_PROJECT_AUDIT_REPORT.md → src/database/models.py
- `Step 14: Explain Architecture & Technology Decisions` --references--> `PricePoint`  [INFERRED]
  docs/DEMO_GUIDE.md → src/database/models.py

## Import Cycles
- 2-file cycle: `frontend/src/context/AuthContext.tsx -> frontend/src/context/WishlistContext.tsx -> frontend/src/context/AuthContext.tsx`

## Communities (75 total, 24 thin omitted)

### Community 0 - "add_tracked_product"
Cohesion: 0.05
Nodes (45): PriceAlert, add_tracked_product(), evaluate_tracking_rules(), get_alert_history(), get_tracked_products(), get_tracking_by_id(), get_tracking_summary_stats(), mark_alert_read() (+37 more)

### Community 1 - "analyze_product_deal"
Cohesion: 0.05
Nodes (41): analyze_product_deal(), analyze_suspicious_discount(), calculate_deal_score(), calculate_price_trend(), DealAnalysis, DealVerdict, filter_observations_by_window(), get_deal_classification() (+33 more)

### Community 2 - "auth_service.py"
Cohesion: 0.18
Nodes (5): _base64url_decode(), _base64url_encode(), generate_session_token(), validate_email_format(), verify_session_token()

### Community 3 - "json"
Cohesion: 0.20
Nodes (6): get_personalized_recommendations(), PersonalizedRecommendationsResult, RecommendedProductItem, get_user_profile(), save_user_profile(), UserProfile

### Community 4 - "add_to_wishlist"
Cohesion: 0.10
Nodes (16): get_tracking_by_product_id(), add_to_wishlist(), get_user_wishlist(), get_wishlist_count(), is_in_wishlist(), remove_from_wishlist(), update_wishlist_note(), render_wishlist_view() (+8 more)

### Community 5 - "api.ts"
Cohesion: 0.08
Nodes (56): AuthContext, AuthContextType, AuthProvider(), COMMON_BRANDS, INGREDIENTS_AVOID, ProfilePage(), SKIN_CONCERNS, SKIN_TYPES (+48 more)

### Community 6 - "test_phase8_integration.py"
Cohesion: 0.04
Nodes (33): generate_history_points(), seed_database(), authenticate_user(), get_user_by_email(), get_user_by_id(), normalize_email(), register_user(), temp_db() (+25 more)

### Community 7 - "app.py"
Cohesion: 0.05
Nodes (26): UserPreferences, build_price_history_dataframe(), get_available_stores(), get_user_preferences(), reset_user_preferences(), save_user_preferences(), get_all_brands(), get_all_categories() (+18 more)

### Community 8 - "🎬 15-Step Live Demonstration Script"
Cohesion: 0.04
Nodes (46): 🎬 15-Step Live Demonstration Script, 1. Terminal Startup, 2. Pre-Configured Demo Account, 💡 Examiner Q&A Cheat Sheet, 📋 Executive Viva Overview, PriceWise AI — Comprehensive Academic Demo & Viva Presentation Guide 🎓, 🔑 Quick-Start Credentials & Environment Setup, Step 10: Demonstrate Wishlist Functionality (+38 more)

### Community 9 - "schemas.py"
Cohesion: 0.14
Nodes (17): api_get_recommendations(), api_login(), api_register(), check_manual_url(), get_auto_live_comparison(), get_live_comparison_engine(), AuthResponse, LiveComparisonResponse (+9 more)

### Community 10 - "package.json"
Cohesion: 0.06
Nodes (44): dependencies, autoprefixer@^10.6.2, clsx@^2.1.1, framer-motion@^14.9.0, lucide-react@^1.66.0, postcss@^8.5.32, react@^19.3.1, react-dom@^19.3.1 (+36 more)

### Community 11 - ".check_rate_limit"
Cohesion: 0.07
Nodes (3): 14. Phase 6 Integration Readiness Assessment, RetailerOfferResult, test_adapters_configured_when_env_credentials_present()

### Community 12 - "get_products"
Cohesion: 0.04
Nodes (45): API Inventory:, AlternativeRecommendation, _extract_ingredient_set(), _extract_skin_types(), get_cheapest_alternatives(), get_all_product_types(), get_all_skin_types(), get_all_stores() (+37 more)

### Community 13 - "live_comparison_engine.py"
Cohesion: 0.07
Nodes (17): CapabilityStatus, Store, GeminiSKUExtractionResult, get_gemini_service(), evaluate_product_match(), match_product_with_offer(), MatchClassification, parse_formulation() (+9 more)

### Community 14 - "postgres.py"
Cohesion: 0.13
Nodes (5): Connection, Cursor, get_postgres_connection(), parameter_sql(), Record

### Community 15 - "services/__init__.py"
Cohesion: 0.08
Nodes (21): ensure_database_ready(), migrate_db(), PlatformRatingSummary, ProductReview, ProductUsageGuide, WeightedReviewScore, update_user_profile(), add_product_review() (+13 more)

### Community 16 - "App.tsx"
Cohesion: 0.16
Nodes (25): App(), AppContent(), AuthModal(), BeautyUsageGuide(), Footer(), Navbar(), PriceTrackingModal(), ScrollToTop() (+17 more)

### Community 17 - "test_phase5_smart_advisor.py"
Cohesion: 0.05
Nodes (34): AdvisorPreferences, evaluate_product_for_advisor(), evaluate_use_case_suitability(), extract_battery_hours(), extract_ram_gb(), extract_storage_gb(), get_purchase_recommendations(), has_4k_display() (+26 more)

### Community 19 - "services"
Cohesion: 0.13
Nodes (14): generateValue, key, sync, value, services, buildCommand, envVars, healthCheckPath (+6 more)

### Community 20 - "Product"
Cohesion: 0.06
Nodes (25): Product, ComparisonSummary, generate_comparison_summary(), validate_offer_compatibility(), available_savings(), get_pill_class(), render_product_card(), test_comparison_summary_spread_and_savings() (+17 more)

### Community 22 - "main.py"
Cohesion: 0.15
Nodes (8): api_remove_watchlist(), api_sync_watchlist(), get_health(), lifespan(), HealthResponse, SyncWatchlistRequest, resolve_catalogue_id(), seed_frontend_catalogue()

### Community 23 - "ProductDetailPage.tsx"
Cohesion: 0.15
Nodes (17): retailerHosts, verification, LiveRetailerPriceComparison(), LiveRetailerPriceComparisonProps, ProductDetailModal(), ReviewIntelligenceHub(), ReviewIntelligenceHubProps, SUPPORTED_PLATFORMS (+9 more)

### Community 25 - "PriceWise AI Beauty — Pre-Phase 6 Complete Project Audit"
Cohesion: 0.05
Nodes (30): 10. Test Suite & Production Build Results, 11. Windows 11 Development Environment Compatibility, 12. Security & Reliability Audit, 13. Phase 1–5 Functionality Preservation Checklist, 15. Phase 6 Implementation Plan, 1. Executive Summary, 1. Python Pytest Suite:, 2. Complete Project Architecture & Folder Responsibilities (+22 more)

### Community 26 - "LiveComparisonEngine"
Cohesion: 0.10
Nodes (4): LiveComparisonEngine, LiveComparisonResult, LiveComparisonSummary, LiveRetailerOfferItem

### Community 27 - "check-category-images.mjs"
Cohesion: 0.10
Nodes (15): allImages, baseArg, baseUrl, categories, entries, productProvenance, provenance, root (+7 more)

### Community 28 - "Any"
Cohesion: 0.21
Nodes (6): api_get_profile(), api_list_routines(), api_me(), api_update_profile(), UpdateProfileRequest, UserProfileSchema

### Community 29 - "User"
Cohesion: 0.21
Nodes (5): extract_token_from_request(), get_current_user(), get_optional_current_user(), User, get_authenticated_user_from_token()

### Community 30 - "index.ts"
Cohesion: 0.11
Nodes (16): BeautyUsageGuideProps, PriceHistoryChartProps, TimeRange, REVIEWS_DATA, FilterOptions, KeyActiveDetail, MakeupPreferences, MakeupSubcategory (+8 more)

### Community 31 - "shopping.py"
Cohesion: 0.21
Nodes (5): get_shopping_state(), Notification, save_shopping_state(), ShoppingState, Target

### Community 33 - "PHASE 6 VERIFICATION AUDIT REPORT"
Cohesion: 0.09
Nodes (21): 10. Database Preservation Audit, 11. Security & Compliance Findings, 12. Defects & Limitations Identified, 13. Fixes & Next Steps Recommended, 14. Final Readiness Decision, 1. Executive Summary, 2. Project & Service Status, 3. Files Inspected (+13 more)

### Community 34 - "PriceWise AI Beauty — Phase 7 Implementation Report"
Cohesion: 0.10
Nodes (20): 1. Executive Summary, 1. Full Repository Test Suite (Pytest), 2. Architecture & Data Model Additions, 2. Frontend Linter & Production Build, 3. Cryptographic Security & Authentication, 3. Live Server Endpoint Health, 4. Personalized Skincare Routines & Conflict Detection, 5. Non-Medical Cosmetic Disclaimer (+12 more)

### Community 35 - "BaseRetailerAdapter"
Cohesion: 0.07
Nodes (12): File & Folder Responsibilities:, AmazonIndiaAdapter, BaseRetailerAdapter, MyntraAdapter, NykaaAdapter, PurplleAdapter, get_adapter_registry(), RetailerAdapterRegistry (+4 more)

### Community 36 - "DiscoveryHomePage.tsx"
Cohesion: 0.15
Nodes (21): DealSectionProps, DupesSectionProps, HeroProps, OfficialProductLink(), PriceTrackingModalProps, ProductCard(), ProductCardProps, ProductDetailModalProps (+13 more)

### Community 37 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 38 - "validate_browser_url"
Cohesion: 0.17
Nodes (3): BrowserSecurityError, is_ip_blocked(), validate_browser_url()

### Community 39 - "deal_service.py"
Cohesion: 0.15
Nodes (6): calculate_deal_savings(), check_is_deal_expired(), get_verified_beauty_deals(), VerifiedBeautyDeal, test_calculate_deal_savings(), test_deal_expiration_check()

### Community 40 - "routine_service.py"
Cohesion: 0.14
Nodes (10): add_routine_item(), create_user_routine(), delete_user_routine(), get_user_routine_by_id(), get_user_routines(), reorder_routine_items(), Routine, RoutineItem (+2 more)

### Community 41 - "_serialize_product_item"
Cohesion: 0.19
Nodes (8): get_product(), list_products(), _serialize_offer(), _serialize_product_detail(), _serialize_product_item(), OfferSchema, ProductDetailSchema, ProductListItemSchema

### Community 42 - "test_deployed_backend.py"
Cohesion: 0.28
Nodes (4): client(), register(), test_routines_and_price_alerts_persist_and_are_private(), test_signup_login_profile_and_correct_saved_product()

### Community 43 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 44 - "PHASE 6: AUTOMATIC LIVE RETAILER PRICE COMPARISON ENGINE"
Cohesion: 0.12
Nodes (16): 1. Executive Summary, 1. Pytest Test Suite, 2. Architecture & System Flow, 2. Frontend Linting & Production Build, 3. Database Preservation, 3. Retailer Adapter Capabilities & Access Handling, 4. Live Running Services, 4. Product Matching & Pricing Distinction (+8 more)

### Community 45 - "api_add_watchlist"
Cohesion: 0.16
Nodes (5): api_add_watchlist(), api_get_watchlist(), AddWatchlistRequest, WatchlistItemSchema, WishlistItem

### Community 47 - "PRICEWISE AI BEAUTY — PHASE 6A IMPLEMENTATION REPORT"
Cohesion: 0.14
Nodes (13): 1. Executive Summary, 2. Architecture & Service Status, 3. Database Preservation Verification, 4.1 SSRF & Navigation Security Policy (`src/workers/security_policy.py`), 4.2 Browser Isolation (`src/workers/browser_manager.py`), 4.3 Gemini GenAI Service Boundary (`src/services/gemini_service.py`), 4. Security & Compliance Implementation, 5. Automated Test Results (+5 more)

### Community 49 - "User"
Cohesion: 0.12
Nodes (9): api_delete_routine(), api_delete_routine_item(), api_reorder_routine(), api_reset_profile(), api_update_routine(), ReorderRoutineRequest, UpdateRoutineRequest, reset_user_profile() (+1 more)

### Community 50 - "PriceWise Beauty — Phase 1: Premium Frontend"
Cohesion: 0.17
Nodes (10): 🔒 Demo Data Disclosure, 🎨 Design Identity & Palette, Development Server, Prerequisites, PriceWise Beauty — Phase 1: Premium Frontend, Production Build & Preview, 📁 Project Architecture, 🚀 Running the Frontend (+2 more)

### Community 51 - "post"
Cohesion: 0.18
Nodes (8): api_add_routine_item(), api_create_routine(), api_logout(), _serialize_routine(), AddRoutineItemRequest, CreateRoutineRequest, RoutineItemSchema, RoutineSchema

### Community 53 - "DiscoveryHomePage.tsx"
Cohesion: 0.19
Nodes (17): CategoryGrid(), CategoryGridProps, DealSection(), DupesSection(), Hero(), HowToUseSection(), NavbarProps, ReviewShowcase() (+9 more)

### Community 58 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 61 - "WishlistContext.tsx"
Cohesion: 0.38
Nodes (9): readWishlist(), WishlistContext, WishlistProvider(), clearWishlist(), save(), toggleWishlist(), WishlistState, addToWatchlist() (+1 more)

### Community 62 - "get_connection"
Cohesion: 0.08
Nodes (14): get_connection(), get_db_path(), init_db(), get_offer_price_history(), get_product_price_history(), ProductPriceHistorySummary, temp_db(), test_honest_insufficient_history_state() (+6 more)

### Community 66 - "verify_password"
Cohesion: 0.28
Nodes (3): change_password(), hash_password(), verify_password()

## Knowledge Gaps
- **24 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_connection()` connect `get_connection` to `add_tracked_product`, `analyze_product_deal`, `auth_service.py`, `json`, `add_to_wishlist`, `test_phase8_integration.py`, `app.py`, `get_products`, `live_comparison_engine.py`, `postgres.py`, `services/__init__.py`, `main.py`, `TestPhase6LivePriceEngine`, `LiveComparisonEngine`, `shopping.py`, `BaseRetailerAdapter`, `validate_browser_url`, `routine_service.py`, `User`, `TestDatabaseIntegrity`, `verify_password`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **Are the 23 inferred relationships involving `Product` (e.g. with `analyze_product_deal()` and `AlternativeRecommendation`) actually correct?**
  _`Product` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Should `add_tracked_product` be split into smaller, more focused modules?**
  _Cohesion score 0.048712871287128715 - nodes in this community are weakly interconnected._
- **Why does `Offer` connect `analyze_product_deal` to `BaseRetailerAdapter`, `deal_service.py`, `_serialize_product_item`, `.check_rate_limit`, `get_products`, `live_comparison_engine.py`, `test_phase5_smart_advisor.py`, `Product`, `main.py`, `PriceWise AI Beauty — Pre-Phase 6 Complete Project Audit`?**
  _High betweenness centrality (0.063) - this node is a cross-community bridge._
- **Are the 12 inferred relationships involving `Offer` (e.g. with `14. Phase 6 Integration Readiness Assessment` and `File & Folder Responsibilities:`) actually correct?**
  _`Offer` has 12 INFERRED edges - model-reasoned connections that need verification._
- **Should `analyze_product_deal` be split into smaller, more focused modules?**
  _Cohesion score 0.05445665445665446 - nodes in this community are weakly interconnected._
- **Why does `migrate_db()` connect `services/__init__.py` to `add_tracked_product`, `analyze_product_deal`, `auth_service.py`, `BaseRetailerAdapter`, `json`, `add_to_wishlist`, `test_phase8_integration.py`, `app.py`, `🎬 15-Step Live Demonstration Script`, `routine_service.py`, `User`, `get_connection`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._