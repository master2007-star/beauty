import { useWishlistState } from '../context/WishlistContext';

export function useWishlist() {
  return useWishlistState();
}
