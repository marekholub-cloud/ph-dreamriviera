import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useFavorites } from '@/hooks/useFavorites';
import { useAuth } from '@/contexts/AuthContext';

interface FavoriteButtonProps {
  propertyId: string;
  variant?: 'icon' | 'button';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function FavoriteButton({ 
  propertyId, 
  variant = 'icon',
  size = 'md',
  className 
}: FavoriteButtonProps) {
  const { user } = useAuth();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [isLoading, setIsLoading] = useState(false);

  const isFav = isFavorite(propertyId);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      // Could redirect to login or show modal
      return;
    }

    setIsLoading(true);
    await toggleFavorite(propertyId);
    setIsLoading(false);
  };

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  const iconSizes = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-6 w-6'
  };

  if (!user) {
    return null; // Don't show for non-authenticated users
  }

  if (variant === 'button') {
    return (
      <Button
        variant={isFav ? 'default' : 'outline'}
        size="sm"
        onClick={handleClick}
        disabled={isLoading}
        className={cn(
          'gap-2',
          isFav && 'bg-red-500 hover:bg-red-600 border-red-500',
          className
        )}
      >
        <Heart className={cn(
          iconSizes[size],
          isFav && 'fill-current'
        )} />
        {isFav ? 'V oblíbených' : 'Přidat do oblíbených'}
      </Button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={cn(
        'rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center transition-all hover:scale-110 border border-border/50',
        sizeClasses[size],
        isFav && 'bg-red-500/10 border-red-500/50',
        isLoading && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      <Heart 
        className={cn(
          iconSizes[size],
          'transition-colors',
          isFav ? 'fill-red-500 text-red-500' : 'text-muted-foreground hover:text-red-500'
        )} 
      />
    </button>
  );
}
