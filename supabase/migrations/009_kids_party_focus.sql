-- Repositioning the platform around kids' parties & family events:
-- venues.venue_type has a DB-level check constraint (events/vendors
-- categories are plain text, no constraint to update there). Adding
-- 'kids_play_center' so the content agent can actually classify indoor
-- play centers / party venues once it starts finding them.

alter table venues drop constraint if exists venues_venue_type_check;

alter table venues add constraint venues_venue_type_check check (venue_type in (
  'kids_play_center','hotel','ballroom','hall','conference_center','arena',
  'stadium','theater','outdoor','restaurant','cultural',
  'exhibition_center','other'
));
