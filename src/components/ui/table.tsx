// Adapted from TanStack's kitchen-sink-shadcn-base example (MIT).
// https://github.com/TanStack/table/tree/main/examples/react/kitchen-sink-shadcn-base
// See THIRD_PARTY_NOTICES.md. The container is separate to also host empty states.
import type { ComponentProps } from "react";
import { cn } from "../../lib/utils";

export function TableContainer({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full overflow-auto", className)}
      {...props}
    />
  );
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return <table data-slot="table" className={cn("grid w-full caption-bottom text-xs", className)} {...props} />;
}

export function TableHeader({ className, ...props }: ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("sticky top-0 z-10 grid bg-muted", className)}
      {...props}
    />
  );
}

export function TableBody({ className, ...props }: ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("grid [&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn("flex w-full border-b transition-colors hover:bg-muted/50", className)}
      {...props}
    />
  );
}

export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn("relative flex h-11 shrink-0 items-center border-r px-3 text-left font-medium whitespace-nowrap last:border-r-0", className)}
      {...props}
    />
  );
}

export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn("flex min-h-14 shrink-0 items-center overflow-hidden border-r px-3 py-2 text-ellipsis whitespace-nowrap last:border-r-0", className)}
      {...props}
    />
  );
}

export function TableResizeHandle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="table-resize-handle"
      className={cn(
        "absolute inset-y-0 right-0 z-20 w-2 cursor-col-resize touch-none select-none focus-visible:-outline-offset-2 after:absolute after:inset-y-2 after:right-0 after:w-0.5 hover:after:bg-orange focus-visible:after:bg-orange data-[resizing=true]:after:bg-orange",
        className,
      )}
      {...props}
    />
  );
}
