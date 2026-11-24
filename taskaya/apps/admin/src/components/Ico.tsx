import type { LucideIcon } from 'lucide-react';
import {
  Award, Ban, BadgeCheck, Banknote, Bell, Bug, Building2, CalendarDays, Car, CheckCheck, Circle, CircleCheck,
  ClipboardList, Clock, Construction, Crown, Dices, Droplets, Eye, FileText, Hammer, Hourglass, House,
  Image as ImageIcon, ImagePlus, KeyRound, Layers, LayoutGrid, Leaf, Lock, LogOut, MapPin, Megaphone, MessageSquare, Moon,
  Package, Paintbrush, Palette, Pencil, Phone, Plus, Search, Shirt, Smartphone, Snowflake, Sparkles, Star, Trash2,
  TrendingUp, TriangleAlert, User, Users, Wallet, Wrench, X, Zap,
} from 'lucide-react';

// كل إيموجي قديم → أيقونة خطية بسيطة بنفس المعنى (بتاخد لون النص اللي حواليها)
const MAP: Record<string, LucideIcon> = {
  '🏠': House, '📋': ClipboardList, '🏢': Building2, '🧰': Layers, '👥': Users, '👤': User, '👑': Crown,
  '💰': Wallet, '💵': Banknote, '💬': MessageSquare, '🛠': Wrench, '✅': CircleCheck, '📈': TrendingUp,
  '⚡': Zap, '🏆': Award, '🕒': Clock, '🎉': CheckCheck, '🔒': Lock, '✏': Pencil, '👁': Eye, '🚫': Ban,
  '🗑': Trash2, '✕': X, '❌': X, '★': Star, '⭐': Star, '✔': BadgeCheck, '🔑': KeyRound, '🎲': Dices,
  '🌙': Moon, '🎨': Palette, '🚪': LogOut, '📍': MapPin, '📝': FileText, '📱': Smartphone,
  '🖼': ImageIcon, '🏞': ImagePlus, '⏳': Hourglass, '⌛': Hourglass, '📅': CalendarDays, '🗓': CalendarDays,
  '🔔': Bell, '➕': Plus, '🔍': Search, '📞': Phone, '⚠': TriangleAlert, '🚧': Construction, '📣': Megaphone,
  // أيقونات الأقسام (lib/catalog.ts)
  '💧': Droplets, '✨': Sparkles, '❄': Snowflake, '🔨': Hammer, '🖌': Paintbrush, '🌿': Leaf, '🐞': Bug,
  '🚗': Car, '👕': Shirt, '📦': Package, '🔲': LayoutGrid,
};

export function Ico({ e, size = '1.15em', className = '' }: { e: string | null | undefined; size?: number | string; className?: string }) {
  const key = (e ?? '').replace(/\uFE0F/g, '').trim();
  const C = MAP[key] ?? Circle;
  return <C size={size} strokeWidth={1.75} className={`ico ${className}`.trim()} aria-hidden="true" />;
}
