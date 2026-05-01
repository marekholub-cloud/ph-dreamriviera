import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface FavoriteProperty {
  id: string;
  property_id: string;
  created_at: string;
  property?: {
    id: string;
    name: string;
    slug: string;
    hero_image_url: string | null;
    price_formatted: string | null;
    status: string;
    areas: {
      name: string;
      city: string;
    } | null;
  };
}

export function useFavorites() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteProperty[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  const fetchFavorites = useCallback(async () => {
    if (!user) {
      setFavorites([]);
      setFavoriteIds(new Set());
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          property_id,
          created_at,
          property:properties (
            id,
            name,
            slug,
            hero_image_url,
            price_formatted,
            status,
            areas (
              name,
              city
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform the data to handle the nested property object
      const transformedData = (data || []).map(item => ({
        id: item.id,
        property_id: item.property_id,
        created_at: item.created_at,
        property: item.property as FavoriteProperty['property']
      }));

      setFavorites(transformedData);
      setFavoriteIds(new Set(transformedData.map(f => f.property_id)));
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  const addFavorite = useCallback(async (propertyId: string) => {
    if (!user) {
      toast.error('Pro přidání do oblíbených se musíte přihlásit');
      return false;
    }

    try {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, property_id: propertyId });

      if (error) {
        if (error.code === '23505') {
          // Already favorited
          return true;
        }
        throw error;
      }

      setFavoriteIds(prev => new Set([...prev, propertyId]));
      toast.success('Přidáno do oblíbených');
      await fetchFavorites();
      return true;
    } catch (error) {
      console.error('Error adding favorite:', error);
      toast.error('Nepodařilo se přidat do oblíbených');
      return false;
    }
  }, [user, fetchFavorites]);

  const removeFavorite = useCallback(async (propertyId: string) => {
    if (!user) return false;

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('property_id', propertyId);

      if (error) throw error;

      setFavoriteIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(propertyId);
        return newSet;
      });
      toast.success('Odebráno z oblíbených');
      await fetchFavorites();
      return true;
    } catch (error) {
      console.error('Error removing favorite:', error);
      toast.error('Nepodařilo se odebrat z oblíbených');
      return false;
    }
  }, [user, fetchFavorites]);

  const toggleFavorite = useCallback(async (propertyId: string) => {
    if (favoriteIds.has(propertyId)) {
      return removeFavorite(propertyId);
    } else {
      return addFavorite(propertyId);
    }
  }, [favoriteIds, addFavorite, removeFavorite]);

  const isFavorite = useCallback((propertyId: string) => {
    return favoriteIds.has(propertyId);
  }, [favoriteIds]);

  return {
    favorites,
    favoriteIds,
    loading,
    addFavorite,
    removeFavorite,
    toggleFavorite,
    isFavorite,
    refetch: fetchFavorites
  };
}
