
DROP TABLE IF EXISTS user_profile;

CREATE TABLE user_profile(
  id SERIAL PRIMARY KEY,
  age INT,
  city VARCHAR(100),
  url VARCHAR(400),
  user_id INT REFERENCES users(id) ON DELETE CASCADE UNIQUE NOT NULL
);
