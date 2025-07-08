import type { FC, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  className?: string;
  children?: ReactNode;
}

export const PageHeader: FC<PageHeaderProps> = ({ title, className, children }) => {
  return (
    <div className={cn("flex flex-col gap-2 md:flex-row md:items-center md:justify-between", className)}>
      <h1 className="text-3xl font-bold font-headline text-primary">{title}</h1>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
};
