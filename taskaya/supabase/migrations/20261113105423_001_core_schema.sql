create extension if not exists "pgcrypto";

create type user_role as enum ('customer', 'provider', 'admin');
create type provider_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type pricing_model as enum ('fixed', 'starting_from', 'custom_quote');
create type booking_method as enum ('direct', 'recommended');
create type booking_status as enum (
  'pending', 'accepted', 'quotation_submitted', 'awaiting_customer_approval',
  'confirmed', 'in_progress', 'completed', 'cancelled', 'rejected'
);
create type quotation_status as enum ('submitted', 'accepted', 'rejected');
create type payment_method as enum ('cash', 'card', 'wallet');
create type payment_status as enum ('pending', 'paid', 'refunded');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  full_name text,
  phone text unique,
  email text,
  avatar_url text,
  language text not null default 'ar',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table cities (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  is_active boolean not null default true
);

create table service_areas (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  is_active boolean not null default true
);

create table addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id) on delete cascade,
  label text,
  area_id uuid references service_areas(id),
  street text,
  building text,
  floor text,
  apartment text,
  notes text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table service_categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  icon text,
  image_url text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table service_subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references service_categories(id) on delete cascade,
  name_ar text not null,
  name_en text not null,
  icon text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table provider_profiles (
  id uuid primary key references profiles(id) on delete cascade,
  business_name text not null,
  description text,
  logo_url text,
  cover_url text,
  business_address text,
  status provider_status not null default 'pending',
  is_verified boolean not null default false,
  is_featured boolean not null default false,
  is_available boolean not null default true,
  rating_avg numeric(3,2) not null default 0,
  rating_count int not null default 0,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table provider_documents (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider_profiles(id) on delete cascade,
  doc_type text not null,
  file_url text not null,
  created_at timestamptz not null default now()
);

create table provider_coverage (
  provider_id uuid not null references provider_profiles(id) on delete cascade,
  area_id uuid not null references service_areas(id) on delete cascade,
  primary key (provider_id, area_id)
);

create table provider_portfolio (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider_profiles(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now()
);

create table provider_availability (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider_profiles(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  is_active boolean not null default true,
  check (end_time > start_time)
);

create table services (
  id uuid primary key default gen_random_uuid(),
  subcategory_id uuid not null references service_subcategories(id),
  name_ar text not null,
  name_en text not null,
  description_ar text,
  description_en text,
  image_url text,
  is_active boolean not null default true
);

create table provider_services (
  id uuid primary key default gen_random_uuid(),
  provider_id uuid not null references provider_profiles(id) on delete cascade,
  service_id uuid not null references services(id),
  title text,
  description text,
  pricing_model pricing_model not null default 'fixed',
  base_price numeric(10,2),
  estimated_duration_minutes int,
  requirements text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (provider_id, service_id),
  check (pricing_model = 'custom_quote' or base_price is not null)
);

create table provider_service_images (
  id uuid primary key default gen_random_uuid(),
  provider_service_id uuid not null references provider_services(id) on delete cascade,
  image_url text not null
);

create table commission_rules (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references service_categories(id),
  provider_id uuid references provider_profiles(id),
  rate_percent numeric(5,2) not null check (rate_percent between 0 and 100),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table bookings (
  id uuid primary key default gen_random_uuid(),
  booking_number bigint generated always as identity,
  customer_id uuid not null references profiles(id),
  provider_id uuid references provider_profiles(id),
  provider_service_id uuid references provider_services(id),
  service_id uuid not null references services(id),
  method booking_method not null default 'direct',
  status booking_status not null default 'pending',
  address_id uuid references addresses(id),
  details text,
  scheduled_at timestamptz,
  pricing_model pricing_model,
  quoted_price numeric(10,2),
  final_price numeric(10,2),
  commission_rate numeric(5,2),
  commission_amount numeric(10,2),
  provider_earning numeric(10,2),
  cancel_reason text,
  idempotency_key text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table booking_status_history (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  from_status booking_status,
  to_status booking_status not null,
  changed_by uuid references profiles(id),
  note text,
  created_at timestamptz not null default now()
);

create table quotations (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  provider_id uuid not null references provider_profiles(id),
  price numeric(10,2) not null check (price >= 0),
  notes text,
  proposed_at timestamptz,
  status quotation_status not null default 'submitted',
  created_at timestamptz not null default now()
);

create table booking_attachments (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id) on delete cascade,
  file_url text not null,
  uploaded_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null unique references bookings(id) on delete cascade,
  customer_id uuid not null references profiles(id),
  provider_id uuid not null references provider_profiles(id),
  rating smallint not null check (rating between 1 and 5),
  comment text,
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  title text not null,
  body text,
  data jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table favorites (
  customer_id uuid not null references profiles(id) on delete cascade,
  provider_id uuid not null references provider_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (customer_id, provider_id)
);

create table payment_records (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references bookings(id),
  amount numeric(10,2) not null,
  method payment_method not null default 'cash',
  status payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id),
  booking_id uuid references bookings(id),
  subject text not null,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create index idx_bookings_customer on bookings(customer_id, status);
create index idx_bookings_provider on bookings(provider_id, status);
create index idx_provider_services_provider on provider_services(provider_id);
create index idx_provider_services_service on provider_services(service_id);
create index idx_provider_coverage_area on provider_coverage(area_id);
create index idx_reviews_provider on reviews(provider_id);
create index idx_notifications_user on notifications(user_id, is_read);
create index idx_status_history_booking on booking_status_history(booking_id);
create index idx_addresses_customer on addresses(customer_id);
