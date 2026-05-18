import React, { useState } from 'react';
import { Search, Menu, Bell, ShoppingCart, User, Settings, LogOut, ShieldCheck, ExternalLink, Mail, UserCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger,
  DropdownMenuShortcut
} from "@/components/ui/dropdown-menu";
import Sidebar from './Sidebar';
import { cn } from "@/lib/utils";

const TopHeader = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout, loading } = useAuth();
  const { cartCount, setIsOpen: setIsCartOpen } = useCart();

  if (!user) return null;

  const initials = user.full_name 
    ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase() 
    : (user.username ? user.username[0].toUpperCase() : 'U');

  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 h-12 flex items-center justify-between px-3 md:px-4 shadow-sm">
      <div className="flex items-center gap-2 md:gap-4 flex-1">
        {/* Mobile Sidebar Trigger */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-slate-600 hover:bg-slate-100 rounded-lg h-8 w-8">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-slate-950 border-r-slate-800">
            <SheetTitle className="sr-only">Main Navigation</SheetTitle>
            <SheetDescription className="sr-only">Access all modules and settings from the sidebar.</SheetDescription>
            <Sidebar isMobile={true} closeMenu={() => setIsMobileMenuOpen(false)} />
          </SheetContent>
        </Sheet>
        
        {/* Global Search */}
        <div className="relative max-w-sm w-full hidden sm:flex items-center group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
          <Input 
            type="text" 
            placeholder="Search resources..." 
            className="pl-8 bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:ring-indigo-500/20 transition-all rounded-lg h-8 text-xs" 
          />
        </div>
      </div>
      
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Notification Bell */}
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg h-8 w-8">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-rose-500 rounded-full border border-white" />
        </Button>

        {/* Cart Trigger (for Users) */}
        {(user.role === 'user' || user.role === 'customer') && (
           <Button 
            onClick={() => setIsCartOpen(true)}
            variant="ghost" 
            size="icon" 
            className="relative text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg h-8 w-8"
           >
             <ShoppingCart className="h-4 w-4" />
             {cartCount > 0 && (
               <span className="absolute -top-1 -right-1 h-4 min-w-[16px] bg-indigo-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white px-1">
                 {cartCount}
               </span>
             )}
           </Button>
        )}

        {/* User Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0 border-2 border-transparent hover:border-indigo-500/30 transition-all overflow-hidden group">
              <Avatar className="h-full w-full">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`} />
                <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white font-bold text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56 mt-1 p-1 rounded-xl shadow-xl border-slate-200" align="end">
            <DropdownMenuLabel className="font-normal p-2">
              <div className="flex flex-col space-y-0.5">
                <p className="text-xs font-black text-slate-800 leading-none">{user.full_name || 'Authorized User'}</p>
                <p className="text-[10px] font-bold text-slate-500 leading-none">@{user.username}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-100" />
            <div className="p-0.5 space-y-0.5">
              <DropdownMenuItem className="rounded-lg h-8 focus:bg-indigo-50 focus:text-indigo-600 cursor-pointer font-bold text-slate-600 text-xs">
                <User className="mr-2 h-3.5 w-3.5" />
                <span>My Profile</span>
                <DropdownMenuShortcut className="text-[9px]">⌘P</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg h-8 focus:bg-indigo-50 focus:text-indigo-600 cursor-pointer font-bold text-slate-600 text-xs">
                <Settings className="mr-2 h-3.5 w-3.5" />
                <span>Account Settings</span>
                <DropdownMenuShortcut className="text-[9px]">⌘S</DropdownMenuShortcut>
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-lg h-8 focus:bg-indigo-50 focus:text-indigo-600 cursor-pointer font-bold text-slate-600 text-xs">
                <ShieldCheck className="mr-2 h-3.5 w-3.5" />
                <span>Privacy & Security</span>
              </DropdownMenuItem>
            </div>
            <DropdownMenuSeparator className="bg-slate-100" />
            <DropdownMenuItem 
              onClick={logout}
              className="rounded-lg h-8 focus:bg-rose-50 focus:text-rose-600 cursor-pointer font-black text-slate-600 group text-xs"
            >
              <LogOut className="mr-2 h-3.5 w-3.5 text-slate-400 group-focus:text-rose-600" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};

export default TopHeader;