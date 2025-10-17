import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://ukvbfcsfahvaczymudqu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVrdmJmY3NmYWh2YWN6eW11ZHF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg5NDgyNzAsImV4cCI6MjA3NDUyNDI3MH0.uRJ4FCJ_DRWx77eJLDeO0C6pnZqcd7My0w0i5GHInwA"; // paste your anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
