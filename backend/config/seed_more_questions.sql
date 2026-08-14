-- Run this after schema.sql to add more variety.
-- Usage: paste directly into psql (same method as your first seed data).

INSERT INTO companies (name) VALUES ('Microsoft'), ('Meta'), ('Netflix')
ON CONFLICT (name) DO NOTHING;

INSERT INTO questions (company_id, category, difficulty, question_text, expected_keywords)
VALUES
((SELECT id FROM companies WHERE name = 'General Practice'), 'DSA', 'easy',
 'What is the difference between an array and a linked list?', ARRAY['contiguous','pointer','memory','insertion','deletion']),

((SELECT id FROM companies WHERE name = 'General Practice'), 'DSA', 'medium',
 'Explain how quicksort works and its average time complexity.', ARRAY['pivot','partition','O(n log n)','recursion']),

((SELECT id FROM companies WHERE name = 'General Practice'), 'DSA', 'hard',
 'How would you detect a cycle in a linked list?', ARRAY['fast pointer','slow pointer','Floyd','cycle']),

((SELECT id FROM companies WHERE name = 'General Practice'), 'System Design', 'medium',
 'How would you design a rate limiter?', ARRAY['token bucket','sliding window','Redis','throttling']),

((SELECT id FROM companies WHERE name = 'General Practice'), 'System Design', 'hard',
 'Design a scalable notification system (email, SMS, push).', ARRAY['queue','pub/sub','fan-out','retry']),

((SELECT id FROM companies WHERE name = 'General Practice'), 'Behavioural', 'easy',
 'Describe a project you are most proud of and why.', ARRAY['impact','ownership','result']),

((SELECT id FROM companies WHERE name = 'General Practice'), 'Behavioural', 'medium',
 'Tell me about a time you failed and what you learned.', ARRAY['failure','lesson','improvement']),

((SELECT id FROM companies WHERE name = 'General Practice'), 'HR', 'easy',
 'Why do you want to work here?', ARRAY['company','mission','growth']),

((SELECT id FROM companies WHERE name = 'General Practice'), 'HR', 'easy',
 'Where do you see yourself in 5 years?', ARRAY['growth','goals','career']),

((SELECT id FROM companies WHERE name = 'Google'), 'DSA', 'hard',
 'Given an array of integers, find the maximum subarray sum (Kadane''s algorithm).', ARRAY['Kadane','subarray','dynamic programming']),

((SELECT id FROM companies WHERE name = 'Google'), 'System Design', 'hard',
 'Design Google Search autocomplete.', ARRAY['trie','ranking','latency','cache']),

((SELECT id FROM companies WHERE name = 'Google'), 'Behavioural', 'medium',
 'Tell me about a time you disagreed with a teammate on a technical decision.', ARRAY['disagreement','data','compromise']),

((SELECT id FROM companies WHERE name = 'Amazon'), 'Behavioural', 'medium',
 'Tell me about a time you had to deal with a difficult customer or stakeholder.', ARRAY['customer obsession','empathy','resolution']),

((SELECT id FROM companies WHERE name = 'Amazon'), 'System Design', 'hard',
 'Design an inventory management system for an e-commerce warehouse.', ARRAY['database','concurrency','consistency']),

((SELECT id FROM companies WHERE name = 'Amazon'), 'DSA', 'medium',
 'How would you find the top K frequent elements in an array?', ARRAY['heap','hashmap','O(n log k)']),

((SELECT id FROM companies WHERE name = 'Microsoft'), 'DSA', 'medium',
 'Explain how a binary search tree maintains its ordering property.', ARRAY['left subtree','right subtree','in-order traversal']),

((SELECT id FROM companies WHERE name = 'Microsoft'), 'System Design', 'medium',
 'Design a URL shortener like bit.ly.', ARRAY['hashing','base62','database','redirect']),

((SELECT id FROM companies WHERE name = 'Meta'), 'System Design', 'hard',
 'Design a news feed ranking system.', ARRAY['ranking','ML model','engagement','cache']),

((SELECT id FROM companies WHERE name = 'Meta'), 'Behavioural', 'medium',
 'Tell me about a time you moved fast and it caused a problem. What did you do?', ARRAY['move fast','mistake','fix','learn']),

((SELECT id FROM companies WHERE name = 'Netflix'), 'System Design', 'hard',
 'Design a video streaming and recommendation system.', ARRAY['CDN','recommendation','buffering','microservices']),

((SELECT id FROM companies WHERE name = 'Netflix'), 'Behavioural', 'medium',
 'Describe a time you had high autonomy on a project. How did you handle it?', ARRAY['autonomy','ownership','judgment']);