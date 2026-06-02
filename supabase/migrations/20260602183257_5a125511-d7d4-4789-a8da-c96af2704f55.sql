create table if not exists public.crm_image_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('image','prompt')),
  channel text,
  image_url text,
  prompt text,
  created_by uuid,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.crm_image_templates to authenticated;
grant all on public.crm_image_templates to service_role;

alter table public.crm_image_templates enable row level security;

create policy "crm_image_templates_admin_all"
on public.crm_image_templates for all
to authenticated
using ( public.is_admin() )
with check ( public.is_admin() );

notify pgrst, 'reload schema';