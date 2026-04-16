import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const TopHeader = () => {
  return (
    <header className="h-16 bg-white border-b flex items-center justify-between px-8 shadow-sm">
      <div className="relative w-96 flex items-center">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input 
          type="text" 
          placeholder="Search in AR Hub..." 
          className="pl-9 bg-gray-50 focus-visible:bg-white transition-colors" 
        />
      </div>
      
      <Avatar className="h-9 w-9 cursor-pointer shadow-sm hover:shadow-md transition-shadow">
        <AvatarImage src="https://github.com/shadcn.png" alt="@romeo" />
        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">R</AvatarFallback>
      </Avatar>
    </header>
  );
};

export default TopHeader;