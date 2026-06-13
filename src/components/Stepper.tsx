import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface StepperProps {
  steps: string[];
  currentStep: number;
}

const Stepper = ({ steps, currentStep }: StepperProps) => {
  return (
    <div className="flex items-center gap-1 md:gap-2 w-full">
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className="flex items-center gap-1.5 md:gap-3">
              <div
                className={cn(
                  "w-7 h-7 md:w-9 md:h-9 rounded-full flex items-center justify-center text-xs md:text-sm font-display transition-all duration-300 shrink-0",
                  isCompleted && "gradient-primary text-primary-foreground shadow-glow",
                  isCurrent && "border-2 border-primary text-primary animate-pulse-glow",
                  !isCompleted && !isCurrent && "border border-border text-muted-foreground"
                )}
              >
                {isCompleted ? <Check className="w-3 h-3 md:w-4 md:h-4" /> : index + 1}
              </div>
              <span
                className={cn(
                  "text-sm font-medium hidden md:block transition-colors",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-px mx-1 md:mx-3 transition-colors",
                  isCompleted ? "bg-primary" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default Stepper;
