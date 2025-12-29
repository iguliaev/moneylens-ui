"use client";

import { App as AntdApp, ConfigProvider } from "antd";
import { RefineThemes, useNotificationProvider } from "@refinedev/antd";
import {
  DashboardOutlined,
  DollarOutlined,
  RiseOutlined,
  BankOutlined,
  SettingOutlined,
  TagsOutlined,
  AppstoreOutlined,
  CreditCardOutlined,
} from "@ant-design/icons";
import { DevtoolsProvider } from "@providers/devtools";
import { Refine } from "@refinedev/core";
import { RefineKbar, RefineKbarProvider } from "@refinedev/kbar";
import routerProvider from "@refinedev/nextjs-router";
import { authProviderClient } from "@providers/auth-provider/auth-provider.client";
import { dataProvider } from "@providers/data-provider";

export function RefineProvider({ children }: { children: React.ReactNode }) {
  return (
    <RefineKbarProvider>
      <DevtoolsProvider>
        <ConfigProvider theme={RefineThemes.Blue as any}>
          <AntdApp>
            <Refine
              routerProvider={routerProvider}
              authProvider={authProviderClient}
              dataProvider={dataProvider}
              notificationProvider={useNotificationProvider}
              resources={[
                {
                  name: "dashboard",
                  list: "/dashboard",
                  meta: { 
                    icon: <DashboardOutlined />,
                  },
                },
                {
                  name: "spend",
                  list: "/spend",
                  meta: { 
                    icon: <DollarOutlined />,
                  },
                },
                {
                  name: "earn",
                  list: "/earn",
                  meta: { 
                    icon: <RiseOutlined />,
                  },
                },
                {
                  name: "save",
                  list: "/save",
                  meta: { 
                    icon: <BankOutlined />,
                  },
                },
                {
                  name: "settings",
                  list: "/settings",
                  meta: { 
                    icon: <SettingOutlined />,
                  },
                },
                {
                  name: "bank-accounts",
                  list: "/settings/bank-accounts",
                  meta: {
                    parent: "settings",
                    icon: <CreditCardOutlined />,
                    label: "Bank Accounts",
                  },
                },
                {
                  name: "categories",
                  list: "/settings/categories",
                  meta: {
                    parent: "settings",
                    icon: <AppstoreOutlined />,
                  },
                },
                {
                  name: "tags",
                  list: "/settings/tags",
                  meta: {
                    parent: "settings",
                    icon: <TagsOutlined />,
                  },
                },
              ]}
              options={{
                syncWithLocation: true,
                warnWhenUnsavedChanges: true,
                projectId: "Sokeom-PrRZaQ-edxT0P",
              }}
            >
              {children}
              <RefineKbar />
            </Refine>
          </AntdApp>
        </ConfigProvider>
      </DevtoolsProvider>
    </RefineKbarProvider>
  );
}
