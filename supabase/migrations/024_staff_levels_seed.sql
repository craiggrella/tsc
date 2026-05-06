-- Seed default staff levels for credits + contracts pickers.
-- Order matters — matches industry hierarchy from staff writer up to showrunner.

INSERT INTO list_staff_levels (org_id, value, label, sort_order)
SELECT id, v.value, v.label, v.sort_order
FROM organizations,
  (VALUES
    ('staff_writer', 'Staff Writer', 0),
    ('story_editor', 'Story Editor', 1),
    ('exec_story_editor', 'Exec. Story Editor', 2),
    ('co_producer', 'Co-Producer', 3),
    ('producer', 'Producer', 4),
    ('supervising_producer', 'Supervising Producer', 5),
    ('consulting_producer', 'Consulting Producer', 6),
    ('co_executive_producer', 'Co-Executive Producer', 7),
    ('executive_producer', 'Executive Producer', 8),
    ('showrunner', 'Showrunner', 9)
  ) AS v(value, label, sort_order)
ON CONFLICT (org_id, value) DO NOTHING;
