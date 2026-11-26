-- 026: indexes for my_inbox + the daily cleanup (fast even when rows grow)
create index if not exists idx_notifications_user_created on public.notifications (user_id, created_at desc);
create index if not exists idx_notifications_created on public.notifications (created_at);
create index if not exists idx_broadcasts_created on public.broadcasts (created_at desc);
