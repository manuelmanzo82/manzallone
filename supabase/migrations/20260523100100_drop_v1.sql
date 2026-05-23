-- Drop v1 schema from public.
-- Backup confirmed by user before running this migration.
-- Drops every table, view, function, and type in public schema.

-- Drop tables (CASCADE removes dependent FKs/views/policies)
do $$
declare
    r record;
begin
    for r in
        select tablename from pg_tables where schemaname = 'public'
    loop
        execute 'drop table if exists public.' || quote_ident(r.tablename) || ' cascade';
    end loop;
end $$;

-- Drop views
do $$
declare
    r record;
begin
    for r in
        select viewname from pg_views where schemaname = 'public'
    loop
        execute 'drop view if exists public.' || quote_ident(r.viewname) || ' cascade';
    end loop;
end $$;

-- Drop functions and procedures (skip those owned by an extension)
do $$
declare
    r record;
begin
    for r in
        select
            p.proname as name,
            pg_get_function_identity_arguments(p.oid) as args,
            case p.prokind when 'p' then 'procedure' else 'function' end as kind
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public'
          and p.prokind in ('f','p')
          and not exists (
              select 1 from pg_depend d
              where d.objid = p.oid and d.deptype = 'e'
          )
    loop
        execute 'drop ' || r.kind || ' if exists public.' || quote_ident(r.name) || '(' || r.args || ') cascade';
    end loop;
end $$;

-- Drop user-defined types (skip extension-owned)
do $$
declare
    r record;
begin
    for r in
        select t.typname as name
        from pg_type t
        join pg_namespace n on n.oid = t.typnamespace
        where n.nspname = 'public'
          and t.typtype in ('e','c','d')
          and not exists (select 1 from pg_class c where c.relname = t.typname and c.relnamespace = n.oid)
          and not exists (
              select 1 from pg_depend d
              where d.objid = t.oid and d.deptype = 'e'
          )
    loop
        execute 'drop type if exists public.' || quote_ident(r.name) || ' cascade';
    end loop;
end $$;
