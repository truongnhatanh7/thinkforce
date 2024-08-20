create type "public"."DOC_GEN_STATUS" as enum ('started', 'searching', 'persona', 'refining', 'writing', 'polishing', 'uploading', 'completed', 'error');

alter table "public"."doc_meta" add column "run_id" text;

alter table "public"."doc_meta" add column "status" "DOC_GEN_STATUS";


