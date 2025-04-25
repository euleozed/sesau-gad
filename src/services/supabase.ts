import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://yxerhuojxxxckatylftd.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4ZXJodW9qeHh4Y2thdHlsZnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MDk3NDQsImV4cCI6MjA2MDM4NTc0NH0.u2NNzl2E3nI2H5OWquif0C3EL3SKEydwxtmiGoqwjMs";

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

// Types
export interface Process {
  id: string;
  processo: string;
  objeto: string;
  status: string;
}

// Process related queries
export const processQueries = {
  // Fetch all processes
  getAllProcesses: async (): Promise<{ data: Process[] | null; error: any }> => {
    const { data, error } = await supabase
      .from('process')
      .select('id, processo, objeto, status');
    return { data, error };
  },

  // Add or update a process
  upsertProcess: async (processData: Omit<Process, 'id'>): Promise<{ data: any; error: any }> => {
    const { data, error } = await supabase
      .from('process')
      .upsert([{ ...processData }]);
    return { data, error };
  },

  // Delete a process
  deleteProcess: async (id: string): Promise<{ data: any; error: any }> => {
    const { data, error } = await supabase
      .from('process')
      .delete()
      .match({ processo: id });
    return { data, error };
  },

  // Get process statistics
  getProcessStatistics: async () => {
    const { data: processes, error } = await supabase
      .from('process')
      .select('status');

    if (error) {
      return { data: null, error };
    }

    const statistics = {
      total: processes.length,
      activeCount: processes.filter(p => p.status === 'ativo').length,
      inactiveCount: processes.filter(p => p.status === 'inativo').length,
      statusDistribution: processes.reduce((acc: Record<string, number>, curr) => {
        acc[curr.status] = (acc[curr.status] || 0) + 1;
        return acc;
      }, {})
    };

    return { data: statistics, error: null };
  }
};

export default supabase; 