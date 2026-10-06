import React from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { WhatsAppIcon } from "@/components/WhatsAppIcon";
import { cn } from "@/lib/utils";

export interface WhatsAppButtonProps extends ButtonProps {
  label?: string;
  loading?: boolean;
  isPdf?: boolean;
}

export function WhatsAppButton({
  label = "Send WhatsApp PDF",
  loading = false,
  isPdf = true,
  className,
  type = "button",
  disabled,
  children,
  ...props
}: WhatsAppButtonProps) {
  return (
    <Button
      type={type}
      disabled={disabled || loading}
      className={cn(
        "rounded-xl bg-[#25D366] text-white hover:bg-[#20ba5a] active:bg-[#1da851] font-medium shadow-sm transition-colors duration-150 inline-flex items-center gap-1.5",
        (disabled || loading) && "opacity-60 cursor-not-allowed hover:bg-[#25D366]",
        className,
      )}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          <span>Generating PDF...</span>
        </>
      ) : (
        <>
          <div className="flex items-center">
            <WhatsAppIcon className="h-4 w-4 shrink-0 fill-current" />
            {isPdf && (
              <FileText className="h-3 w-3 shrink-0 ml-0.5 opacity-90" />
            )}
          </div>
          <span>{children || label}</span>
        </>
      )}
    </Button>
  );
}
