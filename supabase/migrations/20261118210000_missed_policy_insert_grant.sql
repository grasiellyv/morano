-- Allow authenticated users to insert with an initial ungenerated_count
grant insert (ungenerated_count)
  on public.routines to authenticated;
