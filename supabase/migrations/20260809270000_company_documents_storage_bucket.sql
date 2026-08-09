-- Migration: company_documents_storage_bucket
-- Applied: 2026-08-09
-- Private bucket for statutory documents (GST/PAN/incorporation certs).
-- Kept separate from the existing public 'hrbharat-media' bucket, which is
-- unsuitable for sensitive company documents since it's publicly readable.

insert into storage.buckets (id, name, public)
values ('company-documents', 'company-documents', false)
on conflict (id) do nothing;

-- Path convention: company-documents/{company_id}/{filename}
-- Only the owning company's admin can read/write/delete their own folder.

create policy "Owners can read their company documents"
  on storage.objects for select
  using (
    bucket_id = 'company-documents'
    and (storage.foldername(name))[1] in (select id::text from public.companies where owner_id = auth.uid())
  );

create policy "Owners can upload their company documents"
  on storage.objects for insert
  with check (
    bucket_id = 'company-documents'
    and (storage.foldername(name))[1] in (select id::text from public.companies where owner_id = auth.uid())
  );

create policy "Owners can delete their company documents"
  on storage.objects for delete
  using (
    bucket_id = 'company-documents'
    and (storage.foldername(name))[1] in (select id::text from public.companies where owner_id = auth.uid())
  );