import type { FC, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  className?: string;
  children?: ReactNode;
  action?: ReactNode;
}

export const PageHeader: FC<PageHeaderProps> = ({ title, className, children, action }) => {
  return (
    <div className={cn("flex flex-col gap-2 md:flex-row md:items-center md:justify-between", className)}>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold font-headline text-primary">{title}</h1>
        {children}
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
};
