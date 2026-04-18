-- Phase B3-1 検証: profiles / roles / user_roles / handle_new_user
-- 前提: auth スキーマ・auth.instances・pgcrypto（crypt）が利用可能（Supabase 標準）
-- 末尾 rollback でテストユーザーを消す

begin;

-- ケース1: roles seed（5 件）
do $$
declare
  n int;
begin
  select count(*) into n from public.roles;
  if n < 5 then
    raise exception 'verify fail: expected at least 5 roles, got %', n;
  end if;
  if not exists (select 1 from public.roles where role_code = 'admin') then
    raise exception 'verify fail: admin role missing';
  end if;
end $$;

select role_code, role_name
from public.roles
order by role_code;

-- ケース2: テーブル存在
do $$
begin
  if to_regclass('public.profiles') is null then
    raise exception 'verify fail: public.profiles missing';
  end if;
  if to_regclass('public.roles') is null then
    raise exception 'verify fail: public.roles missing';
  end if;
  if to_regclass('public.user_roles') is null then
    raise exception 'verify fail: public.user_roles missing';
  end if;
end $$;

-- 掃除（再実行用）
delete from auth.users
where email = 'verify-b3-1@example.com';

-- ケース3: auth.users 投入 → handle_new_user で profiles ができること
do $$
declare
  v_uid uuid;
  v_pc int;
begin
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at
  )
  select
    i.id,
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'verify-b3-1@example.com',
    crypt('verify-b3-1-test', gen_salt('bf')),
    now(),
    '{}',
    jsonb_build_object('display_name', 'Verify B3-1 User'),
    now(),
    now()
  from auth.instances i
  limit 1
  returning id into v_uid;

  select count(*) into v_pc
  from public.profiles
  where id = v_uid;

  if v_pc <> 1 then
    raise exception 'verify fail: expected 1 profile after auth insert, got %', v_pc;
  end if;
end $$;

-- ケース4・5: admin を付与し一覧取得
insert into public.user_roles (user_id, role_id)
select p.id, r.id
from public.profiles p
cross join public.roles r
where p.email = 'verify-b3-1@example.com'
  and r.role_code = 'admin';

select
  p.email,
  r.role_code,
  r.role_name
from public.user_roles ur
join public.profiles p on p.id = ur.user_id
join public.roles r on r.id = ur.role_id
where p.email = 'verify-b3-1@example.com';

rollback;
