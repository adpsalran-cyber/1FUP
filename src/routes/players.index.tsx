    queryFn: async () => {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('is_dummy', { ascending: true })
        .order('name');
      if (error) return [];
      return data || [];
    },
