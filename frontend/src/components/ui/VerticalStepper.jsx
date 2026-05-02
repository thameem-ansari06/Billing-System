import React from 'react';
import { Check, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function VerticalStepper({ steps, currentStep }) {
  return (
    <div className="space-y-0 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        
        return (
          <div key={index} className="relative pl-10 pb-10 last:pb-0">
            {/* Step Icon */}
            <div 
              className={cn(
                "absolute left-0 top-1 w-6 h-6 rounded-full flex items-center justify-center z-10 transition-all duration-500",
                isCompleted ? "bg-emerald-500 text-white scale-110 shadow-lg shadow-emerald-100" : 
                isCurrent ? "bg-indigo-600 text-white scale-125 shadow-xl shadow-indigo-100 animate-pulse" : 
                "bg-white border-2 border-slate-200 text-slate-300"
              )}
            >
              {isCompleted ? <Check size={14} strokeWidth={4} /> : 
               isCurrent ? <Circle size={8} fill="currentColor" /> : 
               <span className="text-[10px] font-black">{index + 1}</span>}
            </div>

            {/* Step Content */}
            <div className={cn(
              "transition-all duration-500",
              isCompleted ? "opacity-60" : 
              isCurrent ? "translate-x-2" : "opacity-40"
            )}>
              <h4 className={cn(
                "text-sm font-black uppercase tracking-wider mb-1",
                isCurrent ? "text-indigo-600" : isCompleted ? "text-slate-800" : "text-slate-400"
              )}>
                {step.title}
              </h4>
              <p className="text-xs font-bold text-slate-500">
                {step.description}
              </p>
              {step.timestamp && (
                <span className="inline-block mt-2 px-2 py-1 bg-slate-100 text-[10px] font-black text-slate-500 rounded-md">
                  {new Date(step.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
