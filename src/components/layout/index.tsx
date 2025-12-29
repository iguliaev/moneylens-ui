"use client";

import type { PropsWithChildren } from "react";
import { Breadcrumb } from "antd";
import { Menu } from "../menu";
import { useBreadcrumb } from "@refinedev/core";
import Link from "next/link";

export const Layout: React.FC<PropsWithChildren> = ({ children }) => {
  const { breadcrumbs } = useBreadcrumb();
  
  const items = breadcrumbs.map((breadcrumb) => ({
    title: breadcrumb.href ? (
      <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
    ) : (
      breadcrumb.label
    ),
  }));
  
  return (
    <div className="layout">
      <Menu />
      <div className="content">
        {items.length > 0 && <Breadcrumb items={items} />}
        <div>{children}</div>
      </div>
    </div>
  );
};
