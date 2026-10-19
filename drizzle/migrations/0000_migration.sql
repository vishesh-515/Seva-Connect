
create type public.org_role as enum ('owner','admin','staff','project_manager','viewer');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, job_title text, phone text, avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 2 and 120),
  org_type text not null default 'Non-profit',
  contact_email text not null,
  phone text, address text,
  country text not null default 'India',
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  logo_url text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  role public.org_role not null default 'staff',
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, user_id)
);
create index on public.organization_members(user_id);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role public.org_role not null default 'staff' check (role <> 'owner'),
  status text not null default 'pending' check (status in ('pending','accepted','revoked')),
  invited_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index invitations_pending_unique on public.invitations(organization_id, lower(email)) where status = 'pending';

create or replace function public.org_role_of(_org uuid)
returns public.org_role language sql stable security definer set search_path = public as $$
  select role from public.organization_members
  where organization_id = _org and user_id = auth.uid() and status = 'active' limit 1
$$;

create or replace function public.is_org_member(_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.organization_members where organization_id=_org and user_id=auth.uid() and status='active')
$$;

create or replace function public.has_org_role(_org uuid, _roles public.org_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.organization_members where organization_id=_org and user_id=auth.uid() and status='active' and role = any(_roles))
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end $$;

create table public.beneficiaries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  code text not null default ('BEN-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  full_name text not null check (length(full_name) between 2 and 150),
  date_of_birth date, gender text, phone text, email text, address text, city text, region text, postal_code text,
  household_size int check (household_size is null or household_size between 1 and 50),
  support_category text not null default 'Other',
  support_requirements text,
  registration_date date not null default current_date,
  status text not null default 'active' check (status in ('active','inactive','graduated','archived')),
  notes text,
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);
create index on public.beneficiaries(organization_id, created_at desc);
create index on public.beneficiaries(organization_id, status);

create table public.volunteers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  full_name text not null check (length(full_name) between 2 and 150),
  email text, phone text, skills text, interests text, availability text, address text,
  joining_date date not null default current_date,
  status text not null default 'active' check (status in ('active','inactive','archived')),
  notes text,
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.volunteers(organization_id, status);

create table public.donors (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  donor_type text not null default 'individual' check (donor_type in ('individual','organization')),
  name text not null check (length(name) between 2 and 150),
  email text, phone text, address text, notes text,
  status text not null default 'active' check (status in ('active','archived')),
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.donors(organization_id);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (length(name) between 2 and 150),
  description text, objectives text,
  start_date date, end_date date,
  status text not null default 'planned' check (status in ('planned','active','on_hold','completed','cancelled')),
  budget numeric(14,2) check (budget is null or budget >= 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  manager_id uuid,
  target_beneficiaries int check (target_beneficiaries is null or target_beneficiaries >= 0),
  location text,
  manual_progress int check (manual_progress is null or manual_progress between 0 and 100),
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);
create index on public.projects(organization_id, status);

create table public.project_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid,
  volunteer_id uuid references public.volunteers(id) on delete cascade,
  role text not null default 'member',
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((user_id is null) <> (volunteer_id is null))
);
create unique index pm_user_unique on public.project_members(project_id, user_id) where user_id is not null;
create unique index pm_vol_unique on public.project_members(project_id, volunteer_id) where volunteer_id is not null;

create table public.project_beneficiaries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  beneficiary_id uuid not null references public.beneficiaries(id) on delete cascade,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, beneficiary_id)
);

create table public.donations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text not null default ('DON-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  donation_type text not null default 'monetary' check (donation_type in ('monetary','in_kind')),
  donor_id uuid references public.donors(id) on delete set null,
  project_id uuid references public.projects(id) on delete set null,
  amount numeric(14,2) check (amount is null or amount > 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  donation_date date not null default current_date,
  payment_method text, payment_reference text, purpose text,
  status text not null default 'recorded' check (status in ('recorded','confirmed','cancelled','refunded')),
  description text, receipt_reference text,
  item_name text, item_category text,
  quantity numeric(14,2) check (quantity is null or quantity > 0),
  unit text,
  estimated_value numeric(14,2) check (estimated_value is null or estimated_value >= 0),
  storage_notes text,
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, reference),
  check (donation_type <> 'monetary' or amount is not null),
  check (donation_type <> 'in_kind' or (item_name is not null and quantity is not null))
);
create index on public.donations(organization_id, donation_date desc);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text not null default ('EXP-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  title text not null check (length(title) between 2 and 150),
  description text,
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'INR' check (currency ~ '^[A-Z]{3}$'),
  category text not null default 'Other',
  expense_date date not null default current_date,
  project_id uuid references public.projects(id) on delete set null,
  payment_method text, vendor text, receipt_reference text, receipt_path text,
  status text not null default 'recorded' check (status in ('recorded','approved','rejected','cancelled')),
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, reference)
);
create index on public.expenses(organization_id, expense_date desc);
create index on public.expenses(project_id);

create table public.assistance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  reference text not null default ('AST-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
  beneficiary_id uuid not null references public.beneficiaries(id) on delete restrict,
  project_id uuid references public.projects(id) on delete set null,
  assistance_type text not null default 'Other',
  description text,
  quantity numeric(14,2) not null default 1 check (quantity > 0),
  unit text,
  estimated_value numeric(14,2) check (estimated_value is null or estimated_value >= 0),
  distribution_date date not null default current_date,
  responsible_user_id uuid,
  notes text,
  status text not null default 'distributed' check (status in ('planned','distributed','cancelled','corrected')),
  created_by uuid, updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, reference)
);
create index on public.assistance_records(organization_id, distribution_date desc);
create index on public.assistance_records(beneficiary_id);

create table public.volunteer_hours (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  project_id uuid references public.projects(id) on delete set null,
  activity_date date not null default current_date,
  hours numeric(6,2) not null check (hours > 0 and hours <= 24),
  description text,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.volunteer_hours(volunteer_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  user_id uuid not null,
  title text not null, body text, link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.notifications(user_id, created_at desc);

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  actor_id uuid,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  summary text,
  changes jsonb,
  created_at timestamptz not null default now()
);
create index on public.activity_logs(organization_id, created_at desc);
create index on public.activity_logs(entity_id);

grant select, insert, update, delete on
  public.profiles, public.organizations, public.organization_members, public.invitations,
  public.beneficiaries, public.volunteers, public.donors, public.projects, public.project_members,
  public.project_beneficiaries, public.donations, public.expenses, public.assistance_records,
  public.volunteer_hours, public.notifications to authenticated;
grant select on public.activity_logs to authenticated;
grant all on all tables in schema public to service_role;

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.invitations enable row level security;
alter table public.beneficiaries enable row level security;
alter table public.volunteers enable row level security;
alter table public.donors enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.project_beneficiaries enable row level security;
alter table public.donations enable row level security;
alter table public.expenses enable row level security;
alter table public.assistance_records enable row level security;
alter table public.volunteer_hours enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

create policy "profiles read self or co-members" on public.profiles for select to authenticated using (
  id = auth.uid() or exists (
    select 1 from public.organization_members m1 join public.organization_members m2 on m1.organization_id = m2.organization_id
    where m1.user_id = auth.uid() and m2.user_id = profiles.id and m1.status='active')
);
create policy "profiles insert self" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "profiles update self" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "org read members" on public.organizations for select to authenticated using (public.is_org_member(id));
create policy "org update admins" on public.organizations for update to authenticated
  using (public.has_org_role(id, array['owner','admin']::public.org_role[]))
  with check (public.has_org_role(id, array['owner','admin']::public.org_role[]));

create policy "members read" on public.organization_members for select to authenticated using (public.is_org_member(organization_id));
create policy "members update admins" on public.organization_members for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]) and role <> 'owner')
  with check (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]) and role <> 'owner');
create policy "members delete admins or self" on public.organization_members for delete to authenticated
  using ((public.has_org_role(organization_id, array['owner','admin']::public.org_role[]) and role <> 'owner') or (user_id = auth.uid() and role <> 'owner'));

create policy "inv read admins or invitee" on public.invitations for select to authenticated using (
  public.has_org_role(organization_id, array['owner','admin']::public.org_role[])
  or lower(email) = lower(coalesce(auth.jwt()->>'email',''))
);
create policy "inv insert admins" on public.invitations for insert to authenticated
  with check (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]) and invited_by = auth.uid());
create policy "inv update admins" on public.invitations for update to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]))
  with check (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));
create policy "inv delete admins" on public.invitations for delete to authenticated
  using (public.has_org_role(organization_id, array['owner','admin']::public.org_role[]));

do $$
declare t record;
begin
  for t in select * from (values
    ('beneficiaries', array['owner','admin','staff','project_manager'], array['owner','admin','staff','project_manager','viewer']),
    ('volunteers',    array['owner','admin','staff','project_manager'], array['owner','admin','staff','project_manager','viewer']),
    ('donors',        array['owner','admin','staff'],                   array['owner','admin','staff']),
    ('projects',      array['owner','admin','project_manager'],         array['owner','admin','staff','project_manager','viewer']),
    ('project_members', array['owner','admin','project_manager'],       array['owner','admin','staff','project_manager','viewer']),
    ('project_beneficiaries', array['owner','admin','staff','project_manager'], array['owner','admin','staff','project_manager','viewer']),
    ('donations',     array['owner','admin','staff'],                   array['owner','admin','staff','project_manager','viewer']),
    ('expenses',      array['owner','admin','staff','project_manager'], array['owner','admin','staff','project_manager','viewer']),
    ('assistance_records', array['owner','admin','staff','project_manager'], array['owner','admin','staff','project_manager','viewer']),
    ('volunteer_hours', array['owner','admin','staff','project_manager'], array['owner','admin','staff','project_manager','viewer'])
  ) as v(tbl, writers, readers)
  loop
    execute format('create policy "%1$s read" on public.%1$I for select to authenticated using (public.has_org_role(organization_id, %2$L::public.org_role[]))', t.tbl, t.readers);
    execute format('create policy "%1$s insert" on public.%1$I for insert to authenticated with check (public.has_org_role(organization_id, %2$L::public.org_role[]))', t.tbl, t.writers);
    execute format('create policy "%1$s update" on public.%1$I for update to authenticated using (public.has_org_role(organization_id, %2$L::public.org_role[])) with check (public.has_org_role(organization_id, %2$L::public.org_role[]))', t.tbl, t.writers);
    execute format('create policy "%1$s delete" on public.%1$I for delete to authenticated using (public.has_org_role(organization_id, array[''owner'',''admin'']::public.org_role[]))', t.tbl);
    execute format('create trigger trg_%1$s_updated before update on public.%1$I for each row execute function public.set_updated_at()', t.tbl);
  end loop;
end $$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_orgs_updated before update on public.organizations for each row execute function public.set_updated_at();
create trigger trg_members_updated before update on public.organization_members for each row execute function public.set_updated_at();
create trigger trg_inv_updated before update on public.invitations for each row execute function public.set_updated_at();

create policy "notif read own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notif update own" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif delete own" on public.notifications for delete to authenticated using (user_id = auth.uid());

create policy "logs read members" on public.activity_logs for select to authenticated using (public.is_org_member(organization_id));

create or replace function public.guard_same_org()
returns trigger language plpgsql security definer set search_path = public as $$
declare j jsonb := to_jsonb(new); k text; tbl text; ref_org uuid;
begin
  foreach k in array array['donor_id','project_id','beneficiary_id','volunteer_id'] loop
    if j ? k and j->>k is not null then
      tbl := case k when 'donor_id' then 'donors' when 'project_id' then 'projects' when 'beneficiary_id' then 'beneficiaries' else 'volunteers' end;
      execute format('select organization_id from public.%I where id = $1', tbl) into ref_org using (j->>k)::uuid;
      if ref_org is distinct from new.organization_id then
        raise exception 'Referenced % belongs to a different organization', k;
      end if;
    end if;
  end loop;
  if tg_op = 'INSERT' and j ? 'created_by' then
    new := jsonb_populate_record(new, jsonb_build_object('created_by', auth.uid()));
  end if;
  if j ? 'updated_by' then
    new := jsonb_populate_record(new, jsonb_build_object('updated_by', auth.uid()));
  end if;
  if tg_op = 'UPDATE' and new.organization_id <> old.organization_id then
    raise exception 'organization_id cannot be changed';
  end if;
  return new;
end $$;

create or replace function public.log_activity()
returns trigger language plpgsql security definer set search_path = public as $$
declare rec jsonb; old_rec jsonb; label text; diff jsonb := '{}'::jsonb; k text;
begin
  if tg_op = 'DELETE' then rec := to_jsonb(old); else rec := to_jsonb(new); end if;
  label := coalesce(rec->>'full_name', rec->>'name', rec->>'title', rec->>'item_name', rec->>'reference', rec->>'role', '');
  if tg_op = 'UPDATE' then
    old_rec := to_jsonb(old);
    for k in select jsonb_object_keys(rec) loop
      if k not in ('updated_at','updated_by') and (rec->k) is distinct from (old_rec->k) then
        diff := diff || jsonb_build_object(k, jsonb_build_object('from', old_rec->k, 'to', rec->k));
      end if;
    end loop;
    if diff = '{}'::jsonb then return new; end if;
  end if;
  if not exists (select 1 from public.organizations where id = (rec->>'organization_id')::uuid) then
    if tg_op = 'DELETE' then return old; end if; return new;
  end if;
  insert into public.activity_logs(organization_id, actor_id, action, entity_type, entity_id, summary, changes)
  values ((rec->>'organization_id')::uuid, auth.uid(),
    case tg_op when 'INSERT' then 'created' when 'UPDATE' then (case when diff ? 'status' then 'status_changed' else 'updated' end) else 'deleted' end,
    tg_table_name, (rec->>'id')::uuid, label,
    case when tg_op='UPDATE' then diff else null end);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['beneficiaries','volunteers','donors','projects','donations','expenses','assistance_records','project_members','project_beneficiaries','volunteer_hours'] loop
    execute format('create trigger trg_%1$s_guard before insert or update on public.%1$I for each row execute function public.guard_same_org()', t);
  end loop;
  foreach t in array array['beneficiaries','volunteers','donors','projects','donations','expenses','assistance_records','organization_members'] loop
    execute format('create trigger trg_%1$s_log after insert or update or delete on public.%1$I for each row execute function public.log_activity()', t);
  end loop;
end $$;

create or replace function public.notify_project_assignment()
returns trigger language plpgsql security definer set search_path = public as $$
declare pname text;
begin
  if new.user_id is not null and new.user_id is distinct from auth.uid() then
    select name into pname from public.projects where id = new.project_id;
    insert into public.notifications(organization_id, user_id, title, body, link)
    values (new.organization_id, new.user_id, 'Assigned to project', 'You were added to ' || coalesce(pname,'a project'), '/projects/' || new.project_id);
  end if;
  return new;
end $$;
create trigger trg_pm_notify after insert on public.project_members for each row execute function public.notify_project_assignment();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.create_organization(_name text, _org_type text, _contact_email text, _phone text, _address text, _country text, _currency text)
returns uuid language plpgsql security definer set search_path = public as $$
declare oid uuid;
begin
  if auth.uid() is null then raise exception 'Not authenticated'; end if;
  insert into public.organizations(name, org_type, contact_email, phone, address, country, currency, created_by)
  values (_name, coalesce(_org_type,'Non-profit'), _contact_email, _phone, _address, coalesce(_country,'India'), upper(coalesce(_currency,'INR')), auth.uid())
  returning id into oid;
  insert into public.organization_members(organization_id, user_id, role) values (oid, auth.uid(), 'owner');
  return oid;
end $$;

create or replace function public.accept_pending_invitations()
returns int language plpgsql security definer set search_path = public as $$
declare em text := lower(coalesce(auth.jwt()->>'email','')); n int := 0; r record;
begin
  if auth.uid() is null or em = '' then return 0; end if;
  for r in select * from public.invitations where lower(email) = em and status = 'pending' loop
    insert into public.organization_members(organization_id, user_id, role) values (r.organization_id, auth.uid(), r.role)
    on conflict (organization_id, user_id) do nothing;
    update public.invitations set status='accepted' where id = r.id;
    insert into public.notifications(organization_id, user_id, title, body, link)
    values (r.organization_id, auth.uid(), 'Invitation accepted', 'You joined a new workspace', '/dashboard');
    n := n + 1;
  end loop;
  return n;
end $$;

create or replace function public.org_members_directory(_org uuid)
returns table(member_id uuid, user_id uuid, role public.org_role, status text, full_name text, email text, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.user_id, m.role, m.status, p.full_name, u.email::text, m.created_at
  from public.organization_members m
  left join public.profiles p on p.id = m.user_id
  left join auth.users u on u.id = m.user_id
  where m.organization_id = _org and public.is_org_member(_org)
  order by m.created_at
$$;

create or replace function public.dashboard_summary(_org uuid, _from date, _to date)
returns jsonb language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'beneficiaries', (select count(*) from beneficiaries where organization_id=_org and status <> 'archived'),
    'active_volunteers', (select count(*) from volunteers where organization_id=_org and status='active'),
    'active_projects', (select count(*) from projects where organization_id=_org and status='active'),
    'assistance_this_month', (select count(*) from assistance_records where organization_id=_org and status='distributed' and distribution_date >= date_trunc('month', current_date)),
    'donations_by_currency', coalesce((select jsonb_agg(jsonb_build_object('currency',currency,'total',total)) from (
        select currency, sum(amount) total from donations where organization_id=_org and donation_type='monetary' and status in ('recorded','confirmed') and donation_date between _from and _to group by currency) d),'[]'::jsonb),
    'expenses_by_currency', coalesce((select jsonb_agg(jsonb_build_object('currency',currency,'total',total)) from (
        select currency, sum(amount) total from expenses where organization_id=_org and status in ('recorded','approved') and expense_date between _from and _to group by currency) e),'[]'::jsonb),
    'monthly', coalesce((select jsonb_agg(row_to_json(x) order by x.month) from (
        select to_char(m,'YYYY-MM') as month,
          (select coalesce(sum(amount),0) from donations where organization_id=_org and donation_type='monetary' and status in ('recorded','confirmed') and date_trunc('month',donation_date)=m) donations,
          (select coalesce(sum(amount),0) from expenses where organization_id=_org and status in ('recorded','approved') and date_trunc('month',expense_date)=m) expenses,
          (select count(*) from beneficiaries where organization_id=_org and date_trunc('month',registration_date)=m) beneficiaries
        from generate_series(date_trunc('month',_from::timestamp), date_trunc('month',_to::timestamp), interval '1 month') m) x),'[]'::jsonb),
    'project_status', coalesce((select jsonb_agg(jsonb_build_object('status',status,'count',c)) from (select status, count(*) c from projects where organization_id=_org group by status) p),'[]'::jsonb),
    'assistance_by_type', coalesce((select jsonb_agg(jsonb_build_object('type',assistance_type,'count',c)) from (select assistance_type, count(*) c from assistance_records where organization_id=_org and status='distributed' and distribution_date between _from and _to group by assistance_type) a),'[]'::jsonb)
  )
$$;

create or replace function public.project_spend(_org uuid)
returns table(project_id uuid, currency text, spent numeric)
language sql stable security invoker set search_path = public as $$
  select project_id, currency, sum(amount) from expenses
  where organization_id=_org and project_id is not null and status in ('recorded','approved')
  group by project_id, currency
$$;

revoke execute on function public.create_organization(text,text,text,text,text,text,text) from anon, public;
revoke execute on function public.accept_pending_invitations() from anon, public;
revoke execute on function public.org_members_directory(uuid) from anon, public;
revoke execute on function public.dashboard_summary(uuid,date,date) from anon, public;
revoke execute on function public.project_spend(uuid) from anon, public;
grant execute on function public.create_organization(text,text,text,text,text,text,text) to authenticated;
grant execute on function public.accept_pending_invitations() to authenticated;
grant execute on function public.org_members_directory(uuid) to authenticated;
grant execute on function public.dashboard_summary(uuid,date,date) to authenticated;
grant execute on function public.project_spend(uuid) to authenticated;

create policy "org docs read" on storage.objects for select to authenticated
  using (bucket_id='org-documents' and public.is_org_member(((storage.foldername(name))[1])::uuid));
create policy "org docs write" on storage.objects for insert to authenticated
  with check (bucket_id='org-documents' and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner','admin','staff','project_manager']::public.org_role[]));
create policy "org docs delete" on storage.objects for delete to authenticated
  using (bucket_id='org-documents' and public.has_org_role(((storage.foldername(name))[1])::uuid, array['owner','admin']::public.org_role[]));
