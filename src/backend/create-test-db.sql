-- Create test couple
INSERT INTO "Couple" (id, "secretKey", "numChildren", language, "createdAt", "updatedAt") 
VALUES ('couple-test', 'secret-key-test', 0, 'es', datetime('now'), datetime('now'));

-- Create test users
INSERT INTO "User" (id, "coupleId", email, name, "passwordHash", "createdAt", "updatedAt")
VALUES 
  ('user-1', 'couple-test', 'person1@test.com', 'Persona 1', '$2a$10$hash1', datetime('now'), datetime('now')),
  ('user-2', 'couple-test', 'person2@test.com', 'Persona 2', '$2a$10$hash2', datetime('now'), datetime('now'));

-- Create transactions for 30 days (mix of positive/negative)
INSERT INTO "PointsTransaction" (id, "coupleId", "userId", type, amount, description, "createdAt")
VALUES
  ('tx-1', 'couple-test', 'user-1', 'task_completed', '10', 'Día 1 - Usuario 1', datetime('now', '-29 days')),
  ('tx-2', 'couple-test', 'user-2', 'task_completed', '8', 'Día 1 - Usuario 2', datetime('now', '-29 days')),
  ('tx-3', 'couple-test', 'user-1', 'task_completed', '12', 'Día 5 - Usuario 1', datetime('now', '-25 days')),
  ('tx-4', 'couple-test', 'user-2', 'task_completed', '-5', 'Día 5 - Usuario 2', datetime('now', '-25 days')),
  ('tx-5', 'couple-test', 'user-1', 'task_completed', '15', 'Día 10 - Usuario 1', datetime('now', '-20 days')),
  ('tx-6', 'couple-test', 'user-2', 'task_completed', '10', 'Día 10 - Usuario 2', datetime('now', '-20 days')),
  ('tx-7', 'couple-test', 'user-1', 'task_completed', '8', 'Día 15 - Usuario 1', datetime('now', '-15 days')),
  ('tx-8', 'couple-test', 'user-2', 'task_completed', '12', 'Día 15 - Usuario 2', datetime('now', '-15 days')),
  ('tx-9', 'couple-test', 'user-1', 'task_completed', '20', 'Día 20 - Usuario 1', datetime('now', '-10 days')),
  ('tx-10', 'couple-test', 'user-2', 'task_completed', '6', 'Día 20 - Usuario 2', datetime('now', '-10 days')),
  ('tx-11', 'couple-test', 'user-1', 'task_completed', '14', 'Día 25 - Usuario 1', datetime('now', '-5 days')),
  ('tx-12', 'couple-test', 'user-2', 'task_completed', '16', 'Día 25 - Usuario 2', datetime('now', '-5 days')),
  ('tx-13', 'couple-test', 'user-1', 'task_completed', '18', 'Día 30 - Usuario 1', datetime('now', '-1 days')),
  ('tx-14', 'couple-test', 'user-2', 'task_completed', '9', 'Día 30 - Usuario 2', datetime('now'));
