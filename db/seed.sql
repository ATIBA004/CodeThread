-- Seed data (passwords: admin = Admin123!, demo = User123!)
INSERT INTO users (password_hash, display_name, role) VALUES
(
  '$2b$10$N5t07redYmEKCWH3BnTNkuuGO6pgxVQ4w6wQoBetvS3TQoOUz2v8G',
  'admin',
  'admin'
),
(
  '$2b$10$dDxzFf2N/g9B1ecDLNGo4eK9mh75yzy2bLIlJKctShqmaLEFFxBR.',
  'demo',
  'user'
)
ON CONFLICT (display_name) DO NOTHING;

INSERT INTO channels (name, description, created_by)
SELECT 'general', 'Welcome — ask anything.', u.id FROM users u WHERE u.display_name = 'admin' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO channels (name, description, created_by)
SELECT 'announcements', 'Project updates and news.', u.id FROM users u WHERE u.display_name = 'admin' LIMIT 1
ON CONFLICT (name) DO NOTHING;

INSERT INTO posts (channel_id, author_id, title, body)
SELECT c.id, u.id, 'Welcome to the forum', 'This is a seeded post. Replies below are threaded.'
FROM channels c
CROSS JOIN users u
WHERE c.name = 'general' AND u.display_name = 'admin'
  AND NOT EXISTS (
    SELECT 1 FROM posts p2
    JOIN channels ch2 ON p2.channel_id = ch2.id
    WHERE ch2.name = 'general' AND p2.title = 'Welcome to the forum'
  );

INSERT INTO posts (channel_id, author_id, title, body)
SELECT c.id, u.id, 'Demo question from demo user', 'How do nested replies work?'
FROM channels c
CROSS JOIN users u
WHERE c.name = 'general' AND u.display_name = 'demo'
  AND NOT EXISTS (
    SELECT 1 FROM posts p2
    JOIN channels ch2 ON p2.channel_id = ch2.id
    WHERE ch2.name = 'general' AND p2.title = 'Demo question from demo user'
  );

INSERT INTO replies (post_id, parent_reply_id, author_id, body)
SELECT p.id, NULL, u.id, 'Thanks for setting this up!'
FROM posts p
JOIN channels ch ON p.channel_id = ch.id
JOIN users u ON u.display_name = 'demo'
WHERE ch.name = 'general' AND p.title = 'Welcome to the forum'
  AND NOT EXISTS (
    SELECT 1 FROM replies r WHERE r.post_id = p.id AND r.body = 'Thanks for setting this up!' AND r.parent_reply_id IS NULL
  );

INSERT INTO replies (post_id, parent_reply_id, author_id, body)
SELECT r.post_id, r.id, u.id, 'Nested reply here — threading works.'
FROM replies r
JOIN posts p ON r.post_id = p.id
JOIN channels ch ON p.channel_id = ch.id
JOIN users u ON u.display_name = 'admin'
WHERE ch.name = 'general' AND p.title = 'Welcome to the forum'
  AND r.body = 'Thanks for setting this up!'
  AND NOT EXISTS (
    SELECT 1 FROM replies r2
    WHERE r2.parent_reply_id = r.id AND r2.body = 'Nested reply here — threading works.'
  );

INSERT INTO votes (user_id, target_type, target_id, value)
SELECT u.id, 'post', p.id, 1
FROM users u
CROSS JOIN posts p
JOIN channels ch ON p.channel_id = ch.id
WHERE u.display_name = 'demo' AND ch.name = 'general' AND p.title = 'Welcome to the forum'
ON CONFLICT (user_id, target_type, target_id) DO NOTHING;

INSERT INTO votes (user_id, target_type, target_id, value)
SELECT u.id, 'post', p.id, 1
FROM users u
CROSS JOIN posts p
JOIN channels ch ON p.channel_id = ch.id
WHERE u.display_name = 'admin' AND ch.name = 'general' AND p.title = 'Demo question from demo user'
ON CONFLICT (user_id, target_type, target_id) DO NOTHING;
