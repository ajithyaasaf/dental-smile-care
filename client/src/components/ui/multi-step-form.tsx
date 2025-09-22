import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface Step {
  title: string;
  description?: string;
}

interface MultiStepFormProps {
  steps: Step[];
  currentStep: number;
  children: ReactNode;
  className?: string;
}

export function MultiStepForm({ steps, currentStep, children, className }: MultiStepFormProps) {
  return (
    <div className={cn("space-y-6", className)}>
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className="flex items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                  index < currentStep
                    ? "bg-primary text-primary-foreground"
                    : index === currentStep
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
                data-testid={`step-indicator-${index}`}
              >
                {index + 1}
              </div>
              <div className="ml-3">
                <span
                  className={cn(
                    "text-sm font-medium",
                    index <= currentStep ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
                {step.description && (
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                )}
              </div>
            </div>
            {index < steps.length - 1 && (
              <div className="flex-1 h-0.5 bg-border mx-4" />
            )}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <div>{children}</div>
    </div>
  );
}
