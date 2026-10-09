CREATE TABLE "activity_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_audit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_catalog" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"model_url" text,
	"thumbnail_url" text,
	"platform_family" text,
	"generation_id" text,
	"scale" jsonb DEFAULT '[1,1,1]'::jsonb NOT NULL,
	"position_offset" jsonb DEFAULT '[0,0,0]'::jsonb NOT NULL,
	"rotation_offset" jsonb DEFAULT '[0,0,0]'::jsonb NOT NULL,
	"anchor_type" text DEFAULT 'pedestal' NOT NULL,
	"rarity" text,
	"is_unlockable" boolean DEFAULT false NOT NULL,
	"unlock_rule_id" text,
	"premium_sku" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"analysis" jsonb,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"asset_id" text NOT NULL,
	"version" integer NOT NULL,
	"model_url" text NOT NULL,
	"analysis" jsonb,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "award_definitions" (
	"id" text PRIMARY KEY NOT NULL,
	"title" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"category" text NOT NULL,
	"condition_type" text NOT NULL,
	"condition_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"rarity" text NOT NULL,
	"material" text DEFAULT 'gold' NOT NULL,
	"model_asset_id" text,
	"points" integer DEFAULT 10 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_games" (
	"id" text PRIMARY KEY NOT NULL,
	"igdb_id" integer,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"alternative_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"summary" text,
	"cover_url" text,
	"artwork_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"screenshot_urls" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"video_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"release_date" text,
	"igdb_platform_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"platform_names" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"genres" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"series" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"franchises" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"developers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"publishers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"age_ratings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"external_ids" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"data_source" text NOT NULL,
	"created_by" text,
	"total_rating" real,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "catalog_search_cache" (
	"key" text PRIMARY KEY NOT NULL,
	"game_ids" jsonb NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_goals" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"series_name" text,
	"target_game_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"generation_id" text,
	"target_count" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "entitlements" (
	"user_id" text NOT NULL,
	"sku" text NOT NULL,
	"source" text NOT NULL,
	"granted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "entitlements_user_id_sku_pk" PRIMARY KEY("user_id","sku")
);
--> statement-breakpoint
CREATE TABLE "error_log" (
	"id" text PRIMARY KEY NOT NULL,
	"scope" text NOT NULL,
	"message" text NOT NULL,
	"detail" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generations" (
	"id" text PRIMARY KEY NOT NULL,
	"platform_id" text NOT NULL,
	"name" text NOT NULL,
	"short_name" text NOT NULL,
	"kind" text NOT NULL,
	"year_start" integer,
	"year_end" integer,
	"case_profile" text NOT NULL,
	"igdb_platform_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_retro" boolean DEFAULT false NOT NULL,
	"shelf_capacity" integer DEFAULT 10 NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "import_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"total" integer DEFAULT 0 NOT NULL,
	"imported" integer DEFAULT 0 NOT NULL,
	"skipped" integer DEFAULT 0 NOT NULL,
	"failed" integer DEFAULT 0 NOT NULL,
	"report" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pending_matches" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "linked_accounts" (
	"user_id" text NOT NULL,
	"provider" text NOT NULL,
	"external_id" text NOT NULL,
	"display_name" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "linked_accounts_user_id_provider_pk" PRIMARY KEY("user_id","provider")
);
--> statement-breakpoint
CREATE TABLE "museum_objects" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"asset_id" text NOT NULL,
	"anchor_id" text NOT NULL,
	"rotation_y" real DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "museum_placements" (
	"user_game_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"gallery_id" text NOT NULL,
	"generation_id" text NOT NULL,
	"shelf_index" integer NOT NULL,
	"slot_index" integer NOT NULL,
	"sort_index" integer NOT NULL,
	"rotation_y" real DEFAULT 0 NOT NULL,
	"scale" real DEFAULT 1 NOT NULL,
	"display_mode" text DEFAULT 'cover-out' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "museum_shelves" (
	"user_id" text NOT NULL,
	"generation_id" text NOT NULL,
	"mode" text DEFAULT 'auto' NOT NULL,
	"sort_by" text DEFAULT 'added' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "museum_shelves_user_id_generation_id_pk" PRIMARY KEY("user_id","generation_id")
);
--> statement-breakpoint
CREATE TABLE "oauth_accounts" (
	"provider" text NOT NULL,
	"provider_account_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "oauth_accounts_provider_provider_account_id_pk" PRIMARY KEY("provider","provider_account_id")
);
--> statement-breakpoint
CREATE TABLE "platforms" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"accent_color" text NOT NULL,
	"tagline" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "themes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" jsonb NOT NULL,
	"description" jsonb NOT NULL,
	"params" jsonb NOT NULL,
	"premium_sku" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_awards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"award_definition_id" text NOT NULL,
	"definition_version" integer NOT NULL,
	"unlocked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"progress_snapshot" jsonb,
	"verification_level" text DEFAULT 'self-reported' NOT NULL,
	"displayed_in_museum" boolean DEFAULT true NOT NULL,
	"seen_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user_games" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"catalog_game_id" text NOT NULL,
	"platform_id" text NOT NULL,
	"generation_id" text NOT NULL,
	"ownership_type" text NOT NULL,
	"store" text,
	"edition" text,
	"region" text,
	"condition" text,
	"purchase_date" text,
	"purchase_price" double precision,
	"purchase_currency" text,
	"status" text DEFAULT 'backlog' NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT true NOT NULL,
	"rating" real,
	"playtime_minutes" integer,
	"notes" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"external_ref" text,
	"verification_status" text DEFAULT 'self-reported' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"password_hash" text,
	"email_verified_at" timestamp with time zone,
	"role" text DEFAULT 'user' NOT NULL,
	"plan" text DEFAULT 'free' NOT NULL,
	"avatar_url" text,
	"locale" text DEFAULT 'tr' NOT NULL,
	"bio" text,
	"collection_description" text,
	"museum_visibility" text DEFAULT 'private' NOT NULL,
	"share_token" text NOT NULL,
	"share_settings" jsonb DEFAULT '{"platforms":["xbox","playstation","pc"],"showAwards":true,"showFavorites":true,"showStats":true}'::jsonb NOT NULL,
	"selected_platforms" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"active_theme_id" text DEFAULT 'modern-museum' NOT NULL,
	"onboarding_completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset_versions" ADD CONSTRAINT "asset_versions_asset_id_asset_catalog_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset_catalog"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_goals" ADD CONSTRAINT "collection_goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "linked_accounts" ADD CONSTRAINT "linked_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "museum_objects" ADD CONSTRAINT "museum_objects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "museum_placements" ADD CONSTRAINT "museum_placements_user_game_id_user_games_id_fk" FOREIGN KEY ("user_game_id") REFERENCES "public"."user_games"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "museum_placements" ADD CONSTRAINT "museum_placements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "museum_shelves" ADD CONSTRAINT "museum_shelves_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "museum_shelves" ADD CONSTRAINT "museum_shelves_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_awards" ADD CONSTRAINT "user_awards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_awards" ADD CONSTRAINT "user_awards_award_definition_id_award_definitions_id_fk" FOREIGN KEY ("award_definition_id") REFERENCES "public"."award_definitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_catalog_game_id_catalog_games_id_fk" FOREIGN KEY ("catalog_game_id") REFERENCES "public"."catalog_games"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_platform_id_platforms_id_fk" FOREIGN KEY ("platform_id") REFERENCES "public"."platforms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "public"."generations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activity_user_type_idx" ON "activity_events" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "audit_created_idx" ON "admin_audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "assets_category_idx" ON "asset_catalog" USING btree ("category","status");--> statement-breakpoint
CREATE INDEX "asset_versions_asset_idx" ON "asset_versions" USING btree ("asset_id","version");--> statement-breakpoint
CREATE INDEX "auth_tokens_user_idx" ON "auth_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_igdb_uq" ON "catalog_games" USING btree ("igdb_id");--> statement-breakpoint
CREATE INDEX "catalog_slug_idx" ON "catalog_games" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "catalog_source_idx" ON "catalog_games" USING btree ("data_source");--> statement-breakpoint
CREATE INDEX "goals_user_idx" ON "collection_goals" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "generations_platform_idx" ON "generations" USING btree ("platform_id");--> statement-breakpoint
CREATE INDEX "import_jobs_user_idx" ON "import_jobs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "museum_objects_anchor_uq" ON "museum_objects" USING btree ("user_id","anchor_id");--> statement-breakpoint
CREATE INDEX "placements_user_gen_idx" ON "museum_placements" USING btree ("user_id","generation_id","sort_index");--> statement-breakpoint
CREATE INDEX "oauth_user_idx" ON "oauth_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_awards_uq" ON "user_awards" USING btree ("user_id","award_definition_id");--> statement-breakpoint
CREATE INDEX "user_games_user_idx" ON "user_games" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "user_games_user_gen_idx" ON "user_games" USING btree ("user_id","generation_id");--> statement-breakpoint
CREATE INDEX "user_games_catalog_idx" ON "user_games" USING btree ("user_id","catalog_game_id");--> statement-breakpoint
CREATE UNIQUE INDEX "user_games_external_uq" ON "user_games" USING btree ("user_id","source","external_ref") WHERE "user_games"."external_ref" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_username_uq" ON "users" USING btree ("username");