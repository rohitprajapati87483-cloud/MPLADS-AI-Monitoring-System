import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WorkflowStep } from '@/types/dataset';

const STEPS: { step: WorkflowStep; label: string }[] = [
  { step: 1, label: 'Upload' },
  { step: 2, label: 'Profile' },
  { step: 3, label: 'Map Columns' },
  { step: 4, label: 'Validate' },
  { step: 5, label: 'Review' },
  { step: 6, label: 'Import' },
];

interface WorkflowStepperProps {
  currentStep: WorkflowStep;
  className?: string;
}

export function WorkflowStepper({ currentStep, className }: WorkflowStepperProps) {
  return (
    <div className={cn('flex items-center w-full', className)}>
      {STEPS.map(({ step, label }, idx) => {
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;
        const isLast = idx === STEPS.length - 1;

        return (
          <div key={step} className="flex items-center flex-1 min-w-0">
            {/* Step circle + label */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold border-2 transition-colors',
                  isCompleted
                    ? 'bg-primary-700 border-primary-700 text-white'
                    : isActive
                    ? 'bg-white border-primary-700 text-primary-700'
                    : 'bg-white border-slate-300 text-slate-400',
                )}
              >
                {isCompleted ? <Check size={14} /> : step}
              </div>
              <span
                className={cn(
                  'mt-1 text-[10px] font-medium whitespace-nowrap',
                  isActive ? 'text-primary-700' : isCompleted ? 'text-slate-600' : 'text-slate-400',
                )}
              >
                {label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div
                className={cn(
                  'h-0.5 flex-1 mx-2 mt-[-14px] rounded-full',
                  isCompleted ? 'bg-primary-700' : 'bg-slate-200',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
