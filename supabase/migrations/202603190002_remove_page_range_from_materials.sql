alter table public.materials
  drop column if exists page_range_start,
  drop column if exists page_range_end,
  drop column if exists page_count;
