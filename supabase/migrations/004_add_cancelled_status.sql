-- Add 'cancelled' status for student-initiated cancellations
-- NOTE: PostgreSQL requires this to be committed before 'cancelled' can be used in policies.
-- Run this migration alone first; policies are in 004b_cancelled_policies.sql

ALTER TYPE public.outpass_status ADD VALUE IF NOT EXISTS 'cancelled';
