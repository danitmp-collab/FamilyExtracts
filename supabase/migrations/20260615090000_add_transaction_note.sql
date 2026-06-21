alter table public.transactions
add column if not exists note text;

comment on column public.transactions.note is 'Manual user note shown in movement and concept group views.';
