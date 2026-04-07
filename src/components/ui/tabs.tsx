"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Tabs as TabsPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"

type TabsOrientation =
  React.ComponentProps<typeof TabsPrimitive.Root>["orientation"]

type TabsListVariant = "default" | "line"

const TabsRootContext = React.createContext<{
  orientation: TabsOrientation
}>({
  orientation: "horizontal",
})

const TabsListContext = React.createContext<{
  orientation: TabsOrientation
  variant: TabsListVariant
}>({
  orientation: "horizontal",
  variant: "default",
})

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsRootContext.Provider value={{ orientation }}>
      <TabsPrimitive.Root
        data-slot="tabs"
        data-orientation={orientation}
        orientation={orientation}
        className={cn(
          "group/tabs flex gap-2",
          orientation === "horizontal" ? "flex-col" : "flex-row",
          className
        )}
        {...props}
      />
    </TabsRootContext.Provider>
  )
}

const tabsListVariants = cva(
  "group/tabs-list text-muted-foreground inline-flex w-fit items-center justify-center rounded-lg p-[3px]",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 rounded-none bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  const { orientation } = React.useContext(TabsRootContext)
  const resolvedVariant: TabsListVariant = variant ?? "default"

  return (
    <TabsListContext.Provider value={{ orientation, variant: resolvedVariant }}>
      <TabsPrimitive.List
        data-slot="tabs-list"
        data-variant={resolvedVariant}
        className={cn(
          tabsListVariants({ variant: resolvedVariant }),
          orientation === "horizontal" ? "h-9 flex-row" : "h-fit flex-col",
          className
        )}
        {...props}
      >
        {children}
      </TabsPrimitive.List>
    </TabsListContext.Provider>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const { orientation, variant } = React.useContext(TabsListContext)

  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring text-foreground/60 hover:text-foreground dark:text-muted-foreground dark:hover:text-foreground relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "data-[state=active]:bg-background dark:data-[state=active]:text-foreground dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 data-[state=active]:text-foreground",
        orientation === "vertical" && "w-full justify-start",
        variant === "default" && "data-[state=active]:shadow-sm",
        variant === "line" &&
          "bg-transparent data-[state=active]:bg-transparent dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-transparent",
        variant === "line" &&
          "after:bg-foreground after:absolute after:opacity-0 after:transition-opacity data-[state=active]:after:opacity-100",
        variant === "line" &&
          (orientation === "horizontal"
            ? "after:inset-x-0 after:bottom-[-5px] after:h-0.5"
            : "after:inset-y-0 after:-right-1 after:w-0.5"),
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 outline-none", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
