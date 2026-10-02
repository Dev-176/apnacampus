-- ==============================================================================
-- Migration: 20261001000008_realtime_replica_identity.sql
-- Description: Enable FULL replica identity for Realtime RLS evaluation
-- ==============================================================================

ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.conversations REPLICA IDENTITY FULL;
