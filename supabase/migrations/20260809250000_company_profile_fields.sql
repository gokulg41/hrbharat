-- Migration: company_profile_fields
-- Applied: 2026-08-09
-- Additive only: new nullable columns on companies for the Company Profile page.
-- Nothing existing is renamed, dropped, or made required.

alter table public.companies
  add column if not exists email text,
  add column if not exists website text,
  add column if not exists industry text,
  add column if not exists company_size text,
  add column if not exists established_on date,
  add column if not exists pan_number text,
  add column if not exists address_line1 text,
  add column if not exists address_line2 text,
  add column if not exists city text,
  add column if not exists state text,
  add column if not exists pincode text,
  add column if not exists country text default 'India',
  add column if not exists esi_number text,
  add column if not exists pf_establishment_code text,
  add column if not exists professional_tax_number text;