import React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { cn } from "@/lib/utils";

export interface WhatsAppButtonProps extends ButtonProps {
  label?: string;
}

export function WhatsAppButton({
  label = "Send WhatsApp",
  className,
  type = "button",
  disabled,
  children,
  ...props
}: WhatsAppButtonProps) {
  return (
    <Button
      type={type}
      disabled={disabled}
      className={cn(
        "rounded-xl bg-[#25D366] text-white hover:bg-[#20ba5a] active:bg-[#1da851] font-medium shadow-sm transition-colors duration-150 inline-flex items-center gap-2",
        disabled && "opacity-50 cursor-not-allowed hover:bg-[#25D366]",
        className,
      )}
      {...props}
    >
      <WhatsAppIcon className="h-4 w-4 shrink-0 fill-current" />
      <span>{children || label}</span>
    </Button>
  );
}
