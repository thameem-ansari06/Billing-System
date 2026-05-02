import React, { useState } from 'react';
import { Search, Menu } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import Sidebar from './Sidebar';
import ProfileDropdown from './ProfileDropdown';

const TopHeader = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-4 md:px-8 shadow-sm">
      <div className="flex items-center gap-2 md:gap-4 w-full md:w-auto">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-md">
            <Menu size={24} />
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64 bg-slate-950 border-r-slate-800">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SheetDescription className="sr-only">Mobile Navigation Menu</SheetDescription>
            <Sidebar isMobile={true} closeMenu={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        
        <div className="relative flex-1 md:w-96 flex items-center">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            type="text" 
            placeholder="Search in AR Hub..." 
            className="pl-9 bg-gray-50 focus-visible:bg-white transition-colors w-full" 
          />
        </div>
      </div>
      
      <ProfileDropdown />
    </header>
  );
};

export default TopHeader;