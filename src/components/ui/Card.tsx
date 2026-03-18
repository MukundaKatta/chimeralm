"use client";

import { cn } from "@/lib/utils";
import { HTMLAttributes, forwardRef } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "glow" | "interactive";
  glowColor?: string;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = "default", glowColor, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border",
          {
            "glass-card": variant === "default",
            "glass-card animated-border": variant === "glow",
            "glass-hover p-6 cursor-pointer": variant === "interactive",
          },
          className
        )}
        style={glowColor ? { boxShadow: `0 0 20px ${glowColor}33` } : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = "Card";
export default Card;
