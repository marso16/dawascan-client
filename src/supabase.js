import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://qratyxejteqfbnyrfmut.supabase.co";
const SUPABASE_KEY = "sb_publishable_Bq4Z_4s4TdBHW2xPhg54iQ_JVel-BKu";

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
// export const API_URL = "http://192.168.10.37:8000";
export const API_URL = "https://dawascan-api.onrender.com";

export const ADMIN_EMAILS = ["marckey2345@gmail.com"];
