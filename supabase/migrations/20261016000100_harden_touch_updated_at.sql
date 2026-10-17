-- Security advisor (0011 function_search_path_mutable): pin the trigger function's search_path.
-- It only touches NEW, so an empty search_path is safe.
alter function public.touch_updated_at() set search_path = '';
