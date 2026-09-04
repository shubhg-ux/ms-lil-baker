-- Ms. Lil Baker production hardening
-- Applied to Supabase project dqedwfbowxevwjspwiti.

create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from auth.users
    where id = (select auth.uid())
      and coalesce(raw_app_meta_data->>'role','') = 'admin'
  );
$$;
revoke execute on function private.is_admin() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

-- Assign the existing staff account the admin role.
update auth.users
set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
where email = 'testharry.17@gmail.com';

-- Customers create orders only through the validated RPC. Admins can read/update orders.
drop policy if exists "public can create website orders" on public.orders;
drop policy if exists "authenticated can view orders" on public.orders;
drop policy if exists "authenticated can update orders" on public.orders;
drop policy if exists "Admins can view orders" on public.orders;
drop policy if exists "Admins can update orders" on public.orders;
create policy "Admins can view orders" on public.orders for select to authenticated using ((select private.is_admin()));
create policy "Admins can update orders" on public.orders for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Product and site-content mutations are admin-only.
drop policy if exists "Only logged-in users can delete products" on public.products;
drop policy if exists "Only logged-in users can insert products" on public.products;
drop policy if exists "Only logged-in users can update products" on public.products;
drop policy if exists "Admins can delete products" on public.products;
drop policy if exists "Admins can insert products" on public.products;
drop policy if exists "Admins can update products" on public.products;
create policy "Admins can delete products" on public.products for delete to authenticated using ((select private.is_admin()));
create policy "Admins can insert products" on public.products for insert to authenticated with check ((select private.is_admin()));
create policy "Admins can update products" on public.products for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy if exists "Authenticated can manage site settings" on public.site_settings;
drop policy if exists "Admins can manage site settings" on public.site_settings;
create policy "Admins can manage site settings" on public.site_settings for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Product photo writes are admin-only; public reads remain allowed.
drop policy if exists "Authenticated users can delete product photos" on storage.objects;
drop policy if exists "Authenticated users can update product photos" on storage.objects;
drop policy if exists "Authenticated users can upload product photos" on storage.objects;
drop policy if exists "Admins can delete product photos" on storage.objects;
drop policy if exists "Admins can update product photos" on storage.objects;
drop policy if exists "Admins can upload product photos" on storage.objects;
create policy "Admins can delete product photos" on storage.objects for delete to authenticated using (bucket_id = 'product-photos' and (select private.is_admin()));
create policy "Admins can update product photos" on storage.objects for update to authenticated using (bucket_id = 'product-photos' and (select private.is_admin())) with check (bucket_id = 'product-photos' and (select private.is_admin()));
create policy "Admins can upload product photos" on storage.objects for insert to authenticated with check (bucket_id = 'product-photos' and (select private.is_admin()));

-- Public checkout RPC. Client-supplied prices/names are ignored; live product data is authoritative.
drop function if exists public.place_customer_order(text,text,text,date,text,text,jsonb,numeric);
create function public.place_customer_order(
  p_customer_name text,
  p_phone text,
  p_email text,
  p_requested_date date,
  p_delivery_address text,
  p_notes text,
  p_items jsonb,
  p_total_amount numeric default 0
)
returns table(order_id bigint, order_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id bigint;
  v_total numeric := 0;
  v_items jsonb := '[]'::jsonb;
  item jsonb;
  v_product public.products%rowtype;
  v_qty integer;
  v_uuid uuid;
begin
  if nullif(trim(p_customer_name),'') is null or length(trim(p_customer_name)) > 120 then
    raise exception 'Please provide a valid customer name.' using errcode='22023';
  end if;
  if nullif(regexp_replace(coalesce(p_phone,''),'\D','','g'),'') is null
     or length(regexp_replace(p_phone,'\D','','g')) < 10
     or length(regexp_replace(p_phone,'\D','','g')) > 15 then
    raise exception 'Please provide a valid phone number.' using errcode='22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your basket is empty.' using errcode='22023';
  end if;
  for item in select value from jsonb_array_elements(p_items)
  loop
    begin
      v_uuid := (item->>'id')::uuid;
    exception when invalid_text_representation then
      raise exception 'One of the selected products is invalid.' using errcode='22023';
    end;
    v_qty := greatest(1, least(coalesce((item->>'qty')::integer, 1), 20));
    select * into v_product from public.products where id = v_uuid and is_available = true;
    if not found then
      raise exception 'One of the selected products is no longer available.' using errcode='22023';
    end if;
    v_total := v_total + (v_product.price * v_qty);
    v_items := v_items || jsonb_build_array(jsonb_build_object('id',v_product.id,'qty',v_qty,'name',v_product.name,'price',v_product.price,'details',v_product.category));
  end loop;
  insert into public.orders (customer_name,phone,email,requested_date,delivery_address,notes,items,total_amount,status,source)
  values (trim(p_customer_name),trim(p_phone),nullif(trim(coalesce(p_email,'')),''),p_requested_date,nullif(trim(coalesce(p_delivery_address,'')),''),nullif(trim(coalesce(p_notes,'')),''),v_items,v_total,'new','website')
  returning id into v_id;
  return query select v_id, 'MLB-' || lpad(v_id::text,4,'0');
end;
$$;
revoke execute on function public.place_customer_order(text,text,text,date,text,text,jsonb,numeric) from public;
grant execute on function public.place_customer_order(text,text,text,date,text,text,jsonb,numeric) to anon, authenticated;

-- Customer tracking RPC returns an order only when both ID and phone match.
drop function if exists public.get_order_by_id_and_phone(bigint,text);
create function public.get_order_by_id_and_phone(p_id bigint,p_phone text)
returns table(id bigint,created_at timestamptz,customer_name text,phone text,email text,requested_date date,delivery_address text,notes text,items jsonb,total_amount numeric,status text,source text)
language sql
stable
security definer
set search_path = ''
as $$
  select o.id,o.created_at,o.customer_name,o.phone,o.email,o.requested_date,o.delivery_address,o.notes,o.items,o.total_amount,o.status,o.source
  from public.orders o
  where o.id=p_id and regexp_replace(o.phone,'\D','','g')=regexp_replace(coalesce(p_phone,''),'\D','','g')
  limit 1;
$$;
revoke execute on function public.get_order_by_id_and_phone(bigint,text) from public;
grant execute on function public.get_order_by_id_and_phone(bigint,text) to anon, authenticated;
