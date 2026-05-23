-- Screenshot upload bucket for Claude Vision analysis.
-- Private bucket; reads happen server-side via signed URL.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'screenshots',
    'screenshots',
    false,
    5 * 1024 * 1024,           -- 5 MB
    array[
        'image/jpeg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif'
    ]
)
on conflict (id) do update set
    public            = excluded.public,
    file_size_limit   = excluded.file_size_limit,
    allowed_mime_types= excluded.allowed_mime_types;

-- RLS: user-folder pattern, owners only.
-- Path convention: {user_id}/{timestamp}_{filename}
-- storage.foldername(name) is a text[] split on '/'.

drop policy if exists "screenshots_read_own"   on storage.objects;
drop policy if exists "screenshots_insert_own" on storage.objects;
drop policy if exists "screenshots_update_own" on storage.objects;
drop policy if exists "screenshots_delete_own" on storage.objects;

create policy "screenshots_read_own" on storage.objects
    for select to authenticated
    using (
        bucket_id = 'screenshots'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "screenshots_insert_own" on storage.objects
    for insert to authenticated
    with check (
        bucket_id = 'screenshots'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "screenshots_update_own" on storage.objects
    for update to authenticated
    using (
        bucket_id = 'screenshots'
        and (storage.foldername(name))[1] = auth.uid()::text
    )
    with check (
        bucket_id = 'screenshots'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

create policy "screenshots_delete_own" on storage.objects
    for delete to authenticated
    using (
        bucket_id = 'screenshots'
        and (storage.foldername(name))[1] = auth.uid()::text
    );

-- Add screenshot_url to weights so smart-scale photos can be stored too
-- (meals.photo_url and workouts.screenshot_url already exist).
alter table public.weights
    add column if not exists screenshot_url text;
