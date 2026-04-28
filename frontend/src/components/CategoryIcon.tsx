import React from 'react';
import { getPlaceholderIcon } from '../utils/marketplace';

interface CategoryIconProps {
  categoryName: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

/**
 * Renders the appropriate Lucide icon for a given category name.
 * Wrapping the dynamic icon lookup in its own component keeps the parent
 * components lint-clean (avoids "component created during render" warnings).
 */
const CategoryIcon: React.FC<CategoryIconProps> = ({
  categoryName,
  size = 48,
  color = '#002BFF',
  strokeWidth = 1.5,
}) => {
  const Icon = getPlaceholderIcon(categoryName);
  return <Icon size={size} color={color} strokeWidth={strokeWidth} />;
};

export default CategoryIcon;
