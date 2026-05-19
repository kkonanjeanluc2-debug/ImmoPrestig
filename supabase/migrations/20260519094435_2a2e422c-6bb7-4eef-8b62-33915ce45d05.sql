
DELETE FROM parcelles WHERE ilot_id IN (
  'd5a8f984-ce04-45f1-99d3-afb69009dcf6',
  '7f2425ac-cb47-49fb-b67d-337e559312ee',
  '91e4345f-1ab6-4eb6-8ad1-75c246ce9eb0',
  '8219a1d8-6fd8-4554-84bc-b01079b5ca11'
);
DELETE FROM ilots WHERE id IN (
  'd5a8f984-ce04-45f1-99d3-afb69009dcf6',
  '7f2425ac-cb47-49fb-b67d-337e559312ee',
  '91e4345f-1ab6-4eb6-8ad1-75c246ce9eb0',
  '8219a1d8-6fd8-4554-84bc-b01079b5ca11'
);
