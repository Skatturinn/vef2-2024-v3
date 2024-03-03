CREATE TABLE IF NOT EXISTS public.teams (
  id serial primary key,
  name varchar(128) not null unique,
  slug varchar(128) not null unique,
  description varchar(1024)
);

CREATE TABLE IF NOT EXISTS public.games (
  game_id serial primary key,
  date timestamp with time zone not null default current_timestamp,
  home INTEGER NOT NULL,
  away INTEGER NOT NULL,
  home_score INTEGER NOT NULL CHECK (home_score >= 0 AND home_score <= 100),
  away_score INTEGER NOT NULL CHECK (away_score >= 0 AND away_score <= 100),

  CONSTRAINT fk_teams_home FOREIGN KEY (home) REFERENCES teams (id),
  CONSTRAINT fk_teams_away FOREIGN KEY (away) REFERENCES teams (id)
);