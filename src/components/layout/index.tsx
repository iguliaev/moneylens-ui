"use client";

import type { PropsWithChildren } from "react";
import { Layout as AntdLayout, Breadcrumb } from "antd";
import { Menu } from "../menu";
import { useBreadcrumb } from "@refinedev/core";
import Link from "next/link";

const { Header, Sider, Content } = AntdLayout;

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
    <AntdLayout style={{ minHeight: "100vh" }}>
      <Sider
        width={200}
        style={{
          overflow: "auto",
          height: "100vh",
          position: "fixed",
          left: 0,
          top: 0,
          bottom: 0,
        }}
      >
        <Menu />
      </Sider>
      <AntdLayout style={{ marginLeft: 200 }}>
        <Content style={{ padding: "16px", minHeight: 280 }}>
          {items.length > 0 && (
            <Breadcrumb 
              items={items} 
              style={{ marginBottom: "16px" }}
            />
          )}
          <div>{children}</div>
        </Content>
      </AntdLayout>
    </AntdLayout>
  );
};
