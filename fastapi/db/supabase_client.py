"""
FinSight FastAPI — Supabase Service Role Client
Uses the service role key, which bypasses Row Level Security.
This is intentional: FastAPI writes on behalf of verified users.
The security comes from X-Internal-Secret middleware, not from RLS.
"""
import os
from supabase import create_client, Client

_client: Client | None = None


def get_supabase() -> Client:
    """
    Returns a singleton Supabase client using the service role key.
    Creates the client on first call, reuses on subsequent calls.
    Thread-safe for FastAPI's async context.
    """
    global _client
    if _client is None:
        _client = create_client(
            supabase_url=os.environ["SUPABASE_URL"],
            supabase_key=os.environ["SUPABASE_SERVICE_ROLE_KEY"],
        )
    return _client
