-- M1: Extensions
-- uuid-ossp for uuid generation, pg_cron for scheduled jobs (insights, notifications).

create extension if not exists "uuid-ossp";
create extension if not exists pg_trgm;

-- pg_cron may require dashboard activation on some Supabase plans.
-- If this fails, enable from Dashboard -> Database -> Extensions, then re-run.
do $$
begin
    create extension if not exists pg_cron;
exception
    when others then
        raise notice 'pg_cron not available: % - enable via Supabase dashboard', sqlerrm;
end $$;
