
import { UserStorageData } from '../types';
import { supabase } from './supabase';

export class SyncService {
  // Fetch user data from Supabase
  static async fetchUserData(email: string): Promise<UserStorageData> {
    console.log(`[SupabaseSync] Fetching data for user: ${email}`);
    
    try {
      const { data, error } = await supabase
        .from('user_data')
        .select('data')
        .eq('email', email)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        return data.data as UserStorageData;
      }
      
      // Return default initial data for new users
      return {
        members: [],
        history: [],
        logoUrl: 'https://i.imgur.com/8Qp6u8f.png'
      };
    } catch (error) {
      console.error("[SupabaseSync] Error fetching data:", error);
      // Fallback to empty data if there's an error (e.g. table doesn't exist yet)
      return {
        members: [],
        history: [],
        logoUrl: 'https://i.imgur.com/8Qp6u8f.png'
      };
    }
  }

  // Save user data to Supabase
  static async saveUserData(email: string, data: UserStorageData): Promise<void> {
    console.log(`[SupabaseSync] Saving data for user: ${email}`);
    
    try {
      const { error } = await supabase
        .from('user_data')
        .upsert({ email, data, updated_at: new Date().toISOString() }, { onConflict: 'email' });
      
      if (error) throw error;
    } catch (error) {
      console.error("[SupabaseSync] Error saving data:", error);
    }
  }
}
