CREATE DATABASE toddle;

CREATE TABLE users (
  userId SERIAL PRIMARY KEY,
  name TEXT,
  handle TEXT,
  passwordDigest TEXT,
  pfp TEXT,
  bio TEXT,
  following_count INTEGER,
  follower_count INTEGER,
  todd_count INTEGER
);

CREATE TABLE todds (
  tweetId SERIAL PRIMARY KEY,
  baby_todd_txt TEXT,
  normal_todd_txt TEXT,
  userId INTEGER REFERENCES users (userid)
);

CREATE TABLE follower (
  followerId INTEGER REFERENCES users (userid),
  followeeId INTEGER REFERENCES users (userid) 
);