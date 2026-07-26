export interface MenuBadge {
  text: string;
  color?: 'primary' | 'accent' | 'warn';
}

export interface MenuItem {
  id: string;
  parentId?: string | null;
  label: string;
  icon?: string;
  route?: string;
  order?: number;
  /** Permission string, or any-of list, required to see this node. Omit for always-visible. */
  permission?: string | string[];
  featureCode?: string;
  visible?: boolean;
  children?: MenuItem[];
  badge?: MenuBadge;
  tooltip?: string;
  externalLink?: boolean;
  favorite?: boolean;
  disabled?: boolean;
  hidden?: boolean;
}
