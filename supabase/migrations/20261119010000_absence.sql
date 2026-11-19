alter table public.home_members
  add column absence_start date,
  add column absence_end date,
  add constraint home_members_absence_check check (
    (absence_start is null and absence_end is null)
    or (absence_start is not null and absence_end is not null and absence_end >= absence_start)
  );

grant update (absence_start, absence_end) on public.home_members to authenticated;
