CREATE UNIQUE INDEX doc_meta_file_name_key ON public.doc_meta USING btree (file_name);

alter table "public"."doc_meta" add constraint "doc_meta_file_name_key" UNIQUE using index "doc_meta_file_name_key";


