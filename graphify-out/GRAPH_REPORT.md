# Graph Report - price-comparison-website  (2026-11-25)

## Corpus Check
- 114 files · ~104,961 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 2, .example 2, .ini 1)

## Summary
- 1385 nodes · 3545 edges · 109 communities (46 shown, 63 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 108 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `6258a8d5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- models.py
- auth_service.py
- json
- migrate_db
- api.ts
- os
- Product
- Deployment
- package.json
- test_phase5_smart_advisor.py
- product_matching_service.py
- postgres.py
- seed.py
- App.tsx
- test_phase4_reviews_and_intelligence.py
- services
- get_products
- main.py
- ProductDetailPage.tsx
- test_phase7_wishlist.py
- services/__init__.py
- check-category-images.mjs
- index.ts
- Any
- User
- api_add_watchlist
- routine_service.py
- DiscoveryHomePage.tsx
- compilerOptions
- get_tracked_products
- test_deployed_backend.py
- compilerOptions
- DealAnalysis
- deal_service.py
- _serialize_product_item
- product_service.py
- test_phase7_auth.py
- reset_user_profile
- PriceWise Beauty
- PriceTrackingRecord
- test_phase8_integration.py
- add_tracked_product
- test_database.py
- TestPhase7RoutinesAndConflictDetection
- TestPhase7WatchlistAndPersonalization
- .oxlintrc.json
- DealVerdict
- TestPhase7ProfileAndPreferences
- WishlistContext.tsx
- connection.py
- stores.ts
- tsconfig.json
- get_connection
- models.py

## God Nodes (most connected - your core abstractions)
1. `get_connection()` - 112 edges
2. `Product` - 92 edges
3. `Offer` - 78 edges
4. `migrate_db()` - 73 edges
5. `get_products()` - 55 edges
6. `register_user()` - 51 edges
7. `add_tracked_product()` - 48 edges
8. `analyze_product_deal()` - 39 edges
9. `PricePoint` - 38 edges
10. `seed_database()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `ProductPriceHistorySummary` --uses--> `PricePoint`  [INFERRED]
  backend/src/database/price_history_service.py → backend/src/database/models.py
- `ProductEvaluation` --uses--> `DealAnalysis`  [INFERRED]
  backend/src/services/recommendation_service.py → backend/src/analysis/deal_detector.py
- `ProductEvaluation` --uses--> `Offer`  [INFERRED]
  backend/src/services/recommendation_service.py → backend/src/database/models.py
- `ProductEvaluation` --uses--> `Product`  [INFERRED]
  backend/src/services/recommendation_service.py → backend/src/database/models.py
- `AlternativeRecommendation` --uses--> `Product`  [INFERRED]
  backend/src/services/alternative_service.py → backend/src/database/models.py

## Import Cycles
- 2-file cycle: `frontend/src/context/AuthContext.tsx -> frontend/src/context/WishlistContext.tsx -> frontend/src/context/AuthContext.tsx`

## Communities (109 total, 63 thin omitted)

### Community 1 - "models.py"
Cohesion: 0.08
Nodes (35): analyze_product_deal(), analyze_suspicious_discount(), calculate_deal_score(), calculate_price_trend(), filter_observations_by_window(), get_deal_classification(), SuspiciousDiscountAlert, PricePoint (+27 more)

### Community 2 - "auth_service.py"
Cohesion: 0.07
Nodes (14): authenticate_user(), _base64url_decode(), _base64url_encode(), change_password(), generate_session_token(), get_user_by_id(), hash_password(), normalize_email() (+6 more)

### Community 3 - "json"
Cohesion: 0.09
Nodes (13): lifespan(), get_shopping_state(), Notification, save_shopping_state(), ShoppingState, Target, seed_frontend_catalogue(), get_personalized_recommendations() (+5 more)

### Community 4 - "migrate_db"
Cohesion: 0.09
Nodes (21): migrate_db(), PriceAlert, evaluate_tracking_rules(), get_alert_history(), get_tracking_summary_stats(), mark_alert_read(), mark_all_alerts_read(), pause_tracking() (+13 more)

### Community 5 - "api.ts"
Cohesion: 0.09
Nodes (51): AuthContext, AuthContextType, AuthProvider(), useTrackerState(), COMMON_BRANDS, INGREDIENTS_AVOID, ProfilePage(), SKIN_CONCERNS (+43 more)

### Community 6 - "os"
Cohesion: 0.08
Nodes (15): seed_database(), temp_db(), seeded_db(), seeded_db(), p3_test_db(), p4_test_db(), p5_test_db(), p6_test_db() (+7 more)

### Community 7 - "Product"
Cohesion: 0.06
Nodes (25): Offer, Product, ComparisonSummary, generate_comparison_summary(), validate_offer_compatibility(), match_product_with_offer(), available_savings(), test_comparison_summary_spread_and_savings() (+17 more)

### Community 8 - "Deployment"
Cohesion: 0.33
Nodes (5): Backend on Render, Deployment, Frontend on GitHub Pages, Live services, Verify

### Community 10 - "package.json"
Cohesion: 0.06
Nodes (44): dependencies, autoprefixer@^10.6.2, clsx@^2.1.1, framer-motion@^14.9.0, lucide-react@^1.66.0, postcss@^8.5.32, react@^19.3.1, react-dom@^19.3.1 (+36 more)

### Community 12 - "test_phase5_smart_advisor.py"
Cohesion: 0.06
Nodes (30): AdvisorPreferences, evaluate_product_for_advisor(), evaluate_use_case_suitability(), extract_battery_hours(), extract_ram_gb(), extract_storage_gb(), get_purchase_recommendations(), has_4k_display() (+22 more)

### Community 13 - "product_matching_service.py"
Cohesion: 0.11
Nodes (10): AlternativeRecommendation, _extract_ingredient_set(), _extract_skin_types(), get_cheapest_alternatives(), evaluate_product_match(), MatchClassification, parse_formulation(), parse_quantity_volume() (+2 more)

### Community 14 - "postgres.py"
Cohesion: 0.13
Nodes (5): Connection, Cursor, get_postgres_connection(), parameter_sql(), Record

### Community 15 - "seed.py"
Cohesion: 0.11
Nodes (8): generate_history_points(), get_user_by_email(), save_user_preferences(), test_p7_16_save_preferences(), test_p7_17_retrieve_preferences(), test_p7_18_persist_preferences_across_service_instances(), test_p7_19_validate_budget_ranges(), test_p8_10_invalid_inputs_resilience()

### Community 16 - "App.tsx"
Cohesion: 0.13
Nodes (28): App(), AppContent(), AuthModal(), Footer(), Navbar(), PriceTrackingModal(), PriceTrackingModalProps, ProductImage() (+20 more)

### Community 18 - "test_phase4_reviews_and_intelligence.py"
Cohesion: 0.06
Nodes (24): PlatformRatingSummary, ProductReview, ProductUsageGuide, UserPreferences, WeightedReviewScore, get_available_stores(), get_user_preferences(), reset_user_preferences() (+16 more)

### Community 19 - "services"
Cohesion: 0.12
Nodes (15): generateValue, key, sync, value, services, buildCommand, envVars, healthCheckPath (+7 more)

### Community 20 - "get_products"
Cohesion: 0.08
Nodes (24): get_products(), test_beauty_currency_symbol_inr(), test_combined_filters_and_sorting(), test_filter_by_budget_range(), test_legacy_currency_symbol_usd(), test_search_by_beauty_brand(), test_search_by_beauty_product_name(), test_search_by_verified_ingredients() (+16 more)

### Community 22 - "main.py"
Cohesion: 0.09
Nodes (36): api_add_routine_item(), api_create_routine(), api_get_recommendations(), api_login(), api_logout(), api_register(), check_manual_url(), get_auto_live_comparison() (+28 more)

### Community 23 - "ProductDetailPage.tsx"
Cohesion: 0.17
Nodes (18): BeautyUsageGuide(), LiveRetailerPriceComparison(), LiveRetailerPriceComparisonProps, ReviewIntelligenceHub(), ReviewIntelligenceHubProps, SUPPORTED_PLATFORMS, ProductDetailPage(), PlatformRatingSummary (+10 more)

### Community 24 - "test_phase7_wishlist.py"
Cohesion: 0.11
Nodes (15): add_to_wishlist(), get_user_wishlist(), get_wishlist_count(), is_in_wishlist(), remove_from_wishlist(), remove_product_from_wishlist(), update_wishlist_note(), test_p7_09_add_product_to_wishlist() (+7 more)

### Community 25 - "services/__init__.py"
Cohesion: 0.18
Nodes (6): get_product_price_history(), ProductPriceHistorySummary, update_user_profile(), test_honest_insufficient_history_state(), test_price_history_window_filtering(), test_variant_separation_in_price_history()

### Community 27 - "check-category-images.mjs"
Cohesion: 0.09
Nodes (18): allImages, baseArg, baseUrl, categories, entries, productProvenance, provenance, root (+10 more)

### Community 29 - "index.ts"
Cohesion: 0.12
Nodes (15): ALTERNATIVES_DATA, REVIEWS_DATA, DupeComparison, FilterOptions, MakeupPreferences, MakeupSubcategory, OtherSubcategory, PriceTrendPoint (+7 more)

### Community 30 - "Any"
Cohesion: 0.12
Nodes (8): api_get_profile(), api_list_routines(), api_me(), api_reorder_routine(), api_update_profile(), api_update_routine(), get_health(), reorder_routine_items()

### Community 31 - "User"
Cohesion: 0.20
Nodes (5): extract_token_from_request(), get_current_user(), get_optional_current_user(), User, get_authenticated_user_from_token()

### Community 33 - "api_add_watchlist"
Cohesion: 0.13
Nodes (6): api_add_watchlist(), api_get_watchlist(), api_remove_watchlist(), api_sync_watchlist(), resolve_catalogue_id(), WishlistItem

### Community 34 - "routine_service.py"
Cohesion: 0.16
Nodes (9): add_routine_item(), create_user_routine(), detect_ingredient_conflicts(), get_user_routine_by_id(), get_user_routines(), Routine, RoutineItem, seed_default_routines_for_user() (+1 more)

### Community 36 - "DiscoveryHomePage.tsx"
Cohesion: 0.11
Nodes (32): BeautyUsageGuideProps, CategoryGrid(), CategoryGridProps, DealSection(), DealSectionProps, DupesSection(), DupesSectionProps, Hero() (+24 more)

### Community 37 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 40 - "get_tracked_products"
Cohesion: 0.12
Nodes (9): get_tracked_products(), get_tracking_by_id(), test_p6_01_create_tracking_record(), test_p6_02_retrieve_tracked_products(), test_p6_05_pause_tracking(), test_p6_07_remove_tracking(), test_p7_22_user_cannot_access_other_users_tracking_records(), test_p7_24_user_cannot_remove_other_users_tracking() (+1 more)

### Community 42 - "test_deployed_backend.py"
Cohesion: 0.28
Nodes (4): client(), register(), test_routines_and_price_alerts_persist_and_are_private(), test_signup_login_profile_and_correct_saved_product()

### Community 43 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 45 - "deal_service.py"
Cohesion: 0.21
Nodes (4): calculate_deal_savings(), check_is_deal_expired(), get_verified_beauty_deals(), VerifiedBeautyDeal

### Community 46 - "_serialize_product_item"
Cohesion: 0.17
Nodes (5): get_product(), list_products(), _serialize_offer(), _serialize_product_detail(), _serialize_product_item()

### Community 47 - "product_service.py"
Cohesion: 0.20
Nodes (6): get_all_brands(), get_all_product_types(), get_all_skin_types(), parse_specs(), test_filter_by_skin_type(), test_dynamic_brands_per_category()

### Community 48 - "test_phase7_auth.py"
Cohesion: 0.17
Nodes (5): test_p7_01_successful_registration(), test_p7_02_duplicate_email_rejection(), test_p7_04_successful_login(), test_p7_05_invalid_password_rejection(), test_p7_06_unknown_account_rejection()

### Community 49 - "reset_user_profile"
Cohesion: 0.15
Nodes (6): api_delete_routine(), api_delete_routine_item(), api_reset_profile(), reset_user_profile(), delete_routine_item(), delete_user_routine()

### Community 50 - "PriceWise Beauty"
Cohesion: 0.07
Nodes (28): API reference, Backend: backend/.env, Backend: Render, Backend tests, Changing products and images, Contents, Current limitations, Demo data and real account data (+20 more)

### Community 52 - "test_phase8_integration.py"
Cohesion: 0.14
Nodes (10): register_user(), get_tracking_by_product_id(), get_product_by_id(), test_p8_02_preferences_influence_smart_advisor(), test_p8_03_track_product_from_comparison(), test_p8_04_evaluate_target_price_alert(), test_p8_05_repeated_evaluation_prevents_duplicate_alerts(), test_p8_06_logout_and_login_as_another_user() (+2 more)

### Community 53 - "add_tracked_product"
Cohesion: 0.09
Nodes (12): add_tracked_product(), update_target_price(), test_watchlist_target_price_validation(), test_p6_03_persistence_across_connections(), test_p6_04_update_target_price(), test_p6_08_reject_invalid_target_prices(), test_p6_09_handle_nonexistent_product(), test_p6_10_handle_duplicate_tracking() (+4 more)

### Community 55 - "test_database.py"
Cohesion: 0.25
Nodes (5): get_all_categories(), test_product_query_and_details(), test_search_filter(), test_seed_database_populates_data(), test_beauty_catalog_populated()

### Community 58 - ".oxlintrc.json"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 61 - "WishlistContext.tsx"
Cohesion: 0.35
Nodes (10): readWishlist(), WishlistContext, WishlistProvider(), clearWishlist(), save(), toggleWishlist(), WishlistState, addToWatchlist() (+2 more)

### Community 62 - "connection.py"
Cohesion: 0.15
Nodes (4): get_db_path(), init_db(), temp_db(), temp_db()

### Community 66 - "get_connection"
Cohesion: 0.13
Nodes (10): get_connection(), record_price_observation(), get_product_by_slug(), test_record_new_price_observation_persists(), test_product_slug_generation_and_resolution(), test_p6_13_generate_price_drop_alert(), test_p6_14_no_alert_for_insignificant_changes(), test_p6_18_subsequent_price_change_generates_new_alert() (+2 more)

### Community 67 - "models.py"
Cohesion: 0.14
Nodes (4): Store, get_offer_price_history(), build_price_history_dataframe(), test_p4_12_database_persistence_and_retrieval()

## Knowledge Gaps
- **63 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `get_connection()` connect `get_connection` to `models.py`, `auth_service.py`, `json`, `migrate_db`, `os`, `postgres.py`, `seed.py`, `test_phase4_reviews_and_intelligence.py`, `get_products`, `main.py`, `test_phase7_wishlist.py`, `services/__init__.py`, `Any`, `api_add_watchlist`, `routine_service.py`, `get_tracked_products`, `product_service.py`, `test_phase7_auth.py`, `reset_user_profile`, `test_phase8_integration.py`, `add_tracked_product`, `test_database.py`, `connection.py`, `models.py`?**
  _High betweenness centrality (0.107) - this node is a cross-community bridge._
- **Are the 23 inferred relationships involving `Product` (e.g. with `analyze_product_deal()` and `_serialize_product_detail()`) actually correct?**
  _`Product` has 23 INFERRED edges - model-reasoned connections that need verification._
- **Should `models.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07596153846153846 - nodes in this community are weakly interconnected._
- **Why does `Product` connect `Product` to `models.py`, `api_add_watchlist`, `models.py`, `get_connection`, `migrate_db`, `test_phase5_smart_advisor.py`, `product_matching_service.py`, `_serialize_product_item`, `deal_service.py`, `product_service.py`, `test_phase8_integration.py`, `get_products`, `main.py`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Are the 10 inferred relationships involving `Offer` (e.g. with `analyze_product_deal()` and `analyze_suspicious_discount()`) actually correct?**
  _`Offer` has 10 INFERRED edges - model-reasoned connections that need verification._
- **Should `auth_service.py` be split into smaller, more focused modules?**
  _Cohesion score 0.07123034227567067 - nodes in this community are weakly interconnected._
- **Why does `Offer` connect `Product` to `models.py`, `models.py`, `DealAnalysis`, `deal_service.py`, `_serialize_product_item`, `product_matching_service.py`, `product_service.py`, `test_phase5_smart_advisor.py`, `test_phase8_integration.py`, `get_products`, `main.py`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._