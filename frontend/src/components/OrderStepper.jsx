import React from 'react';
import { CheckCircle2, Clock, FileText, Truck, Package, PackageCheck, Receipt } from 'lucide-react';

const steps = [
  { label: 'Placed', icon: Clock },
  { label: 'Quoted', icon: FileText },
  { label: 'Invoiced', icon: Receipt },
  { label: 'Dispatched', icon: Truck },
  { label: 'Delivered', icon: PackageCheck }
];

export default function OrderStepper({ currentStatus }) {
  // Find index of current status
  const currentStatusIndex = steps.findIndex(step => step.label === currentStatus);
  
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between relative">
        {/* Background Line */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-slate-200 rounded-full z-0"></div>
        {/* Active Line */}
        <div 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-primary rounded-full z-0 transition-all duration-500 ease-in-out"
          style={{ width: `${(currentStatusIndex / (steps.length - 1)) * 100}%` }}
        ></div>

        {steps.map((step, index) => {
          const isCompleted = index <= currentStatusIndex;
          const isCurrent = index === currentStatusIndex;
          const Icon = isCompleted ? CheckCircle2 : step.icon;

          return (
            <div key={step.label} className="relative z-10 flex flex-col items-center">
              <div 
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-primary text-white shadow-lg shadow-primary/30' 
                    : 'bg-white text-slate-400 border-2 border-slate-200'
                } ${isCurrent ? 'ring-4 ring-primary/20 scale-110' : ''}`}
              >
                <Icon size={20} className={isCompleted && !isCurrent ? 'animate-pulse' : ''} />
              </div>
              <p className={`mt-3 text-sm font-semibold ${isCompleted ? 'text-slate-800' : 'text-slate-400'}`}>
                {step.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
