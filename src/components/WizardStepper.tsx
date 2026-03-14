"use client";

import { Check } from "lucide-react";

interface Step {
  id: number;
  title: string;
}

interface WizardStepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepId: number) => void;
}

export function WizardStepper({ steps, currentStep, onStepClick }: WizardStepperProps) {
  return (
    <div className="w-full py-4">
      <div className="relative">
        {/* Progress Bar Background */}
        <div 
          className="absolute top-6 h-1 -translate-y-1/2 rounded-full bg-gray-200" 
          style={{ 
            left: `${100 / (2 * steps.length)}%`, 
            right: `${100 / (2 * steps.length)}%` 
          }} 
        />
        
        {/* Active Progress Bar */}
        <div 
          className="absolute h-1 -translate-y-1/2 rounded-full bg-primary transition-all duration-500 ease-in-out top-6"
          style={{ 
            left: `${100 / (2 * steps.length)}%`,
            width: `calc((${((currentStep - 1) / (Math.max(1, steps.length - 1)))}) * (100% - ${100 / steps.length}%))`
          }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step) => {
            const isCompleted = currentStep > step.id;
            const isActive = currentStep === step.id;
            const isClickable = onStepClick && step.id < currentStep;

            return (
              <div 
                key={step.id} 
                className={`group relative flex flex-col items-center flex-1 ${isClickable ? "cursor-pointer" : ""}`}
                onClick={() => isClickable && onStepClick?.(step.id)}
              >
                {/* Circle Container */}
                <div className="relative z-10 flex h-12 w-12 items-center justify-center">
                  <div 
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300 ${
                      isActive 
                        ? "border-primary bg-primary text-white scale-125 shadow-lg ring-4 ring-primary/20" 
                        : isCompleted 
                          ? "border-primary bg-primary text-white" 
                          : "border-gray-200 bg-white text-gray-400"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    ) : (
                      <span className="text-sm font-bold">
                        {step.id}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Label */}
                <div className="absolute top-14 left-1/2 w-32 -translate-x-1/2 text-center sm:w-40">
                  <div className={`text-[10px] sm:text-xs font-bold leading-tight transition-colors duration-300 ${
                    isActive ? "text-primary" : isCompleted ? "text-gray-900" : "text-gray-400"
                  }`}>
                    {step.title}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Spacer for absolute labels */}
      <div className="h-16" />
    </div>
  );
}
