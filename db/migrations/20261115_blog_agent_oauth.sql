-- WhatEatO Blog Agent OAuth 2.1 authorization code replay protection.
-- Apply only to the intended Hostinger Neon branch after review.
-- No existing posts, drafts, users, or media are modified.
CREATE TABLE IF NOT EXISTS whateato_blog_agent_oauth_codes (
  code_hash text PRIMARY KEY,
  client_id text NOT NULL,
  redirect_uri text NOT NULL,
  code_challenge text NOT NULL,
  owner_account_id uuid NOT NULL REFERENCES whateato_review_accounts(id) ON DELETE RESTRICT,
  scope text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT whateato_blog_agent_code_sha256_check CHECK (length(code_hash)=64),
  CONSTRAINT whateato_blog_agent_code_challenge_check CHECK (length(code_challenge) BETWEEN 43 AND 128),
  CONSTRAINT whateato_blog_agent_code_scope_check CHECK (scope IN ('blog:read','blog:read blog:write'))
);
CREATE INDEX IF NOT EXISTS whateato_blog_agent_oauth_codes_expires_at_idx
  ON whateato_blog_agent_oauth_codes (expires_at);
-- Recommended maintenance, once daily:
-- DELETE FROM whateato_blog_agent_oauth_codes WHERE expires_at < now() - interval '1 day';
